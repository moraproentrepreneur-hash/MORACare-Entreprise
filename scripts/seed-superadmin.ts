/**
 * Initialisation du compte Super Admin de la plateforme.
 *
 * CLAUDE.md § Authentification : « Les identifiants du Super Admin ne doivent
 * jamais être affichés publiquement. Ils servent uniquement à l'initialisation
 * de la base de données. »
 *
 * Ce script ne contient donc aucun identifiant en dur et n'en journalise aucun.
 * Tout est fourni par variables d'environnement.
 *
 * Usage :
 *   SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run seed:superadmin
 */

import { createClient } from '@supabase/supabase-js';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    console.error(`✖ Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value.trim();
};

const SUPABASE_URL = required('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY');
const EMAIL = required('SUPERADMIN_EMAIL');
const PASSWORD = required('SUPERADMIN_PASSWORD');
const USERNAME = process.env.SUPERADMIN_USERNAME?.trim() || EMAIL.split('@')[0];
const FIRST_NAME = process.env.SUPERADMIN_FIRST_NAME?.trim() || 'Super';
const LAST_NAME = process.env.SUPERADMIN_LAST_NAME?.trim() || 'Admin';

if (PASSWORD.length < 12) {
  console.error('✖ SUPERADMIN_PASSWORD doit contenir au moins 12 caractères.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedSuperAdmin(): Promise<void> {
  console.log('› Initialisation du compte Super Admin MORACare…');

  const { data: existing, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', EMAIL)
    .maybeSingle();

  if (lookupError) {
    console.error('✖ Lecture de la table profiles impossible :', lookupError.message);
    process.exit(1);
  }

  if (existing) {
    console.log('✓ Le compte Super Admin existe déjà. Aucune action.');
    return;
  }

  // Le trigger trig_on_auth_user_created crée le profil à partir des métadonnées.
  const { error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: USERNAME,
      first_name: FIRST_NAME,
      last_name: LAST_NAME,
      role: 'super_admin',
    },
  });

  if (authError) {
    console.error('✖ Création du compte impossible :', authError.message);
    process.exit(1);
  }

  console.log('✓ Compte Super Admin créé.');
  console.log('  Connectez-vous avec l’adresse e-mail fournie via SUPERADMIN_EMAIL.');
  console.log('  Le mot de passe n’est volontairement pas affiché ni journalisé.');
}

seedSuperAdmin().catch((err: unknown) => {
  console.error('✖ Échec de l’initialisation :', err instanceof Error ? err.message : err);
  process.exit(1);
});
