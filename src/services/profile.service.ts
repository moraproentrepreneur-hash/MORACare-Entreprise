import { failIf, getClient } from './base.service';
import type { UserAccount, UserRole } from '@/types';

/**
 * Membres du personnel de l'établissement courant.
 *
 * RLS restreint déjà la lecture au périmètre de l'utilisateur : aucun filtre
 * `establishment_id` n'est nécessaire ici, et en ajouter un donnerait la fausse
 * impression que la sécurité dépend du frontend.
 */

export interface StaffMember {
  id: string;
  full_name: string;
  role: UserRole;
  specialty?: string;
  department?: string;
}

export const listStaff = async (roles?: UserRole[]): Promise<StaffMember[]> => {
  let query = getClient()
    .from('profiles')
    .select('id, first_name, last_name, role, specialty, department')
    .is('deleted_at', null)
    .eq('is_active', true);

  if (roles?.length) {
    query = query.in('role', roles);
  }

  const { data, error } = await query.order('last_name');
  failIf(error, 'Chargement du personnel');

  return (data ?? []).map((row) => ({
    id: row.id,
    full_name: `${row.first_name} ${row.last_name}`.trim(),
    role: row.role,
    specialty: row.specialty ?? undefined,
    department: row.department ?? undefined,
  }));
};

/** Praticiens habilités à être désignés sur un acte médical. */
export const listDoctors = (): Promise<StaffMember[]> => listStaff(['doctor']);

export const listUserAccounts = async (): Promise<UserAccount[]> => {
  const { data, error } = await getClient()
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des comptes utilisateurs');

  return (data ?? []).map((row) => ({
    id: row.id,
    business_reference: row.business_reference,
    username: row.username,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone ?? '',
    role: row.role,
    department: row.department ?? '',
    status: row.is_active === false ? 'suspended' : 'active',
    created_at: row.created_at,
  }));
};

export interface CreateUserInput {
  first_name: string;
  last_name: string;
  username?: string;
  email: string;
  phone?: string;
  department?: string;
  role: UserRole;
  password: string;
}

/**
 * Crée un compte utilisateur via le Route Handler serveur.
 *
 * La création passe par la clé `service_role`, qui ne peut pas être exposée au
 * navigateur : l'appel réseau vers `/api/users` est donc obligatoire ici.
 */
export const createUserAccount = async (input: CreateUserInput): Promise<void> => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Création du compte impossible.');
  }
};

/**
 * Modifie un compte existant (UG01 §9, UG02 §5-6).
 *
 * Passe par le Route Handler serveur : la réinitialisation d'un mot de passe
 * exige la clé `service_role`, et les règles de délégation de BP06 §11 sont
 * appliquées côté serveur.
 */
export interface UpdateUserInput {
  role?: UserRole;
  password?: string;
  establishment_id?: string | null;
  is_active?: boolean;
  department?: string;
}

export const updateUserAccount = async (
  userId: string,
  changes: UpdateUserInput,
): Promise<void> => {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Modification du compte impossible.');
  }
};

export const setUserActive = (userId: string, isActive: boolean): Promise<void> =>
  updateUserAccount(userId, { is_active: isActive });
