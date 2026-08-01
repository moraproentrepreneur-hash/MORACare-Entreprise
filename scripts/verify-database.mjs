/**
 * Vérifications post-migration sur le projet Supabase réel.
 *
 * Contrôle que le schéma livré est bien celui attendu : tables, protection RLS,
 * politiques, référentiel des modules, formules et matrice des permissions.
 *
 * Usage :
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... node scripts/verify-database.mjs
 */

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

if (!TOKEN || !REF) {
  console.error('✖ SUPABASE_ACCESS_TOKEN et SUPABASE_PROJECT_REF sont requis.');
  process.exit(1);
}

const runSql = async (query) => {
  const response = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(JSON.parse(text).message ?? text);
  return text ? JSON.parse(text) : [];
};

let failures = 0;

const check = async (label, sql, assertion) => {
  const rows = await runSql(sql);
  const { ok, detail } = assertion(rows);
  console.log(`  ${ok ? '✓' : '✖'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const main = async () => {
  console.log(`Projet : ${REF}\n`);

  console.log('Schéma');
  await check(
    'Tables du schéma public',
    `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'`,
    (r) => ({ ok: r[0].n >= 34, detail: `${r[0].n} tables` }),
  );
  await check(
    'Toutes les tables sont protégées par RLS',
    `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity`,
    (r) => ({ ok: r.length === 0, detail: r.length ? r.map((x) => x.relname).join(', ') : 'aucune exception' }),
  );
  await check(
    'Aucune table RLS sans politique',
    `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relrowsecurity
       AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname)`,
    (r) => ({ ok: r.length === 0, detail: r.length ? r.map((x) => x.relname).join(', ') : 'toutes couvertes' }),
  );
  await check(
    'Politiques RLS créées',
    `SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'`,
    (r) => ({ ok: r[0].n >= 50, detail: `${r[0].n} politiques` }),
  );

  console.log('\nRéférentiel');
  await check(
    'Modules du référentiel (BP12 §4)',
    `SELECT count(*)::int AS n FROM public.modules`,
    (r) => ({ ok: r[0].n === 16, detail: `${r[0].n} modules` }),
  );
  await check(
    'Chaque module porte sa référence Blueprint',
    `SELECT count(*)::int AS n FROM public.modules WHERE blueprint_reference IS NULL`,
    (r) => ({ ok: r[0].n === 0, detail: `${r[0].n} sans référence` }),
  );
  await check(
    'Modules essentiels non désactivables',
    `SELECT string_agg(code, ', ' ORDER BY code) AS codes FROM public.modules WHERE is_core`,
    (r) => ({ ok: r[0].codes === 'dashboard, saas_platform, settings, user_management', detail: r[0].codes }),
  );

  console.log('\nFormules (BP09 §4)');
  await check(
    'Les cinq formules officielles',
    `SELECT string_agg(code, ', ' ORDER BY display_order) AS codes FROM public.subscription_plans`,
    (r) => ({ ok: r[0].codes === 'essai, gratuit, standard, business, vip', detail: r[0].codes }),
  );
  await check(
    'Tarifs officiels en KMF',
    `SELECT string_agg(code || '=' || price_amount::int, ' ' ORDER BY display_order) AS prix
     FROM public.subscription_plans WHERE price_currency='KMF'`,
    (r) => ({
      ok: r[0].prix === 'essai=0 gratuit=0 standard=5000 business=10000 vip=15000',
      detail: r[0].prix,
    }),
  );
  await check(
    'Aucune formule sans composition',
    `SELECT p.code FROM public.subscription_plans p
     WHERE NOT EXISTS (SELECT 1 FROM public.plan_modules pm WHERE pm.plan_id=p.id)`,
    (r) => ({ ok: r.length === 0, detail: r.length ? r.map((x) => x.code).join(', ') : 'toutes configurées' }),
  );
  await check(
    'Aucune formule incomplètement configurée',
    `SELECT code FROM public.subscription_plans
     WHERE storage_mb IS NULL OR support_level IS NULL OR backup_frequency IS NULL
        OR retention_days IS NULL OR cta_label IS NULL`,
    (r) => ({ ok: r.length === 0, detail: r.length ? r.map((x) => x.code).join(', ') : 'complètes' }),
  );

  console.log('\nPermissions (BP26A, UG01→UG10)');
  await check(
    'Matrice chargée',
    `SELECT count(*)::int AS n FROM public.role_permissions`,
    (r) => ({ ok: r[0].n >= 57, detail: `${r[0].n} permissions` }),
  );
  await check(
    'Les dix rôles sont couverts',
    `SELECT count(DISTINCT role)::int AS n FROM public.role_permissions`,
    (r) => ({ ok: r[0].n === 10, detail: `${r[0].n} rôles` }),
  );
  await check(
    'Super Admin sans accès clinique (BP06 §10 bis)',
    `SELECT count(*)::int AS n FROM public.role_permissions rp
     JOIN public.modules m ON m.id = rp.module_id
     WHERE rp.role='super_admin' AND rp.can_view
       AND m.code IN ('patients','appointments','consultations','hospitalizations','pharmacy','laboratory','imaging')`,
    (r) => ({ ok: r[0].n === 0, detail: `${r[0].n} accès clinique` }),
  );
  await check(
    'Aucun droit d’écriture sans droit de lecture',
    `SELECT count(*)::int AS n FROM public.role_permissions
     WHERE NOT can_view AND (can_create OR can_update OR can_delete)`,
    (r) => ({ ok: r[0].n === 0, detail: `${r[0].n} incohérences` }),
  );

  console.log('\nFonctions et triggers');
  await check(
    'Fonctions de sécurité avec search_path figé',
    `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%')`,
    (r) => ({ ok: r.length === 0, detail: r.length ? r.map((x) => x.proname).join(', ') : 'toutes sécurisées' }),
  );
  await check(
    'Trigger de création de profil sur auth.users',
    `SELECT count(*)::int AS n FROM pg_trigger WHERE tgname='trig_on_auth_user_created'`,
    (r) => ({ ok: r[0].n === 1, detail: r[0].n ? 'présent' : 'ABSENT' }),
  );
  await check(
    "Journal d'audit inaltérable (aucune politique UPDATE/DELETE)",
    `SELECT count(*)::int AS n FROM pg_policies
     WHERE schemaname='public' AND tablename='audit_logs' AND cmd IN ('UPDATE','DELETE')`,
    (r) => ({ ok: r[0].n === 0, detail: `${r[0].n} politique(s) de modification` }),
  );

  console.log('');
  if (failures > 0) {
    console.log(`${failures} vérification(s) en échec.`);
    process.exit(1);
  }
  console.log('Toutes les vérifications sont concluantes.');
};

main().catch((err) => {
  console.error('Erreur inattendue :', err.message);
  process.exit(1);
});
