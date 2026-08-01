-- MORACare Enterprise - Amorçage du référentiel officiel
-- Version: 2.0.1
--
-- Ce fichier ne contient AUCUNE donnée fictive : uniquement le référentiel
-- normatif extrait de la documentation officielle.
--
-- Traçabilité :
--   * modules            → BP12 §4 « Liste des modules » (+ BP25, BP30)
--   * plans              → BP09 §4 « Les plans disponibles »
--   * permissions        → UG01 à UG10, section « Rôle » de chaque guide
--
-- Idempotent : réexécutable sans effet de bord.

-- ==========================================
-- 1. MODULES (BP12 §4)
-- ==========================================
-- Colonnes : code, nom, blueprint, is_core, espace, ordre
INSERT INTO public.modules (code, name, description, blueprint_reference, is_core, workspace, display_order)
VALUES
  -- BP12 §4 « Administration » : Tableau de bord, Utilisateurs, Rôles,
  -- Permissions, Paramètres, Journalisation. Non désactivables : sans eux la
  -- plateforme ne peut plus être ni utilisée ni auditée.
  ('dashboard',        'Tableau de bord',            'Vue synthétique de l''activité',                'BP-012', true,  'establishment',  10),
  ('user_management',  'Utilisateurs & Rôles',       'Comptes, rôles et habilitations',               'BP-026A', true, 'establishment',  20),
  ('settings',         'Paramètres & Audit',         'Configuration, gouvernance et journalisation',  'BP-028A', true, 'establishment',  30),

  -- Modules métier, désactivables (BP12 §7, BP28A §12)
  ('patients',         'Gestion des Patients',       'Dossier médical partagé',                       'BP-013', false, 'establishment',  40),
  ('appointments',     'Rendez-vous',                'Agenda et planification',                       'BP-014', false, 'establishment',  50),
  ('consultations',    'Consultations',              'Consultations, diagnostics et prescriptions',   'BP-015', false, 'establishment',  60),
  ('hospitalizations', 'Hospitalisation',            'Admissions, chambres, lits et sorties',         'BP-016', false, 'establishment',  70),
  ('pharmacy',         'Pharmacie',                  'Médicaments, stock et dispensation',            'BP-019', false, 'establishment',  80),
  ('laboratory',       'Laboratoire',                'Demandes, analyses et résultats',               'BP-020', false, 'establishment',  90),
  ('imaging',          'Imagerie Médicale',          'Examens, résultats et archivage',               'BP-021', false, 'establishment', 100),
  ('finance',          'Finance & Facturation',      'Facturation, paiements et caisses',             'BP-022A', false, 'establishment', 110),
  ('hr',               'Ressources Humaines',        'Personnel, présences et paie',                  'BP-023A', false, 'establishment', 120),
  ('reports',          'Rapports & Statistiques',    'États, KPI et business intelligence',           'BP-024A', false, 'establishment', 130),
  ('ged',              'GED & Archivage',            'Gestion documentaire et archivage',             'BP-025', false, 'establishment', 140),

  -- Espace patient (BP29) et espace plateforme (BP30)
  ('patient_portal',   'Portail Patient',            'Espace personnel du patient',                   'BP-029', false, 'portal',        150),
  ('saas_platform',    'Plateforme SaaS',            'Établissements clients, abonnements, licences', 'BP-030', true,  'platform',      160)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      blueprint_reference = EXCLUDED.blueprint_reference,
      is_core = EXCLUDED.is_core,
      workspace = EXCLUDED.workspace,
      display_order = EXCLUDED.display_order;

-- ==========================================
-- 2. PLANS D'ABONNEMENT (BP09 §4)
-- ==========================================
-- Aucun tarif : la documentation n'en fixe aucun (BP09, BP30, LP-001 §7
-- « Ne pas afficher de prix »).
--
-- Les limites (max_users, max_patients, storage_mb) restent NULL : BP09 §10
-- établit qu'un plan « peut définir des limites » mais n'en chiffre aucune.
-- Elles sont donc paramétrables par le Super Admin, jamais inventées ici.
INSERT INTO public.subscription_plans
  (code, name, description, duration_days, is_automatic, requires_approval, requires_payment, display_order)
VALUES
  ('essai',    'Essai',    'Découverte complète de MORACare.',                    3,    true,  false, false, 10),
  ('gratuit',  'Gratuit',  'Version permanente avec limitations.',                NULL, false, true,  false, 20),
  ('standard', 'Standard', 'Version destinée aux petits établissements.',         NULL, false, false, true,  30),
  ('business', 'Business', 'Version destinée aux établissements en croissance.',  NULL, false, false, true,  40),
  ('vip',      'VIP',      'Version complète. Toutes les fonctionnalités disponibles.', NULL, false, false, true, 50)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      duration_days = EXCLUDED.duration_days,
      is_automatic = EXCLUDED.is_automatic,
      requires_approval = EXCLUDED.requires_approval,
      requires_payment = EXCLUDED.requires_payment,
      display_order = EXCLUDED.display_order;

-- ------------------------------------------------------------------
-- Composition des plans (BP09 BR-006 « Les modules dépendent de la formule »)
--
-- Seuls DEUX plans ont une composition documentée :
--   * Essai — « Découverte complète de MORACare » (BP09 §4)
--   * VIP   — « Toutes les fonctionnalités disponibles » (BP09 §4)
--
-- Pour Gratuit, Standard et Business, BP09 mentionne des limitations sans
-- jamais dire lesquelles. Rien n'est donc inscrit ici : leur composition est
-- à définir par le Super Admin depuis le module Paramètres.
--
-- Un plan sans composition est traité par l'application comme « non encore
-- configuré » : tous les modules restent accessibles et l'interface affiche
-- un avertissement. Inventer des restrictions aurait été une décision
-- commerciale, pas une décision technique.
-- ------------------------------------------------------------------
INSERT INTO public.plan_modules (plan_id, module_id)
SELECT p.id, m.id
FROM public.subscription_plans p
CROSS JOIN public.modules m
WHERE p.code IN ('essai', 'vip')
  AND m.workspace = 'establishment'
ON CONFLICT DO NOTHING;

-- ==========================================
-- 3. MATRICE DES PERMISSIONS (UG01 → UG10)
-- ==========================================
-- Chaque ligne est justifiée par le guide utilisateur du rôle concerné.
-- Aucune permission n'est codée en dur dans l'application.

CREATE OR REPLACE FUNCTION public.seed_role_permission(
  p_role TEXT, p_module TEXT, p_view BOOLEAN, p_create BOOLEAN, p_update BOOLEAN, p_delete BOOLEAN
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_module_id UUID;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE code = p_module;
  IF v_module_id IS NULL THEN
    RAISE EXCEPTION 'seed_role_permission : module % introuvable', p_module;
  END IF;

  INSERT INTO public.role_permissions (role, module_id, can_view, can_create, can_update, can_delete)
  VALUES (p_role::public.user_role_type, v_module_id, p_view, p_create, p_update, p_delete)
  ON CONFLICT (role, module_id) DO UPDATE
    SET can_view = EXCLUDED.can_view,
        can_create = EXCLUDED.can_create,
        can_update = EXCLUDED.can_update,
        can_delete = EXCLUDED.can_delete;
END;
$$;

DO $$
BEGIN
  -- ---- SUPER ADMIN (UG01, BP06 §10 bis) --------------------------------
  -- « L'administrateur n'intervient pas dans les activités médicales
  --   quotidiennes des établissements. » Aucun module de soins.
  PERFORM public.seed_role_permission('super_admin', 'saas_platform',   true, true, true, true);
  PERFORM public.seed_role_permission('super_admin', 'settings',        true, true, true, true);
  PERFORM public.seed_role_permission('super_admin', 'user_management', true, true, true, true);

  -- ---- RESPONSABLE D'ÉTABLISSEMENT (UG02) ------------------------------
  PERFORM public.seed_role_permission('establishment_admin', 'dashboard',        true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'user_management',  true,  true,  true,  true);
  PERFORM public.seed_role_permission('establishment_admin', 'settings',         true,  true,  true,  false);
  PERFORM public.seed_role_permission('establishment_admin', 'patients',         true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'appointments',     true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'consultations',    true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'hospitalizations', true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'pharmacy',         true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'laboratory',       true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'imaging',          true,  false, false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'finance',          true,  true,  true,  false);
  PERFORM public.seed_role_permission('establishment_admin', 'hr',               true,  true,  true,  true);
  PERFORM public.seed_role_permission('establishment_admin', 'reports',          true,  true,  false, false);
  PERFORM public.seed_role_permission('establishment_admin', 'ged',              true,  true,  true,  false);

  -- ---- MÉDECIN (UG03) --------------------------------------------------
  PERFORM public.seed_role_permission('doctor', 'dashboard',        true, false, false, false);
  PERFORM public.seed_role_permission('doctor', 'patients',         true, true,  true,  false);
  PERFORM public.seed_role_permission('doctor', 'appointments',     true, true,  true,  false);
  PERFORM public.seed_role_permission('doctor', 'consultations',    true, true,  true,  false);
  PERFORM public.seed_role_permission('doctor', 'hospitalizations', true, true,  true,  false);
  PERFORM public.seed_role_permission('doctor', 'laboratory',       true, true,  true,  false);
  PERFORM public.seed_role_permission('doctor', 'imaging',          true, true,  true,  false);
  PERFORM public.seed_role_permission('doctor', 'pharmacy',         true, false, false, false);
  PERFORM public.seed_role_permission('doctor', 'ged',              true, true,  false, false);

  -- ---- INFIRMIER (UG04) ------------------------------------------------
  PERFORM public.seed_role_permission('nurse', 'dashboard',        true, false, false, false);
  PERFORM public.seed_role_permission('nurse', 'patients',         true, false, false, false);
  PERFORM public.seed_role_permission('nurse', 'appointments',     true, false, false, false);
  PERFORM public.seed_role_permission('nurse', 'consultations',    true, false, false, false);
  PERFORM public.seed_role_permission('nurse', 'hospitalizations', true, true,  true,  false);
  PERFORM public.seed_role_permission('nurse', 'pharmacy',         true, false, false, false);
  PERFORM public.seed_role_permission('nurse', 'ged',              true, false, false, false);

  -- ---- RÉCEPTIONNISTE (UG05) -------------------------------------------
  PERFORM public.seed_role_permission('receptionist', 'dashboard',        true, false, false, false);
  PERFORM public.seed_role_permission('receptionist', 'patients',         true, true,  true,  false);
  PERFORM public.seed_role_permission('receptionist', 'appointments',     true, true,  true,  false);
  PERFORM public.seed_role_permission('receptionist', 'hospitalizations', true, false, false, false);
  PERFORM public.seed_role_permission('receptionist', 'finance',          true, true,  true,  false);

  -- ---- PHARMACIEN (UG06) -----------------------------------------------
  PERFORM public.seed_role_permission('pharmacist', 'dashboard',     true, false, false, false);
  PERFORM public.seed_role_permission('pharmacist', 'patients',      true, false, false, false);
  PERFORM public.seed_role_permission('pharmacist', 'pharmacy',      true, true,  true,  true);
  PERFORM public.seed_role_permission('pharmacist', 'consultations', true, false, false, false);
  PERFORM public.seed_role_permission('pharmacist', 'ged',           true, false, false, false);

  -- ---- LABORATOIRE (UG07) ----------------------------------------------
  PERFORM public.seed_role_permission('lab_tech', 'dashboard',  true, false, false, false);
  PERFORM public.seed_role_permission('lab_tech', 'patients',   true, false, false, false);
  PERFORM public.seed_role_permission('lab_tech', 'laboratory', true, true,  true,  true);
  PERFORM public.seed_role_permission('lab_tech', 'ged',        true, false, false, false);

  -- ---- IMAGERIE (UG08) -------------------------------------------------
  PERFORM public.seed_role_permission('radiologist', 'dashboard', true, false, false, false);
  PERFORM public.seed_role_permission('radiologist', 'patients',  true, false, false, false);
  PERFORM public.seed_role_permission('radiologist', 'imaging',   true, true,  true,  true);
  PERFORM public.seed_role_permission('radiologist', 'ged',       true, false, false, false);

  -- ---- COMPTABLE (UG09) ------------------------------------------------
  PERFORM public.seed_role_permission('accountant', 'dashboard', true, false, false, false);
  PERFORM public.seed_role_permission('accountant', 'patients',  true, false, false, false);
  PERFORM public.seed_role_permission('accountant', 'finance',   true, true,  true,  true);
  PERFORM public.seed_role_permission('accountant', 'reports',   true, true,  false, false);
  PERFORM public.seed_role_permission('accountant', 'ged',       true, false, false, false);

  -- ---- PATIENT (UG10, BP29) --------------------------------------------
  -- Le patient ne dispose que de son portail : aucun module interne.
  PERFORM public.seed_role_permission('patient', 'patient_portal', true, false, false, false);
END $$;
