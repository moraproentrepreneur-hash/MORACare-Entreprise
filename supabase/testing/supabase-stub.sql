-- Simulation minimale de Supabase pour PGlite.
--
-- Les migrations s'appuient sur des objets que Supabase fournit et que
-- PostgreSQL nu ne connaît pas : le schéma `auth`, les rôles `authenticated` et
-- `anon`, le stockage. Ce fichier en reproduit le strict nécessaire.
--
-- Il est la source unique des trois harnais qui appliquent les migrations hors
-- Supabase : la suite de tests, la validation des migrations et le contrôle des
-- types. Chacun en gardait sa copie, et elles ont divergé — le contrôle des
-- types ignorait le schéma `storage`, ajouté par la migration d'identité de
-- l'établissement, et échouait donc silencieusement dans `npm run verify`.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID,
  aud VARCHAR(255),
  role VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  encrypted_password VARCHAR(255),
  email_confirmed_at TIMESTAMPTZ,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;

DO $r$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN CREATE ROLE anon;          EXCEPTION WHEN duplicate_object THEN NULL; END $r$;

-- Supabase Storage. Reproduit ce dont les migrations ont besoin : déclarer un
-- compartiment et poser des politiques sur les objets. `foldername` renvoie les
-- segments du chemin, ce qui permet de cloisonner par dossier.
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public BOOLEAN DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT,
  owner UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[]
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT string_to_array(regexp_replace(name, '/[^/]*$', ''), '/');
$fn$;
