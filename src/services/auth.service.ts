import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from '@/lib/supabase/config';
import type { UserProfile } from '@/types';

export interface AuthResult {
  success: boolean;
  error?: string;
}

/**
 * Message d'erreur unique pour tout échec d'identification.
 *
 * Volontairement générique : distinguer « compte inconnu » de « mot de passe
 * incorrect » permettrait d'énumérer les comptes existants. Et il ne doit
 * évidemment jamais divulguer d'identifiant (CLAUDE.md § Authentification).
 */
const GENERIC_AUTH_ERROR = 'Identifiant ou mot de passe incorrect.';

/**
 * Authentifie un utilisateur par e-mail professionnel et mot de passe
 * (UG01 §3, UG02 §3, UG03 §3).
 */
export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_SETUP_MESSAGE };
  }

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return { success: false, error: GENERIC_AUTH_ERROR };
  }

  return { success: true };
};

export const signOut = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const supabase = createBrowserSupabaseClient();
  await supabase.auth.signOut();
};

/**
 * Charge le profil métier de l'utilisateur authentifié.
 *
 * Renvoie `null` si aucun profil n'est rattaché au compte : l'application doit
 * alors refuser l'accès plutôt que de supposer un rôle.
 */
export const fetchCurrentProfile = async (): Promise<UserProfile | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = createBrowserSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data || data.is_active === false) return null;

  return {
    id: data.id,
    business_reference: data.business_reference,
    username: data.username,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone ?? undefined,
    role: data.role,
    establishment_id: data.establishment_id,
    is_active: data.is_active ?? true,
    avatar_url: data.avatar_url ?? undefined,
    specialty: data.specialty ?? undefined,
    license_number: data.license_number ?? undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

/**
 * S'abonne aux changements d'état d'authentification (connexion, déconnexion,
 * expiration du jeton) pour que l'interface reste synchronisée avec la session.
 */
export const onAuthStateChange = (callback: () => void): (() => void) => {
  if (!isSupabaseConfigured()) return () => undefined;

  const supabase = createBrowserSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => callback());

  return () => subscription.unsubscribe();
};
