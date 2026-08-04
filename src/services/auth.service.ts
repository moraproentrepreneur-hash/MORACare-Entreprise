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
 * Authentifie un utilisateur par **e-mail ou nom d'utilisateur** (UG02 §6).
 *
 * L'appel passe par `/api/auth/login` : Supabase Auth n'authentifie que par
 * e-mail, et la résolution identifiant → adresse doit rester côté serveur pour
 * ne pas exposer les adresses du personnel. Le serveur écrit la session dans
 * les cookies, que le client Supabase du navigateur relit ensuite.
 */
export const signIn = async (identifier: string, password: string): Promise<AuthResult> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_SETUP_MESSAGE };
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return { success: false, error: payload?.error ?? GENERIC_AUTH_ERROR };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: 'Le serveur est injoignable. Vérifiez votre connexion et réessayez.',
    };
  }
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
    must_change_password: data.must_change_password === true,
    activation_required: data.activation_required === true,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

/**
 * Dépose une demande de réinitialisation de mot de passe.
 *
 * Passe par le serveur : la résolution d'un identifiant vers un compte ne doit
 * jamais avoir lieu dans le navigateur. La réponse est identique que le compte
 * existe ou non — c'est volontaire, et la promesse résolue ne dit donc rien de
 * l'existence du compte.
 */
export const requestPasswordReset = async (identifier: string): Promise<string> => {
  const response = await fetch('/api/auth/password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier.trim() }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Votre demande n'a pas pu être enregistrée.");
  }

  return (
    payload?.message ??
    'Votre demande a été enregistrée. Elle sera traitée par un administrateur.'
  );
};

/** Changement de mot de passe par son titulaire (première connexion incluse). */
export const changeOwnPassword = async (
  currentPassword: string,
  newPassword: string,
): Promise<void> => {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Le mot de passe n’a pas pu être modifié.');
  }
};

export interface ActivationDispatch {
  delivered: boolean;
  /** Adresse partiellement masquée, pour confirmer la destination sans la révéler. */
  email: string;
  validMinutes: number;
}

/** Demande l'envoi (ou le renvoi) du code d'activation. */
export const sendActivationCode = async (): Promise<ActivationDispatch> => {
  const response = await fetch('/api/auth/activation', { method: 'POST' });
  const payload = (await response.json().catch(() => null)) as
    | (ActivationDispatch & { error?: string })
    | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error ?? "Le code n'a pas pu être envoyé.");
  }

  return { delivered: payload.delivered, email: payload.email, validMinutes: payload.validMinutes };
};

/** Vérifie le code d'activation et débloque le compte. */
export const verifyActivationCode = async (code: string): Promise<void> => {
  const response = await fetch('/api/auth/activation', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Code incorrect.');
  }
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
