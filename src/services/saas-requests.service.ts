import { failIf, getClient } from './base.service';
import type { EstablishmentType } from '@/types';
import type { RequestStatus, StartOption } from '@/types/database';

/**
 * Demandes de démonstration et prises de contact.
 *
 * Les deux flux viennent de la vitrine et sont traités par MORA Shawiri. Ils
 * partagent volontairement le même jeu de statuts : un seul vocabulaire pour un
 * seul métier — la relation commerciale.
 *
 * La lecture et la mise à jour sont réservées au Super Admin par les politiques
 * RLS ; le dépôt, lui, se fait côté serveur puisque le visiteur n'est pas
 * authentifié.
 */

export const REQUEST_STATUSES: readonly RequestStatus[] = [
  'pending',
  'in_progress',
  'contacted',
  'accepted',
  'rejected',
  'closed',
];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  contacted: 'Contacté',
  accepted: 'Accepté',
  rejected: 'Refusé',
  closed: 'Clôturé',
};

/** Couleur du badge de statut, du plus ouvert au plus fermé. */
export const REQUEST_STATUS_TONES: Record<RequestStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  in_progress: 'bg-blue-500/15 text-blue-400',
  contacted: 'bg-indigo-500/15 text-indigo-300',
  accepted: 'bg-emerald-500/15 text-emerald-400',
  rejected: 'bg-red-500/15 text-red-400',
  closed: 'bg-slate-700/40 text-slate-400',
};

const asStatus = (value: string): RequestStatus =>
  (REQUEST_STATUSES as readonly string[]).includes(value) ? (value as RequestStatus) : 'pending';

// ---------------------------------------------------------------------------
// Demandes de démonstration (formulaire de la Landing Page)
// ---------------------------------------------------------------------------

export interface RegistrationRequest {
  id: string;
  reference: string;
  establishmentName: string;
  establishmentType: EstablishmentType | null;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
  /** Offre retenue par le visiteur. `null` pour une demande générique. */
  planName: string | null;
  planCode: string | null;
  durationMonths: number | null;
  monthlyPrice: number | null;
  totalPrice: number | null;
  savingsAmount: number | null;
  currency: string;
  paymentMethod: string | null;
  startOption: StartOption | null;
  startDate: string | null;
}

/** Libellés des modes de paiement et des dates de démarrage. */
export const PAYMENT_LABELS: Record<string, string> = {
  especes: 'Espèces',
  cheque: 'Chèque',
  mvola: 'Mvola',
  holo: 'Holo',
  wakati: 'Wakati',
};

export const START_LABELS: Record<StartOption, string> = {
  immediate: 'Dès validation',
  next_month: 'Début du mois prochain',
  custom: 'Date choisie',
};

const asStartOption = (value: string | null): StartOption | null =>
  value === 'immediate' || value === 'next_month' || value === 'custom' ? value : null;

export const listRegistrationRequests = async (): Promise<RegistrationRequest[]> => {
  const { data, error } = await getClient()
    .from('registration_requests')
    .select('*')
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des demandes');

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.business_reference,
    establishmentName: row.establishment_name,
    establishmentType: row.establishment_type,
    fullName: row.full_name,
    phone: row.phone ?? '',
    email: row.email,
    message: row.message ?? '',
    status: asStatus(row.status),
    createdAt: row.created_at,
    planName: row.plan_name,
    planCode: row.plan_code,
    durationMonths: row.duration_months,
    monthlyPrice: row.monthly_price === null ? null : Number(row.monthly_price),
    totalPrice: row.total_price === null ? null : Number(row.total_price),
    savingsAmount: row.savings_amount === null ? null : Number(row.savings_amount),
    currency: row.price_currency,
    paymentMethod: row.payment_method,
    startOption: asStartOption(row.start_option),
    startDate: row.start_date,
  }));
};

export const setRegistrationRequestStatus = async (
  requestId: string,
  status: RequestStatus,
  processedBy: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('registration_requests')
    .update({ status, processed_by: processedBy, processed_at: new Date().toISOString() })
    .eq('id', requestId);

  failIf(error, 'Mise à jour de la demande');
};

// ---------------------------------------------------------------------------
// Prises de contact (formulaire Contact / Support)
// ---------------------------------------------------------------------------

export interface ContactRequest {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: RequestStatus;
  createdAt: string;
}

export const listContactRequests = async (): Promise<ContactRequest[]> => {
  const { data, error } = await getClient()
    .from('contact_requests')
    .select('*')
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des prises de contact');

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.business_reference,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? '',
    subject: row.subject,
    message: row.message,
    status: asStatus(row.status),
    createdAt: row.created_at,
  }));
};

export const setContactRequestStatus = async (
  contactId: string,
  status: RequestStatus,
  processedBy: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('contact_requests')
    .update({ status, processed_by: processedBy, processed_at: new Date().toISOString() })
    .eq('id', contactId);

  failIf(error, 'Mise à jour de la prise de contact');
};

// ---------------------------------------------------------------------------
// Demandes de réinitialisation de mot de passe
// ---------------------------------------------------------------------------

export interface PasswordResetRequest {
  id: string;
  reference: string;
  /** Compte reconnu, ou `null` si l'identifiant saisi n'existe pas. */
  profileId: string | null;
  identifier: string;
  fullName: string;
  email: string;
  establishmentName: string;
  status: RequestStatus;
  createdAt: string;
}

export const listPasswordResetRequests = async (): Promise<PasswordResetRequest[]> => {
  const { data, error } = await getClient()
    .from('password_reset_requests')
    .select('*, establishment:establishments(name)')
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des demandes de réinitialisation');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { establishment?: { name: string } | null };
    return {
      id: row.id,
      reference: row.business_reference,
      profileId: row.profile_id,
      identifier: row.identifier,
      fullName: row.full_name ?? '—',
      email: row.email ?? '—',
      establishmentName: joined.establishment?.name ?? '—',
      status: asStatus(row.status),
      createdAt: row.created_at,
    };
  });
};

export const setPasswordResetStatus = async (
  requestId: string,
  status: RequestStatus,
  processedBy: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('password_reset_requests')
    .update({ status, processed_by: processedBy, processed_at: new Date().toISOString() })
    .eq('id', requestId);

  failIf(error, 'Mise à jour de la demande');
};
