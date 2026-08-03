import type { UserRole } from '@/types';

/**
 * Libellés des rôles, en un seul endroit.
 *
 * Trois écrans les affichaient chacun avec leur propre copie : au premier
 * renommage, ils auraient divergé.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  establishment_admin: "Responsable d'établissement",
  doctor: 'Médecin',
  nurse: 'Infirmier(ère)',
  receptionist: 'Réceptionniste',
  pharmacist: 'Pharmacien',
  lab_tech: 'Laboratoire',
  radiologist: 'Imagerie',
  accountant: 'Comptable',
  patient: 'Patient',
};

/**
 * Rôles attribuables depuis une console d'administration.
 *
 * `super_admin` en est exclu : ce compte appartient à l'éditeur et ne
 * s'attribue pas depuis l'interface.
 */
export const ASSIGNABLE_ROLES: readonly Exclude<UserRole, 'super_admin'>[] = [
  'establishment_admin',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'lab_tech',
  'radiologist',
  'accountant',
  'patient',
];

export const roleLabel = (role: UserRole): string => ROLE_LABELS[role] ?? role;
