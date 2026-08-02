import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';
import type { AppDatabase } from '@/types/database';

/**
 * Connexion par e-mail **ou** nom d'utilisateur (UG02 §6).
 *
 * Supabase Auth n'authentifie que par e-mail. Le personnel d'un établissement
 * ne connaît pas nécessairement l'adresse associée à son compte : son
 * identifiant lui est communiqué par le responsable. La résolution
 * identifiant → e-mail doit donc avoir lieu quelque part.
 *
 * Elle est faite **côté serveur**, jamais côté navigateur : exposer une route
 * publique qui traduit un identifiant en adresse e-mail permettrait d'énumérer
 * les comptes et de récolter les adresses du personnel soignant. Le serveur
 * résout, authentifie, et ne renvoie que le résultat.
 */

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Identifiant requis.').max(255),
  password: z.string().min(1, 'Mot de passe requis.'),
});

/**
 * Message unique pour tout échec.
 *
 * Distinguer « compte inconnu » de « mot de passe incorrect » permettrait de
 * découvrir quels identifiants existent.
 */
const GENERIC_ERROR = 'Identifiant ou mot de passe incorrect.';

const looksLikeEmail = (value: string): boolean => value.includes('@');

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "La connexion à la base de données n'est pas configurée sur ce serveur. " +
          'Contactez votre administrateur.',
      },
      { status: 503 },
    );
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { identifier, password } = parsed.data;
  let email = identifier.toLowerCase();

  // Identifiant qui n'est pas une adresse : on le résout en base.
  if (!looksLikeEmail(identifier)) {
    let admin;
    try {
      admin = createAdminSupabaseClient();
    } catch {
      return NextResponse.json(
        { error: "La connexion par identifiant n'est pas disponible sur ce serveur." },
        { status: 503 },
      );
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email, is_active')
      .eq('username', identifier.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle();

    // Compte inconnu ou désactivé : même réponse qu'un mot de passe erroné.
    if (!profile || profile.is_active === false) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    email = profile.email;
  }

  // L'authentification s'effectue avec la clé publiable, comme depuis le
  // navigateur : la session est écrite dans les cookies, que le client
  // Supabase du navigateur relira ensuite.
  const cookieStore = cookies();

  const supabase = createServerClient<AppDatabase>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
