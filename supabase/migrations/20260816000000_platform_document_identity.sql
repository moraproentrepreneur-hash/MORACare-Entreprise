-- MORACare Enterprise - Identité documentaire de la plateforme (BP28C, BP30)
-- Version: 3.5.0
--
-- Contexte
-- --------
-- Les documents émis par l'éditeur — au premier rang desquels les factures
-- d'abonnement — n'avaient aucun émetteur. Le moteur documentaire ne connaît
-- que l'identité d'un établissement, et le Super Admin n'appartient à aucun :
-- toute génération depuis sa console échouait sur « Aucun établissement n'est
-- rattaché à votre compte ». C'est la cause du défaut de téléchargement
-- constaté en recette, et non un problème d'affichage.
--
-- Cette migration donne à la plateforme sa propre identité documentaire,
-- strictement séparée de celle des établissements.
--
-- Portée des droits
-- -----------------
-- L'écriture est réservée au Super Admin. La lecture est ouverte à tout compte
-- authentifié, et c'est délibéré : la facture d'abonnement qu'un responsable
-- télécharge depuis son espace est émise par MORA Shawiri, elle doit donc
-- porter l'en-tête de l'éditeur. Sans droit de lecture, l'établissement
-- obtiendrait un document sans émetteur — ou pire, à son propre nom, ce qui
-- laisserait croire qu'il s'est facturé lui-même.

CREATE TABLE IF NOT EXISTS public.platform_identity (
  -- Table à ligne unique : la plateforme n'a qu'une identité. La contrainte
  -- ci-dessous l'impose plutôt que de s'en remettre à la discipline du code.
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  singleton BOOLEAN NOT NULL DEFAULT TRUE,

  -- Identité
  name VARCHAR(200) NOT NULL DEFAULT 'MORACare Enterprise',
  legal_name VARCHAR(200) NOT NULL DEFAULT 'MORA Shawiri',
  short_name VARCHAR(60) NOT NULL DEFAULT 'MORACare',
  slogan VARCHAR(200) NOT NULL DEFAULT '',
  logo_url TEXT NOT NULL DEFAULT '',

  -- Informations légales de l'éditeur
  authorization_number VARCHAR(80) NOT NULL DEFAULT '',
  trade_register VARCHAR(80) NOT NULL DEFAULT '',
  tax_id VARCHAR(80) NOT NULL DEFAULT '',
  legal_mentions TEXT NOT NULL DEFAULT '',

  -- Coordonnées
  phone VARCHAR(40) NOT NULL DEFAULT '',
  phone_secondary VARCHAR(40) NOT NULL DEFAULT '',
  whatsapp VARCHAR(40) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL DEFAULT '',
  support_email VARCHAR(255) NOT NULL DEFAULT '',
  website VARCHAR(255) NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  postal_code VARCHAR(20) NOT NULL DEFAULT '',
  city VARCHAR(120) NOT NULL DEFAULT '',
  island VARCHAR(120) NOT NULL DEFAULT '',
  country VARCHAR(120) NOT NULL DEFAULT 'Comores',

  -- Présentation documentaire
  primary_color VARCHAR(9) NOT NULL DEFAULT '#003366',
  secondary_color VARCHAR(9) NOT NULL DEFAULT '#00A859',
  signature_url TEXT NOT NULL DEFAULT '',
  signature_holder VARCHAR(160) NOT NULL DEFAULT '',
  stamp_url TEXT NOT NULL DEFAULT '',
  pdf_template VARCHAR(40) NOT NULL DEFAULT 'premium_executive',
  document_templates JSONB,
  currency VARCHAR(10) NOT NULL DEFAULT 'KMF',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id),

  CONSTRAINT platform_identity_template_known
    CHECK (pdf_template IN ('premium_classic', 'premium_medical', 'premium_executive')),
  CONSTRAINT platform_identity_colors_hex
    CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$' AND secondary_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Une seule ligne, garantie par la base : un index unique sur une colonne
-- toujours vraie. Deux identités concurrentes produiraient des factures à
-- en-têtes différents selon l'ordre de lecture.
CREATE UNIQUE INDEX IF NOT EXISTS platform_identity_singleton
  ON public.platform_identity (singleton);

DROP TRIGGER IF EXISTS trig_platform_identity_updated ON public.platform_identity;
CREATE TRIGGER trig_platform_identity_updated
  BEFORE UPDATE ON public.platform_identity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ligne initiale. Les valeurs par défaut portent l'identité de l'éditeur telle
-- qu'elle figure déjà dans la documentation officielle ; le Super Admin les
-- complète depuis ses Paramètres.
INSERT INTO public.platform_identity (singleton, slogan, email, website, legal_mentions)
VALUES (
  TRUE,
  'Le système d''information hospitalier des établissements de santé',
  'contact@morashawiri.com',
  'www.moracare.km',
  'MORACare Enterprise est édité par MORA Shawiri. Document émis par voie électronique.'
)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.platform_identity ENABLE ROW LEVEL SECURITY;

-- Écriture réservée à l'éditeur.
DROP POLICY IF EXISTS platform_identity_super_admin ON public.platform_identity;
CREATE POLICY platform_identity_super_admin ON public.platform_identity
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Lecture ouverte : voir l'en-tête du fichier.
DROP POLICY IF EXISTS platform_identity_read ON public.platform_identity;
CREATE POLICY platform_identity_read ON public.platform_identity
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON public.platform_identity TO authenticated;
GRANT INSERT, UPDATE ON public.platform_identity TO authenticated;

COMMENT ON TABLE public.platform_identity IS
  'Identité documentaire de MORA Shawiri, éditeur de la plateforme (BP28C, BP30). Écriture réservée au Super Admin.';

-- ==========================================
-- STOCKAGE DES VISUELS DE LA PLATEFORME
-- ==========================================
-- Les visuels de l'éditeur — logo, signature, cachet — ne peuvent pas vivre
-- dans le compartiment des établissements : ses politiques cloisonnent par
-- dossier d'établissement, et le Super Admin n'en a pas.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'platform-assets', 'platform-assets', TRUE, 5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS platform_assets_read ON storage.objects;
CREATE POLICY platform_assets_read ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'platform-assets');

DROP POLICY IF EXISTS platform_assets_write ON storage.objects;
CREATE POLICY platform_assets_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'platform-assets' AND public.is_super_admin());

DROP POLICY IF EXISTS platform_assets_update ON storage.objects;
CREATE POLICY platform_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'platform-assets' AND public.is_super_admin());

DROP POLICY IF EXISTS platform_assets_delete ON storage.objects;
CREATE POLICY platform_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'platform-assets' AND public.is_super_admin());
