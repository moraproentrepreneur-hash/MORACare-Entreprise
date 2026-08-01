-- MORACare Enterprise - Durcissement de sécurité
-- Version: 1.1.0
-- Référence: TD02 §7/§8/§14/§15/§16, TD05 §9, TD06 §7/§8, BP06 §14, BP26A, BP26B
--
-- Corrige les écarts P0-06 à P0-09 du RAPPORT-AUDIT-PHASE1-2 :
--   * 13 tables avaient RLS activé SANS aucune politique (donc inaccessibles)
--   * system_settings n'avait pas RLS
--   * is_super_admin() était SECURITY DEFINER sans search_path figé
--   * les références métier étaient générées par RANDOM() sur une colonne UNIQUE
--   * aucun trigger updated_at (TD05 §9), aucun index (TD02 §16)

-- ==========================================
-- 1. FONCTIONS HELPER SÉCURISÉES
-- ==========================================
-- SECURITY DEFINER + search_path figé : sans cela, un schéma malveillant placé
-- en tête de search_path pourrait détourner la résolution des noms.
-- Ces fonctions contournent volontairement RLS pour éviter la récursion
-- infinie des politiques qui les appellent.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'super_admin'
      AND is_active = true
      AND deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'Vrai si l''utilisateur courant est un Super Admin actif. Contourne RLS par conception.';

CREATE OR REPLACE FUNCTION public.current_establishment_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT establishment_id FROM public.profiles
  WHERE id = (SELECT auth.uid())
    AND is_active = true
    AND deleted_at IS NULL;
$$;

COMMENT ON FUNCTION public.current_establishment_id() IS
  'Établissement de rattachement de l''utilisateur courant. Colonne d''isolation multi-tenant (TD02 §14).';

CREATE OR REPLACE FUNCTION public.is_establishment_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('super_admin', 'establishment_admin')
      AND is_active = true
      AND deleted_at IS NULL
  );
$$;

-- ==========================================
-- 2. ACTIVATION RLS MANQUANTE
-- ==========================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. SUPPRESSION DES POLITIQUES HÉRITÉES
-- ==========================================
-- Les 3 politiques d'origine étaient incomplètes (pas de WITH CHECK explicite,
-- pas de restriction au rôle authenticated).
DROP POLICY IF EXISTS "Super admins full access to profiles"   ON public.profiles;
DROP POLICY IF EXISTS "Users read own establishment patients"  ON public.patients;
DROP POLICY IF EXISTS "Users edit own establishment patients"  ON public.patients;

-- ==========================================
-- 4. ISOLATION MULTI-TENANT — TABLES MÉTIER
-- ==========================================
-- Politique uniforme sur toutes les tables portant establishment_id :
-- un utilisateur n'accède qu'aux données de SON établissement ; le Super Admin
-- accède à tout. WITH CHECK empêche d'écrire dans un autre établissement.
-- TD06 §8 : « Les utilisateurs d'un établissement ne peuvent jamais accéder
-- aux données d'un autre établissement. »

DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'patients',
    'appointments',
    'consultations',
    'prescriptions',
    'hospitalizations',
    'pharmacy_items',
    'lab_orders',
    'imaging_orders',
    'invoices',
    'payments',
    'employees',
    'system_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || t, t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL
        TO authenticated
        USING (
          public.is_super_admin()
          OR establishment_id = public.current_establishment_id()
        )
        WITH CHECK (
          public.is_super_admin()
          OR establishment_id = public.current_establishment_id()
        )
    $f$, 'tenant_isolation_' || t, t);
  END LOOP;
END $$;

-- ==========================================
-- 5. POLITIQUES SPÉCIFIQUES
-- ==========================================

-- --- ESTABLISHMENTS ---
-- Le Super Admin gère tous les établissements (BP30, UG01 §5-6).
-- Un utilisateur ne voit QUE son propre établissement, en lecture seule.
DROP POLICY IF EXISTS establishments_super_admin ON public.establishments;
CREATE POLICY establishments_super_admin ON public.establishments
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS establishments_read_own ON public.establishments;
CREATE POLICY establishments_read_own ON public.establishments
  FOR SELECT TO authenticated
  USING (id = public.current_establishment_id());

-- --- PROFILES ---
-- Chacun lit et modifie son propre profil ; les membres d'un établissement se
-- voient entre eux (nécessaire pour sélectionner un médecin : CLAUDE.md
-- « Aucune saisie libre lorsqu'une relation existe déjà »).
DROP POLICY IF EXISTS profiles_super_admin ON public.profiles;
CREATE POLICY profiles_super_admin ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS profiles_read_own_establishment ON public.profiles;
CREATE POLICY profiles_read_own_establishment ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR establishment_id = public.current_establishment_id()
  );

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- L'administrateur d'établissement gère les comptes de SON établissement
-- (UG02 §5-6 : créer, modifier, désactiver, attribuer un rôle).
DROP POLICY IF EXISTS profiles_admin_manage_establishment ON public.profiles;
CREATE POLICY profiles_admin_manage_establishment ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.is_establishment_admin()
    AND establishment_id = public.current_establishment_id()
  )
  WITH CHECK (
    public.is_establishment_admin()
    AND establishment_id = public.current_establishment_id()
  );

-- --- NOTIFICATIONS ---
-- Portées par user_id, pas par establishment_id.
DROP POLICY IF EXISTS notifications_own ON public.notifications;
CREATE POLICY notifications_own ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_super_admin())
  WITH CHECK (user_id = (SELECT auth.uid()) OR public.is_super_admin());

-- --- AUDIT_LOGS ---
-- BP26B : le journal d'audit est consultable par les administrateurs et
-- INALTÉRABLE. Aucune politique UPDATE ni DELETE n'est créée : PostgreSQL
-- refusera donc toute modification ou suppression, y compris par le Super Admin.
DROP POLICY IF EXISTS audit_logs_read_admin ON public.audit_logs;
CREATE POLICY audit_logs_read_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_establishment_admin()
      AND establishment_id = public.current_establishment_id()
    )
  );

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR establishment_id = public.current_establishment_id()
  );

-- ==========================================
-- 6. RÉFÉRENCES MÉTIER SÉQUENTIELLES (TD02 §8)
-- ==========================================
-- Remplace RANDOM() : « uniques ; séquentielles ; non modifiables ; permanentes ».

CREATE SEQUENCE IF NOT EXISTS public.seq_ref_patients          AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_appointments      AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_consultations     AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_prescriptions     AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_hospitalizations  AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_pharmacy_items    AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_lab_orders        AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_imaging_orders    AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_invoices          AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_payments          AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_employees         AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_establishments    AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_profiles          AS BIGINT START 1;

CREATE OR REPLACE FUNCTION public.generate_business_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prefix TEXT;
  v_seq    TEXT;
BEGIN
  IF NEW.business_reference IS NOT NULL AND NEW.business_reference <> '' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'patients'         THEN v_prefix := 'MORA-PAT-'; v_seq := 'public.seq_ref_patients';
    WHEN 'appointments'     THEN v_prefix := 'MORA-RDV-'; v_seq := 'public.seq_ref_appointments';
    WHEN 'consultations'    THEN v_prefix := 'MORA-CON-'; v_seq := 'public.seq_ref_consultations';
    WHEN 'prescriptions'    THEN v_prefix := 'MORA-ORD-'; v_seq := 'public.seq_ref_prescriptions';
    WHEN 'hospitalizations' THEN v_prefix := 'MORA-HOS-'; v_seq := 'public.seq_ref_hospitalizations';
    WHEN 'pharmacy_items'   THEN v_prefix := 'MORA-PHA-'; v_seq := 'public.seq_ref_pharmacy_items';
    WHEN 'lab_orders'       THEN v_prefix := 'MORA-LAB-'; v_seq := 'public.seq_ref_lab_orders';
    WHEN 'imaging_orders'   THEN v_prefix := 'MORA-IMG-'; v_seq := 'public.seq_ref_imaging_orders';
    WHEN 'invoices'         THEN v_prefix := 'MORA-FAC-'; v_seq := 'public.seq_ref_invoices';
    WHEN 'payments'         THEN v_prefix := 'MORA-PAY-'; v_seq := 'public.seq_ref_payments';
    WHEN 'employees'        THEN v_prefix := 'MORA-EMP-'; v_seq := 'public.seq_ref_employees';
    WHEN 'establishments'   THEN v_prefix := 'MORA-EST-'; v_seq := 'public.seq_ref_establishments';
    WHEN 'profiles'         THEN v_prefix := 'MORA-USR-'; v_seq := 'public.seq_ref_profiles';
    ELSE
      RAISE EXCEPTION 'generate_business_ref: aucune séquence définie pour la table %', TG_TABLE_NAME;
  END CASE;

  NEW.business_reference := v_prefix || LPAD(nextval(v_seq::regclass)::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- Immuabilité des références métier (TD02 §8 : « non modifiables ; permanentes »)
CREATE OR REPLACE FUNCTION public.prevent_business_ref_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.business_reference IS DISTINCT FROM OLD.business_reference THEN
    RAISE EXCEPTION
      'La référence métier est non modifiable (TD02 §8). Valeur d''origine : %',
      OLD.business_reference;
  END IF;
  RETURN NEW;
END;
$$;

-- ==========================================
-- 7. TRIGGER updated_at (TD05 §9)
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
  ref_tables TEXT[] := ARRAY[
    'patients', 'appointments', 'consultations', 'prescriptions',
    'hospitalizations', 'pharmacy_items', 'lab_orders', 'imaging_orders',
    'invoices', 'payments', 'employees', 'establishments', 'profiles'
  ];
BEGIN
  FOREACH t IN ARRAY ref_tables LOOP
    -- Immuabilité de la référence métier
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_ref_immutable ON public.%I', t, t);
    EXECUTE format($f$
      CREATE TRIGGER trig_%s_ref_immutable
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.prevent_business_ref_update()
    $f$, t, t);

    -- Mise à jour automatique de updated_at
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated_at ON public.%I', t, t);
    EXECUTE format($f$
      CREATE TRIGGER trig_%s_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $f$, t, t);
  END LOOP;
END $$;

-- ==========================================
-- 8. INDEX (TD02 §16)
-- ==========================================
-- « Les index sont créés sur : UUID ; références métier ; clés étrangères ;
--   dates ; recherches fréquentes ; colonnes de filtrage. »
-- business_reference est déjà indexé par sa contrainte UNIQUE.

CREATE INDEX IF NOT EXISTS idx_profiles_establishment        ON public.profiles(establishment_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role                 ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_patients_establishment        ON public.patients(establishment_id);
CREATE INDEX IF NOT EXISTS idx_patients_names                ON public.patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone                ON public.patients(phone);

CREATE INDEX IF NOT EXISTS idx_appointments_establishment    ON public.appointments(establishment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient          ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor           ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date             ON public.appointments(appointment_date);

CREATE INDEX IF NOT EXISTS idx_consultations_establishment   ON public.consultations(establishment_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient         ON public.consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor          ON public.consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date            ON public.consultations(consultation_date);

CREATE INDEX IF NOT EXISTS idx_prescriptions_establishment   ON public.prescriptions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient         ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation    ON public.prescriptions(consultation_id);

CREATE INDEX IF NOT EXISTS idx_hospitalizations_establishment ON public.hospitalizations(establishment_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_patient       ON public.hospitalizations(patient_id);
CREATE INDEX IF NOT EXISTS idx_hospitalizations_status        ON public.hospitalizations(status);

CREATE INDEX IF NOT EXISTS idx_pharmacy_items_establishment  ON public.pharmacy_items(establishment_id);

CREATE INDEX IF NOT EXISTS idx_lab_orders_establishment      ON public.lab_orders(establishment_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient            ON public.lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status             ON public.lab_orders(status);

CREATE INDEX IF NOT EXISTS idx_imaging_orders_establishment  ON public.imaging_orders(establishment_id);
CREATE INDEX IF NOT EXISTS idx_imaging_orders_patient        ON public.imaging_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_orders_status         ON public.imaging_orders(status);

CREATE INDEX IF NOT EXISTS idx_invoices_establishment        ON public.invoices(establishment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient              ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status               ON public.invoices(status);

CREATE INDEX IF NOT EXISTS idx_payments_establishment        ON public.payments(establishment_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice              ON public.payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_employees_establishment       ON public.employees(establishment_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile             ON public.employees(profile_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_establishment      ON public.audit_logs(establishment_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user               ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created            ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread     ON public.notifications(user_id, is_read);

-- Soft delete (TD02 §12) : index partiels sur les lignes vivantes uniquement
CREATE INDEX IF NOT EXISTS idx_patients_active
  ON public.patients(establishment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consultations_active
  ON public.consultations(establishment_id) WHERE deleted_at IS NULL;

-- ==========================================
-- 9. CONTRAINTE D'UNICITÉ MÉTIER
-- ==========================================
-- Un même établissement ne peut pas avoir deux clés de paramètre identiques.
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_unique_key
  ON public.system_settings(establishment_id, key);

-- ==========================================
-- 10. CRÉATION AUTOMATIQUE DU PROFIL (Supabase Auth → public.profiles)
-- ==========================================
-- profiles.id référence auth.users(id). Sans ce trigger, un compte créé dans
-- Supabase Auth n'aurait aucun profil : la connexion réussirait mais
-- l'application serait incapable de déterminer le rôle et l'établissement.
--
-- Les attributs proviennent des métadonnées fournies à la création du compte
-- par un administrateur (BP05 : les comptes ne sont jamais auto-créés par
-- l'utilisateur final). Le rôle par défaut est le moins privilégié.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role public.user_role_type;
BEGIN
  -- Rôle demandé dans les métadonnées, sinon 'patient' (moindre privilège).
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::public.user_role_type;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'patient';
  END;

  INSERT INTO public.profiles (
    id, username, email, first_name, last_name, phone, role, establishment_id, is_active
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone',
    v_role,
    NULLIF(NEW.raw_user_meta_data->>'establishment_id', '')::UUID,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_on_auth_user_created ON auth.users;
CREATE TRIGGER trig_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
