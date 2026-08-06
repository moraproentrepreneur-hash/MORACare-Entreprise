-- MORACare Enterprise - Cycle de vie des abonnements et modèles documentaires
-- Version: 2.8.0
--
-- Deux chantiers :
--
--   1. L'abonnement porte désormais sa durée en mois. L'échéance s'en déduit,
--      au lieu d'être saisie : une date de fin qui ne correspond pas à la durée
--      vendue est une source de litige.
--
--   2. Les modèles documentaires de BP28C §8 — Premium Classic, Premium Medical
--      et Premium Executive — deviennent sélectionnables, globalement et par
--      type de document (BP28C §9).

-- ==========================================
-- 1. DURÉE DE L'ABONNEMENT
-- ==========================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS duration_months INT;

COMMENT ON COLUMN public.subscriptions.duration_months IS
  'Durée vendue, en mois. NULL pour une formule permanente ou un essai en jours.';

DO $$ BEGIN
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_duration_check
    CHECK (duration_months IS NULL OR duration_months BETWEEN 1 AND 36);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 2. ÉTAT CALCULÉ DE L'ABONNEMENT
-- ==========================================
/*
 * L'état affiché ne se réduit pas au statut enregistré.
 *
 * Un abonnement « actif » dont l'échéance est passée n'est plus actif ; un
 * abonnement dont l'échéance approche mérite d'être signalé avant de devenir un
 * incident. Cette fonction unifie le calcul afin que l'interface du Super Admin
 * et celle de l'établissement disent exactement la même chose — les faire
 * diverger reviendrait à contredire le client sur son propre contrat.
 */
CREATE OR REPLACE FUNCTION public.subscription_state_of(
  status public.subscription_state,
  end_date DATE
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN status = 'suspended'  THEN 'suspended'
    WHEN status = 'terminated' THEN 'terminated'
    WHEN status = 'pending'    THEN 'pending'
    WHEN end_date IS NULL      THEN 'active'
    WHEN end_date < CURRENT_DATE THEN 'expired'
    WHEN end_date <= CURRENT_DATE + 30 THEN 'expiring_soon'
    ELSE 'active'
  END;
$$;

COMMENT ON FUNCTION public.subscription_state_of(public.subscription_state, DATE) IS
  'État affiché : croise le statut enregistré et l''échéance réelle.';

-- ==========================================
-- 3. HISTORISATION DU CHANGEMENT DE FORMULE
-- ==========================================
/*
 * Le trigger d'historisation existant ne suivait que le statut. Un changement
 * de formule — Standard vers Business, par exemple — passait donc inaperçu,
 * alors que c'est l'événement commercial le plus significatif du cycle de vie.
 */
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_events (
      subscription_id, establishment_id, event_type,
      previous_status, new_status, previous_plan_id, new_plan_id, performed_by
    ) VALUES (
      NEW.id, NEW.establishment_id, 'created',
      NULL, NEW.status, NULL, NEW.plan_id, NEW.created_by
    );
    RETURN NEW;
  END IF;

  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
    INSERT INTO public.subscription_events (
      subscription_id, establishment_id, event_type,
      previous_status, new_status, previous_plan_id, new_plan_id, performed_by
    ) VALUES (
      NEW.id, NEW.establishment_id, 'plan_changed',
      OLD.status, NEW.status, OLD.plan_id, NEW.plan_id, NEW.updated_by
    );
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.subscription_events (
      subscription_id, establishment_id, event_type,
      previous_status, new_status, previous_plan_id, new_plan_id, performed_by
    ) VALUES (
      NEW.id, NEW.establishment_id, 'status_changed',
      OLD.status, NEW.status, OLD.plan_id, NEW.plan_id, NEW.updated_by
    );
  END IF;

  -- Une prolongation sans changement de formule ni de statut reste un
  -- événement : c'est elle qui justifie la nouvelle échéance.
  IF NEW.end_date IS DISTINCT FROM OLD.end_date
     AND NEW.plan_id IS NOT DISTINCT FROM OLD.plan_id
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    INSERT INTO public.subscription_events (
      subscription_id, establishment_id, event_type,
      previous_status, new_status, previous_plan_id, new_plan_id, performed_by
    ) VALUES (
      NEW.id, NEW.establishment_id, 'renewed',
      OLD.status, NEW.status, OLD.plan_id, NEW.plan_id, NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$;

/*
 * Le trigger conserve le nom posé par 20260801000000.
 *
 * En créer un second sous un autre nom laisserait les deux actifs : chaque
 * événement serait alors écrit deux fois dans l'historique. La fonction est
 * remplacée, le déclencheur reste unique.
 */
DROP TRIGGER IF EXISTS trig_subscription_events ON public.subscriptions;
DROP TRIGGER IF EXISTS trig_subscription_history ON public.subscriptions;

CREATE TRIGGER trig_subscription_history
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

-- ==========================================
-- 4. COHÉRENCE DE LA LICENCE
-- ==========================================
/*
 * La licence suit l'abonnement.
 *
 * Changer de formule modifie le plafond d'utilisateurs et le stockage ; laisser
 * la licence sur les valeurs de l'ancienne formule reviendrait à vendre
 * Business et à livrer Standard. La synchronisation est faite en base plutôt
 * que dans l'application : elle vaut alors pour tous les chemins d'écriture.
 */
CREATE OR REPLACE FUNCTION public.sync_license_with_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  plan RECORD;
BEGIN
  SELECT max_users, storage_mb INTO plan
    FROM public.subscription_plans WHERE id = NEW.plan_id;

  UPDATE public.licenses
     SET expires_at = NEW.end_date,
         max_users  = plan.max_users,
         storage_mb = plan.storage_mb,
         status = CASE
           WHEN NEW.status = 'active'     THEN 'active'::public.license_state
           WHEN NEW.status = 'terminated' THEN 'terminated'::public.license_state
           WHEN NEW.status = 'expired'    THEN 'expired'::public.license_state
           ELSE 'suspended'::public.license_state
         END,
         updated_by = NEW.updated_by
   WHERE subscription_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_license_follows_subscription ON public.subscriptions;
CREATE TRIGGER trig_license_follows_subscription
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  WHEN (
    OLD.plan_id IS DISTINCT FROM NEW.plan_id
    OR OLD.end_date IS DISTINCT FROM NEW.end_date
    OR OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION public.sync_license_with_subscription();

-- ==========================================
-- 5. MODÈLES DOCUMENTAIRES (BP28C §8 et §9)
-- ==========================================
-- Note : aucune politique n'est ajoutée pour la lecture de l'abonnement par
-- l'établissement. `subscriptions_read_own`, `subscription_events_read_own` et
-- `licenses_read_own`, créées par 20260801000000, l'autorisent déjà — et
-- couvrent en outre le Super Admin, que les redéfinir aurait fait perdre.
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS pdf_template VARCHAR(30) NOT NULL DEFAULT 'premium_classic',
  ADD COLUMN IF NOT EXISTS document_templates JSONB;

COMMENT ON COLUMN public.establishments.pdf_template IS
  'Modèle par défaut de l''établissement (BP28C §9).';
COMMENT ON COLUMN public.establishments.document_templates IS
  'Modèle attribué à certains types de documents : { "invoice": "premium_executive", … }';

DO $$ BEGIN
  ALTER TABLE public.establishments
    ADD CONSTRAINT establishments_pdf_template_check
    CHECK (pdf_template IN ('premium_classic', 'premium_medical', 'premium_executive'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

/*
 * L'en-tête et le pied de page ne sont plus saisis.
 *
 * BP28C §10 autorise l'administrateur à personnaliser l'en-tête et le pied,
 * mais §6 exige des documents homogènes et conformes. Deux champs libres
 * laissaient recopier à la main des coordonnées déjà saisies ailleurs, avec la
 * garantie qu'elles finiraient par diverger. Ils sont désormais composés à
 * partir de l'identité, des coordonnées et des informations légales — que
 * l'administrateur continue de maîtriser, mais à un seul endroit.
 */
ALTER TABLE public.establishments
  DROP COLUMN IF EXISTS pdf_header,
  DROP COLUMN IF EXISTS pdf_footer;
