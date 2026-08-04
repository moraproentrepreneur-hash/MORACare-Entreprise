import { failIf, getClient } from './base.service';
import { DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from '@/lib/password-policy';
import type { Database, LoginAttemptRow } from '@/types/database';

type SecuritySettingsUpdate = Database['public']['Tables']['security_settings']['Update'];

/**
 * Paramètres de sécurité de la plateforme.
 *
 * Ce service alimente le centre de sécurité du Super Admin. Les valeurs qu'il
 * écrit sont celles que le serveur applique réellement : la politique des mots
 * de passe, le verrouillage et la rétention sont relus en base à chaque
 * connexion et à chaque changement de mot de passe. Modifier un champ ici change
 * le comportement de l'application, pas seulement son affichage.
 */

export interface SecurityConfiguration {
  id: string;
  establishmentId: string | null;
  password: PasswordPolicy;
  passwordExpiryDays: number | null;
  sessionMaxMinutes: number;
  sessionIdleMinutes: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  auditRetentionDays: number;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'email' | 'totp' | 'whatsapp';
  updatedAt: string;
}

const toConfiguration = (row: {
  id: string;
  establishment_id: string | null;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_lowercase: boolean;
  password_require_digit: boolean;
  password_require_special: boolean;
  password_expiry_days: number | null;
  session_max_minutes: number;
  session_idle_minutes: number;
  max_login_attempts: number;
  lockout_minutes: number;
  audit_retention_days: number;
  two_factor_enabled: boolean;
  two_factor_method: string;
  updated_at: string;
}): SecurityConfiguration => ({
  id: row.id,
  establishmentId: row.establishment_id,
  password: {
    minLength: row.password_min_length,
    requireUppercase: row.password_require_uppercase,
    requireLowercase: row.password_require_lowercase,
    requireDigit: row.password_require_digit,
    requireSpecial: row.password_require_special,
  },
  passwordExpiryDays: row.password_expiry_days,
  sessionMaxMinutes: row.session_max_minutes,
  sessionIdleMinutes: row.session_idle_minutes,
  maxLoginAttempts: row.max_login_attempts,
  lockoutMinutes: row.lockout_minutes,
  auditRetentionDays: row.audit_retention_days,
  twoFactorEnabled: row.two_factor_enabled,
  twoFactorMethod: (row.two_factor_method as SecurityConfiguration['twoFactorMethod']) ?? 'email',
  updatedAt: row.updated_at,
});

/** Politique de la plateforme : la ligne sans établissement. */
export const getPlatformSecurity = async (): Promise<SecurityConfiguration | null> => {
  const { data, error } = await getClient()
    .from('security_settings')
    .select('*')
    .is('establishment_id', null)
    .maybeSingle();

  failIf(error, 'Chargement des paramètres de sécurité');
  return data ? toConfiguration(data) : null;
};

export interface SecurityUpdate {
  password?: Partial<PasswordPolicy>;
  passwordExpiryDays?: number | null;
  sessionMaxMinutes?: number;
  sessionIdleMinutes?: number;
  maxLoginAttempts?: number;
  lockoutMinutes?: number;
  auditRetentionDays?: number;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: SecurityConfiguration['twoFactorMethod'];
}

export const updatePlatformSecurity = async (
  settingsId: string,
  changes: SecurityUpdate,
  userId: string,
): Promise<void> => {
  // Typé depuis le schéma généré : une colonne renommée en base fait échouer la
  // compilation plutôt que de produire une mise à jour silencieusement vide.
  const payload: SecuritySettingsUpdate = { updated_by: userId };

  if (changes.password) {
    const policy = { ...DEFAULT_PASSWORD_POLICY, ...changes.password };
    payload.password_min_length = policy.minLength;
    payload.password_require_uppercase = policy.requireUppercase;
    payload.password_require_lowercase = policy.requireLowercase;
    payload.password_require_digit = policy.requireDigit;
    payload.password_require_special = policy.requireSpecial;
  }

  if (changes.passwordExpiryDays !== undefined) {
    payload.password_expiry_days = changes.passwordExpiryDays;
  }
  if (changes.sessionMaxMinutes !== undefined) payload.session_max_minutes = changes.sessionMaxMinutes;
  if (changes.sessionIdleMinutes !== undefined) {
    payload.session_idle_minutes = changes.sessionIdleMinutes;
  }
  if (changes.maxLoginAttempts !== undefined) payload.max_login_attempts = changes.maxLoginAttempts;
  if (changes.lockoutMinutes !== undefined) payload.lockout_minutes = changes.lockoutMinutes;
  if (changes.auditRetentionDays !== undefined) {
    payload.audit_retention_days = changes.auditRetentionDays;
  }
  if (changes.twoFactorEnabled !== undefined) payload.two_factor_enabled = changes.twoFactorEnabled;
  if (changes.twoFactorMethod !== undefined) payload.two_factor_method = changes.twoFactorMethod;

  const { error } = await getClient()
    .from('security_settings')
    .update(payload)
    .eq('id', settingsId);

  failIf(error, 'Mise à jour des paramètres de sécurité');
};

// ---------------------------------------------------------------------------
// Tentatives de connexion
// ---------------------------------------------------------------------------

export interface LoginAttempt {
  id: string;
  identifier: string;
  succeeded: boolean;
  failureReason: string | null;
  ipAddress: string;
  createdAt: string;
}

const FAILURE_LABELS: Record<string, string> = {
  unknown_identifier: 'Identifiant inconnu',
  bad_password: 'Mot de passe incorrect',
  inactive: 'Compte désactivé',
  locked: 'Compte verrouillé',
  locked_out: 'Verrouillage déclenché',
};

export const describeFailure = (reason: string | null): string =>
  reason ? (FAILURE_LABELS[reason] ?? reason) : '—';

export const listRecentLoginAttempts = async (limit = 50): Promise<LoginAttempt[]> => {
  const { data, error } = await getClient()
    .from('login_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  failIf(error, 'Chargement des tentatives de connexion');

  return (data ?? []).map((row: LoginAttemptRow) => ({
    id: row.id,
    identifier: row.identifier,
    succeeded: row.succeeded,
    failureReason: row.failure_reason,
    ipAddress: row.ip_address ?? '—',
    createdAt: row.created_at,
  }));
};

// ---------------------------------------------------------------------------
// Comptes verrouillés
// ---------------------------------------------------------------------------

export interface LockedAccount {
  id: string;
  fullName: string;
  username: string;
  email: string;
  lockedUntil: string;
  failedAttempts: number;
}

export const listLockedAccounts = async (): Promise<LockedAccount[]> => {
  const { data, error } = await getClient()
    .from('profiles')
    .select('id, first_name, last_name, username, email, locked_until, failed_login_attempts')
    .not('locked_until', 'is', null)
    .gt('locked_until', new Date().toISOString())
    .is('deleted_at', null);

  failIf(error, 'Chargement des comptes verrouillés');

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    username: row.username,
    email: row.email,
    lockedUntil: row.locked_until as string,
    failedAttempts: row.failed_login_attempts,
  }));
};

/** Lève un verrouillage sans attendre son expiration. */
export const unlockAccount = async (userId: string): Promise<void> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlock: true }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Déverrouillage impossible.');
  }
};

// ---------------------------------------------------------------------------
// Rétention
// ---------------------------------------------------------------------------

/**
 * Applique la politique de rétention.
 *
 * La suppression est faite par une fonction PostgreSQL : elle porte la règle au
 * plus près des données, et reste exécutable par une tâche planifiée le jour où
 * la purge devra être automatique.
 */
export const purgeExpiredAuditLogs = async (): Promise<number> => {
  const { data, error } = await getClient().rpc('purge_expired_audit_logs');
  failIf(error, 'Purge du journal d’audit');
  return typeof data === 'number' ? data : 0;
};
