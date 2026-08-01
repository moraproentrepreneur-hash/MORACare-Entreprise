import { failIf, getClient } from './base.service';
import type {
  SubscriptionState,
  LicenseState,
  SubscriptionPlanRow,
} from '@/types/database';

/**
 * Abonnements et licences SaaS (BP09, BP30).
 *
 * Réservé au Super Admin par les politiques RLS (BP30 BR-295). L'historique
 * est écrit automatiquement par des triggers PostgreSQL : aucun appel ne peut
 * l'omettre, et rien ne peut le supprimer (BP09 §14).
 */

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationDays: number | null;
  maxUsers: number | null;
  maxPatients: number | null;
  storageMb: number | null;
  isAutomatic: boolean;
  requiresApproval: boolean;
  requiresPayment: boolean;
  isActive: boolean;
  /** Tarification officielle MORACare. */
  priceAmount: number;
  priceCurrency: string;
  billingPeriod: string | null;
  supportLevel: string | null;
  backupFrequency: string | null;
  retentionDays: number | null;
  highlights: string[];
  limitations: string[];
  ctaLabel: string | null;
  isFeatured: boolean;
}

export interface SubscriptionSummary {
  id: string;
  businessReference: string;
  establishmentId: string;
  establishmentName: string;
  planCode: string;
  planName: string;
  status: SubscriptionState;
  startDate: string;
  endDate: string | null;
}

export interface SubscriptionEvent {
  id: string;
  eventType: string;
  previousStatus: SubscriptionState | null;
  newStatus: SubscriptionState | null;
  comment: string | null;
  createdAt: string;
}

export interface LicenseSummary {
  id: string;
  licenseNumber: string;
  establishmentId: string;
  establishmentName: string;
  status: LicenseState;
  activatedAt: string | null;
  expiresAt: string | null;
  maxUsers: number | null;
  storageMb: number | null;
}

const toPlan = (row: SubscriptionPlanRow): SubscriptionPlan => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  durationDays: row.duration_days,
  maxUsers: row.max_users,
  maxPatients: row.max_patients,
  storageMb: row.storage_mb,
  isAutomatic: row.is_automatic,
  requiresApproval: row.requires_approval,
  requiresPayment: row.requires_payment,
  isActive: row.is_active,
  priceAmount: Number(row.price_amount),
  priceCurrency: row.price_currency,
  billingPeriod: row.billing_period,
  supportLevel: row.support_level,
  backupFrequency: row.backup_frequency,
  retentionDays: row.retention_days,
  highlights: row.highlights ?? [],
  limitations: row.limitations ?? [],
  ctaLabel: row.cta_label,
  isFeatured: row.is_featured,
});

/**
 * Formules destinées à la Landing Page.
 *
 * Lisibles sans authentification (politique `plans_read_public`) : ce sont des
 * informations commerciales publiques, et LP-001 §1 réserve la vitrine aux
 * visiteurs. Chaque formule est accompagnée du nom des modules qu'elle inclut.
 */
export interface PublicPlan extends SubscriptionPlan {
  moduleNames: string[];
}

export const listPublicPlans = async (): Promise<PublicPlan[]> => {
  const client = getClient();

  const [plansRes, linksRes, modulesRes] = await Promise.all([
    client.from('subscription_plans').select('*').eq('is_active', true).order('display_order'),
    client.from('plan_modules').select('plan_id, module_id'),
    client.from('modules').select('id, name, workspace'),
  ]);

  failIf(plansRes.error, 'Chargement des formules');
  failIf(linksRes.error, 'Chargement de la composition des formules');
  failIf(modulesRes.error, 'Chargement des modules');

  const moduleNameById = new Map(
    (modulesRes.data ?? [])
      // Les modules d'administration ne sont pas des arguments de vente.
      .filter((m) => m.workspace !== 'platform')
      .map((m) => [m.id, m.name]),
  );

  return (plansRes.data ?? []).map((row) => {
    const plan = toPlan(row as SubscriptionPlanRow);
    const moduleNames = (linksRes.data ?? [])
      .filter((link) => link.plan_id === plan.id)
      .flatMap((link) => {
        const name = moduleNameById.get(link.module_id);
        return name ? [name] : [];
      })
      .sort();

    return { ...plan, moduleNames };
  });
};

export const listPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data, error } = await getClient()
    .from('subscription_plans')
    .select('*')
    .order('display_order');

  failIf(error, 'Chargement des plans');
  return (data ?? []).map(toPlan);
};

export const listSubscriptions = async (): Promise<SubscriptionSummary[]> => {
  const { data, error } = await getClient()
    .from('subscriptions')
    .select(
      '*, plan:subscription_plans(code, name), establishment:establishments(name)',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des abonnements');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      plan?: { code: string; name: string } | null;
      establishment?: { name: string } | null;
    };
    return {
      id: row.id,
      businessReference: row.business_reference,
      establishmentId: row.establishment_id,
      establishmentName: joined.establishment?.name ?? '',
      planCode: joined.plan?.code ?? '',
      planName: joined.plan?.name ?? '',
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
    };
  });
};

/**
 * Calcule la date de fin d'un abonnement.
 *
 * BP09 §5 : « une date de fin (sauf Gratuit) ». Un plan sans durée définie
 * (`duration_days` NULL) est donc permanent.
 */
const computeEndDate = (plan: SubscriptionPlan, startDate: Date): string | null => {
  if (plan.durationDays === null) return null;
  const end = new Date(startDate);
  end.setDate(end.getDate() + plan.durationDays);
  return end.toISOString().split('T')[0];
};

export interface CreateSubscriptionInput {
  establishmentId: string;
  planId: string;
  /** BP09 §6 : un abonnement naît « En attente » sauf activation immédiate. */
  activateImmediately?: boolean;
}

/**
 * Crée un abonnement et la licence associée (BP09 §11, BP30 §9).
 *
 * BR-001 : un établissement ne peut exister sans formule associée.
 * BR-008 : une licence appartient à un seul établissement.
 */
export const createSubscription = async (
  input: CreateSubscriptionInput,
  userId: string,
): Promise<void> => {
  const client = getClient();

  const { data: planRow, error: planError } = await client
    .from('subscription_plans')
    .select('*')
    .eq('id', input.planId)
    .single();

  failIf(planError, 'Lecture du plan');
  const plan = toPlan(planRow as SubscriptionPlanRow);

  const start = new Date();
  const endDate = computeEndDate(plan, start);

  const { data: created, error } = await client
    .from('subscriptions')
    .insert({
      establishment_id: input.establishmentId,
      plan_id: input.planId,
      status: input.activateImmediately ? 'active' : 'pending',
      start_date: start.toISOString().split('T')[0],
      end_date: endDate,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single();

  failIf(error, "Création de l'abonnement");

  // La licence suit l'abonnement (BP30 §9 : « la licence est activée »).
  const { error: licenseError } = await client.from('licenses').upsert(
    {
      establishment_id: input.establishmentId,
      subscription_id: (created as { id: string }).id,
      status: input.activateImmediately ? 'active' : 'suspended',
      expires_at: endDate,
      max_users: plan.maxUsers,
      storage_mb: plan.storageMb,
      created_by: userId,
      updated_by: userId,
    },
    { onConflict: 'establishment_id' },
  );

  failIf(licenseError, 'Création de la licence');
};

/** Change le statut d'un abonnement. L'historique est écrit par trigger. */
export const setSubscriptionStatus = async (
  subscriptionId: string,
  status: SubscriptionState,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('subscriptions')
    .update({ status, updated_by: userId })
    .eq('id', subscriptionId);

  failIf(error, "Mise à jour de l'abonnement");
};

/**
 * Renouvelle un abonnement (BP09 §8).
 *
 * « Le renouvellement prolonge la durée. Aucune donnée n'est supprimée. Aucune
 * configuration n'est perdue. » La prolongation part de la date de fin
 * existante si elle est future, sinon d'aujourd'hui.
 */
export const renewSubscription = async (
  subscriptionId: string,
  additionalDays: number,
  userId: string,
): Promise<void> => {
  const client = getClient();

  const { data, error } = await client
    .from('subscriptions')
    .select('end_date')
    .eq('id', subscriptionId)
    .single();

  failIf(error, "Lecture de l'abonnement");

  const current = (data as { end_date: string | null }).end_date;
  const base = current && new Date(current) > new Date() ? new Date(current) : new Date();
  base.setDate(base.getDate() + additionalDays);
  const newEnd = base.toISOString().split('T')[0];

  const { error: updateError } = await client
    .from('subscriptions')
    .update({ end_date: newEnd, status: 'active', updated_by: userId })
    .eq('id', subscriptionId);

  failIf(updateError, 'Renouvellement de l’abonnement');

  const { error: licenseError } = await client
    .from('licenses')
    .update({ expires_at: newEnd, status: 'active', updated_by: userId })
    .eq('subscription_id', subscriptionId);

  failIf(licenseError, 'Prolongation de la licence');
};

export const listSubscriptionEvents = async (
  subscriptionId: string,
): Promise<SubscriptionEvent[]> => {
  const { data, error } = await getClient()
    .from('subscription_events')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false });

  failIf(error, "Chargement de l'historique");

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    comment: row.comment,
    createdAt: row.created_at,
  }));
};

export const listLicenses = async (): Promise<LicenseSummary[]> => {
  const { data, error } = await getClient()
    .from('licenses')
    .select('*, establishment:establishments(name)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des licences');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { establishment?: { name: string } | null };
    return {
      id: row.id,
      licenseNumber: row.license_number,
      establishmentId: row.establishment_id,
      establishmentName: joined.establishment?.name ?? '',
      status: row.status,
      activatedAt: row.activated_at,
      expiresAt: row.expires_at,
      maxUsers: row.max_users,
      storageMb: row.storage_mb,
    };
  });
};

/**
 * Change le statut d'une licence.
 *
 * BR-290 : une suspension n'entraîne jamais la suppression des données.
 * Ce service ne touche donc qu'au statut.
 */
export const setLicenseStatus = async (
  licenseId: string,
  status: LicenseState,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('licenses')
    .update({ status, updated_by: userId })
    .eq('id', licenseId);

  failIf(error, 'Mise à jour de la licence');
};
