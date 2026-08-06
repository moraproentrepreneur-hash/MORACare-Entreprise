-- MORACare Enterprise - Identité complète de l'établissement
-- Version: 2.7.0
--
-- Les Paramètres d'un établissement ne portaient que les six champs saisis par
-- le Super Admin à la création. Cette migration leur adjoint l'identité
-- institutionnelle complète, telle que la décrivent :
--
--   BP28A §5  — nom officiel, nom commercial, logo, site web, numéro
--               d'identification ; §3 — langue, devise, fuseau horaire
--   BP28C §4  — identité visuelle : couleurs, slogan, mentions légales
--   BP28C §11 — signature numérisée et cachet institutionnel
--   UG02 §16  — logo, coordonnées, horaires, spécialités
--
-- Les fichiers (logo, bannière, signature, cachet) ne sont pas stockés en base :
-- seules leurs URL le sont. Les binaires vont dans Supabase Storage, dont les
-- politiques isolent chaque établissement dans son propre dossier.

-- ==========================================
-- 1. IDENTITÉ
-- ==========================================
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS short_name VARCHAR(80),
  ADD COLUMN IF NOT EXISTS slogan VARCHAR(255),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

COMMENT ON COLUMN public.establishments.legal_name IS
  'Nom officiel, tel qu''il figure sur les documents administratifs (BP28A §5).';
COMMENT ON COLUMN public.establishments.short_name IS
  'Nom abrégé ou commercial, utilisé dans les espaces contraints (BP28A §5).';

-- ==========================================
-- 2. INFORMATIONS LÉGALES
-- ==========================================
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS authorization_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS trade_register VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS legal_mentions TEXT;

COMMENT ON COLUMN public.establishments.authorization_number IS
  'Numéro d''autorisation d''exercer délivré par l''autorité de santé.';
COMMENT ON COLUMN public.establishments.tax_id IS
  'Identifiant fiscal (NIF). Reporté sur les factures.';

-- ==========================================
-- 3. COORDONNÉES ÉTENDUES
-- ==========================================
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(50),
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50),
  ADD COLUMN IF NOT EXISTS support_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS island VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

COMMENT ON COLUMN public.establishments.island IS
  'Île de rattachement. Le découpage administratif comorien la distingue de la ville.';

DO $$ BEGIN
  ALTER TABLE public.establishments
    ADD CONSTRAINT establishments_coordinates_check
    CHECK (
      (latitude IS NULL AND longitude IS NULL)
      OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 4. PRÉFÉRENCES RÉGIONALES
-- ==========================================
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'KMF',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(60) NOT NULL DEFAULT 'Indian/Comoro',
  ADD COLUMN IF NOT EXISTS locale VARCHAR(10) NOT NULL DEFAULT 'fr';

DO $$ BEGIN
  ALTER TABLE public.establishments
    ADD CONSTRAINT establishments_locale_check CHECK (locale IN ('fr', 'en'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- 5. ORGANISATION
-- ==========================================
-- Les horaires sont un objet et non sept colonnes : le jour est une donnée, pas
-- une structure. Ajouter une fermeture exceptionnelle ne demandera pas de
-- migration.
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.establishments.opening_hours IS
  'Horaires par jour : { "monday": { "closed": false, "open": "08:00", "close": "17:00" }, … }';
COMMENT ON COLUMN public.establishments.specialties IS
  'Spécialités proposées par l''établissement (UG02 §16).';

-- ==========================================
-- 6. DOCUMENTS ET IDENTITÉ VISUELLE
-- ==========================================
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(9) NOT NULL DEFAULT '#003366',
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(9) NOT NULL DEFAULT '#00A859',
  ADD COLUMN IF NOT EXISTS pdf_header TEXT,
  ADD COLUMN IF NOT EXISTS pdf_footer TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_holder VARCHAR(200),
  ADD COLUMN IF NOT EXISTS stamp_url TEXT;

COMMENT ON COLUMN public.establishments.pdf_header IS
  'Mentions portées en tête des documents générés (BP28C §5).';
COMMENT ON COLUMN public.establishments.signature_holder IS
  'Nom et qualité du signataire, imprimés sous la signature.';

DO $$ BEGIN
  ALTER TABLE public.establishments
    ADD CONSTRAINT establishments_colors_check
    CHECK (
      primary_color ~* '^#[0-9a-f]{6}([0-9a-f]{2})?$'
      AND secondary_color ~* '^#[0-9a-f]{6}([0-9a-f]{2})?$'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Le nom officiel reprend le nom d'usage tant qu'il n'a pas été précisé : un
-- document généré ne doit jamais sortir sans raison sociale.
UPDATE public.establishments SET legal_name = name WHERE legal_name IS NULL;

-- ==========================================
-- 7. STOCKAGE DES FICHIERS D'IDENTITÉ
-- ==========================================
-- Un seul compartiment, en lecture publique : ces images figurent sur des
-- documents remis aux patients et dans des PDF, qui ne portent pas de session.
-- L'écriture, elle, est strictement cloisonnée.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'establishment-assets',
  'establishment-assets',
  TRUE,
  2097152, -- 2 Mio : un logo qui dépasse ralentit chaque document produit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

/*
 * Cloisonnement par dossier.
 *
 * Le premier segment du chemin est l'identifiant de l'établissement. Un
 * responsable n'écrit donc que dans le sien, et ne peut ni remplacer ni
 * supprimer le logo d'un confrère — ce qui, sur des documents médicaux
 * remis aux patients, relèverait de l'usurpation.
 */
DROP POLICY IF EXISTS establishment_assets_read ON storage.objects;
CREATE POLICY establishment_assets_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'establishment-assets');

DROP POLICY IF EXISTS establishment_assets_write ON storage.objects;
CREATE POLICY establishment_assets_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'establishment-assets'
    AND (
      public.is_super_admin()
      OR (
        public.is_establishment_admin()
        AND (storage.foldername(name))[1] = public.current_establishment_id()::TEXT
      )
    )
  );

DROP POLICY IF EXISTS establishment_assets_update ON storage.objects;
CREATE POLICY establishment_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'establishment-assets'
    AND (
      public.is_super_admin()
      OR (
        public.is_establishment_admin()
        AND (storage.foldername(name))[1] = public.current_establishment_id()::TEXT
      )
    )
  );

DROP POLICY IF EXISTS establishment_assets_delete ON storage.objects;
CREATE POLICY establishment_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'establishment-assets'
    AND (
      public.is_super_admin()
      OR (
        public.is_establishment_admin()
        AND (storage.foldername(name))[1] = public.current_establishment_id()::TEXT
      )
    )
  );

-- ==========================================
-- 8. ÉCRITURE DES PARAMÈTRES PAR LE RESPONSABLE
-- ==========================================
-- La politique existante réservait toute écriture sur `establishments` au Super
-- Admin. Le responsable doit pouvoir tenir à jour l'identité de SON
-- établissement (UG02 §16) — sans jamais toucher aux colonnes commerciales,
-- protégées ci-dessous par un trigger.
DROP POLICY IF EXISTS establishments_admin_update_own ON public.establishments;
CREATE POLICY establishments_admin_update_own ON public.establishments
  FOR UPDATE TO authenticated
  USING (public.is_establishment_admin() AND id = public.current_establishment_id())
  WITH CHECK (public.is_establishment_admin() AND id = public.current_establishment_id());

/*
 * Un responsable ne se vend pas une formule à lui-même.
 *
 * RLS raisonne par ligne, pas par colonne : autoriser la mise à jour de la
 * ligne autoriserait aussi `subscription_status` ou `max_users`. Ce trigger
 * restitue les valeurs commerciales dès qu'un autre qu'un Super Admin tente de
 * les modifier — la mise à jour réussit, mais ces colonnes ne bougent pas.
 */
CREATE OR REPLACE FUNCTION public.protect_establishment_commercials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  NEW.subscription_status := OLD.subscription_status;
  NEW.subscription_plan   := OLD.subscription_plan;
  NEW.max_users           := OLD.max_users;
  NEW.is_active           := OLD.is_active;
  NEW.business_reference  := OLD.business_reference;
  NEW.deleted_at          := OLD.deleted_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_establishments_protect_commercials ON public.establishments;
CREATE TRIGGER trig_establishments_protect_commercials
  BEFORE UPDATE ON public.establishments
  FOR EACH ROW EXECUTE FUNCTION public.protect_establishment_commercials();

COMMENT ON FUNCTION public.protect_establishment_commercials() IS
  'Empêche un responsable de modifier les colonnes commerciales de son établissement.';
