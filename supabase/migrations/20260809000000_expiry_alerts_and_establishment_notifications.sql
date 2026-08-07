-- MORACare Enterprise - Alertes d'échéance et notifications d'établissement
-- Version: 2.9.0
--
-- Deux évolutions :
--
--   1. Le responsable d'établissement accède au Centre de notifications de sa
--      structure. Jusqu'ici, seules les notifications nominatives lui étaient
--      visibles ; celles de son établissement — échéance d'abonnement, incident
--      — ne l'étaient pas.
--
--   2. Les échéances d'abonnement produisent des alertes à J-7 puis à J-3,
--      pour le Super Admin **et** pour le responsable concerné.

-- ==========================================
-- 1. LECTURE DES NOTIFICATIONS D'ÉTABLISSEMENT
-- ==========================================
-- Le responsable voit les notifications de son établissement ; le personnel
-- soignant ne voit que les siennes. Les alertes d'échéance et les incidents
-- relèvent de la gestion de la structure, pas du soin.
DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR user_id = (SELECT auth.uid())
    OR (
      public.is_establishment_admin()
      AND establishment_id = public.current_establishment_id()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR user_id = (SELECT auth.uid())
    OR (
      public.is_establishment_admin()
      AND establishment_id = public.current_establishment_id()
    )
  );

-- ==========================================
-- 2. ALERTES D'ÉCHÉANCE
-- ==========================================
/*
 * Produit les alertes d'échéance dues.
 *
 * Deux seuils : sept jours, puis trois. Chaque seuil ne déclenche qu'une fois
 * par abonnement — la fonction est donc rejouable sans produire de doublon, ce
 * qui permet de l'appeler à chaque ouverture du Centre de notifications plutôt
 * que de dépendre d'un ordonnanceur externe.
 *
 * L'unicité repose sur la charge utile : `metadata->>'subscriptionId'` et
 * `metadata->>'threshold'` identifient l'alerte déjà émise.
 *
 * Chaque échéance produit deux notifications : une de plateforme, destinée aux
 * Super Admins, et une portée par l'établissement, que son responsable voit
 * dans son propre Centre. La même information doit atteindre celui qui vend et
 * celui qui subit l'expiration.
 */
CREATE OR REPLACE FUNCTION public.emit_subscription_expiry_alerts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  threshold INT;
  row RECORD;
  produced INT := 0;
BEGIN
  FOREACH threshold IN ARRAY ARRAY[7, 3] LOOP
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
         -- Le seuil est franchi, sans être encore expiré : au-delà, c'est une
         -- alerte d'expiration, pas d'échéance imminente.
         AND s.end_date <= CURRENT_DATE + threshold
         AND s.end_date >= CURRENT_DATE
         AND NOT EXISTS (
           SELECT 1 FROM public.notifications n
            WHERE n.category = 'subscription_expiry'
              AND n.metadata->>'subscriptionId' = s.id::TEXT
              AND n.metadata->>'threshold' = threshold::TEXT
         )
    LOOP
      -- Destinée aux Super Admins.
      INSERT INTO public.notifications (
        user_id, establishment_id, category, severity, type, title, message, link, metadata
      ) VALUES (
        NULL, NULL, 'subscription_expiry',
        CASE WHEN threshold <= 3 THEN 'critical' ELSE 'warning' END,
        CASE WHEN threshold <= 3 THEN 'critical' ELSE 'warning' END,
        'Abonnement à échéance dans ' || threshold || ' jours',
        row.establishment_name || ' — formule ' || COALESCE(row.plan_name, 'inconnue'),
        '/admin/abonnements',
        jsonb_build_object(
          'subscriptionId', row.id,
          'threshold', threshold,
          'establishmentName', row.establishment_name,
          'planName', row.plan_name,
          'endDate', row.end_date
        )
      );

      -- Destinée au responsable de l'établissement concerné.
      INSERT INTO public.notifications (
        user_id, establishment_id, category, severity, type, title, message, link, metadata
      ) VALUES (
        NULL, row.establishment_id, 'subscription_expiry',
        CASE WHEN threshold <= 3 THEN 'critical' ELSE 'warning' END,
        CASE WHEN threshold <= 3 THEN 'critical' ELSE 'warning' END,
        'Votre abonnement expire dans ' || threshold || ' jours',
        'Formule ' || COALESCE(row.plan_name, 'inconnue') ||
          ' — échéance le ' || to_char(row.end_date, 'DD/MM/YYYY'),
        '/settings',
        jsonb_build_object(
          'subscriptionId', row.id,
          'threshold', threshold,
          'planName', row.plan_name,
          'endDate', row.end_date,
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
  'Émet les alertes d''échéance à J-7 et J-3. Rejouable sans produire de doublon.';
