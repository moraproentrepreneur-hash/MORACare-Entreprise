import { auditColumns, failIf, getClient, type WriteContext } from './base.service';
import type { Appointment, Consultation } from '@/types';

/**
 * Rendez-vous, consultations et hospitalisations (BP14, BP15, BP16).
 *
 * Les noms de patient et de praticien ne sont jamais stockés en doublon : ils
 * proviennent d'une jointure sur `patients` et `profiles`. C'est ce qui garantit
 * l'exigence CLAUDE.md « Aucune saisie libre lorsqu'une relation existe déjà ».
 */

const PATIENT_JOIN = 'patient:patients(first_name, last_name)';
const DOCTOR_JOIN = 'doctor:profiles!doctor_id(first_name, last_name)';

type Joined = {
  patient?: { first_name: string; last_name: string } | null;
  doctor?: { first_name: string; last_name: string } | null;
};

const fullName = (p?: { first_name: string; last_name: string } | null): string =>
  p ? `${p.first_name} ${p.last_name}`.trim() : '';

// ---------------------------------------------------------------- Rendez-vous

export interface AppointmentInput {
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  duration_minutes?: number;
  reason: string;
  notes?: string;
}

export const listAppointments = async (): Promise<Appointment[]> => {
  const { data, error } = await getClient()
    .from('appointments')
    .select(`*, ${PATIENT_JOIN}, ${DOCTOR_JOIN}`)
    .is('deleted_at', null)
    .order('appointment_date', { ascending: false });

  failIf(error, 'Chargement des rendez-vous');

  return (data ?? []).map((row) => {
    const joined = row as unknown as Joined;
    return {
      id: row.id,
      business_reference: row.business_reference,
      establishment_id: row.establishment_id ?? '',
      patient_id: row.patient_id,
      patient_name: fullName(joined.patient),
      doctor_id: row.doctor_id,
      doctor_name: fullName(joined.doctor),
      appointment_date: row.appointment_date,
      duration_minutes: row.duration_minutes ?? 30,
      status: (row.status ?? 'scheduled') as Appointment['status'],
      reason: row.reason ?? '',
      notes: row.notes ?? undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
};

export const createAppointment = async (
  input: AppointmentInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('appointments')
    .insert({
      ...auditColumns(ctx),
      patient_id: input.patient_id,
      doctor_id: input.doctor_id,
      appointment_date: input.appointment_date,
      duration_minutes: input.duration_minutes ?? 30,
      reason: input.reason,
      notes: input.notes ?? null,
      status: 'scheduled',
    });

  failIf(error, 'Création du rendez-vous');
};

// --------------------------------------------------------------- Consultations

export interface ConsultationInput {
  patient_id: string;
  doctor_id: string;
  chief_complaint: string;
  symptoms?: string;
  physical_examination?: string;
  weight_kg?: number;
  height_cm?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  temperature_celsius?: number;
  heart_rate_bpm?: number;
  diagnosis_summary?: string;
  treatment_plan?: string;
}

export const listConsultations = async (): Promise<Consultation[]> => {
  const { data, error } = await getClient()
    .from('consultations')
    .select(`*, ${PATIENT_JOIN}, ${DOCTOR_JOIN}`)
    .is('deleted_at', null)
    .order('consultation_date', { ascending: false });

  failIf(error, 'Chargement des consultations');

  return (data ?? []).map((row) => {
    const joined = row as unknown as Joined;
    return {
      id: row.id,
      business_reference: row.business_reference,
      establishment_id: row.establishment_id ?? '',
      patient_id: row.patient_id,
      patient_name: fullName(joined.patient),
      doctor_id: row.doctor_id,
      doctor_name: fullName(joined.doctor),
      consultation_date: row.consultation_date ?? row.created_at,
      chief_complaint: row.chief_complaint,
      symptoms: row.symptoms ?? undefined,
      physical_examination: row.physical_examination ?? undefined,
      weight_kg: row.weight_kg ?? undefined,
      height_cm: row.height_cm ?? undefined,
      blood_pressure_systolic: row.blood_pressure_systolic ?? undefined,
      blood_pressure_diastolic: row.blood_pressure_diastolic ?? undefined,
      temperature_celsius: row.temperature_celsius ?? undefined,
      heart_rate_bpm: row.heart_rate_bpm ?? undefined,
      diagnosis_summary: row.diagnosis_summary ?? undefined,
      treatment_plan: row.treatment_plan ?? undefined,
      status: (row.status ?? 'completed') as Consultation['status'],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
};

export const createConsultation = async (
  input: ConsultationInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('consultations')
    .insert({ ...auditColumns(ctx), ...input, status: 'completed' });

  failIf(error, 'Création de la consultation');
};

// Les hospitalisations relèvent désormais de hospitalization.service.ts : le
// module BP16 manipule des chambres, des lits et un cycle de vie complet que
// ce service clinique n’a pas vocation à porter.
