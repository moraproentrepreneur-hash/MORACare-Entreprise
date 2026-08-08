import { failIf, getClient } from './base.service';
import type { Json } from '@/types/database';

/**
 * Centre de notifications.
 *
 * Toutes les notifications sont des lignes de la table `notifications` : elles
 * se marquent lues, s'archivent et se restaurent de la même façon, quel que
 * soit le destinataire. La portée est décidée par les seules politiques RLS —
 * le Super Admin voit la plateforme entière, le responsable d'établissement sa
 * structure, chacun ses notifications nominatives.
 *
 * Il en allait autrement jusqu'ici. Les échéances d'abonnement et de licence
 * étaient recalculées à chaque lecture et présentées comme des notifications
 * sans exister en base. N'ayant pas de ligne, elles n'étaient ni marquables ni
 * archivables : le menu d'actions se réduisait à « consulter », et le filtre
 * « Archivées » ne pouvait rien montrer puisque rien n'était archivable.
 *
 * Le défaut ne se voyait que côté Super Admin : sa liste est presque
 * entièrement faite d'échéances, là où celle d'un responsable est surtout faite
 * d'événements réels. Les échéances sont désormais émises et persistées par la
 * base, aux paliers 30, 7, 3 jours puis à l'expiration.
 */

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

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  reference: string | null;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  createdAt: string;
  expiresAt: string | null;
  href?: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  isArchived: boolean;
  /** Identifiant de la ligne en base. */
  rowId: string;
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  system: 'Système',
  activation_code: "Code d'activation",
  registration_request: 'Demande d’abonnement',
  contact_request: 'Prise de contact',
  password_reset: 'Réinitialisation',
  establishment_created: 'Établissement créé',
  admin_created: 'Compte créé',
  subscription_expiry: 'Abonnement',
  license_expiry: 'Licence',
  critical_error: 'Erreur critique',
};

const asCategory = (value: string): NotificationCategory =>
  (value in CATEGORY_LABELS ? value : 'system') as NotificationCategory;

const asSeverity = (value: string | null): NotificationSeverity =>
  value === 'warning' || value === 'critical' ? value : 'info';

const asMetadata = (value: Json | null): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

// ---------------------------------------------------------------------------
// Événements persistés
// ---------------------------------------------------------------------------

export interface NotificationQuery {
  /** Inclure les notifications archivées. Par défaut, elles sont masquées. */
  includeArchived?: boolean;
  limit?: number;
}

const loadStoredNotifications = async (
  query: NotificationQuery = {},
): Promise<AppNotification[]> => {
  let request = getClient()
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(query.limit ?? 200);

  if (!query.includeArchived) {
    request = request.eq('is_archived', false);
  }

  const { data, error } = await request;
  failIf(error, 'Chargement des notifications');

  return (data ?? []).map((row) => ({
    id: `stored:${row.id}`,
    rowId: row.id,
    reference: row.business_reference,
    title: row.title,
    message: row.message,
    category: asCategory(row.category),
    severity: asSeverity(row.severity),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    href: row.link ?? undefined,
    metadata: asMetadata(row.metadata),
    isRead: row.is_read,
    isArchived: row.is_archived,
  }));
};

export const markNotificationRead = async (rowId: string, isRead = true): Promise<void> => {
  const { error } = await getClient()
    .from('notifications')
    .update({ is_read: isRead, read_at: isRead ? new Date().toISOString() : null })
    .eq('id', rowId);

  failIf(error, 'Mise à jour de la notification');
};

export const archiveNotification = async (rowId: string, isArchived = true): Promise<void> => {
  const now = new Date().toISOString();
  const { error } = await getClient()
    .from('notifications')
    .update({
      is_archived: isArchived,
      archived_at: isArchived ? now : null,
      // Archiver, c'est avoir traité : la marquer non lue n'aurait plus de sens.
      ...(isArchived ? { is_read: true, read_at: now } : {}),
    })
    .eq('id', rowId);

  failIf(error, 'Archivage de la notification');
};

export const markAllNotificationsRead = async (): Promise<void> => {
  const { error } = await getClient()
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false)
    .eq('is_archived', false);

  failIf(error, 'Mise à jour des notifications');
};

/**
 * Publie un événement depuis le navigateur.
 *
 * Réservé aux actions déjà effectuées côté client par un Super Admin — la
 * création d'un établissement, par exemple. Les événements déclenchés par un
 * Route Handler sont publiés côté serveur, au plus près de leur origine.
 */
export const publishPlatformNotification = async (input: {
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  establishmentId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> => {
  const { error } = await getClient().from('notifications').insert({
    user_id: null,
    establishment_id: input.establishmentId ?? null,
    category: input.category,
    severity: input.severity ?? 'info',
    type: input.severity ?? 'info',
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    metadata: (input.metadata ?? null) as Json,
    is_read: false,
    is_archived: false,
  });

  // Une notification manquée ne doit pas faire échouer l'action qui l'a
  // déclenchée : l'établissement créé reste créé.
  if (error) return;
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

/**
 * Émet les alertes d'échéance dues.
 *
 * Appelée à l'ouverture du Centre : la fonction PostgreSQL est rejouable sans
 * produire de doublon, ce qui évite de dépendre d'un ordonnanceur externe que
 * l'hébergement ne garantit pas. Elle couvre les paliers 30, 7 et 3 jours, le
 * jour de l'échéance, puis l'expiration constatée — pour les abonnements comme
 * pour les licences.
 */
export const emitExpiryAlerts = async (): Promise<void> => {
  await getClient().rpc('emit_subscription_expiry_alerts');
};

/**
 * Charge les notifications visibles par l'utilisateur courant.
 *
 * Aucun filtrage par rôle ici : les politiques RLS s'en chargent, et les
 * dupliquer côté client ferait diverger les deux au premier changement. Le
 * Super Admin et le responsable d'établissement exécutent donc exactement la
 * même requête, et disposent des mêmes actions sur ce qu'elle leur renvoie.
 */
export const loadNotifications = async (
  query: NotificationQuery = {},
): Promise<AppNotification[]> => {
  // Les échéances franchies depuis la dernière consultation sont matérialisées
  // avant la lecture, afin d'apparaître dans la liste qui suit. L'échec est
  // absorbé : ne pas pouvoir produire une alerte ne doit pas empêcher de
  // consulter les notifications existantes.
  try {
    await emitExpiryAlerts();
  } catch {
    // Absorbé volontairement : voir ci-dessus.
  }

  return loadStoredNotifications(query);
};

export const unreadCount = (notifications: readonly AppNotification[]): number =>
  notifications.filter((item) => !item.isRead && !item.isArchived).length;
