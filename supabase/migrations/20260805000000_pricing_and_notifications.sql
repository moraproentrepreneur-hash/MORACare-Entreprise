-- MORACare Enterprise - Remise longue durée et centre de notifications
-- Version: 2.6.0
--
-- Deux corrections décidées par l'éditeur :
--
--   1. La tarification abandonne la grille de paliers au profit d'une règle
--      unique : un mois au tarif normal, puis une remise fixe par mois dès deux
--      mois, quelle que soit la durée choisie (jusqu'à douze). La règle étant
--      la même pour toutes les formules, elle s'exprime en deux colonnes plutôt
--      qu'en trente-six lignes de grille — et rester juste ne dépend plus de la
--      complétude d'un tableau.
--
--   2. Les notifications deviennent persistantes. Elles n'étaient jusqu'ici
--      recalculées qu'à l'ouverture du panneau, ce qui interdisait de les
--      marquer lues ou de les archiver. Le Centre de notifications devient le
--      point unique de réception des événements de la plateforme.

-- ==========================================
-- 1. REMISE LONGUE DURÉE
-- ==========================================
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS discount_per_month NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_min_months INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_duration_months INT NOT NULL DEFAULT 12;

COMMENT ON COLUMN public.subscription_plans.discount_per_month IS
  'Remise en valeur absolue, par mois, appliquée dès discount_min_months.';
COMMENT ON COLUMN public.subscription_plans.discount_min_months IS
  'Durée à partir de laquelle la remise s''applique. En deçà, tarif normal.';

DO $$ BEGIN
  ALTER TABLE public.subscription_plans
    ADD CONSTRAINT subscription_plans_discount_check
    CHECK (
      discount_per_month >= 0
      AND discount_per_month < price_amount + 1
      AND discount_min_months BETWEEN 1 AND 36
      AND max_duration_months BETWEEN 1 AND 36
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Politique commerciale de l'éditeur : 1 000 KMF de remise par mois dès deux
-- mois, sur les trois formules payantes. Les formules gratuites n'ont ni durée
-- à choisir ni remise à appliquer.
UPDATE public.subscription_plans
   SET discount_per_month = 1000, discount_min_months = 2, max_duration_months = 12
 WHERE code IN ('standard', 'business', 'vip');

UPDATE public.subscription_plans
   SET discount_per_month = 0, discount_min_months = 2, max_duration_months = 1
 WHERE code IN ('essai', 'gratuit');

-- La grille de paliers n'a plus d'objet : trois lignes par formule ne
-- pouvaient pas couvrir douze durées, et la règle se lit désormais sur la
-- formule elle-même.
DROP TABLE IF EXISTS public.plan_durations CASCADE;

-- ==========================================
-- 2. DEMANDES : TARIF NORMAL CONSERVÉ
-- ==========================================
-- Le récapitulatif doit montrer le tarif normal ET le tarif remisé. Sans la
-- valeur de référence, une évolution des prix rendrait les demandes passées
-- incompréhensibles.
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS base_monthly_price NUMERIC(12,2);

COMMENT ON COLUMN public.registration_requests.base_monthly_price IS
  'Tarif mensuel normal au moment de la demande, avant remise.';
COMMENT ON COLUMN public.registration_requests.monthly_price IS
  'Tarif mensuel réellement appliqué, remise comprise.';

-- ==========================================
-- 3. NOTIFICATIONS PERSISTANTES
-- ==========================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS business_reference VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category VARCHAR(40) NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS link VARCHAR(255),
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.notifications.user_id IS
  'Destinataire. NULL = notification de plateforme, destinée aux Super Admins.';
COMMENT ON COLUMN public.notifications.metadata IS
  'Charge utile de l''événement : code de vérification, montants, références.';

-- `is_read` était nullable et sans valeur par défaut : une notification créée
-- sans la renseigner n'était ni lue ni non lue.
UPDATE public.notifications SET is_read = FALSE WHERE is_read IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN is_read SET DEFAULT FALSE,
  ALTER COLUMN is_read SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_category_check
    CHECK (category IN (
      'system', 'activation_code', 'registration_request', 'contact_request',
      'password_reset', 'establishment_created', 'admin_created',
      'subscription_expiry', 'license_expiry', 'critical_error'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_severity_check
    CHECK (severity IN ('info', 'warning', 'critical'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.seq_ref_notifications AS BIGINT START 1;

CREATE OR REPLACE FUNCTION public.generate_notification_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.business_reference IS NULL OR NEW.business_reference = '' THEN
    NEW.business_reference := 'MORA-NOT-' ||
      LPAD(nextval('public.seq_ref_notifications'::regclass)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_notifications_ref ON public.notifications;
CREATE TRIGGER trig_notifications_ref
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.generate_notification_reference();

-- Les lignes déjà présentes n'ont pas de référence : le trigger ne joue qu'à
-- l'insertion.
UPDATE public.notifications
   SET business_reference = 'MORA-NOT-' ||
       LPAD(nextval('public.seq_ref_notifications'::regclass)::TEXT, 6, '0')
 WHERE business_reference IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_platform
  ON public.notifications(created_at DESC) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications(category, is_archived, is_read);

-- ==========================================
-- 4. SÉCURITÉ DES NOTIFICATIONS
-- ==========================================
-- La politique précédente confrontait `user_id` à `auth.uid()` : une
-- notification de plateforme (user_id NULL) n'était donc lisible que par la
-- branche Super Admin. Le comportement est conservé et rendu explicite.
DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_super_admin()
    OR user_id = (SELECT auth.uid())
  );

COMMENT ON TABLE public.notifications IS
  'Centre de notifications. user_id NULL = événement de plateforme, réservé aux Super Admins.';
