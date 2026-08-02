import { NextResponse } from 'next/server';
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase/config';

/**
 * Diagnostic de configuration du déploiement.
 *
 * Répond à une question simple et jusqu'ici impossible à trancher sans deviner :
 * *ce déploiement voit-il ses variables d'environnement ?*
 *
 * Aucune valeur sensible n'est renvoyée — uniquement la présence des variables,
 * leur longueur et un préfixe. Un secret ne peut pas être reconstitué à partir
 * de ces informations, mais elles suffisent à distinguer « variable absente »
 * de « variable erronée ».
 */

export const dynamic = 'force-dynamic';

/** Décrit une variable sans jamais en révéler la valeur. */
const describe = (value: string | undefined) => {
  if (!value) return { defini: false };
  return {
    defini: true,
    longueur: value.length,
    prefixe: value.slice(0, 12),
  };
};

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const configure = isSupabaseConfigured() && Boolean(serviceRoleKey);

  return NextResponse.json(
    {
      configure,
      // Ces trois variables sont indispensables au fonctionnement.
      variables: {
        NEXT_PUBLIC_SUPABASE_URL: describe(SUPABASE_URL || undefined),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: describe(SUPABASE_ANON_KEY || undefined),
        SUPABASE_SERVICE_ROLE_KEY: describe(serviceRoleKey),
      },
      // `NEXT_PUBLIC_*` est figée dans le bundle au moment du build : ajouter la
      // variable sans reconstruire ne change rien côté navigateur.
      construitLe: process.env.VERCEL_DEPLOYMENT_ID ? undefined : 'local',
      environnement: process.env.VERCEL_ENV ?? 'local',
      remarque: configure
        ? 'Configuration complète.'
        : "Variables manquantes : renseignez-les dans Vercel puis redéployez SANS cache de build (les variables NEXT_PUBLIC_ sont figées à la compilation).",
    },
    { status: configure ? 200 : 503 },
  );
}
