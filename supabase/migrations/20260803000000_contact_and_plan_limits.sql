-- MORACare Enterprise - Prises de contact et limites commerciales
-- Version: 2.4.0
--
-- Trois évolutions décidées par l'éditeur lors de la recette :
--   1. Table des prises de contact, alimentée par le formulaire de la vitrine
--   2. Statuts de traitement communs aux demandes et aux contacts
--   3. Limites commerciales exprimées en utilisateurs et en enregistrements
--      par module, en remplacement de la composition par formule

-- ==========================================
-- 1. PRISES DE CONTACT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.contact_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    processed_by UUID REFERENCES public.profiles(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.contact_requests IS
  'Messages du formulaire Contact de la Landing Page. Traités par le Super Admin.';

-- ==========================================
-- 2. STATUTS DE TRAITEMENT
-- ==========================================
-- Mêmes valeurs pour les demandes de démonstration et les prises de contact,
-- afin que les deux écrans se pilotent de la même façon.
DO $$ BEGIN
  ALTER TABLE public.contact_requests
    ADD CONSTRAINT contact_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'contacted', 'accepted', 'rejected', 'closed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.registration_requests
    ADD CONSTRAINT registration_requests_status_check
    CHECK (status IN ('pending', 'in_progress', 'contacted', 'accepted', 'rejected', 'closed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 3. RÉFÉRENCE MÉTIER
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_contact_requests AS BIGINT START 1;

CREATE OR REPLACE FUNCTION public.generate_contact_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.business_reference IS NULL OR NEW.business_reference = '' THEN
    NEW.business_reference := 'MORA-CTC-' ||
      LPAD(nextval('public.seq_ref_contact_requests'::regclass)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_contact_requests_ref ON public.contact_requests;
CREATE TRIGGER trig_contact_requests_ref
  BEFORE INSERT ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_contact_reference();

DROP TRIGGER IF EXISTS trig_contact_requests_updated_at ON public.contact_requests;
CREATE TRIGGER trig_contact_requests_updated_at
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 4. SÉCURITÉ
-- ==========================================
-- Comme les demandes d'inscription : dépôt par le serveur (clé secrète),
-- consultation et traitement réservés au Super Admin.
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_requests_admin ON public.contact_requests;
CREATE POLICY contact_requests_admin ON public.contact_requests
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE INDEX IF NOT EXISTS idx_contact_requests_status  ON public.contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created ON public.contact_requests(created_at DESC);

-- ==========================================
-- 5. LIMITES COMMERCIALES DES FORMULES
-- ==========================================
-- L'éditeur exprime désormais les limites en nombre d'utilisateurs et en
-- nombre d'enregistrements par module. La composition par formule disparaît :
-- tous les modules sont inclus, leur activation relevant des Paramètres de
-- l'établissement.
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_records_per_module INT;

COMMENT ON COLUMN public.subscription_plans.max_records_per_module IS
  'Enregistrements maximum par module. NULL = illimité.';

-- Tarifs inchangés ; seules les limites et les mentions changent.
UPDATE public.subscription_plans SET
  max_users = NULL, max_patients = NULL, max_records_per_module = NULL,
  highlights = ARRAY[
    'Découverte complète de MORACare',
    'Utilisateurs illimités',
    'Patients illimités',
    'Activation immédiate'
  ],
  limitations = ARRAY['Durée limitée à 3 jours']
WHERE code = 'essai';

UPDATE public.subscription_plans SET
  max_users = 2, max_patients = NULL, max_records_per_module = 5,
  highlights = ARRAY[
    'Gratuit de façon permanente',
    'Tous les modules disponibles',
    'Mises à jour incluses'
  ],
  limitations = ARRAY[
    'Validation obligatoire',
    '2 utilisateurs',
    '5 enregistrements par module'
  ]
WHERE code = 'gratuit';

UPDATE public.subscription_plans SET
  max_users = 5, max_patients = NULL, max_records_per_module = 50,
  highlights = ARRAY[
    'Pensé pour les petits établissements',
    'Tous les modules disponibles',
    'Assistance par e-mail'
  ],
  limitations = ARRAY['5 utilisateurs', '50 enregistrements par module']
WHERE code = 'standard';

UPDATE public.subscription_plans SET
  max_users = 10, max_patients = NULL, max_records_per_module = 100,
  highlights = ARRAY[
    'Pour les établissements en croissance',
    'Tous les modules disponibles',
    'Assistance prioritaire'
  ],
  limitations = ARRAY['10 utilisateurs', '100 enregistrements par module']
WHERE code = 'business';

UPDATE public.subscription_plans SET
  max_users = NULL, max_patients = NULL, max_records_per_module = NULL,
  highlights = ARRAY[
    'Toutes les fonctionnalités disponibles',
    'Utilisateurs illimités',
    'Enregistrements illimités',
    'Accompagnement dédié'
  ],
  limitations = ARRAY[]::TEXT[]
WHERE code = 'vip';

-- ==========================================
-- 6. TOUS LES MODULES POUR TOUTES LES FORMULES
-- ==========================================
-- Décision de l'éditeur : la formule ne restreint plus les modules. Le
-- pilotage se fait établissement par établissement, via `establishment_modules`.
DELETE FROM public.plan_modules;

INSERT INTO public.plan_modules (plan_id, module_id)
SELECT p.id, m.id
FROM public.subscription_plans p
CROSS JOIN public.modules m
WHERE m.workspace IN ('establishment', 'portal')
ON CONFLICT DO NOTHING;

-- Contrôle : aucune formule ne doit rester sans composition.
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
