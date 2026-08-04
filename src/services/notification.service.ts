import { failIf, getClient } from './base.service';
import type { UserRole } from '@/types';
import type { EstablishmentLicense, EstablishmentSubscription } from './access.service';

/**
 * Fil de notifications de l'utilisateur connecté.
 *
 * Une notification n'est pas nécessairement une ligne de la table
 * `notifications` : la plupart des alertes utiles — une demande sans réponse,
 * un abonnement qui arrive à échéance — sont des *états* de la base, pas des
 * messages qu'il faudrait penser à écrire. Les recalculer à l'ouverture du
 * panneau garantit qu'ils sont exacts, et qu'aucun événement manqué ne reste
 * invisible faute d'avoir été notifié au bon moment.
 *
 * Le périmètre suit le rôle : le Super Admin voit la vie de la plateforme, un
 * utilisateur d'établissement ne voit que la sienne. Les politiques RLS le
 * garantissent de toute façon côté base.
 */

export type NotificationSource =
  | 'system'
  | 'registration'
  | 'contact'
  | 'password_reset'
  | 'subscription'
  | 'license';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  source: NotificationSource;
  severity: NotificationSeverity;
  createdAt: string;
  /** Écran à ouvrir au clic. */
  href?: string;
  /** Ligne de `notifications` correspondante, si l'alerte en est une. */
  rowId?: string;
  isRead: boolean;
}

const DAY = 86_400_000;
/** Seuil d'alerte avant échéance : un mois pour renouveler sans urgence. */
const EXPIRY_WARNING_DAYS = 30;

const daysUntil = (date: string): number => Math.ceil((new Date(date).getTime() - Date.now()) / DAY);

const expiryPhrase = (days: number): string => {
  if (days < 0) return `échéance dépassée depuis ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
  if (days === 0) return "échéance aujourd'hui";
  return `échéance dans ${days} jour${days > 1 ? 's' : ''}`;
};

// ---------------------------------------------------------------------------
// Messages système (table `notifications`)
// ---------------------------------------------------------------------------

const loadSystemNotifications = async (userId: string): Promise<AppNotification[]> => {
  const { data, error } = await getClient()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  failIf(error, 'Chargement des notifications');

  return (data ?? []).map((row) => ({
    id: `system:${row.id}`,
    rowId: row.id,
    title: row.title,
    message: row.message,
    source: 'system' as const,
    severity: row.type === 'error' ? 'critical' : row.type === 'warning' ? 'warning' : 'info',
    createdAt: row.created_at,
    isRead: row.is_read === true,
  }));
};

export const markNotificationRead = async (rowId: string): Promise<void> => {
  const { error } = await getClient().from('notifications').update({ is_read: true }).eq('id', rowId);
  failIf(error, 'Mise à jour de la notification');
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  failIf(error, 'Mise à jour des notifications');
};

// ---------------------------------------------------------------------------
// Alertes de la plateforme (Super Admin)
// ---------------------------------------------------------------------------

const loadPlatformAlerts = async (): Promise<AppNotification[]> => {
  const client = getClient();

  const [requests, contacts, resets, subscriptions, licenses] = await Promise.all([
    client
      .from('registration_requests')
      .select('id, business_reference, establishment_name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .from('contact_requests')
      .select('id, business_reference, full_name, subject, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .from('password_reset_requests')
      .select('id, business_reference, identifier, full_name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .from('subscriptions')
      .select('id, end_date, status, establishment:establishments(name)')
      .not('end_date', 'is', null)
      .in('status', ['active', 'pending'])
      .is('deleted_at', null)
      .order('end_date')
      .limit(20),
    client
      .from('licenses')
      .select('id, license_number, expires_at, status, establishment:establishments(name)')
      .not('expires_at', 'is', null)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('expires_at')
      .limit(20),
  ]);

  failIf(requests.error, 'Chargement des demandes');
  failIf(contacts.error, 'Chargement des prises de contact');
  failIf(resets.error, 'Chargement des demandes de réinitialisation');
  failIf(subscriptions.error, 'Chargement des abonnements');
  failIf(licenses.error, 'Chargement des licences');

  const alerts: AppNotification[] = [];

  for (const row of requests.data ?? []) {
    alerts.push({
      id: `registration:${row.id}`,
      title: 'Nouvelle demande de démonstration',
      message: `${row.establishment_name} — référence ${row.business_reference}`,
      source: 'registration',
      severity: 'info',
      createdAt: row.created_at,
      href: '/admin/demandes',
      isRead: false,
    });
  }

  for (const row of contacts.data ?? []) {
    alerts.push({
      id: `contact:${row.id}`,
      title: 'Nouveau message de contact',
      message: `${row.full_name} — ${row.subject}`,
      source: 'contact',
      severity: 'info',
      createdAt: row.created_at,
      href: '/admin/contacts',
      isRead: false,
    });
  }

  for (const row of resets.data ?? []) {
    alerts.push({
      id: `password_reset:${row.id}`,
      title: 'Demande de réinitialisation',
      message: `${row.full_name ?? row.identifier} — référence ${row.business_reference}`,
      source: 'password_reset',
      severity: 'warning',
      createdAt: row.created_at,
      href: '/admin/reinitialisations',
      isRead: false,
    });
  }

  for (const row of subscriptions.data ?? []) {
    if (!row.end_date) continue;
    const days = daysUntil(row.end_date);
    if (days > EXPIRY_WARNING_DAYS) continue;

    const joined = row as unknown as { establishment?: { name: string } | null };
    alerts.push({
      id: `subscription:${row.id}`,
      title: days < 0 ? 'Abonnement expiré' : 'Abonnement bientôt expiré',
      message: `${joined.establishment?.name ?? 'Établissement'} — ${expiryPhrase(days)}`,
      source: 'subscription',
      severity: days < 0 ? 'critical' : 'warning',
      createdAt: row.end_date,
      href: '/admin/abonnements',
      isRead: false,
    });
  }

  for (const row of licenses.data ?? []) {
    if (!row.expires_at) continue;
    const days = daysUntil(row.expires_at);
    if (days > EXPIRY_WARNING_DAYS) continue;

    const joined = row as unknown as { establishment?: { name: string } | null };
    alerts.push({
      id: `license:${row.id}`,
      title: days < 0 ? 'Licence expirée' : 'Licence bientôt expirée',
      message: `${joined.establishment?.name ?? 'Établissement'} — ${row.license_number} — ${expiryPhrase(days)}`,
      source: 'license',
      severity: days < 0 ? 'critical' : 'warning',
      createdAt: row.expires_at,
      href: '/admin/abonnements',
      isRead: false,
    });
  }

  return alerts;
};

// ---------------------------------------------------------------------------
// Alertes de l'établissement
// ---------------------------------------------------------------------------

/**
 * Alertes déduites du contrat de l'établissement.
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

  if (subscription?.endDate) {
    const days = daysUntil(subscription.endDate);
    if (days <= EXPIRY_WARNING_DAYS) {
      alerts.push({
        id: 'subscription:self',
        title: days < 0 ? 'Votre abonnement a expiré' : 'Votre abonnement arrive à échéance',
        message: `Formule ${subscription.planName} — ${expiryPhrase(days)}. Aucune donnée n'est supprimée.`,
        source: 'subscription',
        severity: days < 0 ? 'critical' : 'warning',
        createdAt: subscription.endDate,
        href: '/settings',
        isRead: false,
      });
    }
  }

  if (license?.expiresAt) {
    const days = daysUntil(license.expiresAt);
    if (days <= EXPIRY_WARNING_DAYS) {
      alerts.push({
        id: 'license:self',
        title: days < 0 ? 'Votre licence a expiré' : 'Votre licence arrive à échéance',
        message: `Licence ${license.licenseNumber} — ${expiryPhrase(days)}.`,
        source: 'license',
        severity: days < 0 ? 'critical' : 'warning',
        createdAt: license.expiresAt,
        href: '/settings',
        isRead: false,
      });
    }
  }

  if (subscription && subscription.status !== 'active') {
    alerts.push({
      id: 'subscription:status',
      title: "L'abonnement n'est pas actif",
      message: `Statut actuel : ${subscription.status}. Contactez MORA Shawiri.`,
      source: 'subscription',
      severity: 'warning',
      createdAt: subscription.startDate,
      href: '/settings',
      isRead: false,
    });
  }

  return alerts;
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export interface NotificationContext {
  userId: string;
  role: UserRole;
  subscription: EstablishmentSubscription | null;
  license: EstablishmentLicense | null;
}

export const loadNotifications = async (
  context: NotificationContext,
): Promise<AppNotification[]> => {
  const system = await loadSystemNotifications(context.userId);

  const scoped =
    context.role === 'super_admin'
      ? await loadPlatformAlerts()
      : buildEstablishmentAlerts(context.subscription, context.license);

  return [...system, ...scoped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const unreadCount = (notifications: readonly AppNotification[]): number =>
  notifications.filter((item) => !item.isRead).length;
