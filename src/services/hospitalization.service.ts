import { auditColumns, failIf, getClient, type WriteContext } from './base.service';

/**
 * Module Hospitalisation (BP16).
 *
 * Chambres et lits sont des ressources de la base, jamais du texte saisi : le
 * formulaire d'admission choisit parmi ce qui existe et ce qui est libre. Les
 * contrôles de fond — un lit occupé, un lit hors service, une chambre pleine —
 * sont tenus par PostgreSQL ; ce service se contente de présenter les
 * possibilités et de traduire les refus en messages lisibles.
 */

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

export type RoomState = 'available' | 'occupied' | 'maintenance' | 'closed';

export type BedState = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';

export type StayState =
  | 'pre_admission'
  | 'admitted'
  | 'in_stay'
  | 'transferring'
  | 'discharge_planned'
  | 'discharged'
  | 'canceled'
  | 'archived';

export const ROOM_STATE_LABELS: Record<RoomState, string> = {
  available: 'Ouverte',
  occupied: 'Complète',
  maintenance: 'En maintenance',
  closed: 'Fermée',
};

/** BP16 §7. */
export const BED_STATE_LABELS: Record<BedState, string> = {
  available: 'Disponible',
  occupied: 'Occupé',
  reserved: 'Réservé',
  cleaning: 'En nettoyage',
  out_of_service: 'Hors service',
};

/** BP16 §12. */
export const STAY_STATE_LABELS: Record<StayState, string> = {
  pre_admission: 'Pré-admission',
  admitted: 'Admission validée',
  in_stay: 'Hospitalisé',
  transferring: 'En transfert',
  discharge_planned: 'Sortie programmée',
  discharged: 'Sorti',
  canceled: 'Annulée',
  archived: 'Archivée',
};

/** BP16 §5 : les origines d'une admission sont fixées par le blueprint. */
export const ADMISSION_ORIGINS = [
  { value: 'consultation', label: 'Après une consultation' },
  { value: 'emergency', label: 'Depuis les urgences' },
  { value: 'internal_transfer', label: 'Après un transfert interne' },
  { value: 'external_transfer', label: 'Après un transfert externe' },
  { value: 'administrative', label: 'Sur décision administrative' },
] as const;

/** BP16 §10. */
export const TRANSFER_TYPES = [
  { value: 'bed', label: 'Changement de lit' },
  { value: 'room', label: 'Changement de chambre' },
  { value: 'service', label: 'Changement de service' },
  { value: 'external', label: 'Transfert vers un autre établissement' },
] as const;

/** Séjours qui occupent réellement un lit. */
const ACTIVE_STAYS: readonly StayState[] = [
  'pre_admission',
  'admitted',
  'in_stay',
  'transferring',
  'discharge_planned',
];

export const isActiveStay = (status: StayState): boolean => ACTIVE_STAYS.includes(status);

// ---------------------------------------------------------------------------
// Modèles
// ---------------------------------------------------------------------------

export interface Room {
  id: string;
  reference: string;
  code: string;
  name: string | null;
  roomType: string;
  service: string | null;
  floor: string | null;
  capacity: number;
  dailyRate: number;
  status: RoomState;
  notes: string | null;
  /** Calculés depuis les lits, pour éviter une requête par ligne de tableau. */
  bedCount: number;
  occupiedBeds: number;
}

export interface Bed {
  id: string;
  reference: string;
  code: string;
  roomId: string;
  roomCode: string;
  roomType: string;
  service: string | null;
  status: BedState;
  availableFrom: string | null;
  notes: string | null;
  /** Séjour en cours, s'il y en a un. */
  hospitalizationId: string | null;
  patientId: string | null;
  patientName: string | null;
  admissionDate: string | null;
  isAssignable: boolean;
  dailyRate: number;
}

export interface Stay {
  id: string;
  reference: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  roomId: string | null;
  bedId: string | null;
  roomCode: string | null;
  bedCode: string | null;
  service: string | null;
  admissionOrigin: string | null;
  admissionDate: string;
  dischargeDate: string | null;
  admissionReason: string;
  dischargeSummary: string | null;
  dischargeReason: string | null;
  patientCondition: string | null;
  recommendations: string | null;
  nextAppointmentDate: string | null;
  dischargeValidatedBy: string | null;
  dailyRate: number;
  status: StayState;
  /** Jours écoulés, ou durée totale si le séjour est terminé (BP16 §4). */
  lengthOfStay: number;
}

export interface CareRecord {
  id: string;
  reference: string;
  hospitalizationId: string;
  careType: string;
  recordedAt: string;
  caregiverId: string | null;
  caregiverName: string | null;
  temperature: number | null;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weightKg: number | null;
  painLevel: number | null;
  observations: string | null;
  incident: string | null;
  nutrition: string | null;
}

export interface MedicalVisit {
  id: string;
  reference: string;
  hospitalizationId: string;
  doctorId: string;
  doctorName: string;
  visitedAt: string;
  observations: string;
  evolution: string | null;
  diagnosis: string | null;
  treatmentChanges: string | null;
  additionalExams: string | null;
  decision: string | null;
}

export interface Transfer {
  id: string;
  reference: string;
  hospitalizationId: string;
  transferType: string;
  fromRoomCode: string | null;
  fromBedCode: string | null;
  fromService: string | null;
  toRoomCode: string | null;
  toBedCode: string | null;
  toService: string | null;
  externalDestination: string | null;
  reason: string;
  transferredAt: string;
  performedByName: string | null;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

interface NamedProfile {
  first_name?: string | null;
  last_name?: string | null;
}

const fullName = (person: NamedProfile | null | undefined): string =>
  person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : '';

const DAY = 86_400_000;

/** Durée de séjour en jours entamés : une nuit compte pour un jour. */
export const stayLength = (admission: string, discharge: string | null): number => {
  const start = new Date(admission).getTime();
  const end = discharge ? new Date(discharge).getTime() : Date.now();
  return Math.max(1, Math.ceil((end - start) / DAY));
};

// ---------------------------------------------------------------------------
// Chambres
// ---------------------------------------------------------------------------

export interface RoomInput {
  code: string;
  name?: string;
  roomType: string;
  service?: string;
  floor?: string;
  capacity: number;
  dailyRate: number;
  status: RoomState;
  notes?: string;
}

export const listRooms = async (): Promise<Room[]> => {
  const client = getClient();

  const [rooms, beds] = await Promise.all([
    client.from('rooms').select('*').is('deleted_at', null).order('code'),
    // La vue porte déjà l'occupation : la relire évite de recalculer côté
    // client une information dont la base est la seule source fiable.
    client.from('bed_availability').select('room_id, bed_id, hospitalization_id'),
  ]);

  failIf(rooms.error, 'Chargement des chambres');
  failIf(beds.error, 'Chargement des lits');

  const counts = new Map<string, { total: number; occupied: number }>();
  for (const bed of beds.data ?? []) {
    if (!bed.room_id) continue;
    const entry = counts.get(bed.room_id) ?? { total: 0, occupied: 0 };
    entry.total += 1;
    if (bed.hospitalization_id) entry.occupied += 1;
    counts.set(bed.room_id, entry);
  }

  return (rooms.data ?? []).map((row) => {
    const count = counts.get(row.id) ?? { total: 0, occupied: 0 };
    return {
      id: row.id,
      reference: row.business_reference,
      code: row.code,
      name: row.name,
      roomType: row.room_type,
      service: row.service,
      floor: row.floor,
      capacity: row.capacity,
      dailyRate: Number(row.daily_rate ?? 0),
      status: row.status as RoomState,
      notes: row.notes,
      bedCount: count.total,
      occupiedBeds: count.occupied,
    };
  });
};

export const createRoom = async (input: RoomInput, ctx: WriteContext): Promise<void> => {
  const { error } = await getClient()
    .from('rooms')
    .insert({
      ...auditColumns(ctx),
      code: input.code.trim(),
      name: input.name?.trim() || null,
      room_type: input.roomType,
      service: input.service || null,
      floor: input.floor?.trim() || null,
      capacity: input.capacity,
      daily_rate: input.dailyRate,
      status: input.status,
      notes: input.notes?.trim() || null,
    });

  failIf(error, 'Création de la chambre');
};

export const updateRoom = async (
  id: string,
  input: RoomInput,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('rooms')
    .update({
      code: input.code.trim(),
      name: input.name?.trim() || null,
      room_type: input.roomType,
      service: input.service || null,
      floor: input.floor?.trim() || null,
      capacity: input.capacity,
      daily_rate: input.dailyRate,
      status: input.status,
      notes: input.notes?.trim() || null,
      updated_by: userId,
    })
    .eq('id', id);

  failIf(error, 'Mise à jour de la chambre');
};

/**
 * Retrait d'une chambre.
 *
 * BR-064 interdit la suppression physique : la chambre est marquée supprimée et
 * disparaît des listes, mais les séjours passés continuent de la référencer.
 */
export const removeRoom = async (id: string, userId: string): Promise<void> => {
  const client = getClient();

  const { count, error: countError } = await client
    .from('bed_availability')
    .select('bed_id', { count: 'exact', head: true })
    .eq('room_id', id)
    .not('hospitalization_id', 'is', null);

  failIf(countError, 'Vérification de la chambre');

  if ((count ?? 0) > 0) {
    throw new Error(
      'Cette chambre accueille encore des patients. Transférez-les avant de la retirer.',
    );
  }

  const { error } = await client
    .from('rooms')
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id);

  failIf(error, 'Retrait de la chambre');
};

// ---------------------------------------------------------------------------
// Lits
// ---------------------------------------------------------------------------

export interface BedInput {
  roomId: string;
  code: string;
  status: BedState;
  availableFrom?: string | null;
  notes?: string;
}

interface AvailabilityRow {
  bed_id: string;
  bed_reference: string;
  bed_code: string;
  bed_status: string;
  available_from: string | null;
  room_id: string;
  room_code: string;
  room_type: string;
  service: string | null;
  daily_rate: number | string | null;
  hospitalization_id: string | null;
  patient_id: string | null;
  admission_date: string | null;
  is_assignable: boolean | null;
}

export const listBeds = async (): Promise<Bed[]> => {
  const client = getClient();

  const { data, error } = await client
    .from('bed_availability')
    .select('*')
    .order('room_code')
    .order('bed_code');

  failIf(error, 'Chargement des lits');

  const rows = (data ?? []) as unknown as AvailabilityRow[];

  // Les noms de patients sont résolus en une requête plutôt qu'en jointure :
  // la vue n'expose que l'identifiant, et un LEFT JOIN sur `patients` la
  // ferait dépendre d'une table que tous les rôles ne lisent pas.
  const patientIds = [...new Set(rows.map((row) => row.patient_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();

  if (patientIds.length > 0) {
    const { data: patients } = await client
      .from('patients')
      .select('id, first_name, last_name')
      .in('id', patientIds);

    for (const patient of patients ?? []) {
      names.set(patient.id, fullName(patient));
    }
  }

  return rows.map((row) => ({
    id: row.bed_id,
    reference: row.bed_reference,
    code: row.bed_code,
    roomId: row.room_id,
    roomCode: row.room_code,
    roomType: row.room_type,
    service: row.service,
    status: row.bed_status as BedState,
    availableFrom: row.available_from,
    notes: null,
    hospitalizationId: row.hospitalization_id,
    patientId: row.patient_id,
    patientName: row.patient_id ? (names.get(row.patient_id) ?? 'Patient') : null,
    admissionDate: row.admission_date,
    isAssignable: row.is_assignable === true,
    dailyRate: Number(row.daily_rate ?? 0),
  }));
};

export const createBed = async (input: BedInput, ctx: WriteContext): Promise<void> => {
  const { error } = await getClient()
    .from('beds')
    .insert({
      ...auditColumns(ctx),
      room_id: input.roomId,
      code: input.code.trim(),
      status: input.status,
      available_from: input.availableFrom || null,
      notes: input.notes?.trim() || null,
    });

  failIf(error, 'Création du lit');
};

/**
 * Changement d'état d'un lit.
 *
 * L'état « occupé » n'est jamais posé à la main : il découle de l'affectation
 * d'un séjour, et la base le tient elle-même. Le proposer ici laisserait croire
 * qu'un lit peut être déclaré occupé sans patient.
 */
export const setBedState = async (
  id: string,
  status: Exclude<BedState, 'occupied'>,
  userId: string,
  availableFrom?: string | null,
): Promise<void> => {
  const { error } = await getClient()
    .from('beds')
    .update({
      status,
      available_from: availableFrom ?? null,
      updated_by: userId,
    })
    .eq('id', id)
    .neq('status', 'occupied');

  failIf(error, "Mise à jour de l'état du lit");
};

export const removeBed = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('beds')
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .neq('status', 'occupied');

  failIf(error, 'Retrait du lit');
};

// ---------------------------------------------------------------------------
// Séjours
// ---------------------------------------------------------------------------

const STAY_SELECT = `
  *,
  patient:patients!hospitalizations_patient_id_fkey(first_name, last_name),
  doctor:profiles!hospitalizations_doctor_id_fkey(first_name, last_name),
  room:rooms(code),
  bed:beds(code)
`;

interface StayJoined {
  patient?: NamedProfile | null;
  doctor?: NamedProfile | null;
  room?: { code: string } | null;
  bed?: { code: string } | null;
}

export const listStays = async (): Promise<Stay[]> => {
  const { data, error } = await getClient()
    .from('hospitalizations')
    .select(STAY_SELECT)
    .is('deleted_at', null)
    .order('admission_date', { ascending: false });

  failIf(error, 'Chargement des hospitalisations');

  return (data ?? []).map((row) => {
    const joined = row as unknown as StayJoined;
    const admission = row.admission_date ?? row.created_at;

    return {
      id: row.id,
      reference: row.business_reference,
      patientId: row.patient_id,
      patientName: fullName(joined.patient),
      doctorId: row.doctor_id,
      doctorName: fullName(joined.doctor),
      roomId: row.room_id,
      bedId: row.bed_id,
      // Les séjours antérieurs à la gestion des ressources ne portent qu'un
      // texte : on l'affiche plutôt que de laisser la colonne vide.
      roomCode: joined.room?.code ?? row.room_number,
      bedCode: joined.bed?.code ?? row.bed_number,
      service: row.service,
      admissionOrigin: row.admission_origin,
      admissionDate: admission,
      dischargeDate: row.discharge_date,
      admissionReason: row.admission_reason,
      dischargeSummary: row.discharge_summary,
      dischargeReason: row.discharge_reason,
      patientCondition: row.patient_condition,
      recommendations: row.recommendations,
      nextAppointmentDate: row.next_appointment_date,
      dischargeValidatedBy: row.discharge_validated_by,
      dailyRate: Number(row.daily_rate ?? 0),
      status: row.stay_status as StayState,
      lengthOfStay: stayLength(admission, row.discharge_date),
    };
  });
};

export interface AdmissionInput {
  patientId: string;
  doctorId: string;
  roomId: string;
  bedId: string;
  service: string;
  admissionOrigin: string;
  admissionReason: string;
  admissionDate?: string;
  dailyRate: number;
}

export const admitPatient = async (
  input: AdmissionInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('hospitalizations')
    .insert({
      ...auditColumns(ctx),
      patient_id: input.patientId,
      doctor_id: input.doctorId,
      room_id: input.roomId,
      bed_id: input.bedId,
      service: input.service,
      admission_origin: input.admissionOrigin,
      admission_reason: input.admissionReason,
      admission_date: input.admissionDate ?? new Date().toISOString(),
      daily_rate: input.dailyRate,
      stay_status: 'in_stay',
      status: 'active',
    });

  failIf(error, "Enregistrement de l'admission");
};

/**
 * Transfert d'un patient (BP16 §10).
 *
 * Le mouvement est historisé **avant** le déplacement : si l'affectation
 * échoue — lit entre-temps occupé, chambre incohérente — la trace décrirait un
 * transfert qui n'a pas eu lieu. L'ordre inverse serait pire : un déplacement
 * sans trace, contraire à BR-061.
 */
export interface TransferInput {
  hospitalizationId: string;
  transferType: string;
  toRoomId?: string | null;
  toBedId?: string | null;
  toService?: string | null;
  externalDestination?: string | null;
  reason: string;
}

export const transferPatient = async (
  input: TransferInput,
  current: Pick<Stay, 'roomId' | 'bedId' | 'service'>,
  ctx: WriteContext,
): Promise<void> => {
  const client = getClient();
  const isExternal = input.transferType === 'external';

  if (!isExternal) {
    const { error: moveError } = await client
      .from('hospitalizations')
      .update({
        room_id: input.toRoomId ?? current.roomId,
        bed_id: input.toBedId ?? current.bedId,
        service: input.toService ?? current.service,
        updated_by: ctx.userId,
      })
      .eq('id', input.hospitalizationId);

    failIf(moveError, 'Transfert du patient');
  } else {
    // Un transfert externe met fin au séjour : le lit doit être libéré.
    const { error: closeError } = await client
      .from('hospitalizations')
      .update({
        stay_status: 'discharged',
        discharge_date: new Date().toISOString(),
        discharge_reason: 'Transfert externe',
        discharge_validated_by: ctx.userId,
        discharge_validated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq('id', input.hospitalizationId);

    failIf(closeError, 'Transfert externe');
  }

  const { error } = await client.from('hospitalization_transfers').insert({
    ...auditColumns(ctx),
    hospitalization_id: input.hospitalizationId,
    transfer_type: input.transferType,
    from_room_id: current.roomId,
    from_bed_id: current.bedId,
    from_service: current.service,
    to_room_id: input.toRoomId ?? null,
    to_bed_id: input.toBedId ?? null,
    to_service: input.toService ?? null,
    external_destination: input.externalDestination ?? null,
    reason: input.reason,
    performed_by: ctx.userId,
  });

  failIf(error, 'Historisation du transfert');
};

export interface DischargeInput {
  hospitalizationId: string;
  dischargeReason: string;
  patientCondition: string;
  dischargeSummary: string;
  recommendations?: string;
  nextAppointmentDate?: string | null;
}

export const dischargePatient = async (
  input: DischargeInput,
  ctx: WriteContext,
): Promise<void> => {
  const now = new Date().toISOString();

  const { error } = await getClient()
    .from('hospitalizations')
    .update({
      stay_status: 'discharged',
      status: 'discharged',
      discharge_date: now,
      discharge_reason: input.dischargeReason,
      patient_condition: input.patientCondition,
      discharge_summary: input.dischargeSummary,
      recommendations: input.recommendations?.trim() || null,
      next_appointment_date: input.nextAppointmentDate || null,
      // La validation médicale est exigée par la base quand le réglage est
      // actif : la porter ici évite un refus incompréhensible côté écran.
      discharge_validated_by: ctx.userId,
      discharge_validated_at: now,
      updated_by: ctx.userId,
    })
    .eq('id', input.hospitalizationId);

  failIf(error, 'Enregistrement de la sortie');
};

export const cancelStay = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('hospitalizations')
    .update({ stay_status: 'canceled', status: 'canceled', updated_by: userId })
    .eq('id', id);

  failIf(error, "Annulation de l'admission");
};

export const planDischarge = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('hospitalizations')
    .update({ stay_status: 'discharge_planned', updated_by: userId })
    .eq('id', id);

  failIf(error, 'Programmation de la sortie');
};

// ---------------------------------------------------------------------------
// Soins, visites, transferts
// ---------------------------------------------------------------------------

export interface CareInput {
  hospitalizationId: string;
  careType: string;
  temperature?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  weightKg?: number | null;
  painLevel?: number | null;
  observations?: string;
  incident?: string;
  nutrition?: string;
}

export const listCare = async (hospitalizationId: string): Promise<CareRecord[]> => {
  const { data, error } = await getClient()
    .from('hospitalization_care')
    .select('*, caregiver:profiles!hospitalization_care_caregiver_id_fkey(first_name, last_name)')
    .eq('hospitalization_id', hospitalizationId)
    .is('deleted_at', null)
    .order('recorded_at', { ascending: false });

  failIf(error, 'Chargement des soins');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { caregiver?: NamedProfile | null };
    return {
      id: row.id,
      reference: row.business_reference,
      hospitalizationId: row.hospitalization_id,
      careType: row.care_type,
      recordedAt: row.recorded_at,
      caregiverId: row.caregiver_id,
      caregiverName: joined.caregiver ? fullName(joined.caregiver) : null,
      temperature: row.temperature === null ? null : Number(row.temperature),
      systolic: row.blood_pressure_systolic,
      diastolic: row.blood_pressure_diastolic,
      heartRate: row.heart_rate,
      respiratoryRate: row.respiratory_rate,
      oxygenSaturation: row.oxygen_saturation,
      weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
      painLevel: row.pain_level,
      observations: row.observations,
      incident: row.incident,
      nutrition: row.nutrition,
    };
  });
};

export const recordCare = async (input: CareInput, ctx: WriteContext): Promise<void> => {
  const { error } = await getClient()
    .from('hospitalization_care')
    .insert({
      ...auditColumns(ctx),
      hospitalization_id: input.hospitalizationId,
      care_type: input.careType,
      caregiver_id: ctx.userId,
      temperature: input.temperature ?? null,
      blood_pressure_systolic: input.systolic ?? null,
      blood_pressure_diastolic: input.diastolic ?? null,
      heart_rate: input.heartRate ?? null,
      respiratory_rate: input.respiratoryRate ?? null,
      oxygen_saturation: input.oxygenSaturation ?? null,
      weight_kg: input.weightKg ?? null,
      pain_level: input.painLevel ?? null,
      observations: input.observations?.trim() || null,
      incident: input.incident?.trim() || null,
      nutrition: input.nutrition?.trim() || null,
    });

  failIf(error, "Enregistrement du soin");
};

export interface VisitInput {
  hospitalizationId: string;
  doctorId: string;
  observations: string;
  evolution?: string;
  diagnosis?: string;
  treatmentChanges?: string;
  additionalExams?: string;
  decision?: string;
}

export const listVisits = async (hospitalizationId: string): Promise<MedicalVisit[]> => {
  const { data, error } = await getClient()
    .from('hospitalization_visits')
    .select('*, doctor:profiles!hospitalization_visits_doctor_id_fkey(first_name, last_name)')
    .eq('hospitalization_id', hospitalizationId)
    .is('deleted_at', null)
    .order('visited_at', { ascending: false });

  failIf(error, 'Chargement des visites');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { doctor?: NamedProfile | null };
    return {
      id: row.id,
      reference: row.business_reference,
      hospitalizationId: row.hospitalization_id,
      doctorId: row.doctor_id,
      doctorName: fullName(joined.doctor),
      visitedAt: row.visited_at,
      observations: row.observations,
      evolution: row.evolution,
      diagnosis: row.diagnosis,
      treatmentChanges: row.treatment_changes,
      additionalExams: row.additional_exams,
      decision: row.decision,
    };
  });
};

export const recordVisit = async (input: VisitInput, ctx: WriteContext): Promise<void> => {
  const { error } = await getClient()
    .from('hospitalization_visits')
    .insert({
      ...auditColumns(ctx),
      hospitalization_id: input.hospitalizationId,
      doctor_id: input.doctorId,
      observations: input.observations,
      evolution: input.evolution || null,
      diagnosis: input.diagnosis?.trim() || null,
      treatment_changes: input.treatmentChanges?.trim() || null,
      additional_exams: input.additionalExams?.trim() || null,
      decision: input.decision || null,
    });

  failIf(error, 'Enregistrement de la visite');
};

export const listTransfers = async (hospitalizationId: string): Promise<Transfer[]> => {
  const { data, error } = await getClient()
    .from('hospitalization_transfers')
    .select(`
      *,
      from_room:rooms!hospitalization_transfers_from_room_id_fkey(code),
      to_room:rooms!hospitalization_transfers_to_room_id_fkey(code),
      from_bed:beds!hospitalization_transfers_from_bed_id_fkey(code),
      to_bed:beds!hospitalization_transfers_to_bed_id_fkey(code),
      performer:profiles!hospitalization_transfers_performed_by_fkey(first_name, last_name)
    `)
    .eq('hospitalization_id', hospitalizationId)
    .is('deleted_at', null)
    .order('transferred_at', { ascending: false });

  failIf(error, 'Chargement des transferts');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      from_room?: { code: string } | null;
      to_room?: { code: string } | null;
      from_bed?: { code: string } | null;
      to_bed?: { code: string } | null;
      performer?: NamedProfile | null;
    };

    return {
      id: row.id,
      reference: row.business_reference,
      hospitalizationId: row.hospitalization_id,
      transferType: row.transfer_type,
      fromRoomCode: joined.from_room?.code ?? null,
      fromBedCode: joined.from_bed?.code ?? null,
      fromService: row.from_service,
      toRoomCode: joined.to_room?.code ?? null,
      toBedCode: joined.to_bed?.code ?? null,
      toService: row.to_service,
      externalDestination: row.external_destination,
      reason: row.reason,
      transferredAt: row.transferred_at,
      performedByName: joined.performer ? fullName(joined.performer) : null,
    };
  });
};

// ---------------------------------------------------------------------------
// Indicateurs (BP16 §15)
// ---------------------------------------------------------------------------

export interface OccupancyReport {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  outOfServiceBeds: number;
  occupancyRate: number;
  totalRooms: number;
  availableRooms: number;
  currentStays: number;
  averageLengthOfStay: number;
  byService: { service: string; beds: number; occupied: number }[];
}

export const buildOccupancy = (beds: readonly Bed[], stays: readonly Stay[]): OccupancyReport => {
  const occupied = beds.filter((bed) => bed.hospitalizationId !== null).length;
  const outOfService = beds.filter(
    (bed) => bed.status === 'out_of_service' || bed.status === 'cleaning',
  ).length;

  const services = new Map<string, { beds: number; occupied: number }>();
  for (const bed of beds) {
    const key = bed.service ?? 'Non affecté';
    const entry = services.get(key) ?? { beds: 0, occupied: 0 };
    entry.beds += 1;
    if (bed.hospitalizationId) entry.occupied += 1;
    services.set(key, entry);
  }

  const closed = stays.filter((stay) => stay.status === 'discharged');
  const average =
    closed.length === 0
      ? 0
      : closed.reduce((total, stay) => total + stay.lengthOfStay, 0) / closed.length;

  const rooms = new Map<string, boolean>();
  for (const bed of beds) {
    // Une chambre est comptée disponible dès qu'un de ses lits l'est.
    rooms.set(bed.roomId, (rooms.get(bed.roomId) ?? false) || bed.isAssignable);
  }

  return {
    totalBeds: beds.length,
    occupiedBeds: occupied,
    availableBeds: beds.filter((bed) => bed.isAssignable).length,
    outOfServiceBeds: outOfService,
    occupancyRate: beds.length === 0 ? 0 : Math.round((occupied / beds.length) * 100),
    totalRooms: rooms.size,
    availableRooms: [...rooms.values()].filter(Boolean).length,
    currentStays: stays.filter((stay) => isActiveStay(stay.status)).length,
    averageLengthOfStay: Math.round(average * 10) / 10,
    byService: [...services.entries()]
      .map(([service, value]) => ({ service, ...value }))
      .sort((a, b) => b.beds - a.beds),
  };
};
