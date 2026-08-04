import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from '@/lib/password-policy';
import type { AppDatabase } from '@/types/database';

/**
 * Politique de sécurité effective, lue côté serveur.
 *
 * C'est cette lecture qui fait foi. Le navigateur reçoit la même politique pour
 * guider la saisie, mais elle y est indicative : un client peut mentir, le
 * serveur revalide toujours.
 *
 * En cas d'échec de lecture, on retombe sur les valeurs par défaut — jamais sur
 * une absence de contrainte. Une panne de base ne doit pas ouvrir la porte.
 */

export interface SecuritySettings {
  password: PasswordPolicy;
  passwordExpiryDays: number | null;
  sessionMaxMinutes: number;
  sessionIdleMinutes: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
  auditRetentionDays: number;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'email' | 'totp' | 'whatsapp';
}

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  password: DEFAULT_PASSWORD_POLICY,
  passwordExpiryDays: null,
  sessionMaxMinutes: 720,
  sessionIdleMinutes: 60,
  maxLoginAttempts: 3,
  lockoutMinutes: 15,
  auditRetentionDays: 365,
  twoFactorEnabled: false,
  twoFactorMethod: 'email',
};

type Client = SupabaseClient<AppDatabase>;

/**
 * Charge la politique de la plateforme (`establishment_id IS NULL`).
 *
 * Un établissement peut avoir sa propre ligne ; elle est alors prioritaire.
 * Aucune fusion partielle : une politique mi-globale mi-locale serait
 * impossible à auditer.
 */
export const loadSecuritySettings = async (
  client: Client,
  establishmentId?: string | null,
): Promise<SecuritySettings> => {
  const query = client.from('security_settings').select('*');

  const { data } = establishmentId
    ? await query.eq('establishment_id', establishmentId).maybeSingle()
    : await query.is('establishment_id', null).maybeSingle();

  // L'établissement n'a pas de politique propre : celle de la plateforme
  // s'applique.
  if (!data && establishmentId) {
    return loadSecuritySettings(client, null);
  }

  if (!data) return DEFAULT_SECURITY_SETTINGS;

  return {
    password: {
      minLength: data.password_min_length,
      requireUppercase: data.password_require_uppercase,
      requireLowercase: data.password_require_lowercase,
      requireDigit: data.password_require_digit,
      requireSpecial: data.password_require_special,
    },
    passwordExpiryDays: data.password_expiry_days,
    sessionMaxMinutes: data.session_max_minutes,
    sessionIdleMinutes: data.session_idle_minutes,
    maxLoginAttempts: data.max_login_attempts,
    lockoutMinutes: data.lockout_minutes,
    auditRetentionDays: data.audit_retention_days,
    twoFactorEnabled: data.two_factor_enabled,
    twoFactorMethod: (data.two_factor_method as SecuritySettings['twoFactorMethod']) ?? 'email',
  };
};
