-- MORACare Enterprise - Alertes d'échéance persistées, par paliers
-- Version: 3.0.0
--
-- Contexte
-- --------
-- Le Centre de notifications présentait deux natures d'éléments : des
-- événements enregistrés en base, et des « états » recalculés à chaque lecture
-- pour les échéances d'abonnement et de licence.
--
-- Les seconds n'étaient pas gérables : sans ligne en base, ils ne pouvaient
-- être ni marqués lus, ni archivés. Côté Super Admin, dont la liste est
-- presque entièrement faite d'échéances, le menu d'actions se réduisait donc à
-- « consulter », et le filtre « Archivées » ne pouvait rien montrer puisque
-- rien n'était archivable. Le responsable d'établissement, dont la liste est
-- surtout faite d'événements réels, ne voyait pas le problème.
--
-- Correction
-- ----------
-- Les échéances deviennent des notifications comme les autres. La fonction
-- d'émission couvre désormais quatre paliers — 30, 7, 3 jours, puis le jour de
-- l'échéance — plus une alerte d'expiration, et traite les licences au même
-- titre que les abonnements.
--
-- Chaque palier n'émet que dans sa propre bande : une échéance à vingt jours
-- déclenche le palier 30 et lui seul. Sans cela, un abonnement déjà entré dans
-- la fenêtre au moment du déploiement aurait produit tous les paliers d'un
-- coup.

-- ==========================================
-- 1. PALIERS D'ALERTE
-- ==========================================
/*
 * Émet les alertes d'échéance dues, pour les abonnements et les licences.
 *
 * Rejouable sans produire de doublon : l'unicité repose sur la charge utile
 * (`metadata->>'sourceId'` et `metadata->>'threshold'`). La fonction peut donc
 * être appelée à chaque ouverture du Centre, sans dépendre d'un ordonnanceur
 * que l'hébergement ne garantit pas.
 *
 * Chaque échéance produit deux notifications : une de plateforme, destinée aux
 * Super Admins, et une portée par l'établissement, que son responsable voit
 * dans son propre Centre. La même information doit atteindre celui qui vend et
 * celui qui subit l'expiration.
 *
 * Le palier -1 désigne l'expiration constatée, et non une échéance à venir.
 */
CREATE OR REPLACE FUNCTION public.emit_subscription_expiry_alerts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  bands INT[] := ARRAY[30, 7, 3, 0, -1];
  threshold INT;
  -- Borne basse de la bande : le palier suivant, plus serré.
  lower_bound INT;
  row RECORD;
  produced INT := 0;
  v_severity TEXT;
  v_days_label TEXT;
BEGIN
  FOR i IN 1 .. array_length(bands, 1) LOOP
    threshold := bands[i];
    lower_bound := CASE WHEN i < array_length(bands, 1) THEN bands[i + 1] ELSE NULL END;

    v_severity := CASE WHEN threshold <= 3 THEN 'critical' ELSE 'warning' END;

    -- ---------- Abonnements ----------
    FOR row IN
      SELECT s.id,
             s.establishment_id,
             s.end_date,
             e.name AS establishment_name,
             p.name AS plan_name
        FROM public.subscriptions s
        JOIN public.establishments e ON e.id = s.establishment_id
        LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
       WHERE s.deleted_at IS NULL
         AND s.status IN ('active', 'pending')
         AND s.end_date IS NOT NULL
         AND (
           CASE
             -- Expiration constatée.
             WHEN threshold = -1 THEN s.end_date < CURRENT_DATE
             -- Bande ]palier suivant, palier courant].
             ELSE s.end_date <= CURRENT_DATE + threshold
              AND s.end_date > CURRENT_DATE + COALESCE(lower_bound, -1)
           END
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.notifications n
            WHERE n.category = 'subscription_expiry'
              AND n.metadata->>'sourceId' = s.id::TEXT
              AND n.metadata->>'threshold' = threshold::TEXT
         )
    LOOP
      v_days_label := CASE
        WHEN threshold = -1 THEN 'a expiré le ' || to_char(row.end_date, 'DD/MM/YYYY')
        WHEN threshold = 0 THEN 'arrive à échéance aujourd''hui'
        ELSE 'arrive à échéance dans ' || threshold || ' jours'
      END;

      INSERT INTO public.notifications (
        user_id, establishment_id, category, severity, type, title, message, link, metadata
      ) VALUES (
        NULL, NULL, 'subscription_expiry',
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'Abonnement expiré' ELSE 'Abonnement à échéance' END,
        row.establishment_name || ' — formule ' || COALESCE(row.plan_name, 'inconnue') ||
          ' — ' || v_days_label,
        '/admin/abonnements',
        jsonb_build_object(
          'sourceId', row.id,
          'sourceType', 'subscription',
          'threshold', threshold,
          'establishmentName', row.establishment_name,
          'planName', row.plan_name,
          'endDate', row.end_date
        )
      );

      INSERT INTO public.notifications (
        user_id, establishment_id, category, severity, type, title, message, link, metadata
      ) VALUES (
        NULL, row.establishment_id, 'subscription_expiry',
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'Votre abonnement a expiré'
             ELSE 'Votre abonnement arrive à échéance' END,
        'Formule ' || COALESCE(row.plan_name, 'inconnue') || ' — ' || v_days_label ||
          '. Aucune donnée n''est supprimée.',
        '/settings',
        jsonb_build_object(
          'sourceId', row.id,
          'sourceType', 'subscription',
          'threshold', threshold,
          'planName', row.plan_name,
          'endDate', row.end_date,
          'audience', 'establishment'
        )
      );

      produced := produced + 2;
    END LOOP;

    -- ---------- Licences ----------
    FOR row IN
      SELECT l.id,
             l.establishment_id,
             l.license_number,
             l.expires_at,
             e.name AS establishment_name
        FROM public.licenses l
        JOIN public.establishments e ON e.id = l.establishment_id
       WHERE l.deleted_at IS NULL
         AND l.status = 'active'
         AND l.expires_at IS NOT NULL
         AND (
           CASE
             WHEN threshold = -1 THEN l.expires_at::DATE < CURRENT_DATE
             ELSE l.expires_at::DATE <= CURRENT_DATE + threshold
              AND l.expires_at::DATE > CURRENT_DATE + COALESCE(lower_bound, -1)
           END
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.notifications n
            WHERE n.category = 'license_expiry'
              AND n.metadata->>'sourceId' = l.id::TEXT
              AND n.metadata->>'threshold' = threshold::TEXT
         )
    LOOP
      v_days_label := CASE
        WHEN threshold = -1 THEN 'a expiré le ' || to_char(row.expires_at, 'DD/MM/YYYY')
        WHEN threshold = 0 THEN 'expire aujourd''hui'
        ELSE 'expire dans ' || threshold || ' jours'
      END;

      INSERT INTO public.notifications (
        user_id, establishment_id, category, severity, type, title, message, link, metadata
      ) VALUES (
        NULL, NULL, 'license_expiry',
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'Licence expirée' ELSE 'Licence à échéance' END,
        row.establishment_name || ' — licence ' || row.license_number || ' ' || v_days_label,
        '/admin/abonnements',
        jsonb_build_object(
          'sourceId', row.id,
          'sourceType', 'license',
          'threshold', threshold,
          'establishmentName', row.establishment_name,
          'licenseNumber', row.license_number,
          'expiresAt', row.expires_at
        )
      );

      INSERT INTO public.notifications (
        user_id, establishment_id, category, severity, type, title, message, link, metadata
      ) VALUES (
        NULL, row.establishment_id, 'license_expiry',
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'critical' ELSE v_severity END,
        CASE WHEN threshold = -1 THEN 'Votre licence a expiré' ELSE 'Votre licence arrive à échéance' END,
        'Licence ' || row.license_number || ' ' || v_days_label || '.',
        '/settings',
        jsonb_build_object(
          'sourceId', row.id,
          'sourceType', 'license',
          'threshold', threshold,
          'licenseNumber', row.license_number,
          'expiresAt', row.expires_at,
          'audience', 'establishment'
        )
      );

      produced := produced + 2;
    END LOOP;
  END LOOP;

  RETURN produced;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_subscription_expiry_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_subscription_expiry_alerts() TO authenticated;

COMMENT ON FUNCTION public.emit_subscription_expiry_alerts() IS
  'Émet les alertes d''échéance des abonnements et licences aux paliers 30, 7, 3, 0 jours et à l''expiration. Rejouable sans produire de doublon.';

-- ==========================================
-- 2. REPRISE DES ALERTES DÉJÀ ÉMISES
-- ==========================================
-- Les alertes produites par la version précédente identifiaient leur source
-- par `subscriptionId`. Sans reprise, elles seraient réémises sous la nouvelle
-- clé et l'utilisateur verrait des doublons de ce qu'il a déjà traité.
UPDATE public.notifications
   SET metadata = metadata - 'subscriptionId'
                  || jsonb_build_object('sourceId', metadata->>'subscriptionId',
                                        'sourceType', 'subscription')
 WHERE category = 'subscription_expiry'
   AND metadata ? 'subscriptionId'
   AND NOT (metadata ? 'sourceId');
