-- MORACare Enterprise - Sécurité, activation des comptes et tarification par durée
-- Version: 2.5.0
--
-- Cette migration porte quatre chantiers :
--   1. un référentiel de sécurité réellement appliqué (mots de passe, sessions,
--      verrouillage, rétention), et non plus documenté
--   2. le cycle de vie d'un compte : mot de passe temporaire, changement
--      obligatoire, activation par code à six chiffres
--   3. les demandes de réinitialisation de mot de passe
--   4. la tarification dégressive par durée et les modes de paiement
--
-- Principe transverse : rien de sensible n'est stocké en clair. Les codes de
-- vérification sont hachés comme des mots de passe ; seul leur condensé est
-- conservé.

-- ==========================================
-- 0. OUTILLAGE
-- ==========================================
-- pgcrypto fournit crypt()/gen_salt(), déjà utilisés par Supabase Auth.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ==========================================
-- 1. PARAMÈTRES DE SÉCURITÉ
-- ==========================================
-- Une ligne par établissement, plus une ligne globale (establishment_id NULL)
-- qui sert de politique de la plateforme et de valeur par défaut.
CREATE TABLE IF NOT EXISTS public.security_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,

    -- Politique des mots de passe
    password_min_length INT NOT NULL DEFAULT 8,
    password_require_uppercase BOOLEAN NOT NULL DEFAULT TRUE,
    password_require_lowercase BOOLEAN NOT NULL DEFAULT TRUE,
    password_require_digit BOOLEAN NOT NULL DEFAULT TRUE,
    password_require_special BOOLEAN NOT NULL DEFAULT FALSE,
    password_expiry_days INT,

    -- Sessions
    session_max_minutes INT NOT NULL DEFAULT 720,
    session_idle_minutes INT NOT NULL DEFAULT 60,

    -- Tentatives et verrouillage
    max_login_attempts INT NOT NULL DEFAULT 3,
    lockout_minutes INT NOT NULL DEFAULT 15,

    -- Journal d'audit
    audit_retention_days INT NOT NULL DEFAULT 365,

    -- Double authentification. Le socle est en place ; l'activation reste
    -- fermée tant que le second facteur n'est pas déployé.
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_method VARCHAR(20) NOT NULL DEFAULT 'email',

    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT security_settings_min_length_check
      CHECK (password_min_length BETWEEN 8 AND 128),
    CONSTRAINT security_settings_attempts_check
      CHECK (max_login_attempts BETWEEN 1 AND 20),
    CONSTRAINT security_settings_lockout_check
      CHECK (lockout_minutes BETWEEN 1 AND 1440),
    CONSTRAINT security_settings_session_check
      CHECK (session_max_minutes BETWEEN 5 AND 43200 AND session_idle_minutes BETWEEN 5 AND 1440),
    CONSTRAINT security_settings_retention_check
      CHECK (audit_retention_days BETWEEN 30 AND 3650),
    CONSTRAINT security_settings_2fa_method_check
      CHECK (two_factor_method IN ('email', 'totp', 'whatsapp'))
);

COMMENT ON TABLE public.security_settings IS
  'Politique de sécurité appliquée. La ligne sans establishment_id est la politique de la plateforme.';

-- Une seule ligne globale, une seule ligne par établissement.
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_settings_global
  ON public.security_settings((establishment_id IS NULL)) WHERE establishment_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_security_settings_establishment
  ON public.security_settings(establishment_id) WHERE establishment_id IS NOT NULL;

-- Politique de la plateforme, conforme à la règle retenue par l'éditeur :
-- 8 caractères, une majuscule, une minuscule, un chiffre.
INSERT INTO public.security_settings (establishment_id)
SELECT NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.security_settings WHERE establishment_id IS NULL
);

-- ==========================================
-- 2. CYCLE DE VIE DES COMPTES
-- ==========================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activation_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.must_change_password IS
  'Le mot de passe actuel est temporaire : il doit être changé avant tout accès.';
COMMENT ON COLUMN public.profiles.activation_required IS
  'Le compte attend la saisie du code de vérification envoyé par e-mail.';

-- Les comptes existants ont un mot de passe choisi par leur titulaire : ils ne
-- doivent pas être soumis rétroactivement au changement obligatoire.
UPDATE public.profiles
   SET password_changed_at = COALESCE(password_changed_at, created_at)
 WHERE password_changed_at IS NULL;

-- ==========================================
-- 3. TENTATIVES DE CONNEXION
-- ==========================================
-- Journalisées y compris pour un identifiant inconnu : c'est précisément le cas
-- qui trahit une tentative d'énumération.
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(255) NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    succeeded BOOLEAN NOT NULL,
    failure_reason VARCHAR(50),
    ip_address VARCHAR(64),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.login_attempts IS
  'Historique des tentatives de connexion, réussies comme échouées.';

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier
  ON public.login_attempts(identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created
  ON public.login_attempts(created_at DESC);

-- ==========================================
-- 4. CODES DE VÉRIFICATION
-- ==========================================
-- Six chiffres, hachés. Un code lisible en base serait un mot de passe en clair.
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    purpose VARCHAR(40) NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT verification_codes_purpose_check
      CHECK (purpose IN ('account_activation', 'trial_activation', 'password_reset', 'two_factor'))
);

COMMENT ON TABLE public.verification_codes IS
  'Codes à six chiffres. Seul le condensé est conservé, jamais le code lui-même.';

CREATE INDEX IF NOT EXISTS idx_verification_codes_profile
  ON public.verification_codes(profile_id, purpose, consumed_at);

-- ==========================================
-- 5. DEMANDES DE RÉINITIALISATION
-- ==========================================
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
    identifier VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    email VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    note TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT password_reset_requests_status_check
      CHECK (status IN ('pending', 'in_progress', 'contacted', 'accepted', 'rejected', 'closed'))
);

COMMENT ON TABLE public.password_reset_requests IS
  'Demandes « mot de passe oublié », traitées manuellement par MORA Shawiri.';

CREATE INDEX IF NOT EXISTS idx_password_reset_status
  ON public.password_reset_requests(status, created_at DESC);

-- ==========================================
-- 6. FILE D'ATTENTE DES ENVOIS
-- ==========================================
-- Point d'extension du système de notification. Tout message part d'ici, quel
-- que soit le canal : un fournisseur d'e-mail aujourd'hui, WhatsApp Business ou
-- Wakati demain, sans que le reste du code change. Un envoi qui échoue reste
-- visible et rejouable au lieu de disparaître.
CREATE TABLE IF NOT EXISTS public.message_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    template VARCHAR(60) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    provider VARCHAR(40),
    provider_message_id VARCHAR(255),
    error TEXT,
    attempts INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    related_type VARCHAR(60),
    related_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT message_outbox_channel_check
      CHECK (channel IN ('email', 'whatsapp', 'sms')),
    CONSTRAINT message_outbox_status_check
      CHECK (status IN ('pending', 'sent', 'failed'))
);

COMMENT ON TABLE public.message_outbox IS
  'File des messages sortants. Canal-agnostique : e-mail, WhatsApp ou SMS.';

CREATE INDEX IF NOT EXISTS idx_message_outbox_status
  ON public.message_outbox(status, created_at DESC);

-- ==========================================
-- 7. MODES DE PAIEMENT
-- ==========================================
-- En table, et non en énumération : ajouter un opérateur ne doit demander ni
-- migration ni déploiement.
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    label VARCHAR(80) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    requires_reference BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_methods IS
  'Modes de paiement proposés au visiteur. Extensible sans migration.';

INSERT INTO public.payment_methods (code, label, description, requires_reference, display_order) VALUES
  ('especes', 'Espèces',  'Règlement en espèces auprès de MORA Shawiri.',      FALSE, 1),
  ('cheque',  'Chèque',   'Règlement par chèque bancaire.',                     TRUE,  2),
  ('mvola',   'Mvola',    'Paiement mobile Mvola.',                             TRUE,  3),
  ('holo',    'Holo',     'Paiement mobile Holo.',                              TRUE,  4),
  ('wakati',  'Wakati',   'Paiement mobile Wakati.',                            TRUE,  5)
ON CONFLICT (code) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description,
      requires_reference = EXCLUDED.requires_reference,
      display_order = EXCLUDED.display_order,
      updated_at = NOW();

-- ==========================================
-- 8. TARIFICATION PAR DURÉE
-- ==========================================
-- Les remises sont des données, pas une formule codée en dur : l'éditeur doit
-- pouvoir modifier une grille sans toucher au code.
CREATE TABLE IF NOT EXISTS public.plan_durations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    months INT NOT NULL,
    monthly_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT plan_durations_months_check CHECK (months BETWEEN 1 AND 36),
    CONSTRAINT plan_durations_price_check CHECK (monthly_price >= 0 AND total_price >= 0),
    CONSTRAINT plan_durations_unique UNIQUE (plan_id, months)
);

COMMENT ON TABLE public.plan_durations IS
  'Grille tarifaire dégressive. Réservée aux formules payantes.';

-- Grille officielle de l'éditeur.
INSERT INTO public.plan_durations (plan_id, months, monthly_price, total_price)
SELECT p.id, d.months, d.monthly_price, d.total_price
FROM public.subscription_plans p
JOIN (VALUES
  ('standard', 1,  5000.00,  5000.00),
  ('standard', 2,  4000.00,  8000.00),
  ('standard', 3,  3000.00,  9000.00),
  ('business', 1, 10000.00, 10000.00),
  ('business', 2,  9000.00, 18000.00),
  ('business', 3,  8000.00, 24000.00),
  ('vip',      1, 15000.00, 15000.00),
  ('vip',      2, 14000.00, 28000.00),
  ('vip',      3, 13000.00, 39000.00)
) AS d(code, months, monthly_price, total_price) ON d.code = p.code
ON CONFLICT (plan_id, months) DO UPDATE
  SET monthly_price = EXCLUDED.monthly_price,
      total_price = EXCLUDED.total_price,
      updated_at = NOW();

-- ==========================================
-- 9. DEMANDES D'ABONNEMENT ENRICHIES
-- ==========================================
-- Le visiteur choisit désormais une offre précise, une durée, un mode de
-- paiement et une date de démarrage. Ces éléments font partie de la demande.
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS plan_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS plan_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS duration_months INT,
  ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS total_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS savings_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS price_currency VARCHAR(10) NOT NULL DEFAULT 'KMF',
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
  ADD COLUMN IF NOT EXISTS start_option VARCHAR(30),
  ADD COLUMN IF NOT EXISTS start_date DATE;

COMMENT ON COLUMN public.registration_requests.savings_amount IS
  'Économie totale par rapport au tarif mensuel de référence.';

DO $$ BEGIN
  ALTER TABLE public.registration_requests
    ADD CONSTRAINT registration_requests_start_option_check
    CHECK (start_option IS NULL OR start_option IN ('immediate', 'next_month', 'custom'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 10. RÉFÉRENCES MÉTIER
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_password_resets AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_messages        AS BIGINT START 1;

CREATE OR REPLACE FUNCTION public.generate_security_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.business_reference IS NOT NULL AND NEW.business_reference <> '' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'password_reset_requests' THEN
    NEW.business_reference := 'MORA-RST-' ||
      LPAD(nextval('public.seq_ref_password_resets'::regclass)::TEXT, 6, '0');
  ELSIF TG_TABLE_NAME = 'message_outbox' THEN
    NEW.business_reference := 'MORA-MSG-' ||
      LPAD(nextval('public.seq_ref_messages'::regclass)::TEXT, 6, '0');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_password_reset_ref ON public.password_reset_requests;
CREATE TRIGGER trig_password_reset_ref
  BEFORE INSERT ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_security_reference();

DROP TRIGGER IF EXISTS trig_message_outbox_ref ON public.message_outbox;
CREATE TRIGGER trig_message_outbox_ref
  BEFORE INSERT ON public.message_outbox
  FOR EACH ROW EXECUTE FUNCTION public.generate_security_reference();

DROP TRIGGER IF EXISTS trig_security_settings_updated_at ON public.security_settings;
CREATE TRIGGER trig_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trig_password_reset_updated_at ON public.password_reset_requests;
CREATE TRIGGER trig_password_reset_updated_at
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trig_message_outbox_updated_at ON public.message_outbox;
CREATE TRIGGER trig_message_outbox_updated_at
  BEFORE UPDATE ON public.message_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trig_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trig_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trig_plan_durations_updated_at ON public.plan_durations;
CREATE TRIGGER trig_plan_durations_updated_at
  BEFORE UPDATE ON public.plan_durations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 11. SÉCURITÉ DES NOUVELLES TABLES
-- ==========================================
ALTER TABLE public.security_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_outbox           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_durations           ENABLE ROW LEVEL SECURITY;

-- Paramètres de sécurité : le Super Admin pilote la plateforme, le responsable
-- consulte ceux de son établissement.
DROP POLICY IF EXISTS security_settings_admin ON public.security_settings;
CREATE POLICY security_settings_admin ON public.security_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS security_settings_read_own ON public.security_settings;
CREATE POLICY security_settings_read_own ON public.security_settings
  FOR SELECT TO authenticated
  USING (establishment_id IS NULL OR establishment_id = public.current_establishment_id());

-- Tentatives de connexion : lecture réservée au Super Admin. L'écriture passe
-- par la clé secrète côté serveur, jamais par le navigateur.
DROP POLICY IF EXISTS login_attempts_admin ON public.login_attempts;
CREATE POLICY login_attempts_admin ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Codes de vérification : aucun accès depuis le navigateur, quel que soit le
-- rôle. Un code, même haché, n'a pas à sortir du serveur.
DROP POLICY IF EXISTS verification_codes_none ON public.verification_codes;
CREATE POLICY verification_codes_none ON public.verification_codes
  FOR SELECT TO authenticated
  USING (FALSE);

DROP POLICY IF EXISTS password_reset_admin ON public.password_reset_requests;
CREATE POLICY password_reset_admin ON public.password_reset_requests
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS message_outbox_admin ON public.message_outbox;
CREATE POLICY message_outbox_admin ON public.message_outbox
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Modes de paiement et grilles tarifaires : informations commerciales publiques,
-- lisibles par la vitrine comme les formules elles-mêmes.
DROP POLICY IF EXISTS payment_methods_read_public ON public.payment_methods;
CREATE POLICY payment_methods_read_public ON public.payment_methods
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS payment_methods_write ON public.payment_methods;
CREATE POLICY payment_methods_write ON public.payment_methods
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS plan_durations_read_public ON public.plan_durations;
CREATE POLICY plan_durations_read_public ON public.plan_durations
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS plan_durations_write ON public.plan_durations;
CREATE POLICY plan_durations_write ON public.plan_durations
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ==========================================
-- 12. PURGE DU JOURNAL D'AUDIT
-- ==========================================
-- La politique de rétention doit être exécutable, sinon elle n'est qu'un
-- affichage. Cette fonction supprime ce qui dépasse la durée configurée.
CREATE OR REPLACE FUNCTION public.purge_expired_audit_logs()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  retention INT;
  removed INT;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Seul le Super Admin peut purger le journal d''audit.';
  END IF;

  SELECT audit_retention_days INTO retention
    FROM public.security_settings WHERE establishment_id IS NULL;

  IF retention IS NULL THEN
    retention := 365;
  END IF;

  DELETE FROM public.audit_logs
   WHERE created_at < NOW() - (retention || ' days')::INTERVAL;

  GET DIAGNOSTICS removed = ROW_COUNT;

  DELETE FROM public.login_attempts
   WHERE created_at < NOW() - (retention || ' days')::INTERVAL;

  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_audit_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_audit_logs() TO authenticated;

COMMENT ON FUNCTION public.purge_expired_audit_logs() IS
  'Applique la politique de rétention au journal d''audit et aux tentatives de connexion.';
