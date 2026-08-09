import { auditColumns, failIf, getClient, type WriteContext } from './base.service';

/**
 * Plans thérapeutiques et dispensation hospitalière (BP19 §6, §11).
 *
 * Le plan regroupe les traitements d'un patient : il donne au pharmacien et au
 * soignant une vue d'ensemble que la succession des ordonnances ne procure pas.
 * BR-084 rattache chaque prescription à un plan.
 *
 * La tournée est la distribution quotidienne aux patients hospitalisés. Chaque
 * administration constatée est consignée dans le dossier du patient — par la
 * base, pas par l'écran : une administration qui ne figurerait pas au dossier
 * n'aurait pas eu lieu du point de vue du soin.
 */

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

export type PlanStatus = 'active' | 'suspended' | 'completed' | 'canceled';

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  active: 'En cours',
  suspended: 'Suspendu',
  completed: 'Terminé',
  canceled: 'Annulé',
};

export const PLAN_STATUS_TONES: Record<PlanStatus, 'good' | 'warn' | 'neutral' | 'bad'> = {
  active: 'good',
  suspended: 'warn',
  completed: 'neutral',
  canceled: 'bad',
};

/** BP19 §6 : médicaments, perfusions, injections, ponctuels, continus. */
export const TREATMENT_TYPES = [
  { value: 'medication', label: 'Médicament' },
  { value: 'infusion', label: 'Perfusion' },
  { value: 'injection', label: 'Injection' },
  { value: 'one_off', label: 'Traitement ponctuel' },
  { value: 'continuous', label: 'Traitement continu' },
] as const;

export const FREQUENCIES = [
  '1 fois par jour',
  '2 fois par jour',
  '3 fois par jour',
  '4 fois par jour',
  'Toutes les 4 heures',
  'Toutes les 6 heures',
  'Toutes les 8 heures',
  'Toutes les 12 heures',
  'À la demande',
  'Dose unique',
] as const;

/** BP19 §11 : la distribution est quotidienne, par tournée. */
export const ROUND_SLOTS = [
  { value: 'matin', label: 'Matin' },
  { value: 'midi', label: 'Midi' },
  { value: 'soir', label: 'Soir' },
  { value: 'nuit', label: 'Nuit' },
] as const;

export const ROUND_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  in_progress: 'En cours',
  closed: 'Clôturée',
  canceled: 'Annulée',
};

export const ADMINISTRATION_STATUS_LABELS: Record<string, string> = {
  planned: 'À administrer',
  administered: 'Administré',
  refused: 'Refusé par le patient',
  postponed: 'Reporté',
  canceled: 'Annulé',
};

// ---------------------------------------------------------------------------
// Modèles
// ---------------------------------------------------------------------------

export interface PlanLine {
  id: string;
  itemId: string | null;
  medicationLabel: string;
  treatmentType: string;
  dosage: string | null;
  route: string | null;
  frequency: string | null;
  administrationTimes: string[];
  durationDays: number | null;
  quantityPerIntake: number | null;
  isContinuous: boolean;
  instructions: string | null;
  status: string;
}

export interface TherapeuticPlan {
  id: string;
  reference: string;
  patientId: string;
  patientName: string;
  hospitalizationId: string | null;
  doctorName: string | null;
  label: string;
  indication: string | null;
  startedOn: string;
  endedOn: string | null;
  status: PlanStatus;
  notes: string | null;
  lines: PlanLine[];
}

export interface Administration {
  id: string;
  hospitalizationId: string;
  patientName: string;
  roomCode: string | null;
  bedCode: string | null;
  planLineId: string | null;
  itemId: string | null;
  medicationLabel: string;
  quantity: number;
  status: string;
  administeredAt: string | null;
  administeredByName: string | null;
  refusalReason: string | null;
  observations: string | null;
}

export interface WardRound {
  id: string;
  reference: string;
  pharmacyId: string | null;
  pharmacyName: string | null;
  service: string | null;
  roundDate: string;
  slot: string;
  status: string;
  preparedByName: string | null;
  closedAt: string | null;
  notes: string | null;
  administrations: Administration[];
  /** Avancement, pour situer la tournée d'un coup d'œil. */
  doneCount: number;
  totalCount: number;
}

interface NamedProfile {
  first_name?: string | null;
  last_name?: string | null;
}

const fullName = (person: NamedProfile | null | undefined): string | null =>
  person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : null;

// ---------------------------------------------------------------------------
// Plans thérapeutiques
// ---------------------------------------------------------------------------

const PLAN_SELECT = `
  *,
  patient:patients(first_name, last_name),
  doctor:profiles!therapeutic_plans_doctor_id_fkey(first_name, last_name),
  lines:therapeutic_plan_lines(*)
`;

export const listTherapeuticPlans = async (patientId?: string): Promise<TherapeuticPlan[]> => {
  let request = getClient()
    .from('therapeutic_plans')
    .select(PLAN_SELECT)
    .is('deleted_at', null)
    .order('started_on', { ascending: false });

  if (patientId) request = request.eq('patient_id', patientId);

  const { data, error } = await request;
  failIf(error, 'Chargement des plans thérapeutiques');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      patient?: NamedProfile | null;
      doctor?: NamedProfile | null;
      lines?: {
        id: string;
        item_id: string | null;
        medication_label: string;
        treatment_type: string;
        dosage: string | null;
        route: string | null;
        frequency: string | null;
        administration_times: string[] | null;
        duration_days: number | null;
        quantity_per_intake: number | string | null;
        is_continuous: boolean;
        instructions: string | null;
        status: string;
      }[];
    };

    return {
      id: row.id,
      reference: row.business_reference,
      patientId: row.patient_id,
      patientName: fullName(joined.patient) ?? '',
      hospitalizationId: row.hospitalization_id,
      doctorName: fullName(joined.doctor),
      label: row.label,
      indication: row.indication,
      startedOn: row.started_on,
      endedOn: row.ended_on,
      status: row.status as PlanStatus,
      notes: row.notes,
      lines: (joined.lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        medicationLabel: line.medication_label,
        treatmentType: line.treatment_type,
        dosage: line.dosage,
        route: line.route,
        frequency: line.frequency,
        administrationTimes: line.administration_times ?? [],
        durationDays: line.duration_days,
        quantityPerIntake:
          line.quantity_per_intake === null ? null : Number(line.quantity_per_intake),
        isContinuous: line.is_continuous,
        instructions: line.instructions,
        status: line.status,
      })),
    };
  });
};

export interface PlanInput {
  patientId: string;
  hospitalizationId: string | null;
  doctorId: string | null;
  label: string;
  indication: string | null;
  startedOn: string;
  notes: string | null;
  lines: {
    itemId: string | null;
    medicationLabel: string;
    treatmentType: string;
    dosage: string | null;
    route: string | null;
    frequency: string | null;
    administrationTimes: string[];
    durationDays: number | null;
    quantityPerIntake: number | null;
    isContinuous: boolean;
    instructions: string | null;
  }[];
}

export const createTherapeuticPlan = async (
  input: PlanInput,
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const { data, error } = await client
    .from('therapeutic_plans')
    .insert({
      ...auditColumns(ctx),
      patient_id: input.patientId,
      hospitalization_id: input.hospitalizationId,
      doctor_id: input.doctorId,
      label: input.label.trim(),
      indication: input.indication?.trim() || null,
      started_on: input.startedOn,
      notes: input.notes?.trim() || null,
      status: 'active',
    })
    .select('id')
    .single();

  failIf(error, 'Création du plan thérapeutique');
  const id = data?.id as string;

  if (input.lines.length > 0) {
    const { error: linesError } = await client.from('therapeutic_plan_lines').insert(
      input.lines.map((line) => ({
        plan_id: id,
        item_id: line.itemId,
        medication_label: line.medicationLabel.trim(),
        treatment_type: line.treatmentType,
        dosage: line.dosage?.trim() || null,
        route: line.route || null,
        frequency: line.frequency || null,
        administration_times: line.administrationTimes.length > 0 ? line.administrationTimes : null,
        duration_days: line.durationDays,
        quantity_per_intake: line.quantityPerIntake,
        is_continuous: line.isContinuous,
        instructions: line.instructions?.trim() || null,
      })),
    );

    if (linesError) {
      // Un plan sans traitement ne décrit rien : mieux vaut le retirer que de
      // laisser une coquille vide dans le dossier du patient.
      await client.from('therapeutic_plans').delete().eq('id', id);
      failIf(linesError, 'Enregistrement des traitements du plan');
    }
  }

  return id;
};

export const setPlanStatus = async (
  id: string,
  status: PlanStatus,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('therapeutic_plans')
    .update({
      status,
      // Un plan terminé ou annulé porte sa date de fin : sans elle, la durée du
      // traitement resterait indéterminée dans le dossier.
      ended_on:
        status === 'completed' || status === 'canceled'
          ? new Date().toISOString().slice(0, 10)
          : null,
      updated_by: userId,
    })
    .eq('id', id);

  failIf(error, 'Mise à jour du plan');
};

export const setPlanLineStatus = async (
  lineId: string,
  status: 'active' | 'suspended' | 'stopped',
): Promise<void> => {
  const { error } = await getClient()
    .from('therapeutic_plan_lines')
    .update({ status })
    .eq('id', lineId);

  failIf(error, 'Mise à jour du traitement');
};

// ---------------------------------------------------------------------------
// Tournées de dispensation (BP19 §11)
// ---------------------------------------------------------------------------

const ROUND_SELECT = `
  *,
  pharmacy:pharmacies(name),
  preparer:profiles!ward_rounds_prepared_by_fkey(first_name, last_name),
  administrations:ward_round_administrations(
    *,
    performer:profiles!ward_round_administrations_administered_by_fkey(first_name, last_name),
    hospitalization:hospitalizations(
      patient:patients(first_name, last_name),
      room:rooms(code),
      bed:beds(code)
    )
  )
`;

export const listWardRounds = async (limit = 50): Promise<WardRound[]> => {
  const { data, error } = await getClient()
    .from('ward_rounds')
    .select(ROUND_SELECT)
    .is('deleted_at', null)
    .order('round_date', { ascending: false })
    .limit(limit);

  failIf(error, 'Chargement des tournées');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      pharmacy?: { name: string } | null;
      preparer?: NamedProfile | null;
      administrations?: {
        id: string;
        hospitalization_id: string;
        plan_line_id: string | null;
        item_id: string | null;
        medication_label: string;
        quantity: number | string;
        status: string;
        administered_at: string | null;
        refusal_reason: string | null;
        observations: string | null;
        performer?: NamedProfile | null;
        hospitalization?: {
          patient?: NamedProfile | null;
          room?: { code: string } | null;
          bed?: { code: string } | null;
        } | null;
      }[];
    };

    const administrations = (joined.administrations ?? []).map((entry) => ({
      id: entry.id,
      hospitalizationId: entry.hospitalization_id,
      patientName: fullName(entry.hospitalization?.patient) ?? 'Patient',
      roomCode: entry.hospitalization?.room?.code ?? null,
      bedCode: entry.hospitalization?.bed?.code ?? null,
      planLineId: entry.plan_line_id,
      itemId: entry.item_id,
      medicationLabel: entry.medication_label,
      quantity: Number(entry.quantity),
      status: entry.status,
      administeredAt: entry.administered_at,
      administeredByName: fullName(entry.performer),
      refusalReason: entry.refusal_reason,
      observations: entry.observations,
    }));

    return {
      id: row.id,
      reference: row.business_reference,
      pharmacyId: row.pharmacy_id,
      pharmacyName: joined.pharmacy?.name ?? null,
      service: row.service,
      roundDate: row.round_date,
      slot: row.slot,
      status: row.status,
      preparedByName: fullName(joined.preparer),
      closedAt: row.closed_at,
      notes: row.notes,
      administrations: administrations.sort((a, b) =>
        `${a.roomCode ?? ''}${a.bedCode ?? ''}`.localeCompare(
          `${b.roomCode ?? ''}${b.bedCode ?? ''}`,
          'fr',
        ),
      ),
      doneCount: administrations.filter((entry) => entry.status === 'administered').length,
      totalCount: administrations.length,
    };
  });
};

/**
 * Prépare une tournée à partir des plans en cours.
 *
 * La liste est composée depuis les traitements actifs des patients hospitalisés
 * du service : c'est ce que BP19 §9 appelle la liste de préparation, ici
 * appliquée à la distribution nominative. Composer la tournée à la main
 * exposerait à oublier un patient admis le matin même.
 */
export interface RoundInput {
  pharmacyId: string | null;
  service: string | null;
  roundDate: string;
  slot: string;
  notes: string | null;
}

export const prepareWardRound = async (
  input: RoundInput,
  ctx: WriteContext,
): Promise<{ id: string; planned: number }> => {
  const client = getClient();

  const { data: head, error } = await client
    .from('ward_rounds')
    .insert({
      ...auditColumns(ctx),
      pharmacy_id: input.pharmacyId,
      service: input.service,
      round_date: input.roundDate,
      slot: input.slot,
      status: 'planned',
      prepared_by: ctx.userId,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  failIf(error, 'Ouverture de la tournée');
  const id = head?.id as string;

  // Séjours en cours du service concerné.
  let staysRequest = client
    .from('hospitalizations')
    .select('id, service')
    .is('deleted_at', null)
    .in('stay_status', ['admitted', 'in_stay', 'discharge_planned']);

  if (input.service) staysRequest = staysRequest.eq('service', input.service);

  const { data: stays, error: staysError } = await staysRequest;
  failIf(staysError, 'Chargement des séjours en cours');

  const stayIds = (stays ?? []).map((stay) => stay.id);
  if (stayIds.length === 0) return { id, planned: 0 };

  const { data: plans, error: plansError } = await client
    .from('therapeutic_plans')
    .select('id, hospitalization_id, lines:therapeutic_plan_lines(id, item_id, medication_label, quantity_per_intake, status)')
    .in('hospitalization_id', stayIds)
    .eq('status', 'active')
    .is('deleted_at', null);

  failIf(plansError, 'Chargement des plans thérapeutiques');

  const rows: {
    round_id: string;
    hospitalization_id: string;
    plan_line_id: string;
    item_id: string | null;
    medication_label: string;
    quantity: number;
  }[] = [];

  for (const plan of plans ?? []) {
    const joined = plan as unknown as {
      hospitalization_id: string | null;
      lines?: {
        id: string;
        item_id: string | null;
        medication_label: string;
        quantity_per_intake: number | string | null;
        status: string;
      }[];
    };

    if (!joined.hospitalization_id) continue;

    for (const line of joined.lines ?? []) {
      // Un traitement suspendu ou arrêté ne se distribue pas.
      if (line.status !== 'active') continue;

      rows.push({
        round_id: id,
        hospitalization_id: joined.hospitalization_id,
        plan_line_id: line.id,
        item_id: line.item_id,
        medication_label: line.medication_label,
        quantity: Number(line.quantity_per_intake ?? 1),
      });
    }
  }

  if (rows.length > 0) {
    const { error: linesError } = await client.from('ward_round_administrations').insert(rows);
    failIf(linesError, 'Préparation de la tournée');
  }

  return { id, planned: rows.length };
};

/**
 * Constate une administration.
 *
 * Le passage à « administré » déclenche côté base l'écriture du soin dans le
 * dossier du patient (BP19 §11).
 */
export const setAdministrationStatus = async (
  administrationId: string,
  status: 'administered' | 'refused' | 'postponed' | 'canceled',
  options: { reason?: string; observations?: string },
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('ward_round_administrations')
    .update({
      status,
      administered_at: status === 'administered' ? new Date().toISOString() : null,
      administered_by: userId,
      refusal_reason: options.reason?.trim() || null,
      observations: options.observations?.trim() || null,
    })
    .eq('id', administrationId);

  failIf(error, "Enregistrement de l'administration");
};

export const setRoundStatus = async (
  id: string,
  status: 'in_progress' | 'closed' | 'canceled',
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('ward_rounds')
    .update({
      status,
      closed_at: status === 'closed' ? new Date().toISOString() : null,
      closed_by: status === 'closed' ? userId : null,
      updated_by: userId,
    })
    .eq('id', id);

  failIf(error, 'Mise à jour de la tournée');
};
