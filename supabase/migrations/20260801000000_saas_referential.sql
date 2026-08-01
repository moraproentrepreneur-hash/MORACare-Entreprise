-- MORACare Enterprise - Référentiel SaaS, abonnements, licences et permissions
-- Version: 2.0.0
-- Références : BP09, BP12 §4, BP26A, BP28A §12-13, BP30, TD02
--
-- Cette migration déplace en base tout ce qui était codé en dur :
--   * le référentiel unique des modules (BP12 §4) ;
--   * les plans d'abonnement (BP09 §4 : Essai, Gratuit, Standard, Business, VIP) ;
--   * les abonnements et leur historique (BP09 §5, §6, §12) ;
--   * les licences (BP09 §11, BP30 §8) ;
--   * l'activation des modules par établissement (BP28A §12) ;
--   * la matrice des permissions par rôle (BP26A, UG01→UG10).
--
-- Aucun tarif n'est enregistré : la documentation n'en fixe aucun.

-- ==========================================
-- 1. RÉFÉRENTIEL UNIQUE DES MODULES (BP12 §4)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    blueprint_reference VARCHAR(50),
    -- Un module « core » ne peut jamais être désactivé : le désactiver
    -- rendrait la plateforme inutilisable ou non auditable (BP28A §12).
    is_core BOOLEAN NOT NULL DEFAULT false,
    -- Espace auquel appartient le module : 'establishment' | 'platform' | 'portal'
    workspace VARCHAR(20) NOT NULL DEFAULT 'establishment',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.modules IS
  'Référentiel unique des modules. Source de vérité des menus, permissions, plans et activations.';

-- ==========================================
-- 2. PLANS D'ABONNEMENT (BP09 §4)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    -- Durée en jours ; NULL = permanent (BP09 §4 « Gratuit : version permanente »)
    duration_days INT,
    -- Limites contrôlées automatiquement (BP09 §10)
    max_users INT,
    max_patients INT,
    storage_mb INT,
    -- Le plan Essai est créé automatiquement (BP09 BR-002)
    is_automatic BOOLEAN NOT NULL DEFAULT false,
    -- Le plan Gratuit nécessite validation du Super Admin (BP09 BR-003)
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    -- Les plans payants nécessitent validation du paiement (BP09 BR-004)
    requires_payment BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.subscription_plans IS
  'Plans définis par BP09 §4. Aucun tarif : la documentation n''en fixe aucun.';

-- Modules inclus dans chaque plan (BP09 BR-006, BP30 §7)
CREATE TABLE IF NOT EXISTS public.plan_modules (
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    PRIMARY KEY (plan_id, module_id)
);

-- ==========================================
-- 3. ABONNEMENTS (BP09 §5, §6)
-- ==========================================
DO $$ BEGIN
    CREATE TYPE subscription_state AS ENUM ('pending', 'active', 'suspended', 'expired', 'terminated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status subscription_state NOT NULL DEFAULT 'pending',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    -- NULL pour le plan Gratuit (BP09 §5 : « une date de fin (sauf Gratuit) »)
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- Historique inaltérable (BP09 §12, BR-009, §14 « aucun historique supprimé »)
CREATE TABLE IF NOT EXISTS public.subscription_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    previous_status subscription_state,
    new_status subscription_state,
    previous_plan_id UUID REFERENCES public.subscription_plans(id),
    new_plan_id UUID REFERENCES public.subscription_plans(id),
    comment TEXT,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. LICENCES (BP09 §11, BP30 §8)
-- ==========================================
DO $$ BEGIN
    CREATE TYPE license_state AS ENUM ('active', 'suspended', 'expired', 'terminated');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_number VARCHAR(50) UNIQUE NOT NULL,
    -- BR-008 / §14 : une licence appartient à un seul établissement, jamais dupliquée
    establishment_id UUID NOT NULL UNIQUE REFERENCES public.establishments(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    status license_state NOT NULL DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at DATE,
    max_users INT,
    storage_mb INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.license_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    previous_status license_state,
    new_status license_state,
    comment TEXT,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. ACTIVATION DES MODULES PAR ÉTABLISSEMENT (BP28A §12)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.establishment_modules (
    establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id),
    PRIMARY KEY (establishment_id, module_id)
);

COMMENT ON TABLE public.establishment_modules IS
  'Activation manuelle par établissement. Se combine au plan : un module doit être inclus dans le plan ET activé.';

-- ==========================================
-- 6. PERMISSIONS DYNAMIQUES (BP26A, UG01→UG10)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role_type NOT NULL,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    can_view BOOLEAN NOT NULL DEFAULT false,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (role, module_id)
);

COMMENT ON TABLE public.role_permissions IS
  'Matrice rôle x module. Aucune permission n''est codée en dur dans l''application.';

-- ==========================================
-- 7. DEMANDES D'INSCRIPTION (BP05 §3.2, BP09 §3)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    establishment_name VARCHAR(255) NOT NULL,
    establishment_type establishment_type,
    requested_plan_id UUID REFERENCES public.subscription_plans(id),
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 8. SÉQUENCES & TRIGGERS
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_subscriptions         AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_licenses              AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_registration_requests AS BIGINT START 1;

CREATE OR REPLACE FUNCTION public.generate_saas_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_TABLE_NAME = 'licenses' THEN
    IF NEW.license_number IS NULL OR NEW.license_number = '' THEN
      NEW.license_number := 'MORA-LIC-' ||
        LPAD(nextval('public.seq_ref_licenses'::regclass)::TEXT, 6, '0');
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.business_reference IS NOT NULL AND NEW.business_reference <> '' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'subscriptions' THEN
      NEW.business_reference := 'MORA-ABO-' ||
        LPAD(nextval('public.seq_ref_subscriptions'::regclass)::TEXT, 6, '0');
    WHEN 'registration_requests' THEN
      NEW.business_reference := 'MORA-DEM-' ||
        LPAD(nextval('public.seq_ref_registration_requests'::regclass)::TEXT, 6, '0');
  END CASE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_subscriptions_ref ON public.subscriptions;
CREATE TRIGGER trig_subscriptions_ref BEFORE INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.generate_saas_reference();

DROP TRIGGER IF EXISTS trig_licenses_ref ON public.licenses;
CREATE TRIGGER trig_licenses_ref BEFORE INSERT ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.generate_saas_reference();

DROP TRIGGER IF EXISTS trig_registration_requests_ref ON public.registration_requests;
CREATE TRIGGER trig_registration_requests_ref BEFORE INSERT ON public.registration_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_saas_reference();

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'modules', 'subscription_plans', 'subscriptions', 'licenses',
    'establishment_modules', 'role_permissions', 'registration_requests'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated_at ON public.%I', t, t);
    EXECUTE format($f$
      CREATE TRIGGER trig_%s_updated_at BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $f$, t, t);
  END LOOP;
END $$;

-- Historisation automatique des abonnements (BP09 BR-009)
CREATE OR REPLACE FUNCTION public.log_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_events (
      subscription_id, establishment_id, event_type, new_status, new_plan_id, performed_by
    ) VALUES (
      NEW.id, NEW.establishment_id, 'created', NEW.status, NEW.plan_id, NEW.created_by
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
    INSERT INTO public.subscription_events (
      subscription_id, establishment_id, event_type,
      previous_status, new_status, previous_plan_id, new_plan_id, performed_by
    ) VALUES (
      NEW.id, NEW.establishment_id,
      CASE WHEN NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN 'plan_changed' ELSE 'status_changed' END,
      OLD.status, NEW.status, OLD.plan_id, NEW.plan_id, NEW.updated_by
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_subscription_history ON public.subscriptions;
CREATE TRIGGER trig_subscription_history
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

CREATE OR REPLACE FUNCTION public.log_license_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.license_events (license_id, establishment_id, event_type, new_status, performed_by)
    VALUES (NEW.id, NEW.establishment_id, 'created', NEW.status, NEW.created_by);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.license_events (
      license_id, establishment_id, event_type, previous_status, new_status, performed_by
    ) VALUES (NEW.id, NEW.establishment_id, 'status_changed', OLD.status, NEW.status, NEW.updated_by);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_license_history ON public.licenses;
CREATE TRIGGER trig_license_history
  AFTER INSERT OR UPDATE ON public.licenses
  FOR EACH ROW EXECUTE FUNCTION public.log_license_change();

-- ==========================================
-- 9. ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.modules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_modules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Référentiels lisibles par tout utilisateur authentifié : sans cela, aucune
-- interface ne pourrait construire son menu. L'écriture reste au Super Admin.
DROP POLICY IF EXISTS modules_read ON public.modules;
CREATE POLICY modules_read ON public.modules
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS modules_write ON public.modules;
CREATE POLICY modules_write ON public.modules
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS plans_read ON public.subscription_plans;
CREATE POLICY plans_read ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS plans_write ON public.subscription_plans;
CREATE POLICY plans_write ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS plan_modules_read ON public.plan_modules;
CREATE POLICY plan_modules_read ON public.plan_modules
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS plan_modules_write ON public.plan_modules;
CREATE POLICY plan_modules_write ON public.plan_modules
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS role_permissions_read ON public.role_permissions;
CREATE POLICY role_permissions_read ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS role_permissions_write ON public.role_permissions;
CREATE POLICY role_permissions_write ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Abonnements et licences : BR-295, seul MORA Shawiri administre ;
-- l'établissement consulte les siens (UG02 §17).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subscriptions', 'subscription_events', 'licenses', 'license_events', 'establishment_modules'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read_own', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT TO authenticated
        USING (
          public.is_super_admin()
          OR establishment_id = public.current_establishment_id()
        )
    $f$, t || '_read_own', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write_admin', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL TO authenticated
        USING (public.is_super_admin())
        WITH CHECK (public.is_super_admin())
    $f$, t || '_write_admin', t);
  END LOOP;
END $$;

-- L'activation manuelle des modules relève du responsable d'établissement
-- (BP28A §12), en plus du Super Admin.
DROP POLICY IF EXISTS establishment_modules_manage ON public.establishment_modules;
CREATE POLICY establishment_modules_manage ON public.establishment_modules
  FOR ALL TO authenticated
  USING (
    public.is_establishment_admin()
    AND establishment_id = public.current_establishment_id()
  )
  WITH CHECK (
    public.is_establishment_admin()
    AND establishment_id = public.current_establishment_id()
  );

-- Demandes d'inscription : déposées publiquement, traitées par le Super Admin.
DROP POLICY IF EXISTS registration_requests_admin ON public.registration_requests;
CREATE POLICY registration_requests_admin ON public.registration_requests
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ==========================================
-- 10. INDEX
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_modules_code               ON public.modules(code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_establishment ON public.subscriptions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status       ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date     ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_subscription_events_sub    ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_licenses_establishment     ON public.licenses(establishment_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status            ON public.licenses(status);
CREATE INDEX IF NOT EXISTS idx_license_events_license     ON public.license_events(license_id);
CREATE INDEX IF NOT EXISTS idx_est_modules_establishment  ON public.establishment_modules(establishment_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role      ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_registration_status        ON public.registration_requests(status);
