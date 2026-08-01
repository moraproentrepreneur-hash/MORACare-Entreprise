import { auditColumns, failIf, getClient, type WriteContext } from './base.service';
import type { ImagingOrder, LabOrder } from '@/types';

/** Demandes de laboratoire et d'imagerie (BP20, BP21). */

const PATIENT_JOIN = 'patient:patients(first_name, last_name)';
const DOCTOR_JOIN = 'doctor:profiles!doctor_id(first_name, last_name)';

type Joined = {
  patient?: { first_name: string; last_name: string } | null;
  doctor?: { first_name: string; last_name: string } | null;
};

const fullName = (p?: { first_name: string; last_name: string } | null): string =>
  p ? `${p.first_name} ${p.last_name}`.trim() : '';

// ----------------------------------------------------------------- Laboratoire

export interface LabOrderInput {
  patient_id: string;
  doctor_id: string;
  test_type: string;
  priority: LabOrder['priority'];
}

export const listLabOrders = async (): Promise<LabOrder[]> => {
  const { data, error } = await getClient()
    .from('lab_orders')
    .select(`*, ${PATIENT_JOIN}, ${DOCTOR_JOIN}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des demandes de laboratoire');

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
      test_type: row.test_type,
      priority: (row.priority ?? 'routine') as LabOrder['priority'],
      status: (row.status ?? 'pending') as LabOrder['status'],
      results: row.results ?? undefined,
      normal_reference_range: row.normal_reference_range ?? undefined,
      completed_at: row.completed_at ?? undefined,
      created_at: row.created_at,
    };
  });
};

export const createLabOrder = async (input: LabOrderInput, ctx: WriteContext): Promise<void> => {
  const { error } = await getClient()
    .from('lab_orders')
    .insert({ ...auditColumns(ctx), ...input, status: 'pending' });

  failIf(error, 'Création de la demande de laboratoire');
};

// -------------------------------------------------------------------- Imagerie

export interface ImagingOrderInput {
  patient_id: string;
  doctor_id: string;
  modality: ImagingOrder['modality'];
  body_part: string;
  clinical_notes?: string;
}

export const listImagingOrders = async (): Promise<ImagingOrder[]> => {
  const { data, error } = await getClient()
    .from('imaging_orders')
    .select(`*, ${PATIENT_JOIN}, ${DOCTOR_JOIN}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, "Chargement des demandes d'imagerie");

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
      modality: row.modality as ImagingOrder['modality'],
      body_part: row.body_part,
      clinical_notes: row.clinical_notes ?? undefined,
      status: (row.status ?? 'pending') as ImagingOrder['status'],
      report_text: row.report_text ?? undefined,
      image_url: row.image_url ?? undefined,
      completed_at: row.completed_at ?? undefined,
      created_at: row.created_at,
    };
  });
};

export const createImagingOrder = async (
  input: ImagingOrderInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('imaging_orders')
    .insert({
      ...auditColumns(ctx),
      patient_id: input.patient_id,
      doctor_id: input.doctor_id,
      modality: input.modality,
      body_part: input.body_part,
      clinical_notes: input.clinical_notes ?? null,
      status: 'pending',
    });

  failIf(error, "Création de la demande d'imagerie");
};
