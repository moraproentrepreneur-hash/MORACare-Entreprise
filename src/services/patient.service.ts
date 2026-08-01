import { auditColumns, failIf, getClient, type WriteContext } from './base.service';
import type { Patient } from '@/types';
import type { PatientRow } from '@/types/database';

const toPatient = (row: PatientRow): Patient => ({
  id: row.id,
  business_reference: row.business_reference,
  establishment_id: row.establishment_id ?? '',
  first_name: row.first_name,
  last_name: row.last_name,
  gender: row.gender as Patient['gender'],
  birth_date: row.birth_date,
  national_id: row.national_id ?? undefined,
  phone: row.phone,
  email: row.email ?? undefined,
  address: row.address ?? undefined,
  blood_group: row.blood_group ?? undefined,
  allergies: row.allergies ?? undefined,
  chronic_conditions: row.chronic_conditions ?? undefined,
  emergency_contact_name: row.emergency_contact_name ?? undefined,
  emergency_contact_phone: row.emergency_contact_phone ?? undefined,
  is_active: row.is_active ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export type PatientInput = Omit<
  Patient,
  'id' | 'business_reference' | 'establishment_id' | 'created_at' | 'updated_at' | 'is_active'
>;

export const listPatients = async (): Promise<Patient[]> => {
  const { data, error } = await getClient()
    .from('patients')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des patients');
  return (data ?? []).map(toPatient);
};

export const createPatient = async (input: PatientInput, ctx: WriteContext): Promise<Patient> => {
  const { data, error } = await getClient()
    .from('patients')
    .insert({
      ...auditColumns(ctx),
      first_name: input.first_name,
      last_name: input.last_name,
      gender: input.gender,
      birth_date: input.birth_date,
      national_id: input.national_id ?? null,
      phone: input.phone,
      email: input.email ?? null,
      address: input.address ?? null,
      blood_group: input.blood_group ?? null,
      allergies: input.allergies ?? null,
      chronic_conditions: input.chronic_conditions ?? null,
      emergency_contact_name: input.emergency_contact_name ?? null,
      emergency_contact_phone: input.emergency_contact_phone ?? null,
    })
    .select()
    .single();

  failIf(error, 'Création du patient');
  return toPatient(data as PatientRow);
};
