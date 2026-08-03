import { failIf, getClient } from './base.service';
import type { EstablishmentType } from '@/types';
import type { RequestStatus } from '@/types/database';

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
}

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
