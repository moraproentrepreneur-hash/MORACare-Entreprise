import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase/config';
import { loadSecuritySettings } from '@/lib/security/settings.server';
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
 *
 * Cette route porte aussi la protection contre le bourrage d'identifiants :
 * comptage des échecs, verrouillage temporaire, journalisation systématique.
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

/** Adresse du client, telle que la voit le proxy. Indicative, jamais probante. */
const clientAddress = (request: Request): string =>
  (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
  request.headers.get('x-real-ip') ||
  'inconnue';

const minutesUntil = (iso: string): number =>
  Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 60_000));

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
  const normalized = identifier.toLowerCase();

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json(
      { error: "Le service d'authentification est momentanément indisponible." },
      { status: 503 },
    );
  }

  const settings = await loadSecuritySettings(admin, null);
  const userAgent = request.headers.get('user-agent') ?? null;
  const ip = clientAddress(request);

  /** Journalise la tentative. Un échec d'écriture ne doit pas ouvrir l'accès. */
  const record = async (
    succeeded: boolean,
    profileId: string | null,
    reason?: string,
  ): Promise<void> => {
    await admin
      .from('login_attempts')
      .insert({
        identifier: normalized,
        profile_id: profileId,
        succeeded,
        failure_reason: reason ?? null,
        ip_address: ip,
        user_agent: userAgent,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  };

  /*
   * Le profil porte le compteur d'échecs et l'éventuel verrou : c'est la source
   * de vérité du verrouillage.
   *
   * La colonne interrogée est choisie selon la forme de la saisie, plutôt que
   * par un filtre `or()` composé à partir d'elle : la valeur vient du visiteur,
   * et le langage de filtre de PostgREST interprète virgules et parenthèses.
   * Un `.eq()` transmet la valeur comme paramètre, sans l'analyser.
   */
  const column = looksLikeEmail(identifier) ? 'email' : 'username';

  const { data: profile } = await admin
    .from('profiles')
    .select(
      'id, email, username, is_active, failed_login_attempts, locked_until, must_change_password, activation_required',
    )
    .eq(column, normalized)
    .is('deleted_at', null)
    .maybeSingle();

  // Compte verrouillé : on refuse avant même de vérifier le mot de passe. Le
  // délai restant est annoncé — le taire n'ajouterait aucune sécurité et
  // laisserait l'utilisateur croire à une panne.
  if (profile?.locked_until && new Date(profile.locked_until).getTime() > Date.now()) {
    await record(false, profile.id, 'locked');
    const minutes = minutesUntil(profile.locked_until);
    return NextResponse.json(
      {
        error: `Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
        locked: true,
        lockedMinutes: minutes,
      },
      { status: 423 },
    );
  }

  if (!profile || profile.is_active === false) {
    // Identifiant inconnu ou compte désactivé : réponse identique à un mot de
    // passe erroné, mais la tentative est tout de même journalisée — c'est
    // précisément le signal d'une énumération.
    await record(false, profile?.id ?? null, profile ? 'inactive' : 'unknown_identifier');
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const email = profile.email;

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
    const attempts = (profile.failed_login_attempts ?? 0) + 1;
    const reachedLimit = attempts >= settings.maxLoginAttempts;
    const lockedUntil = reachedLimit
      ? new Date(Date.now() + settings.lockoutMinutes * 60_000).toISOString()
      : null;

    await admin
      .from('profiles')
      .update({
        failed_login_attempts: reachedLimit ? 0 : attempts,
        locked_until: lockedUntil,
      })
      .eq('id', profile.id);

    await record(false, profile.id, reachedLimit ? 'locked_out' : 'bad_password');

    if (reachedLimit) {
      // Journal d'audit : un verrouillage est un événement de sécurité, pas un
      // simple échec de saisie.
      await admin.from('audit_logs').insert({
        establishment_id: null,
        user_id: profile.id,
        action: 'account_locked',
        entity_name: 'profiles',
        entity_id: profile.id,
        new_values: { attempts: settings.maxLoginAttempts, minutes: settings.lockoutMinutes },
        ip_address: ip,
      });

      return NextResponse.json(
        {
          error: `Compte verrouillé après ${settings.maxLoginAttempts} tentatives. Réessayez dans ${settings.lockoutMinutes} minutes.`,
          locked: true,
          lockedMinutes: settings.lockoutMinutes,
        },
        { status: 423 },
      );
    }

    const left = settings.maxLoginAttempts - attempts;
    return NextResponse.json(
      {
        error: `${GENERIC_ERROR} Il vous reste ${left} tentative${left > 1 ? 's' : ''} avant verrouillage.`,
        attemptsLeft: left,
      },
      { status: 401 },
    );
  }

  // Succès : le compteur repart de zéro, sans quoi trois échecs étalés sur des
  // semaines finiraient par verrouiller un utilisateur légitime.
  await admin
    .from('profiles')
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  await record(true, profile.id);

  return NextResponse.json({
    success: true,
    mustChangePassword: profile.must_change_password === true,
    activationRequired: profile.activation_required === true,
  });
}
