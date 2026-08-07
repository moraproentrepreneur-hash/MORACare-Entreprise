import { failIf, getClient } from './base.service';
import type { UserRole } from '@/types';
import type { Json } from '@/types/database';
import type { EstablishmentLicense, EstablishmentSubscription } from './access.service';

/**
 * Centre de notifications.
 *
 * Deux natures de notifications coexistent, et la distinction est structurante :
 *
 *   - les **événements**, enregistrés en base au moment où ils se produisent :
 *     une demande déposée, un code émis, un compte créé. Ils ont eu lieu une
 *     fois, à un instant donné ; on peut donc les marquer lus et les archiver.
 *
 *   - les **états**, recalculés à chaque lecture : un abonnement qui arrive à
 *     échéance, une licence expirée. Les archiver n'aurait aucun sens — la
 *     situation, elle, persisterait. Ils disparaissent d'eux-mêmes quand la
 *     situation est résolue.
 *
 * Le Centre les présente ensemble, mais n'offre les actions de lecture et
 * d'archivage que sur les premiers.
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
  /** Ligne de `notifications` : absente pour un état recalculé. */
  rowId?: string;
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

const DAY = 86_400_000;
/** Seuil d'alerte avant échéance : un mois pour renouveler sans urgence. */
const EXPIRY_WARNING_DAYS = 30;

const daysUntil = (date: string): number => Math.ceil((new Date(date).getTime() - Date.now()) / DAY);

const expiryPhrase = (days: number): string => {
  if (days < 0) return `échéance dépassée depuis ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
  if (days === 0) return "échéance aujourd'hui";
  return `échéance dans ${days} jour${days > 1 ? 's' : ''}`;
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
// États recalculés
// ---------------------------------------------------------------------------

const loadPlatformExpiries = async (): Promise<AppNotification[]> => {
  const client = getClient();

  const [subscriptions, licenses] = await Promise.all([
    client
      .from('subscriptions')
      .select('id, end_date, status, establishment:establishments(name)')
      .not('end_date', 'is', null)
      .in('status', ['active', 'pending'])
      .is('deleted_at', null)
      .order('end_date')
      .limit(50),
    client
      .from('licenses')
      .select('id, license_number, expires_at, status, establishment:establishments(name)')
      .not('expires_at', 'is', null)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('expires_at')
      .limit(50),
  ]);

  failIf(subscriptions.error, 'Chargement des abonnements');
  failIf(licenses.error, 'Chargement des licences');

  const alerts: AppNotification[] = [];

  for (const row of subscriptions.data ?? []) {
    if (!row.end_date) continue;
    const days = daysUntil(row.end_date);
    if (days > EXPIRY_WARNING_DAYS) continue;

    const joined = row as unknown as { establishment?: { name: string } | null };
    alerts.push({
      id: `subscription:${row.id}`,
      reference: null,
      title: days < 0 ? 'Abonnement expiré' : 'Abonnement bientôt expiré',
      message: `${joined.establishment?.name ?? 'Établissement'} — ${expiryPhrase(days)}`,
      category: 'subscription_expiry',
      severity: days < 0 ? 'critical' : 'warning',
      createdAt: row.end_date,
      expiresAt: null,
      href: '/admin/abonnements',
      metadata: null,
      isRead: false,
      isArchived: false,
    });
  }

  for (const row of licenses.data ?? []) {
    if (!row.expires_at) continue;
    const days = daysUntil(row.expires_at);
    if (days > EXPIRY_WARNING_DAYS) continue;

    const joined = row as unknown as { establishment?: { name: string } | null };
    alerts.push({
      id: `license:${row.id}`,
      reference: row.license_number,
      title: days < 0 ? 'Licence expirée' : 'Licence bientôt expirée',
      message: `${joined.establishment?.name ?? 'Établissement'} — ${expiryPhrase(days)}`,
      category: 'license_expiry',
      severity: days < 0 ? 'critical' : 'warning',
      createdAt: row.expires_at,
      expiresAt: null,
      href: '/admin/abonnements',
      metadata: null,
      isRead: false,
      isArchived: false,
    });
  }

  return alerts;
};

/**
 * Alertes de l'établissement, déduites de son contrat.
 *
 * Elles s'appuient sur le snapshot déjà chargé par `AccessContext` : aucune
 * requête supplémentaire, et surtout aucune lecture d'une table que le rôle
 * n'a pas le droit de consulter.
 */
const buildEstablishmentAlerts = (
  subscription: EstablishmentSubscription | null,
  license: EstablishmentLicense | null,
): AppNotification[] => {
  const alerts: AppNotification[] = [];

  const push = (
    id: string,
    title: string,
    message: string,
    severity: NotificationSeverity,
    createdAt: string,
    category: NotificationCategory,
  ) =>
    alerts.push({
      id,
      reference: null,
      title,
      message,
      category,
      severity,
      createdAt,
      expiresAt: null,
      href: '/settings',
      metadata: null,
      isRead: false,
      isArchived: false,
    });

  if (subscription?.endDate) {
    const days = daysUntil(subscription.endDate);
    if (days <= EXPIRY_WARNING_DAYS) {
      push(
        'subscription:self',
        days < 0 ? 'Votre abonnement a expiré' : 'Votre abonnement arrive à échéance',
        `Formule ${subscription.planName} — ${expiryPhrase(days)}. Aucune donnée n'est supprimée.`,
        days < 0 ? 'critical' : 'warning',
        subscription.endDate,
        'subscription_expiry',
      );
    }
  }

  if (license?.expiresAt) {
    const days = daysUntil(license.expiresAt);
    if (days <= EXPIRY_WARNING_DAYS) {
      push(
        'license:self',
        days < 0 ? 'Votre licence a expiré' : 'Votre licence arrive à échéance',
        `Licence ${license.licenseNumber} — ${expiryPhrase(days)}.`,
        days < 0 ? 'critical' : 'warning',
        license.expiresAt,
        'license_expiry',
      );
    }
  }

  if (subscription && subscription.status !== 'active') {
    push(
      'subscription:status',
      "L'abonnement n'est pas actif",
      `Statut actuel : ${subscription.status}. Contactez MORA Shawiri.`,
      'warning',
      subscription.startDate,
      'subscription_expiry',
    );
  }

  return alerts;
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export interface NotificationContext {
  role: UserRole;
  subscription: EstablishmentSubscription | null;
  license: EstablishmentLicense | null;
}

/**
 * Émet les alertes d'échéance dues (J-7 et J-3).
 *
 * Appelée à l'ouverture du Centre : la fonction PostgreSQL est rejouable sans
 * produire de doublon, ce qui évite de dépendre d'un ordonnanceur externe que
 * l'hébergement ne garantit pas. L'échec est absorbé — ne pas pouvoir produire
 * une alerte ne doit pas empêcher de consulter les notifications existantes.
 */
export const emitExpiryAlerts = async (): Promise<void> => {
  await getClient().rpc('emit_subscription_expiry_alerts');
};

export const loadNotifications = async (
  context: NotificationContext,
  query: NotificationQuery = {},
): Promise<AppNotification[]> => {
  // Les échéances franchies depuis la dernière consultation sont matérialisées
  // avant la lecture, afin d'apparaître dans la liste qui suit.
  try {
    await emitExpiryAlerts();
  } catch {
    // Absorbé volontairement : voir ci-dessus.
  }

  const stored = await loadStoredNotifications(query);

  const derived =
    context.role === 'super_admin'
      ? await loadPlatformExpiries()
      : buildEstablishmentAlerts(context.subscription, context.license);

  return [...stored, ...derived].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const unreadCount = (notifications: readonly AppNotification[]): number =>
  notifications.filter((item) => !item.isRead && !item.isArchived).length;
