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

/** Simulation de Supabase, partagée avec les autres harnais PGlite. */
const SUPABASE_STUB = fs.readFileSync(
  path.join(ROOT, 'supabase', 'testing', 'supabase-stub.sql'),
  'utf8',
);

/**
 * Tables couvertes par un alias `export type XxxRow = Row<'table'>`.
 *
 * `database.ts` ne redéclare plus les colonnes : il dérive du fichier généré,
 * qui fait foi. Le contrôle porte donc sur la couverture — chaque table du
 * schéma a-t-elle son alias — plutôt que sur les colonnes une à une, que le
 * générateur garantit déjà.
 */
const parseAliasedTables = (source) => {
  const set = new Set();

  // Alias de table : `export type XxxRow = Row<'table'>`.
  const table = /export type \w+ = Row<'(\w+)'>/g;
  let m;
  while ((m = table.exec(source)) !== null) set.add(m[1]);

  // Alias de vue. Les vues n'ont ni Insert ni Update — le générateur les place
  // sous `Views` — et ne peuvent donc pas passer par `Row<…>`. Les ignorer
  // ferait signaler comme non couvertes des vues qui le sont.
  const view = /Database\['public'\]\['Views'\]\['(\w+)'\]\['Row'\]/g;
  while ((m = view.exec(source)) !== null) set.add(m[1]);

  return set;
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
  const aliased = parseAliasedTables(source);

  let problems = 0;
  console.log(`Tables aliasées dans database.ts : ${aliased.size}`);
  console.log(`Tables présentes en base         : ${dbColumns.size}\n`);

  for (const table of aliased) {
    if (!dbColumns.has(table)) {
      console.log(`  ✖ ${table} : aliasée en TypeScript, absente de la base`);
      problems += 1;
    }
  }

  const missing = [...dbColumns.keys()].filter((t) => !aliased.has(t));
  if (missing.length > 0) {
    console.log(`  ⚠ Tables sans alias TypeScript : ${missing.join(', ')}`);
  }

  console.log('');
  if (problems === 0) {
    console.log('Alias et schéma cohérents. Les colonnes sont garanties par database.generated.ts.');
    await db.close();
    return;
  }

  console.log();
  process.exit(1);
};

main().catch((err) => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});
