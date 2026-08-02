/**
 * Diagnostic des accès publics (visiteur non authentifié).
 *
 * Reproduit exactement ce que fait la Landing Page depuis le navigateur :
 * lecture des formules avec la clé publiable, et dépôt d'une demande de
 * démonstration. Permet de distinguer un problème de configuration d'un
 * problème de politique RLS.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Configuration lue depuis .env.local');
console.log(`  URL              : ${URL}`);
console.log(`  Clé publiable    : ${ANON?.slice(0, 16)}… (${ANON?.length} car.)`);
console.log(`  Clé secrète      : ${SECRET?.slice(0, 12)}… (${SECRET?.length} car.)`);
console.log('');

// Client "visiteur" : exactement ce dont dispose le navigateur.
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
const admin = createClient(URL, SECRET, { auth: { persistSession: false } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✖'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const main = async () => {
  console.log('1. Lecture publique des formules (Landing Page)');

  const { data: plans, error: plansError } = await anon
    .from('subscription_plans')
    .select('code, name, price_amount, price_currency')
    .eq('is_active', true)
    .order('display_order');

  check(
    'subscription_plans lisible par un visiteur',
    !plansError && plans?.length === 5,
    plansError ? plansError.message : `${plans?.length ?? 0} formules`,
  );
  if (plans?.length) {
    plans.forEach((p) => console.log(`      ${p.name} : ${p.price_amount} ${p.price_currency}`));
  }

  const { data: links, error: linksError } = await anon.from('plan_modules').select('plan_id');
  check(
    'plan_modules lisible par un visiteur',
    !linksError && (links?.length ?? 0) > 0,
    linksError ? linksError.message : `${links?.length ?? 0} liaisons`,
  );

  const { data: modules, error: modulesError } = await anon.from('modules').select('code, name');
  check(
    'modules lisible par un visiteur',
    !modulesError && (modules?.length ?? 0) > 0,
    modulesError ? modulesError.message : `${modules?.length ?? 0} modules`,
  );

  console.log('\n2. Dépôt d’une demande de démonstration');

  // a) Tentative directe en tant que visiteur — doit échouer (pas de politique anon).
  const { error: anonInsertError } = await anon.from('registration_requests').insert({
    full_name: 'Diagnostic Visiteur',
    email: 'diagnostic@exemple.km',
    establishment_name: 'Diagnostic',
  });
  check(
    'Insertion directe par un visiteur refusée (attendu)',
    Boolean(anonInsertError),
    anonInsertError ? anonInsertError.message.slice(0, 60) : 'ACCEPTÉE — faille !',
  );

  // b) Via la clé secrète, comme le fait le Route Handler.
  const { data: created, error: adminInsertError } = await admin
    .from('registration_requests')
    .insert({
      full_name: 'Diagnostic Serveur',
      email: 'diagnostic-serveur@exemple.km',
      phone: '+2690000000',
      establishment_name: 'Clinique Diagnostic',
      establishment_type: 'clinique',
      message: 'Test automatique',
      status: 'pending',
    })
    .select('id, business_reference')
    .single();

  check(
    'Insertion par le serveur (clé secrète)',
    !adminInsertError && Boolean(created),
    adminInsertError ? adminInsertError.message : created?.business_reference,
  );

  if (created) {
    const { data: readBack } = await admin
      .from('registration_requests')
      .select('full_name, status')
      .eq('id', created.id)
      .single();
    check('Demande relue en base', readBack?.status === 'pending', readBack?.full_name);

    await admin.from('registration_requests').delete().eq('id', created.id);
    console.log('      (demande de diagnostic supprimée)');
  }

  console.log('\n3. Résolution identifiant → e-mail (connexion par username)');

  const { data: profileByUsername, error: usernameError } = await anon
    .from('profiles')
    .select('email')
    .eq('username', 'admin')
    .maybeSingle();

  check(
    'Un visiteur ne peut pas résoudre un identifiant (protection anti-énumération)',
    Boolean(usernameError) || !profileByUsername,
    usernameError ? usernameError.message.slice(0, 50) : 'aucune ligne',
  );

  const { data: adminLookup } = await admin
    .from('profiles')
    .select('username, email')
    .eq('username', 'admin')
    .maybeSingle();
  check(
    'Le serveur peut résoudre un identifiant',
    Boolean(adminLookup),
    adminLookup ? `${adminLookup.username} trouvé` : 'introuvable',
  );

  console.log('');
  if (failures > 0) {
    console.log(`${failures} point(s) à corriger.`);
    process.exit(1);
  }
  console.log('Tous les accès publics fonctionnent.');
};

main().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
