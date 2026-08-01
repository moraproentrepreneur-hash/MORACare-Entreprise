import { failIf, getClient } from './base.service';
import type { Establishment, EstablishmentType } from '@/types';

/**
 * Établissements clients de la plateforme SaaS (BP30, UG01 §5-6).
 *
 * Réservé au Super Admin : la politique `establishments_super_admin` est la
 * seule qui autorise l'écriture. Un responsable d'établissement ne peut que
 * lire le sien.
 */

export interface EstablishmentInput {
  name: string;
  type: EstablishmentType;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  subscription_plan?: string;
  max_users?: number;
}

export const listEstablishments = async (): Promise<Establishment[]> => {
  const { data, error } = await getClient()
    .from('establishments')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des établissements');

  return (data ?? []).map((row) => ({
    id: row.id,
    business_reference: row.business_reference,
    name: row.name,
    type: row.type,
    email: row.email,
    phone: row.phone,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? '',
    subscription_status: row.subscription_status,
    subscription_plan: row.subscription_plan ?? '',
    max_users: row.max_users ?? 0,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
};

/** Un établissement précis. RLS restreint déjà la lecture au périmètre autorisé. */
export const getEstablishment = async (establishmentId: string): Promise<Establishment | null> => {
  const { data, error } = await getClient()
    .from('establishments')
    .select('*')
    .eq('id', establishmentId)
    .is('deleted_at', null)
    .maybeSingle();

  failIf(error, "Chargement de l'établissement");
  if (!data) return null;

  return {
    id: data.id,
    business_reference: data.business_reference,
    name: data.name,
    type: data.type,
    email: data.email,
    phone: data.phone,
    address: data.address ?? undefined,
    city: data.city ?? undefined,
    country: data.country ?? '',
    subscription_status: data.subscription_status,
    subscription_plan: data.subscription_plan ?? '',
    max_users: data.max_users ?? 0,
    is_active: data.is_active ?? true,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
};

export interface EstablishmentUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export const updateEstablishment = async (
  establishmentId: string,
  changes: EstablishmentUpdate,
): Promise<void> => {
  const { error } = await getClient()
    .from('establishments')
    .update(changes)
    .eq('id', establishmentId);

  failIf(error, "Mise à jour de l'établissement");
};

export const createEstablishment = async (input: EstablishmentInput): Promise<void> => {
  const { error } = await getClient()
    .from('establishments')
    .insert({
      name: input.name,
      type: input.type,
      email: input.email,
      phone: input.phone,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? 'Comores',
      subscription_plan: input.subscription_plan ?? null,
      max_users: input.max_users ?? 50,
      subscription_status: 'trial',
      is_active: true,
    });

  failIf(error, "Création de l'établissement");
};

/**
 * Suspend ou réactive un établissement (UG01 §5-6).
 *
 * BP30 BR-290 : une suspension ne supprime jamais les données de
 * l'établissement, elle en bloque seulement l'accès.
 */
export const setEstablishmentActive = async (
  establishmentId: string,
  isActive: boolean,
): Promise<void> => {
  const { error } = await getClient()
    .from('establishments')
    .update({
      is_active: isActive,
      subscription_status: isActive ? 'active' : 'suspended',
    })
    .eq('id', establishmentId);

  failIf(error, "Mise à jour du statut de l'établissement");
};
