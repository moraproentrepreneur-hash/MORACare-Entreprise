import { failIf, getClient } from './base.service';
import type { UserRole } from '@/types';

/**
 * Comptes des établissements clients, vus depuis la console MORA Shawiri.
 *
 * La lecture s'appuie sur la politique `profiles_super_admin` : seul le Super
 * Admin traverse les établissements. Aucun filtre `establishment_id` n'est
 * ajouté ici — le faire laisserait croire que l'isolation dépend du frontend.
 *
 * Les écritures (création, mot de passe, suppression) passent obligatoirement
 * par `/api/users` : elles exigent la clé `service_role`, qui ne doit jamais
 * atteindre le navigateur.
 */

export interface PlatformUser {
  id: string;
  businessReference: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  role: UserRole;
  establishmentId: string | null;
  establishmentName: string;
  isActive: boolean;
  createdAt: string;
}

export const listPlatformUsers = async (): Promise<PlatformUser[]> => {
  const { data, error } = await getClient()
    .from('profiles')
    .select('*, establishment:establishments(name)')
    .is('deleted_at', null)
    .neq('role', 'super_admin')
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des comptes');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { establishment?: { name: string } | null };
    return {
      id: row.id,
      businessReference: row.business_reference,
      username: row.username,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      phone: row.phone ?? '',
      role: row.role,
      establishmentId: row.establishment_id,
      establishmentName: joined.establishment?.name ?? '—',
      isActive: row.is_active !== false,
      createdAt: row.created_at,
    };
  });
};

/**
 * Identifiants des établissements possédant au moins un administrateur actif.
 *
 * Sert à signaler ceux qui n'en ont aucun : « aucun établissement ne doit
 * rester sans administrateur ».
 */
export const listEstablishmentsWithAdmin = async (): Promise<Set<string>> => {
  const { data, error } = await getClient()
    .from('profiles')
    .select('establishment_id')
    .eq('role', 'establishment_admin')
    .eq('is_active', true)
    .is('deleted_at', null);

  failIf(error, 'Contrôle des administrateurs');

  return new Set((data ?? []).flatMap((row) => (row.establishment_id ? [row.establishment_id] : [])));
};

export interface CreatePlatformUserInput {
  establishment_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  username?: string;
  password: string;
  role: UserRole;
}

const postJson = async (url: string, method: string, body?: unknown): Promise<void> => {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "L'opération a échoué.");
  }
};

export const createPlatformUser = (input: CreatePlatformUserInput): Promise<void> =>
  postJson('/api/users', 'POST', input);

export interface UpdatePlatformUserInput {
  role?: UserRole;
  password?: string;
  establishment_id?: string | null;
  is_active?: boolean;
}

export const updatePlatformUser = (
  userId: string,
  changes: UpdatePlatformUserInput,
): Promise<void> => postJson(`/api/users/${userId}`, 'PATCH', changes);

export const deletePlatformUser = (userId: string): Promise<void> =>
  postJson(`/api/users/${userId}`, 'DELETE');
