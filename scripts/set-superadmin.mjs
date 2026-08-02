/**
 * Crée ou met à jour le compte Super Admin de la plateforme.
 *
 * Contrairement à `seed:superadmin`, ce script accepte un compte existant et le
 * réaligne : e-mail, identifiant et mot de passe. Il sert à l'administration
 * courante, notamment lorsque l'éditeur impose des identifiants précis.
 *
 * Aucun identifiant n'est écrit dans le dépôt : tout vient de l'environnement.
 *
 * Usage :
 *   SUPERADMIN_EMAIL=... SUPERADMIN_USERNAME=... SUPERADMIN_PASSWORD=... \
 *   node scripts/set-superadmin.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const readEnvFile = () => {
  const file = path.join(ROOT, '.env.local');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
};

const fileEnv = readEnvFile();
const value = (key) => process.env[key] ?? fileEnv[key];

const URL = value('NEXT_PUBLIC_SUPABASE_URL');
const SECRET = value('SUPABASE_SERVICE_ROLE_KEY');
const EMAIL = value('SUPERADMIN_EMAIL');
const USERNAME = value('SUPERADMIN_USERNAME');
const PASSWORD = value('SUPERADMIN_PASSWORD');

const missing = [
  ['NEXT_PUBLIC_SUPABASE_URL', URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SECRET],
  ['SUPERADMIN_EMAIL', EMAIL],
  ['SUPERADMIN_USERNAME', USERNAME],
  ['SUPERADMIN_PASSWORD', PASSWORD],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  console.error(`✖ Variables manquantes : ${missing.join(', ')}`);
  process.exit(1);
}

// Le mot de passe n'est jamais affiché ni journalisé (CLAUDE.md § Authentification).
// En revanche, une faiblesse manifeste doit être signalée : la taire serait pire.
if (PASSWORD.length < 12) {
  console.warn(
    `⚠ Le mot de passe fourni ne fait que ${PASSWORD.length} caractères.\n` +
      `  L'application impose 12 caractères minimum pour les comptes créés via l'interface.\n` +
      `  Ce compte administre l'ensemble de la plateforme : un mot de passe court\n` +
      `  l'expose à une attaque par force brute. À changer après la recette.\n`,
  );
}

const admin = createClient(URL, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const main = async () => {
  console.log(`Projet : ${URL}`);
  console.log(`Compte : ${EMAIL} (identifiant « ${USERNAME} »)\n`);

  // 1. Le compte d'authentification existe-t-il déjà ?
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    console.error('✖ Lecture des comptes impossible :', listError.message);
    process.exit(1);
  }

  // On repère aussi un éventuel Super Admin sous une autre adresse, pour le
  // réaligner plutôt que d'en créer un second.
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, email, username')
    .eq('role', 'super_admin')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  const byEmail = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  const target = byEmail ?? (existingProfile ? list.users.find((u) => u.id === existingProfile.id) : undefined);

  let userId;

  if (target) {
    const { error } = await admin.auth.admin.updateUserById(target.id, {
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error('✖ Mise à jour du compte impossible :', error.message);
      process.exit(1);
    }
    userId = target.id;
    console.log('✓ Compte d’authentification mis à jour');
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: USERNAME,
        first_name: value('SUPERADMIN_FIRST_NAME') ?? 'Super',
        last_name: value('SUPERADMIN_LAST_NAME') ?? 'Admin',
        role: 'super_admin',
      },
    });
    if (error) {
      console.error('✖ Création du compte impossible :', error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log('✓ Compte d’authentification créé');
  }

  // 2. Réalignement du profil applicatif.
  //
  // Le trigger `handle_new_auth_user` le crée à l'inscription, mais il ne suit
  // pas les modifications ultérieures : c'est ici qu'on impose l'identifiant.
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      username: USERNAME,
      email: EMAIL,
      role: 'super_admin',
      is_active: true,
      establishment_id: null,
    })
    .eq('id', userId);

  if (profileError) {
    console.error('✖ Mise à jour du profil impossible :', profileError.message);
    process.exit(1);
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('business_reference, username, email, role, is_active, establishment_id')
    .eq('id', userId)
    .single();

  console.log('✓ Profil applicatif aligné\n');
  console.log('  Référence      :', profile.business_reference);
  console.log('  Identifiant    :', profile.username);
  console.log('  E-mail         :', profile.email);
  console.log('  Rôle           :', profile.role);
  console.log('  Actif          :', profile.is_active);
  console.log('  Établissement  :', profile.establishment_id ?? 'aucun (correct)');
  console.log('\nLe mot de passe n’est volontairement pas affiché.');
};

main().catch((err) => {
  console.error('✖ Erreur inattendue :', err.message);
  process.exit(1);
});
