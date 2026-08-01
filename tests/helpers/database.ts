import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Base de test (TD08).
 *
 * Applique les migrations réelles sur PGlite — PostgreSQL en WebAssembly — afin
 * que les tests portent sur le schéma effectivement livré, et non sur une
 * réimplémentation. Le schéma `auth` de Supabase est simulé au minimum
 * nécessaire.
 *
 * Limite assumée : PGlite n'est pas Supabase. Les tests valident le schéma, les
 * contraintes, les triggers et la logique des politiques RLS, mais pas
 * l'intégration Supabase elle-même.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

const SUPABASE_STUB = `
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
`;

export type TestDatabase = PGlite;

/** Crée une base neuve avec toutes les migrations appliquées. */
export const createTestDatabase = async (): Promise<TestDatabase> => {
  const db = await PGlite.create({ extensions: { uuid_ossp, pgcrypto } });

  await db.exec('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await db.exec('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  await db.exec(SUPABASE_STUB);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }

  // Supabase accorde ces privilèges aux rôles `authenticated` et `anon` ; RLS
  // filtre ensuite les lignes. Sans eux, tout accès échouerait sur un refus de
  // privilège, ce qui masquerait le comportement réel des politiques.
  await db.exec(`
    GRANT USAGE ON SCHEMA public TO authenticated, anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  `);

  // Le propriétaire d'une table contourne RLS par défaut : sans FORCE, les
  // tests s'exécuteraient sans jamais évaluer les politiques.
  const tables = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  for (const { tablename } of tables.rows) {
    await db.exec(`ALTER TABLE public."${tablename}" FORCE ROW LEVEL SECURITY;`);
  }

  return db;
};

/** Exécute une requête sous le rôle `authenticated`, RLS active. */
export const queryAsAuthenticated = async <T = Record<string, unknown>>(
  db: TestDatabase,
  userId: string | null,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => {
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.exec('SET ROLE authenticated');
  try {
    const result = await db.query<T>(sql, params);
    return result.rows;
  } finally {
    await db.exec('RESET ROLE');
  }
};

/**
 * Exécute une requête en se faisant passer pour un utilisateur donné.
 *
 * `auth.uid()` lit `request.jwt.claim.sub` : le poser reproduit exactement ce
 * que fait Supabase, et permet donc de tester les politiques RLS pour de vrai.
 */
export const asUser = async <T = Record<string, unknown>>(
  db: TestDatabase,
  userId: string | null,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => {
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  const result = await db.query<T>(sql, params);
  return result.rows;
};

/** Crée un établissement et renvoie son identifiant. */
export const createEstablishment = async (
  db: TestDatabase,
  name: string,
): Promise<string> => {
  const rows = await db.query<{ id: string }>(
    `INSERT INTO public.establishments (name, type, email, phone)
     VALUES ($1, 'clinique', $2, '+269000000') RETURNING id`,
    [name, `${name.toLowerCase().replace(/\s+/g, '')}@test.km`],
  );
  return rows.rows[0].id;
};

/** Crée un compte auth + son profil, et renvoie l'identifiant utilisateur. */
export const createUser = async (
  db: TestDatabase,
  options: { email: string; role: string; establishmentId: string | null },
): Promise<string> => {
  const authRows = await db.query<{ id: string }>(
    `INSERT INTO auth.users (email) VALUES ($1) RETURNING id`,
    [options.email],
  );
  const userId = authRows.rows[0].id;

  await db.query(
    `INSERT INTO public.profiles (id, username, email, first_name, last_name, role, establishment_id)
     VALUES ($1, $2, $3, 'Test', 'User', $4::public.user_role_type, $5)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, establishment_id = EXCLUDED.establishment_id`,
    [userId, options.email.split('@')[0], options.email, options.role, options.establishmentId],
  );

  return userId;
};

/** Crée un patient rattaché à un établissement. */
export const createPatient = async (
  db: TestDatabase,
  establishmentId: string,
  lastName: string,
): Promise<string> => {
  const rows = await db.query<{ id: string }>(
    `INSERT INTO public.patients (establishment_id, first_name, last_name, gender, birth_date, phone)
     VALUES ($1, 'Patient', $2, 'M', '1990-01-01', '+269111111') RETURNING id`,
    [establishmentId, lastName],
  );
  return rows.rows[0].id;
};
