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
  /** Enregistrements maximum par module. `null` = illimité. */
  maxRecordsPerModule: number | null;
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
  /** Remise par mois accordée au-delà de `discountMinMonths`. */
  discountPerMonth: number;
  discountMinMonths: number;
  maxDurationMonths: number;
}

/**
 * État affiché d'un abonnement.
 *
 * Distinct du statut enregistré : un abonnement « actif » dont l'échéance est
 * passée n'est plus actif, et une échéance proche mérite d'être signalée avant
 * de devenir un incident.
 */
export type SubscriptionHealth =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'suspended'
  | 'terminated'
  | 'pending';

export const HEALTH_LABELS: Record<SubscriptionHealth, string> = {
  active: 'Actif',
  expiring_soon: 'Expire bientôt',
  expired: 'Expiré',
  suspended: 'Suspendu',
  terminated: 'Résilié',
  pending: 'En attente',
};

export const HEALTH_TONES: Record<SubscriptionHealth, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  expiring_soon: 'bg-amber-500/15 text-amber-400',
  expired: 'bg-red-500/15 text-red-400',
  suspended: 'bg-orange-500/15 text-orange-400',
  terminated: 'bg-slate-700/40 text-slate-400',
  pending: 'bg-blue-500/15 text-blue-400',
};

/** Seuil d'alerte : un mois pour renouveler sans urgence. */
export const EXPIRY_WARNING_DAYS = 30;

const MS_PER_DAY = 86_400_000;

/**
 * Jours restants avant échéance. Négatif si elle est passée.
 *
 * Calculé sur des dates civiles et non sur l'instant courant : un abonnement
 * qui expire aujourd'hui doit afficher « 0 jour », pas « quelques heures ».
 */
export const daysRemaining = (endDate: string | null): number | null => {
  if (!endDate) return null;
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / MS_PER_DAY);
};

/** Mois pleins restants, pour une lecture commerciale du temps qui reste. */
export const monthsRemaining = (endDate: string | null): number | null => {
  const days = daysRemaining(endDate);
  return days === null ? null : Math.max(0, Math.floor(days / 30));
};

/**
 * Croise le statut enregistré et l'échéance réelle.
 *
 * Reproduit exactement `public.subscription_state_of` : l'interface et la base
 * doivent dire la même chose, faute de quoi elles se contrediraient devant le
 * client.
 */
export const healthOf = (
  status: SubscriptionState,
  endDate: string | null,
): SubscriptionHealth => {
  if (status === 'suspended') return 'suspended';
  if (status === 'terminated') return 'terminated';
  if (status === 'pending') return 'pending';
  if (!endDate) return 'active';

  const days = daysRemaining(endDate);
  if (days === null) return 'active';
  if (days < 0) return 'expired';
  if (days <= EXPIRY_WARNING_DAYS) return 'expiring_soon';
  return 'active';
};

/** Formulation lisible du temps restant. */
export const describeRemaining = (endDate: string | null): string => {
  const days = daysRemaining(endDate);
  if (days === null) return 'Sans échéance';
  if (days < 0) {
    const past = Math.abs(days);
    return `Expiré depuis ${past} jour${past > 1 ? 's' : ''}`;
  }
  if (days === 0) return "Expire aujourd'hui";
  if (days < 31) return `${days} jour${days > 1 ? 's' : ''} restants`;

  const months = Math.floor(days / 30);
  const rest = days % 30;
  const monthPart = `${months} mois`;
  return rest === 0 ? `${monthPart} restants` : `${monthPart} et ${rest} j restants`;
};

export interface SubscriptionSummary {
  id: string;
  businessReference: string;
  establishmentId: string;
  establishmentName: string;
  planId: string;
  planCode: string;
  planName: string;
  status: SubscriptionState;
  health: SubscriptionHealth;
  startDate: string;
  endDate: string | null;
  durationMonths: number | null;
  daysLeft: number | null;
  monthsLeft: number | null;
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
  maxRecordsPerModule: row.max_records_per_module,
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
  discountPerMonth: Number(row.discount_per_month),
  discountMinMonths: row.discount_min_months,
  maxDurationMonths: row.max_duration_months,
});

/**
 * Formules destinées à la Landing Page.
 *
 * Lisibles sans authentification (politique `plans_read_public`) : ce sont des
 * informations commerciales publiques, et LP-001 §1 réserve la vitrine aux
 * visiteurs.
 *
 * La composition en modules n'est plus lue : toutes les formules donnent accès
 * à tous les modules, dont l'activation relève des Paramètres de
 * l'établissement. Seules les limites commerciales distinguent les offres.
 */
export type PublicPlan = SubscriptionPlan;

export const listPublicPlans = async (): Promise<PublicPlan[]> => {
  const { data, error } = await getClient()
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  failIf(error, 'Chargement des formules');

  return (data ?? []).map((row) => toPlan(row as SubscriptionPlanRow));
};

// ---------------------------------------------------------------------------
// Tarification longue durée
// ---------------------------------------------------------------------------

/**
 * Règle de remise d'une formule.
 *
 * Une seule règle, la même pour toutes les formules : un mois au tarif normal,
 * puis une remise fixe par mois au-delà d'un seuil. Elle remplace la grille de
 * paliers, qui aurait demandé douze lignes par formule et se serait désynchro-
 * nisée au premier changement de prix.
 */
export interface PricingRule {
  /** Tarif mensuel affiché, avant remise. */
  basePrice: number;
  /** Remise en valeur absolue, par mois, au-delà du seuil. */
  discountPerMonth: number;
  /** Durée à partir de laquelle la remise s'applique. */
  minMonths: number;
  /** Durée maximale proposée. */
  maxMonths: number;
  currency: string;
}

export interface PriceBreakdown {
  months: number;
  /** Tarif normal, tel qu'affiché sur la carte. */
  baseMonthlyPrice: number;
  /** Tarif réellement appliqué, remise comprise. */
  monthlyPrice: number;
  totalPrice: number;
  /** Économie sur toute la durée. */
  totalSavings: number;
  discountApplied: boolean;
  currency: string;
}

/**
 * Applique la règle de remise.
 *
 * Volontairement pure et sans accès réseau : le serveur en fait autorité, le
 * navigateur l'utilise pour afficher le récapitulatif sans aller-retour. Les
 * deux calculent donc exactement la même chose, à partir de la même règle lue
 * en base.
 */
export const computePrice = (rule: PricingRule, months: number): PriceBreakdown => {
  const clamped = Math.min(Math.max(1, Math.round(months)), rule.maxMonths);
  const discounted = clamped >= rule.minMonths && rule.discountPerMonth > 0;
  const monthly = discounted
    ? Math.max(0, rule.basePrice - rule.discountPerMonth)
    : rule.basePrice;

  return {
    months: clamped,
    baseMonthlyPrice: rule.basePrice,
    monthlyPrice: monthly,
    totalPrice: monthly * clamped,
    totalSavings: (rule.basePrice - monthly) * clamped,
    discountApplied: discounted,
    currency: rule.currency,
  };
};

export const pricingRuleOf = (plan: {
  priceAmount: number;
  priceCurrency: string;
  discountPerMonth: number;
  discountMinMonths: number;
  maxDurationMonths: number;
}): PricingRule => ({
  basePrice: plan.priceAmount,
  discountPerMonth: plan.discountPerMonth,
  minMonths: plan.discountMinMonths,
  maxMonths: plan.maxDurationMonths,
  currency: plan.priceCurrency,
});

// ---------------------------------------------------------------------------
// Modes de paiement
// ---------------------------------------------------------------------------

export interface PaymentMethod {
  code: string;
  label: string;
  description: string | null;
  requiresReference: boolean;
}

export const listPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const { data, error } = await getClient()
    .from('payment_methods')
    .select('code, label, description, requires_reference')
    .eq('is_active', true)
    .order('display_order');

  failIf(error, 'Chargement des modes de paiement');

  return (data ?? []).map((row) => ({
    code: row.code,
    label: row.label,
    description: row.description,
    requiresReference: row.requires_reference,
  }));
};

export const listPlans = async (): Promise<SubscriptionPlan[]> => {
  const { data, error } = await getClient()
    .from('subscription_plans')
    .select('*')
    .order('display_order');

  failIf(error, 'Chargement des plans');
  return (data ?? []).map(toPlan);
};

const toSummary = (row: {
  id: string;
  business_reference: string;
  establishment_id: string;
  plan_id: string;
  status: SubscriptionState;
  start_date: string;
  end_date: string | null;
  duration_months: number | null;
}, joined: {
  plan?: { code: string; name: string } | null;
  establishment?: { name: string } | null;
}): SubscriptionSummary => ({
  id: row.id,
  businessReference: row.business_reference,
  establishmentId: row.establishment_id,
  establishmentName: joined.establishment?.name ?? '',
  planId: row.plan_id,
  planCode: joined.plan?.code ?? '',
  planName: joined.plan?.name ?? '',
  status: row.status,
  health: healthOf(row.status, row.end_date),
  startDate: row.start_date,
  endDate: row.end_date,
  durationMonths: row.duration_months,
  daysLeft: daysRemaining(row.end_date),
  monthsLeft: monthsRemaining(row.end_date),
});

export const listSubscriptions = async (): Promise<SubscriptionSummary[]> => {
  const { data, error } = await getClient()
    .from('subscriptions')
    .select(
      '*, plan:subscription_plans(code, name), establishment:establishments(name)',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des abonnements');

  return (data ?? []).map((row) =>
    toSummary(
      row,
      row as unknown as {
        plan?: { code: string; name: string } | null;
        establishment?: { name: string } | null;
      },
    ),
  );
};

/**
 * Abonnement d'un établissement précis.
 *
 * Sert à l'interface du responsable : il doit connaître sa formule, son
 * échéance et le temps qui lui reste (UG02 §17). La politique
 * `subscriptions_read_own` l'autorise à lire le sien, et lui seul.
 */
export const getEstablishmentSubscription = async (
  establishmentId: string,
): Promise<SubscriptionSummary | null> => {
  const { data, error } = await getClient()
    .from('subscriptions')
    .select('*, plan:subscription_plans(code, name), establishment:establishments(name)')
    .eq('establishment_id', establishmentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  failIf(error, "Chargement de l'abonnement");
  if (!data) return null;

  return toSummary(
    data,
    data as unknown as {
      plan?: { code: string; name: string } | null;
      establishment?: { name: string } | null;
    },
  );
};

const toIsoDate = (date: Date): string => date.toISOString().split('T')[0];

/**
 * Calcule la date de fin d'un abonnement.
 *
 * Trois cas, dans cet ordre :
 *
 *   1. une durée en mois est vendue : elle prime, c'est ce que le client a payé ;
 *   2. la formule fixe une durée en jours (l'essai) : elle s'applique ;
 *   3. ni l'une ni l'autre : l'abonnement est permanent (BP09 §5, « sauf Gratuit »).
 *
 * L'ajout de mois passe par `setMonth`, qui ramène au dernier jour du mois
 * lorsque le quantième n'existe pas — un abonnement souscrit le 31 janvier
 * pour un mois échoit ainsi le 28 ou 29 février, et non le 3 mars.
 */
const computeEndDate = (
  plan: SubscriptionPlan,
  startDate: Date,
  durationMonths?: number | null,
): string | null => {
  if (durationMonths && durationMonths > 0) {
    const end = new Date(startDate);
    const day = end.getDate();
    end.setMonth(end.getMonth() + durationMonths);
    if (end.getDate() < day) end.setDate(0);
    return toIsoDate(end);
  }

  if (plan.durationDays === null) return null;

  const end = new Date(startDate);
  end.setDate(end.getDate() + plan.durationDays);
  return toIsoDate(end);
};

export interface CreateSubscriptionInput {
  establishmentId: string;
  planId: string;
  /** Durée vendue, en mois. Absente pour un essai ou une formule permanente. */
  durationMonths?: number | null;
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
  const endDate = computeEndDate(plan, start, input.durationMonths);

  const { data: created, error } = await client
    .from('subscriptions')
    .insert({
      establishment_id: input.establishmentId,
      plan_id: input.planId,
      status: input.activateImmediately ? 'active' : 'pending',
      start_date: toIsoDate(start),
      end_date: endDate,
      duration_months: input.durationMonths ?? null,
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
  additionalMonths: number,
  userId: string,
): Promise<void> => {
  const client = getClient();

  const { data, error } = await client
    .from('subscriptions')
    .select('end_date, duration_months')
    .eq('id', subscriptionId)
    .single();

  failIf(error, "Lecture de l'abonnement");

  const row = data as { end_date: string | null; duration_months: number | null };

  // La prolongation part de l'échéance en cours si elle est future : le client
  // ne doit pas perdre les jours qu'il a déjà payés. Si elle est passée, elle
  // repart d'aujourd'hui — prolonger dans le passé n'ouvrirait aucun accès.
  const base =
    row.end_date && new Date(row.end_date) > new Date() ? new Date(row.end_date) : new Date();

  const day = base.getDate();
  base.setMonth(base.getMonth() + additionalMonths);
  if (base.getDate() < day) base.setDate(0);

  const newEnd = toIsoDate(base);

  // La licence est mise à jour par le trigger `sync_license_with_subscription`.
  const { error: updateError } = await client
    .from('subscriptions')
    .update({
      end_date: newEnd,
      status: 'active',
      duration_months: (row.duration_months ?? 0) + additionalMonths,
      updated_by: userId,
    })
    .eq('id', subscriptionId);

  failIf(updateError, 'Renouvellement de l’abonnement');
};

export interface ChangePlanInput {
  subscriptionId: string;
  /** Nouvelle formule. */
  planId: string;
  /** Durée de la nouvelle période, en mois. */
  durationMonths?: number | null;
  /**
   * Repartir d'aujourd'hui plutôt que de conserver l'échéance en cours.
   *
   * Une montée en gamme se facture en général sur une nouvelle période ; une
   * correction d'erreur, non. Le choix appartient à l'éditeur.
   */
  restartPeriod?: boolean;
}

/**
 * Change la formule d'un établissement (BP09 §7).
 *
 * Trois effets, tous portés par la base plutôt que par cet appel :
 *
 *   - l'événement `plan_changed` est écrit par `log_subscription_change`, avec
 *     l'ancienne et la nouvelle formule ;
 *   - la licence reprend le plafond d'utilisateurs et le stockage de la
 *     nouvelle formule, via `sync_license_with_subscription` ;
 *   - l'échéance suit la durée retenue.
 *
 * Aucune donnée de l'établissement n'est touchée : BP09 §8 l'exige pour le
 * renouvellement, et il n'y a pas de raison qu'un changement de formule soit
 * plus destructeur.
 */
export const changeSubscriptionPlan = async (
  input: ChangePlanInput,
  userId: string,
): Promise<void> => {
  const client = getClient();

  const [{ data: current, error: currentError }, { data: planRow, error: planError }] =
    await Promise.all([
      client
        .from('subscriptions')
        .select('start_date, end_date, status')
        .eq('id', input.subscriptionId)
        .single(),
      client.from('subscription_plans').select('*').eq('id', input.planId).single(),
    ]);

  failIf(currentError, "Lecture de l'abonnement");
  failIf(planError, 'Lecture de la formule');

  const existing = current as { start_date: string; end_date: string | null; status: string };
  const plan = toPlan(planRow as SubscriptionPlanRow);

  const start = input.restartPeriod ? new Date() : new Date(existing.start_date);

  // Sans redémarrage ni durée explicite, l'échéance en cours est conservée :
  // changer de formule ne doit pas raccourcir une période déjà payée.
  const endDate =
    input.durationMonths || input.restartPeriod
      ? computeEndDate(plan, start, input.durationMonths)
      : existing.end_date;

  const { error } = await client
    .from('subscriptions')
    .update({
      plan_id: input.planId,
      start_date: toIsoDate(start),
      end_date: endDate,
      duration_months: input.durationMonths ?? null,
      updated_by: userId,
    })
    .eq('id', input.subscriptionId);

  failIf(error, 'Changement de formule');
};

/**
 * Historique d'un abonnement, formule comprise.
 *
 * BP09 §14 : l'historique est écrit par des triggers et ne peut être ni omis
 * ni supprimé.
 */
export interface SubscriptionHistoryEntry {
  id: string;
  eventType: string;
  previousStatus: SubscriptionState | null;
  newStatus: SubscriptionState | null;
  previousPlanName: string | null;
  newPlanName: string | null;
  createdAt: string;
}

export const listSubscriptionHistory = async (
  subscriptionId: string,
): Promise<SubscriptionHistoryEntry[]> => {
  const { data, error } = await getClient()
    .from('subscription_events')
    .select(
      '*, previousPlan:subscription_plans!subscription_events_previous_plan_id_fkey(name), newPlan:subscription_plans!subscription_events_new_plan_id_fkey(name)',
    )
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false });

  failIf(error, "Chargement de l'historique");

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      previousPlan?: { name: string } | null;
      newPlan?: { name: string } | null;
    };
    return {
      id: row.id,
      eventType: row.event_type,
      previousStatus: row.previous_status,
      newStatus: row.new_status,
      previousPlanName: joined.previousPlan?.name ?? null,
      newPlanName: joined.newPlan?.name ?? null,
      createdAt: row.created_at,
    };
  });
};

export const EVENT_LABELS: Record<string, string> = {
  created: 'Abonnement créé',
  plan_changed: 'Changement de formule',
  status_changed: 'Changement de statut',
  renewed: 'Renouvellement',
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
