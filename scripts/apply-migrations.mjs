/**
 * Applique les migrations sur le projet Supabase réel.
 *
 * Utilise l'API de management (`/v1/projects/{ref}/database/query`), qui exécute
 * du SQL avec les privilèges d'administration du projet. Aucune donnée sensible
 * n'est écrite dans le dépôt : tout provient de l'environnement.
 *
 * Une table `migrations.schema_migrations` enregistre ce qui a été appliqué, ce qui
 * rend le script idempotent et rejouable sans risque.
 *
 * Usage :
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/apply-migrations.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(HERE, '..', 'supabase', 'migrations');

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

if (!TOKEN || !REF) {
  console.error('✖ SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF sont requis.');
  process.exit(1);
}

const runSql = async (query) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await response.text();

  if (!response.ok) {
    let message = text;
    try {
      message = JSON.parse(text).message ?? text;
    } catch {
      /* le corps n'est pas du JSON : on garde le texte brut */
    }
    throw new Error(message);
  }

  return text ? JSON.parse(text) : [];
};

const main = async () => {
  // Registre des migrations appliquées.
  //
  // Volontairement hors du schéma `public` : celui-ci est exposé par PostgREST,
  // et une métadonnée d'outillage n'a pas à être interrogeable par l'API.
  await runSql(`
    CREATE SCHEMA IF NOT EXISTS migrations;

    CREATE TABLE IF NOT EXISTS migrations.schema_migrations (
      version     TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    REVOKE ALL ON SCHEMA migrations FROM anon, authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA migrations FROM anon, authenticated;
  `);

  const applied = new Set(
    (await runSql('SELECT version FROM migrations.schema_migrations')).map((r) => r.version),
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Projet : ${REF}`);
  console.log(`Migrations trouvées : ${files.length}\n`);

  let executed = 0;

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');

    if (applied.has(version)) {
      console.log(`  — ${file} (déjà appliquée)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    try {
      await runSql(sql);
      await runSql(
        `INSERT INTO migrations.schema_migrations (version) VALUES ('${version}')
         ON CONFLICT (version) DO NOTHING`,
      );
      executed += 1;
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✖ ${file}`);
      console.error(`    ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n${executed} migration(s) appliquée(s).`);
};

main().catch((err) => {
  console.error('Erreur inattendue :', err.message);
  process.exit(1);
});
