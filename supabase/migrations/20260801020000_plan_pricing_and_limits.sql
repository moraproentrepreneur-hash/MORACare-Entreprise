-- MORACare Enterprise - Tarification officielle et configuration des formules
-- Version: 2.1.0
-- Références : BP09 §4 (les cinq formules), BP09 §10 (limites), BP30 §7
--
-- Les cinq formules restent celles de BP09 §4. Cette migration leur ajoute les
-- tarifs officiels arrêtés par MORA Shawiri et la configuration exploitable
-- automatiquement par le système.
--
-- TARIFS OFFICIELS (décision de l'éditeur, août 2026) :
--   Essai     : 0 KMF
--   Gratuit   : 0 KMF / mois
--   Standard  : 5 000 KMF / mois
--   Business  : 10 000 KMF / mois
--   VIP       : 15 000 KMF / mois

-- ==========================================
-- 1. COLONNES DE TARIFICATION ET DE CONFIGURATION
-- ==========================================
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS price_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_currency    VARCHAR(10)   NOT NULL DEFAULT 'KMF',
  -- 'month' = facturation mensuelle ; NULL = sans récurrence (Essai)
  ADD COLUMN IF NOT EXISTS billing_period    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS support_level     VARCHAR(120),
  ADD COLUMN IF NOT EXISTS backup_frequency  VARCHAR(120),
  -- Durée de conservation des données archivées, en jours
  ADD COLUMN IF NOT EXISTS retention_days    INT,
  -- Contenus affichés sur les cartes : stockés en base, jamais dans l'interface
  ADD COLUMN IF NOT EXISTS highlights        TEXT[],
  ADD COLUMN IF NOT EXISTS limitations       TEXT[],
  ADD COLUMN IF NOT EXISTS cta_label         VARCHAR(80),
  -- Met une formule en avant sur la Landing Page
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.subscription_plans.price_amount IS
  'Tarif officiel MORACare. 0 pour les formules Essai et Gratuit.';
COMMENT ON COLUMN public.subscription_plans.highlights IS
  'Avantages affichés sur la carte. Pilotés par la base pour rester modifiables sans redéploiement.';

-- ==========================================
-- 2. CONFIGURATION DES CINQ FORMULES
-- ==========================================
-- max_users / max_patients : NULL signifie « sans limite ».
--
-- NOTE D'ARBITRAGE — les tarifs sont fournis par l'éditeur. En revanche les
-- quotas (utilisateurs, patients, stockage), le niveau de support, la fréquence
-- des sauvegardes et la durée de conservation ne figurent dans AUCUN document :
-- BP09 §10 établit que « chaque formule peut définir des limites » sans en
-- chiffrer aucune. Les valeurs ci-dessous constituent une proposition cohérente
-- soumise à validation, pas une exigence documentaire.

UPDATE public.subscription_plans SET
  price_amount     = 0,
  price_currency   = 'KMF',
  billing_period   = NULL,
  max_users        = 5,
  max_patients     = 50,
  storage_mb       = 512,
  support_level    = 'Assistance par e-mail',
  backup_frequency = 'Hebdomadaire',
  retention_days   = 30,
  cta_label        = 'Démarrer l''essai',
  is_featured      = false,
  highlights = ARRAY[
    'Découverte complète de MORACare',
    'Tous les modules accessibles',
    'Activation immédiate, sans validation',
    'Aucun moyen de paiement requis'
  ],
  limitations = ARRAY[
    'Durée limitée à 3 jours',
    '5 utilisateurs maximum',
    '50 patients maximum',
    '512 Mo de stockage'
  ]
WHERE code = 'essai';

UPDATE public.subscription_plans SET
  price_amount     = 0,
  price_currency   = 'KMF',
  billing_period   = 'month',
  max_users        = 2,
  max_patients     = 100,
  storage_mb       = 1024,
  support_level    = 'Documentation en ligne',
  backup_frequency = 'Hebdomadaire',
  retention_days   = 90,
  cta_label        = 'Demander l''accès',
  is_featured      = false,
  highlights = ARRAY[
    'Gratuit de façon permanente',
    'Dossiers patients et rendez-vous',
    'Consultations et prescriptions',
    'Mises à jour incluses'
  ],
  limitations = ARRAY[
    'Activation soumise à validation',
    '2 utilisateurs maximum',
    '100 patients maximum',
    'Modules avancés non inclus'
  ]
WHERE code = 'gratuit';

UPDATE public.subscription_plans SET
  price_amount     = 5000,
  price_currency   = 'KMF',
  billing_period   = 'month',
  max_users        = 10,
  max_patients     = 2000,
  storage_mb       = 5120,
  support_level    = 'Assistance par e-mail sous 48 h',
  backup_frequency = 'Quotidienne',
  retention_days   = 365,
  cta_label        = 'Choisir Standard',
  is_featured      = false,
  highlights = ARRAY[
    'Pensé pour les petits établissements',
    'Pharmacie et laboratoire inclus',
    'Facturation et encaissements',
    'Gestion documentaire et archivage'
  ],
  limitations = ARRAY[
    '10 utilisateurs maximum',
    '2 000 patients maximum',
    'Imagerie et hospitalisation non incluses'
  ]
WHERE code = 'standard';

UPDATE public.subscription_plans SET
  price_amount     = 10000,
  price_currency   = 'KMF',
  billing_period   = 'month',
  max_users        = 30,
  max_patients     = 10000,
  storage_mb       = 20480,
  support_level    = 'Assistance prioritaire sous 24 h',
  backup_frequency = 'Quotidienne',
  retention_days   = 1095,
  cta_label        = 'Choisir Business',
  is_featured      = true,
  highlights = ARRAY[
    'Pour les établissements en croissance',
    'Hospitalisation et imagerie médicale',
    'Ressources humaines et plannings',
    'Rapports et tableaux de bord'
  ],
  limitations = ARRAY[
    '30 utilisateurs maximum',
    '10 000 patients maximum'
  ]
WHERE code = 'business';

UPDATE public.subscription_plans SET
  price_amount     = 15000,
  price_currency   = 'KMF',
  billing_period   = 'month',
  max_users        = NULL,
  max_patients     = NULL,
  storage_mb       = 102400,
  support_level    = 'Accompagnement dédié',
  backup_frequency = 'Quotidienne avec restauration à la demande',
  retention_days   = 3650,
  cta_label        = 'Choisir VIP',
  is_featured      = false,
  highlights = ARRAY[
    'Toutes les fonctionnalités disponibles',
    'Utilisateurs et patients illimités',
    'Portail Patient inclus',
    'Accompagnement dédié'
  ],
  limitations = ARRAY[]::TEXT[]
WHERE code = 'vip';

-- ==========================================
-- 3. COMPOSITION DES FORMULES
-- ==========================================
-- Plus aucune formule ne reste « non configurée ».
--
-- Deux compositions sont documentées par BP09 §4 :
--   * Essai — « Découverte complète de MORACare » → tous les modules
--   * VIP   — « Toutes les fonctionnalités disponibles » → tous les modules
--
-- Les trois autres suivent la progression commerciale proposée ci-dessus.

-- Repartir d'une base propre : cette migration fait autorité sur la composition.
DELETE FROM public.plan_modules;

/** Essai et VIP : tous les modules de l'espace établissement + portail. */
INSERT INTO public.plan_modules (plan_id, module_id)
SELECT p.id, m.id
FROM public.subscription_plans p
CROSS JOIN public.modules m
WHERE p.code IN ('essai', 'vip')
  AND m.workspace IN ('establishment', 'portal')
ON CONFLICT DO NOTHING;

/** Gratuit : socle administratif et parcours de soins élémentaire. */
INSERT INTO public.plan_modules (plan_id, module_id)
SELECT p.id, m.id
FROM public.subscription_plans p
CROSS JOIN public.modules m
WHERE p.code = 'gratuit'
  AND m.code IN ('dashboard', 'user_management', 'settings', 'patients', 'appointments', 'consultations')
ON CONFLICT DO NOTHING;

/** Standard : Gratuit + pharmacie, laboratoire, facturation, GED. */
INSERT INTO public.plan_modules (plan_id, module_id)
SELECT p.id, m.id
FROM public.subscription_plans p
CROSS JOIN public.modules m
WHERE p.code = 'standard'
  AND m.code IN (
    'dashboard', 'user_management', 'settings', 'patients', 'appointments',
    'consultations', 'pharmacy', 'laboratory', 'finance', 'ged'
  )
ON CONFLICT DO NOTHING;

/** Business : Standard + hospitalisation, imagerie, RH, rapports. */
INSERT INTO public.plan_modules (plan_id, module_id)
SELECT p.id, m.id
FROM public.subscription_plans p
CROSS JOIN public.modules m
WHERE p.code = 'business'
  AND m.code IN (
    'dashboard', 'user_management', 'settings', 'patients', 'appointments',
    'consultations', 'pharmacy', 'laboratory', 'finance', 'ged',
    'hospitalizations', 'imaging', 'hr', 'reports'
  )
ON CONFLICT DO NOTHING;

-- ==========================================
-- 4. LECTURE PUBLIQUE DES FORMULES
-- ==========================================
-- La Landing Page présente les formules à des visiteurs non authentifiés
-- (LP-001 §1 : « Accessible uniquement aux visiteurs »). Les plans et leur
-- composition sont des informations commerciales publiques : leur lecture est
-- ouverte au rôle `anon`.
--
-- L'écriture reste strictement réservée au Super Admin : les politiques
-- `plans_write` et `plan_modules_write` sont inchangées.

DROP POLICY IF EXISTS plans_read_public ON public.subscription_plans;
CREATE POLICY plans_read_public ON public.subscription_plans
  FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS plan_modules_read_public ON public.plan_modules;
CREATE POLICY plan_modules_read_public ON public.plan_modules
  FOR SELECT TO anon
  USING (true);

-- Le nom des modules est nécessaire pour détailler chaque carte.
DROP POLICY IF EXISTS modules_read_public ON public.modules;
CREATE POLICY modules_read_public ON public.modules
  FOR SELECT TO anon
  USING (true);

-- ==========================================
-- 5. CONTRÔLE D'INTÉGRITÉ
-- ==========================================
-- Aucune formule ne doit rester sans composition : une formule vide
-- désactiverait silencieusement tous les modules de ses établissements.
DO $$
DECLARE
  v_empty TEXT;
BEGIN
  SELECT string_agg(p.code, ', ') INTO v_empty
  FROM public.subscription_plans p
  WHERE NOT EXISTS (SELECT 1 FROM public.plan_modules pm WHERE pm.plan_id = p.id);

  IF v_empty IS NOT NULL THEN
    RAISE EXCEPTION 'Formules sans composition : %', v_empty;
  END IF;
END $$;
