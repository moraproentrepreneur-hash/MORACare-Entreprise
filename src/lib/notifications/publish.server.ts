import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase, Json } from '@/types/database';

/**
 * Publication d'un événement dans le Centre de notifications.
 *
 * Tout événement notable de la plateforme passe par ici. La notification est
 * **persistée** : contrairement aux alertes calculées à la volée, elle peut
 * être lue, filtrée et archivée, et elle survit au rechargement de la page.
 *
 * La publication ne doit jamais faire échouer l'opération qui l'a déclenchée.
 * Un établissement créé mais non notifié reste un établissement créé ; une
 * exception ici annulerait un travail réussi pour une raison secondaire. Les
 * échecs sont donc absorbés.
 */

type Client = SupabaseClient<AppDatabase>;

export type NotificationCategory =
  | 'system'
  | 'activation_code'
  | 'registration_request'
  | 'contact_request'
  | 'password_reset'
  | 'establishment_created'
  | 'admin_created'
  | 'subscription_expiry'
  | 'license_expiry'
  | 'critical_error';

export interface NotificationInput {
  category: NotificationCategory;
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  link?: string;
  /** Charge utile consultée dans le détail : code, montants, coordonnées. */
  metadata?: Record<string, unknown>;
  establishmentId?: string | null;
  /** Destinataire précis. Omis : notification de plateforme (Super Admins). */
  userId?: string | null;
  /** Au-delà, la notification n'a plus d'objet — un code expiré, par exemple. */
  expiresAt?: string | null;
}

const insert = async (admin: Client, input: NotificationInput): Promise<string | null> => {
  const { data, error } = await admin
    .from('notifications')
    .insert({
      user_id: input.userId ?? null,
      establishment_id: input.establishmentId ?? null,
      category: input.category,
      severity: input.severity ?? 'info',
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: (input.metadata ?? null) as Json,
      expires_at: input.expiresAt ?? null,
      type: input.severity ?? 'info',
      is_read: false,
      is_archived: false,
    })
    .select('business_reference')
    .single();

  if (error) return null;
  return data.business_reference;
};

/**
 * Notifie les Super Admins.
 *
 * `user_id` reste nul : la notification appartient à la plateforme, pas à une
 * personne. Elle reste donc visible si le Super Admin qui devait la traiter
 * change — ce qu'un destinataire nominatif ne permettrait pas.
 */
export const notifyPlatform = async (
  admin: Client,
  input: Omit<NotificationInput, 'userId'>,
): Promise<string | null> => {
  try {
    return await insert(admin, { ...input, userId: null });
  } catch {
    return null;
  }
};

/** Notifie un utilisateur précis. */
export const notifyUser = async (
  admin: Client,
  userId: string,
  input: Omit<NotificationInput, 'userId'>,
): Promise<string | null> => {
  try {
    return await insert(admin, { ...input, userId });
  } catch {
    return null;
  }
};
