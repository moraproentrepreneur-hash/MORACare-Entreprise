/**
 * Validation des migrations SQL sans serveur PostgreSQL.
 *
 * Rejoue l'intégralité des migrations sur PGlite — PostgreSQL compilé en
 * WebAssembly — afin de détecter les erreurs de syntaxe, de dépendance et
 * d'ordre AVANT toute exécution sur un projet Supabase réel.
 *
 * Limites assumées : PGlite n'est pas Supabase. Le schéma `auth`, la fonction
 * `auth.uid()` et les rôles sont simulés ci-dessous. Une validation réussie ne
 * remplace donc pas un passage sur la base réelle, mais elle élimine la classe
 * d'erreurs la plus fréquente.
 *
 * Usage : npm run db:validate
 */

import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(HERE, '..', 'supabase', 'migrations');

/** Simulation de Supabase, partagée avec les autres harnais PGlite. */
const SUPABASE_STUB = fs.readFileSync(
  path.join(HERE, '..', 'supabase', 'testing', 'supabase-stub.sql'),
  'utf8',
);

const main = async () => {
  const db = await PGlite.create({ extensions: { uuid_ossp, pgcrypto } });

  const version = (await db.query('SELECT version()')).rows[0].version;
  console.log(`Moteur : ${version.split(',')[0]}`);

  await db.exec('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await db.exec('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
  await db.exec(SUPABASE_STUB);
  console.log('Environnement Supabase simulé : OK\n');

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let failures = 0;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
      console.log(`  OK    ${file}`);
    } catch (err) {
      failures += 1;
      console.log(`  ÉCHEC ${file}`);
      console.log(`        ${err.message}`);
      if (err.position) {
        const pos = Number(err.position);
        const excerpt = sql
          .slice(Math.max(0, pos - 200), pos + 200)
          .replace(/\s+/g, ' ')
          .trim();
        console.log(`        …${excerpt}…`);
      }
    }
  }

  console.log('');

  if (failures > 0) {
    console.log(`${failures} migration(s) en échec.`);
    process.exit(1);
  }

  const count = async (sql) => (await db.query(sql)).rows[0].n;

  console.log('Résultat après application complète :');
  console.log(
    `  Tables publiques    : ${await count(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
    )}`,
  );
  console.log(
    `  Politiques RLS      : ${await count(
      `SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'`,
    )}`,
  );
  console.log(
    `  Tables sans RLS     : ${await count(`
      SELECT count(*)::int AS n FROM pg_tables t
      WHERE t.schemaname='public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace ns ON ns.oid = c.relnamespace
          WHERE ns.nspname='public' AND c.relname=t.tablename AND c.relrowsecurity
        )`)}`,
  );
  console.log(
    `  Tables RLS sans policy : ${await count(`
      SELECT count(*)::int AS n FROM pg_class c
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE ns.nspname='public' AND c.relrowsecurity
        AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname)`)}`,
  );
  console.log(`  Modules            : ${await count('SELECT count(*)::int AS n FROM public.modules')}`);
  console.log(
    `  Plans d'abonnement : ${await count('SELECT count(*)::int AS n FROM public.subscription_plans')}`,
  );
  console.log(
    `  Permissions        : ${await count('SELECT count(*)::int AS n FROM public.role_permissions')}`,
  );

  console.log('\nToutes les migrations s’appliquent sans erreur.');
  await db.close();
};

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});
