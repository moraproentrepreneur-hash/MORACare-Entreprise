/**
 * Contrôle de cohérence entre `src/types/database.ts` et le schéma réel.
 *
 * Les types ont été écrits à la main faute d'accès à la CLI Supabase. Ce script
 * applique les migrations sur PGlite, introspecte le schéma obtenu et compare
 * les colonnes déclarées côté TypeScript à celles réellement créées.
 *
 * Il détecte les deux erreurs qui ne se verraient sinon qu'à l'exécution :
 *   - une colonne typée qui n'existe pas en base ;
 *   - une colonne en base absente du type.
 *
 * Usage : npm run db:check-types
 */

import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const TYPES_FILE = path.join(ROOT, 'src', 'types', 'database.ts');

const SUPABASE_STUB = `
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID, aud VARCHAR(255), role VARCHAR(255),
  email VARCHAR(255) UNIQUE, encrypted_password VARCHAR(255),
  email_confirmed_at TIMESTAMPTZ, raw_app_meta_data JSONB, raw_user_meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $fn$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;
DO $r$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
DO $r$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $r$;
`;

/** Table TypeScript -> nom du type Row, extrait du bloc `Tables:` du schéma. */
const parseTableToRowType = (source) => {
  const map = new Map();
  const re = /^\s{6}(\w+):\s*\{\s*\n\s*Row:\s*(\w+);/gm;
  let m;
  while ((m = re.exec(source)) !== null) map.set(m[1], m[2]);
  return map;
};

/** Colonnes déclarées par un alias `export type XxxRow = [AuditColumns &] { … }`. */
const parseRowColumns = (source, typeName) => {
  const start = source.indexOf(`export type ${typeName} =`);
  if (start === -1) return null;

  const braceStart = source.indexOf('{', start);
  if (braceStart === -1) return null;

  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const body = source.slice(braceStart + 1, end);
  const columns = new Set();
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*(\w+)\??:/);
    if (match) columns.add(match[1]);
  }

  // Les colonnes d'audit sont héritées par intersection.
  const header = source.slice(start, braceStart);
  if (header.includes('AuditColumns')) {
    ['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at'].forEach((c) =>
      columns.add(c),
    );
  }

  return columns;
};

const main = async () => {
  const db = await PGlite.create({ extensions: { uuid_ossp, pgcrypto } });
  await db.exec('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await db.exec('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  await db.exec(SUPABASE_STUB);

  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
  }

  const { rows } = await db.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);

  const dbColumns = new Map();
  for (const row of rows) {
    if (!dbColumns.has(row.table_name)) dbColumns.set(row.table_name, new Set());
    dbColumns.get(row.table_name).add(row.column_name);
  }

  const source = fs.readFileSync(TYPES_FILE, 'utf8');
  const tableToType = parseTableToRowType(source);

  let problems = 0;
  console.log(`Tables déclarées dans database.ts : ${tableToType.size}`);
  console.log(`Tables présentes en base          : ${dbColumns.size}\n`);

  for (const [table, typeName] of tableToType) {
    const actual = dbColumns.get(table);
    if (!actual) {
      console.log(`  ✖ ${table} : déclarée en TypeScript, absente de la base`);
      problems += 1;
      continue;
    }

    const declared = parseRowColumns(source, typeName);
    if (!declared) {
      console.log(`  ✖ ${table} : type ${typeName} introuvable`);
      problems += 1;
      continue;
    }

    const phantom = [...declared].filter((c) => !actual.has(c));
    const missing = [...actual].filter((c) => !declared.has(c));

    if (phantom.length || missing.length) {
      problems += 1;
      console.log(`  ✖ ${table}`);
      if (phantom.length) console.log(`      typées mais absentes en base : ${phantom.join(', ')}`);
      if (missing.length) console.log(`      en base mais non typées      : ${missing.join(', ')}`);
    }
  }

  const untyped = [...dbColumns.keys()].filter((t) => !tableToType.has(t));
  if (untyped.length) {
    console.log(`\n  ⚠ Tables en base sans type TypeScript : ${untyped.join(', ')}`);
  }

  console.log('');
  if (problems === 0) {
    console.log('Types et schéma cohérents.');
    await db.close();
    return;
  }

  console.log(`${problems} incohérence(s) détectée(s).`);
  process.exit(1);
};

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});
