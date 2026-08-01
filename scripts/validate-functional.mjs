/**
 * Validation fonctionnelle contre le projet Supabase réel.
 *
 * Crée un jeu de comptes de test, se connecte réellement via Supabase Auth,
 * puis vérifie l'isolation multi-tenant, les permissions, les abonnements, les
 * licences et les modules — avec de vrais jetons, donc avec les politiques RLS
 * réellement appliquées par PostgreSQL.
 *
 * Le mot de passe du Super Admin est écrit dans `.superadmin-credentials.local`
 * (ignoré par git) et jamais affiché : CLAUDE.md interdit toute divulgation.
 *
 * Usage :
 *   node scripts/validate-functional.mjs            # vérifie
 *   node scripts/validate-functional.mjs --cleanup  # supprime les comptes de test
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

// Lecture de .env.local sans dépendance supplémentaire.
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

const admin = createClient(URL, SECRET, { auth: { autoRefreshToken: false, persistSession: false } });

// Domaine des comptes de test. Un TLD réservé comme `.test` est rejeté par la
// validation d'adresse de Supabase Auth : on utilise un sous-domaine plausible.
const TEST_DOMAIN = 'validation.moracare-test.com';
const strongPassword = () => `${crypto.randomBytes(18).toString('base64url')}Aa1!`;

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✖'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/** Restitue une erreur Supabase lisible, y compris quand `message` est absent. */
const describe = (error) =>
  error?.message || error?.error_description || error?.code || JSON.stringify(error);

/** Client authentifié en tant qu'utilisateur donné : RLS s'applique. */
const signIn = async (email, password) => {
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Connexion ${email} : ${describe(error)}`);
  return { client, user: data.user };
};

const createAccount = async ({ email, password, role, establishmentId, firstName, lastName }) => {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: email.split('@')[0],
      first_name: firstName,
      last_name: lastName,
      role,
      establishment_id: establishmentId ?? '',
    },
  });
  if (error) throw new Error(`Création ${email} : ${describe(error)}`);
  return data.user.id;
};

const cleanup = async () => {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  const targets = (data?.users ?? []).filter((u) => u.email?.endsWith(TEST_DOMAIN));
  for (const u of targets) await admin.auth.admin.deleteUser(u.id);

  await admin.from('establishments').delete().like('name', 'VALIDATION %');
  console.log(`Nettoyage : ${targets.length} compte(s) et les établissements de test supprimés.`);
};

const main = async () => {
  if (process.argv.includes('--cleanup')) {
    await cleanup();
    return;
  }

  console.log(`Projet : ${URL}\n`);

  // Repartir d'un état propre pour que le script soit rejouable.
  await cleanup();
  console.log('');

  // ---------------------------------------------------------------- 1. Auth
  console.log('1. Compte Super Admin et authentification');

  const superEmail = env.SUPERADMIN_EMAIL || 'admin@morashawiri.com';
  let superPassword = strongPassword();

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('email', superEmail)
    .maybeSingle();

  if (existing) {
    // Le compte existe déjà : on réaligne son mot de passe pour pouvoir valider
    // la connexion, plutôt que d'en créer un second.
    await admin.auth.admin.updateUserById(existing.id, { password: superPassword });
    check('Compte Super Admin existant', true, superEmail);
  } else {
    await createAccount({
      email: superEmail,
      password: superPassword,
      role: 'super_admin',
      establishmentId: null,
      firstName: 'Super',
      lastName: 'Admin',
    });
    check('Compte Super Admin créé', true, superEmail);
  }

  const credentialsPath = path.join(ROOT, '.superadmin-credentials.local');
  fs.writeFileSync(
    credentialsPath,
    `# Identifiants Super Admin MORACare — NE JAMAIS VERSIONNER\n` +
      `# Généré le ${new Date().toISOString()}\n\n` +
      `URL      : ${URL}\n` +
      `Email    : ${superEmail}\n` +
      `Password : ${superPassword}\n\n` +
      `Changez ce mot de passe après la première connexion.\n`,
    'utf8',
  );

  const { client: superClient, user: superUser } = await signIn(superEmail, superPassword);
  check('Connexion Supabase Auth réussie', Boolean(superUser), 'jeton obtenu');

  const { data: superProfile } = await superClient
    .from('profiles')
    .select('role, establishment_id')
    .eq('id', superUser.id)
    .maybeSingle();

  check('Profil créé automatiquement par trigger', Boolean(superProfile));
  check('Rôle super_admin attribué', superProfile?.role === 'super_admin', superProfile?.role);
  check(
    "Super Admin rattaché à aucun établissement",
    superProfile?.establishment_id === null,
  );

  // -------------------------------------------------- 2. Établissements
  console.log('\n2. Établissements de test');

  const { data: estA } = await admin
    .from('establishments')
    .insert({ name: 'VALIDATION Clinique Alpha', type: 'clinique', email: `alpha@${TEST_DOMAIN}`, phone: '+2690000001' })
    .select('id, business_reference')
    .single();

  const { data: estB } = await admin
    .from('establishments')
    .insert({ name: 'VALIDATION Clinique Beta', type: 'hopital', email: `beta@${TEST_DOMAIN}`, phone: '+2690000002' })
    .select('id, business_reference')
    .single();

  check('Établissement A créé', Boolean(estA), estA?.business_reference);
  check('Établissement B créé', Boolean(estB), estB?.business_reference);
  check(
    'Références métier séquentielles',
    /^MORA-EST-\d{6}$/.test(estA.business_reference) && /^MORA-EST-\d{6}$/.test(estB.business_reference),
  );

  // ------------------------------------------------------- 3. Comptes
  console.log('\n3. Comptes Responsable et Personnel');

  const accounts = {};
  const roster = [
    ['admin', 'establishment_admin', estA.id],
    ['doctor', 'doctor', estA.id],
    ['nurse', 'nurse', estA.id],
    ['reception', 'receptionist', estA.id],
    ['pharmacist', 'pharmacist', estA.id],
    ['lab', 'lab_tech', estA.id],
    ['accountant', 'accountant', estA.id],
    ['doctorb', 'doctor', estB.id],
  ];

  for (const [slug, role, estId] of roster) {
    const email = `${slug}@${TEST_DOMAIN}`;
    const password = strongPassword();
    await createAccount({
      email,
      password,
      role,
      establishmentId: estId,
      firstName: slug,
      lastName: 'Test',
    });
    accounts[slug] = { email, password, role, establishmentId: estId };
  }
  check(`${roster.length} comptes créés (1 responsable + 7 personnels)`, true);

  const { data: profiles } = await admin
    .from('profiles')
    .select('role, establishment_id')
    .like('email', `%@${TEST_DOMAIN}`);

  check(
    'Rôles et établissements correctement attribués par trigger',
    profiles.length === roster.length && profiles.every((p) => p.establishment_id),
    `${profiles.length} profils`,
  );

  // ------------------------------------------- 4. Abonnement et licence
  console.log('\n4. Abonnements et licences');

  const { data: plan } = await admin
    .from('subscription_plans')
    .select('id, name, price_amount, max_users')
    .eq('code', 'business')
    .single();

  const { data: sub } = await admin
    .from('subscriptions')
    .insert({ establishment_id: estA.id, plan_id: plan.id, status: 'active' })
    .select('id, business_reference')
    .single();

  check('Abonnement créé', Boolean(sub), `${sub?.business_reference} — ${plan.name}`);
  check('Tarif Business conforme', Number(plan.price_amount) === 10000, `${plan.price_amount} KMF`);

  const { data: events } = await admin
    .from('subscription_events')
    .select('event_type')
    .eq('subscription_id', sub.id);
  check('Historisation automatique par trigger', events.length === 1, events[0]?.event_type);

  await admin.from('subscriptions').update({ status: 'suspended' }).eq('id', sub.id);
  const { data: events2 } = await admin
    .from('subscription_events')
    .select('event_type')
    .eq('subscription_id', sub.id);
  check('Changement de statut historisé', events2.length === 2);
  await admin.from('subscriptions').update({ status: 'active' }).eq('id', sub.id);

  const { data: lic } = await admin
    .from('licenses')
    .insert({ establishment_id: estA.id, subscription_id: sub.id, status: 'active', max_users: plan.max_users })
    .select('id, license_number')
    .single();
  check('Licence créée', Boolean(lic), lic?.license_number);

  const { error: dupError } = await admin
    .from('licenses')
    .insert({ establishment_id: estA.id, status: 'active' });
  check('Une licence par établissement (BR-008)', Boolean(dupError), 'duplicata refusé');

  // ------------------------------------------------ 5. Multi-tenant
  console.log('\n5. Isolation multi-tenant (TD06 §8, BR-286)');

  const { data: patA } = await admin
    .from('patients')
    .insert({ establishment_id: estA.id, first_name: 'Alpha', last_name: 'PatientA', gender: 'M', birth_date: '1990-01-01', phone: '+269111' })
    .select('id')
    .single();
  await admin
    .from('patients')
    .insert({ establishment_id: estB.id, first_name: 'Beta', last_name: 'PatientB', gender: 'F', birth_date: '1992-02-02', phone: '+269222' });

  const { client: docA } = await signIn(accounts.doctor.email, accounts.doctor.password);
  const { client: docB } = await signIn(accounts.doctorb.email, accounts.doctorb.password);

  const { data: seenByA } = await docA.from('patients').select('last_name');
  const { data: seenByB } = await docB.from('patients').select('last_name');

  check(
    'Le médecin A ne voit que les patients de A',
    seenByA.length === 1 && seenByA[0].last_name === 'PatientA',
    `${seenByA.length} patient(s)`,
  );
  check(
    'Le médecin B ne voit que les patients de B',
    seenByB.length === 1 && seenByB[0].last_name === 'PatientB',
    `${seenByB.length} patient(s)`,
  );

  const { error: crossWrite } = await docA
    .from('patients')
    .insert({ establishment_id: estB.id, first_name: 'Intrus', last_name: 'Intrus', gender: 'M', birth_date: '1990-01-01', phone: '+269' });
  check("Écriture vers un autre établissement refusée (WITH CHECK)", Boolean(crossWrite));

  const { data: estSeenByA } = await docA.from('establishments').select('name');
  check(
    'Un utilisateur ne voit que son établissement',
    estSeenByA.length === 1 && estSeenByA[0].name === 'VALIDATION Clinique Alpha',
    `${estSeenByA.length} établissement(s)`,
  );

  // ------------------------------------------------- 6. Permissions
  console.log('\n6. Permissions (BP26A, UG01→UG10)');

  const { data: permsDoctor } = await docA
    .from('role_permissions')
    .select('can_view, can_create, modules(code)')
    .eq('role', 'doctor');

  const byCode = Object.fromEntries(permsDoctor.map((p) => [p.modules.code, p]));
  check('Le médecin peut créer des consultations', byCode.consultations?.can_create === true);
  check('Le médecin ne gère pas les utilisateurs', !byCode.user_management);
  check('Le médecin consulte la pharmacie sans la modifier', byCode.pharmacy?.can_view === true && byCode.pharmacy?.can_create === false);

  const { data: permsSuper } = await superClient
    .from('role_permissions')
    .select('can_view, modules(code)')
    .eq('role', 'super_admin');
  const clinical = ['patients', 'appointments', 'consultations', 'hospitalizations', 'pharmacy', 'laboratory', 'imaging'];
  const superClinical = permsSuper.filter((p) => clinical.includes(p.modules.code) && p.can_view);
  check('Super Admin sans accès clinique (BP06 §10 bis)', superClinical.length === 0);

  const { client: accountant } = await signIn(accounts.accountant.email, accounts.accountant.password);
  const { data: accPerms } = await accountant
    .from('role_permissions')
    .select('can_view, modules(code)')
    .eq('role', 'accountant');
  const accByCode = Object.fromEntries(accPerms.map((p) => [p.modules.code, p]));
  check('Le comptable accède à la finance', accByCode.finance?.can_view === true);
  check("Le comptable n'accède pas aux consultations", !accByCode.consultations);

  // ---------------------------------------------------- 7. Modules
  console.log('\n7. Référentiel et activation des modules');

  const { data: modules } = await docA.from('modules').select('code, is_core, workspace');
  check('Référentiel lisible par le personnel', modules.length === 16, `${modules.length} modules`);
  check(
    'Modules essentiels marqués',
    modules.filter((m) => m.is_core).length === 4,
  );

  const pharmacyModule = modules.find((m) => m.code === 'pharmacy');
  await admin
    .from('establishment_modules')
    .upsert({ establishment_id: estA.id, module_id: pharmacyModule.id ?? null, is_enabled: false });

  const { data: pharmaModuleRow } = await admin
    .from('modules')
    .select('id')
    .eq('code', 'pharmacy')
    .single();
  await admin
    .from('establishment_modules')
    .upsert({ establishment_id: estA.id, module_id: pharmaModuleRow.id, is_enabled: false });

  const { data: disabled } = await docA
    .from('establishment_modules')
    .select('is_enabled, modules(code)')
    .eq('is_enabled', false);
  check(
    'Désactivation de module enregistrée et visible',
    disabled.some((d) => d.modules.code === 'pharmacy'),
  );

  const { data: planModules } = await docA
    .from('plan_modules')
    .select('module_id')
    .eq('plan_id', plan.id);
  check('Composition du plan Business définie', planModules.length >= 14, `${planModules.length} modules`);

  // ------------------------------------------------ 8. Journal d'audit
  console.log("\n8. Journal d'audit");

  await admin.from('audit_logs').insert({
    establishment_id: estA.id,
    user_id: superUser.id,
    action: 'validation_test',
    entity_name: 'patients',
    entity_id: patA.id,
  });

  const { client: estAdmin } = await signIn(accounts.admin.email, accounts.admin.password);
  const { data: logs } = await estAdmin.from('audit_logs').select('action');
  check("Le responsable consulte le journal", logs.length >= 1, `${logs.length} entrée(s)`);

  const { data: updated } = await estAdmin
    .from('audit_logs')
    .update({ action: 'falsifie' })
    .eq('action', 'validation_test')
    .select();
  check('Journal inaltérable — modification impossible', (updated?.length ?? 0) === 0);

  const { data: deleted } = await estAdmin
    .from('audit_logs')
    .delete()
    .eq('action', 'validation_test')
    .select();
  check('Journal inaltérable — suppression impossible', (deleted?.length ?? 0) === 0);

  const { data: docLogs } = await docA.from('audit_logs').select('action');
  check("Un médecin n'accède pas au journal d'audit", (docLogs?.length ?? 0) === 0);

  // ---------------------------------------------------------- Bilan
  console.log('');
  console.log(`Identifiants Super Admin écrits dans : ${path.basename(credentialsPath)}`);
  console.log('');

  if (failures > 0) {
    console.log(`${failures} vérification(s) en échec.`);
    process.exit(1);
  }
  console.log('Toutes les vérifications fonctionnelles sont concluantes.');
};

main().catch((err) => {
  console.error('\nErreur :', err.message);
  process.exit(1);
});
