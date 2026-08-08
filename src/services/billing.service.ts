import { failIf, getClient } from './base.service';

/**
 * Facturation des abonnements SaaS (BP30, BP09).
 *
 * À ne pas confondre avec `finance.service.ts`, qui facture les soins d'un
 * patient. Ici, c'est MORA Shawiri qui facture l'établissement.
 *
 * La lecture est ouverte au responsable d'établissement pour sa seule
 * structure ; l'écriture est réservée à l'éditeur. Cette frontière est tenue
 * par les politiques RLS, ce service ne fait que la refléter à l'écran.
 */

export type BillingState =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'canceled';

export const BILLING_LABELS: Record<BillingState, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  partially_paid: 'Partiellement réglée',
  paid: 'Réglée',
  overdue: 'En retard',
  canceled: 'Annulée',
};

export const BILLING_TONES: Record<BillingState, 'good' | 'warn' | 'bad' | 'neutral' | 'info'> = {
  draft: 'neutral',
  issued: 'info',
  partially_paid: 'warn',
  paid: 'good',
  overdue: 'bad',
  canceled: 'neutral',
};

export interface SubscriptionInvoice {
  id: string;
  reference: string;
  establishmentId: string;
  establishmentName: string;
  subscriptionId: string | null;
  planName: string;
  periodStart: string;
  periodEnd: string;
  durationMonths: number;
  baseMonthlyPrice: number;
  monthlyPrice: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  /** Reste dû, calculé ici pour n'exister qu'à un seul endroit. */
  balance: number;
  currency: string;
  status: BillingState;
  issuedOn: string;
  dueOn: string | null;
  paymentMethod: string | null;
  notes: string | null;
  payments: SubscriptionPayment[];
}

export interface SubscriptionPayment {
  id: string;
  reference: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  transactionReference: string | null;
  paidOn: string;
  notes: string | null;
  recordedByName: string | null;
}

interface NamedProfile {
  first_name?: string | null;
  last_name?: string | null;
}

const fullName = (person: NamedProfile | null | undefined): string =>
  person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : '';

const INVOICE_SELECT = `
  *,
  establishment:establishments(name),
  payments:subscription_payments(
    id, business_reference, invoice_id, amount, payment_method,
    transaction_reference, paid_on, notes,
    recorder:profiles!subscription_payments_recorded_by_fkey(first_name, last_name)
  )
`;

interface InvoiceJoined {
  establishment?: { name: string } | null;
  payments?: {
    id: string;
    business_reference: string;
    invoice_id: string;
    amount: number | string;
    payment_method: string;
    transaction_reference: string | null;
    paid_on: string;
    notes: string | null;
    recorder?: NamedProfile | null;
  }[];
}

/**
 * Marque en retard les factures échues et non soldées.
 *
 * Appelée à l'ouverture de l'écran financier plutôt que par un ordonnanceur :
 * l'hébergement ne garantit pas l'exécution d'une tâche planifiée, et une
 * facture restée « émise » trois mois après son échéance fausserait tous les
 * états. L'échec est absorbé : ne pas pouvoir requalifier ne doit pas empêcher
 * de consulter.
 */
export const refreshOverdue = async (): Promise<void> => {
  try {
    await getClient().rpc('refresh_overdue_invoices');
  } catch {
    // Absorbé volontairement : voir ci-dessus.
  }
};

export const listInvoices = async (establishmentId?: string): Promise<SubscriptionInvoice[]> => {
  await refreshOverdue();

  let request = getClient()
    .from('subscription_invoices')
    .select(INVOICE_SELECT)
    .is('deleted_at', null)
    .order('issued_on', { ascending: false });

  if (establishmentId) request = request.eq('establishment_id', establishmentId);

  const { data, error } = await request;
  failIf(error, 'Chargement des factures');

  return (data ?? []).map((row) => {
    const joined = row as unknown as InvoiceJoined;
    const total = Number(row.total_amount ?? 0);
    const paid = Number(row.paid_amount ?? 0);

    return {
      id: row.id,
      reference: row.business_reference,
      establishmentId: row.establishment_id,
      establishmentName: joined.establishment?.name ?? '',
      subscriptionId: row.subscription_id,
      planName: row.plan_name,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      durationMonths: row.duration_months,
      baseMonthlyPrice: Number(row.base_monthly_price ?? 0),
      monthlyPrice: Number(row.monthly_price ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      totalAmount: total,
      paidAmount: paid,
      balance: Math.max(0, total - paid),
      currency: row.currency ?? 'KMF',
      status: row.status as BillingState,
      issuedOn: row.issued_on,
      dueOn: row.due_on,
      paymentMethod: row.payment_method,
      notes: row.notes,
      payments: (joined.payments ?? [])
        .map((payment) => ({
          id: payment.id,
          reference: payment.business_reference,
          invoiceId: payment.invoice_id,
          amount: Number(payment.amount ?? 0),
          paymentMethod: payment.payment_method,
          transactionReference: payment.transaction_reference,
          paidOn: payment.paid_on,
          notes: payment.notes,
          recordedByName: payment.recorder ? fullName(payment.recorder) : null,
        }))
        .sort((a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime()),
    };
  });
};

/**
 * Émet la facture de la période courante d'un abonnement.
 *
 * La fonction PostgreSQL est idempotente : rappelée sur une période déjà
 * facturée, elle renvoie la facture existante plutôt que d'en créer une
 * seconde.
 */
export const issueInvoice = async (subscriptionId: string, userId: string): Promise<void> => {
  const { error } = await getClient().rpc('issue_subscription_invoice', {
    p_subscription_id: subscriptionId,
    p_user: userId,
  });

  failIf(error, "Émission de la facture");
};

export interface PaymentInput {
  invoiceId: string;
  establishmentId: string;
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  paidOn: string;
  notes?: string;
}

export const recordPayment = async (input: PaymentInput, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('subscription_payments')
    .insert({
      establishment_id: input.establishmentId,
      invoice_id: input.invoiceId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      transaction_reference: input.transactionReference?.trim() || null,
      paid_on: input.paidOn,
      notes: input.notes?.trim() || null,
      recorded_by: userId,
      created_by: userId,
      updated_by: userId,
    });

  failIf(error, "Enregistrement du règlement");
};

/** BR-093 : le règlement annulé reste en base, marqué supprimé. */
export const cancelPayment = async (paymentId: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('subscription_payments')
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq('id', paymentId);

  failIf(error, "Annulation du règlement");
};

export const cancelInvoice = async (invoiceId: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('subscription_invoices')
    .update({ status: 'canceled', updated_by: userId })
    .eq('id', invoiceId);

  failIf(error, "Annulation de la facture");
};

// ---------------------------------------------------------------------------
// Synthèse
// ---------------------------------------------------------------------------

export interface BillingSummary {
  invoiceCount: number;
  billed: number;
  collected: number;
  outstanding: number;
  overdueCount: number;
  overdueAmount: number;
  /** Devise dominante du portefeuille, pour l'affichage des totaux. */
  currency: string;
}

/**
 * Totaux du portefeuille.
 *
 * Les factures annulées sont exclues : les inclure gonflerait le chiffre
 * facturé d'un montant que personne n'attend.
 */
export const summarise = (invoices: readonly SubscriptionInvoice[]): BillingSummary => {
  const live = invoices.filter((invoice) => invoice.status !== 'canceled');
  const overdue = live.filter((invoice) => invoice.status === 'overdue');

  return {
    invoiceCount: live.length,
    billed: live.reduce((total, invoice) => total + invoice.totalAmount, 0),
    collected: live.reduce((total, invoice) => total + invoice.paidAmount, 0),
    outstanding: live.reduce((total, invoice) => total + invoice.balance, 0),
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((total, invoice) => total + invoice.balance, 0),
    currency: live[0]?.currency ?? 'KMF',
  };
};
