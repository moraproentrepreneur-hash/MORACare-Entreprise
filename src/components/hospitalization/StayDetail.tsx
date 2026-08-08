'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowRightLeft,
  ClipboardList,
  HeartPulse,
  LogOut,
  Plus,
  Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  STAY_STATE_LABELS,
  TRANSFER_TYPES,
  dischargePatient,
  isActiveStay,
  listCare,
  listTransfers,
  listVisits,
  recordCare,
  recordVisit,
  transferPatient,
  type Bed,
  type CareRecord,
  type MedicalVisit,
  type Stay,
  type Transfer,
} from '@/services/hospitalization.service';
import type { HospitalizationSettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice } from './shared';

/**
 * Dossier d'un séjour : soins, visites, transferts et sortie (BP16 §8 à §11).
 *
 * Les trois journaux sont chargés à l'ouverture du dossier, et non avec la
 * liste des séjours : ramener les soins de tous les patients hospitalisés pour
 * n'en afficher qu'un serait coûteux et inutile.
 */

type Tab = 'care' | 'visits' | 'transfers';

const TABS: readonly { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'care', label: 'Soins', icon: HeartPulse },
  { id: 'visits', label: 'Visites médicales', icon: Stethoscope },
  { id: 'transfers', label: 'Transferts', icon: ArrowRightLeft },
];

/** BP16 §9 : évolution constatée lors d'une visite. */
const EVOLUTIONS = ['Favorable', 'Stationnaire', 'Défavorable', 'Complication'] as const;

/** BP16 §9 : décision au terme de la visite. */
const DECISIONS = [
  'Poursuite du traitement',
  'Modification du traitement',
  'Examens complémentaires',
  'Transfert',
  'Sortie programmée',
] as const;

/** BP16 §11 : état du patient à la sortie. */
const CONDITIONS = ['Guéri', 'Amélioré', 'Stationnaire', 'Aggravé', 'Décédé'] as const;

const emptyCare = {
  careType: '',
  temperature: '',
  systolic: '',
  diastolic: '',
  heartRate: '',
  respiratoryRate: '',
  oxygenSaturation: '',
  weightKg: '',
  painLevel: '',
  observations: '',
  incident: '',
  nutrition: '',
};

/** Convertit un champ numérique laissé vide en absence de mesure. */
const num = (value: string): number | null => (value.trim() === '' ? null : Number(value));

export const StayDetail: React.FC<{
  stay: Stay;
  beds: readonly Bed[];
  settings: HospitalizationSettings;
  canEdit: boolean;
  ctx: WriteContext | null;
  doctorId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}> = ({ stay, beds, settings, canEdit, ctx, doctorId, onClose, onChanged }) => {
  const [tab, setTab] = useState<Tab>('care');
  const [care, setCare] = useState<CareRecord[]>([]);
  const [visits, setVisits] = useState<MedicalVisit[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<'care' | 'visit' | 'transfer' | 'discharge' | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, v, t] = await Promise.all([
        listCare(stay.id),
        listVisits(stay.id),
        listTransfers(stay.id),
      ]);
      setCare(c);
      setVisits(v);
      setTransfers(t);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [stay.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = isActiveStay(stay.status);

  const afterWrite = async () => {
    setForm(null);
    await load();
    await onChanged();
  };

  const longStay = stay.lengthOfStay > settings.maxStayDays && active;

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="2xl"
      title={`Séjour ${stay.reference}`}
      description={`${stay.patientName} · ${STAY_STATE_LABELS[stay.status]}`}
    >
      <div className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:grid-cols-4">
          {[
            { label: 'Chambre', value: stay.roomCode ?? 'Non affectée' },
            { label: 'Lit', value: stay.bedCode ?? '—' },
            { label: 'Service', value: stay.service ?? '—' },
            { label: 'Praticien', value: stay.doctorName || '—' },
            { label: 'Admission', value: formatDate(stay.admissionDate) },
            {
              label: 'Sortie',
              value: stay.dischargeDate ? formatDate(stay.dischargeDate) : 'En cours',
            },
            { label: 'Durée', value: `${stay.lengthOfStay} jour(s)` },
            { label: 'Motif', value: stay.admissionReason },
          ].map((entry) => (
            <div key={entry.label}>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {entry.label}
              </dt>
              <dd className="mt-0.5 break-words text-xs text-slate-200">{entry.value}</dd>
            </div>
          ))}
        </dl>

        {longStay && (
          <Notice tone="info">
            Ce séjour dépasse la durée surveillée de {settings.maxStayDays} jours définie dans les
            Paramètres. Une révision est attendue.
          </Notice>
        )}

        {canEdit && active && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setForm('care')} className="gap-2">
              <Plus className="h-4 w-4" /> Soin
            </Button>
            <Button variant="outline" onClick={() => setForm('visit')} className="gap-2">
              <Plus className="h-4 w-4" /> Visite
            </Button>
            <Button variant="outline" onClick={() => setForm('transfer')} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" /> Transfert
            </Button>
            <Button variant="secondary" onClick={() => setForm('discharge')} className="gap-2">
              <LogOut className="h-4 w-4" /> Enregistrer la sortie
            </Button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
          {TABS.map((entry) => {
            const Icon = entry.icon;
            const counts = { care: care.length, visits: visits.length, transfers: transfers.length };
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  tab === entry.id
                    ? 'bg-mora-blue text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {entry.label}
                <span className="rounded-full bg-slate-950/40 px-1.5 text-[10px]">
                  {counts[entry.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto overscroll-contain">
          {isLoading && <p className="py-8 text-center text-xs text-slate-500">Chargement…</p>}

          {!isLoading && tab === 'care' && <CareList records={care} />}
          {!isLoading && tab === 'visits' && <VisitList visits={visits} />}
          {!isLoading && tab === 'transfers' && <TransferList transfers={transfers} />}
        </div>
      </div>

      {form === 'care' && (
        <CareForm
          stay={stay}
          settings={settings}
          ctx={ctx}
          onCancel={() => setForm(null)}
          onDone={afterWrite}
        />
      )}
      {form === 'visit' && (
        <VisitForm
          stay={stay}
          ctx={ctx}
          doctorId={doctorId}
          onCancel={() => setForm(null)}
          onDone={afterWrite}
        />
      )}
      {form === 'transfer' && (
        <TransferForm
          stay={stay}
          beds={beds}
          settings={settings}
          ctx={ctx}
          onCancel={() => setForm(null)}
          onDone={afterWrite}
        />
      )}
      {form === 'discharge' && (
        <DischargeForm
          stay={stay}
          settings={settings}
          ctx={ctx}
          onCancel={() => setForm(null)}
          onDone={afterWrite}
        />
      )}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Journaux
// ---------------------------------------------------------------------------

/** Constantes relevées, affichées seulement lorsqu'elles ont été mesurées. */
const vitals = (record: CareRecord): string => {
  const parts: string[] = [];
  if (record.temperature !== null) parts.push(`${record.temperature} °C`);
  if (record.systolic !== null && record.diastolic !== null) {
    parts.push(`${record.systolic}/${record.diastolic} mmHg`);
  }
  if (record.heartRate !== null) parts.push(`${record.heartRate} bpm`);
  if (record.respiratoryRate !== null) parts.push(`${record.respiratoryRate} /min`);
  if (record.oxygenSaturation !== null) parts.push(`SpO₂ ${record.oxygenSaturation} %`);
  if (record.weightKg !== null) parts.push(`${record.weightKg} kg`);
  if (record.painLevel !== null) parts.push(`Douleur ${record.painLevel}/10`);
  return parts.join(' · ');
};

const CareList: React.FC<{ records: readonly CareRecord[] }> = ({ records }) =>
  records.length === 0 ? (
    <EmptyState
      icon={HeartPulse}
      title="Aucun soin enregistré"
      description="Les constantes, soins et observations du séjour apparaîtront ici, du plus récent au plus ancien."
    />
  ) : (
    <ul className="space-y-2">
      {records.map((record) => (
        <li key={record.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-white">{record.careType}</span>
            <span className="text-[11px] text-slate-500">{formatDateTime(record.recordedAt)}</span>
          </div>
          {vitals(record) && (
            <p className="mt-1 font-mono text-[11px] text-mora-green">{vitals(record)}</p>
          )}
          {record.observations && (
            <p className="mt-1 text-xs text-slate-300">{record.observations}</p>
          )}
          {record.incident && (
            <p className="mt-1 text-xs text-amber-400">Incident : {record.incident}</p>
          )}
          {record.nutrition && (
            <p className="mt-1 text-[11px] text-slate-400">Alimentation : {record.nutrition}</p>
          )}
          <p className="mt-1 text-[10px] text-slate-600">
            {record.reference}
            {record.caregiverName && ` · ${record.caregiverName}`}
          </p>
        </li>
      ))}
    </ul>
  );

const VisitList: React.FC<{ visits: readonly MedicalVisit[] }> = ({ visits }) =>
  visits.length === 0 ? (
    <EmptyState
      icon={Stethoscope}
      title="Aucune visite médicale"
      description="Chaque passage du praticien y est consigné : observations, évolution, décision."
    />
  ) : (
    <ul className="space-y-2">
      {visits.map((visit) => (
        <li key={visit.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-white">{visit.doctorName || 'Praticien'}</span>
            <span className="text-[11px] text-slate-500">{formatDateTime(visit.visitedAt)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-300">{visit.observations}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {visit.evolution && <Badge label={visit.evolution} tone="info" />}
            {visit.decision && <Badge label={visit.decision} tone="neutral" />}
          </div>
          {visit.diagnosis && (
            <p className="mt-1 text-[11px] text-slate-400">Diagnostic : {visit.diagnosis}</p>
          )}
          {visit.treatmentChanges && (
            <p className="mt-1 text-[11px] text-slate-400">
              Traitement : {visit.treatmentChanges}
            </p>
          )}
          {visit.additionalExams && (
            <p className="mt-1 text-[11px] text-slate-400">Examens : {visit.additionalExams}</p>
          )}
          <p className="mt-1 text-[10px] text-slate-600">{visit.reference}</p>
        </li>
      ))}
    </ul>
  );

const TransferList: React.FC<{ transfers: readonly Transfer[] }> = ({ transfers }) =>
  transfers.length === 0 ? (
    <EmptyState
      icon={ArrowRightLeft}
      title="Aucun transfert"
      description="Chaque changement de lit, de chambre, de service ou d’établissement conserve ici son historique complet."
    />
  ) : (
    <ul className="space-y-2">
      {transfers.map((transfer) => {
        const from = [transfer.fromRoomCode, transfer.fromBedCode].filter(Boolean).join(' — ');
        const to =
          transfer.externalDestination ??
          [transfer.toRoomCode, transfer.toBedCode].filter(Boolean).join(' — ');

        return (
          <li key={transfer.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">
                {TRANSFER_TYPES.find((t) => t.value === transfer.transferType)?.label ??
                  transfer.transferType}
              </span>
              <span className="text-[11px] text-slate-500">
                {formatDateTime(transfer.transferredAt)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {from || transfer.fromService || '—'} → {to || transfer.toService || '—'}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{transfer.reason}</p>
            <p className="mt-1 text-[10px] text-slate-600">
              {transfer.reference}
              {transfer.performedByName && ` · ${transfer.performedByName}`}
            </p>
          </li>
        );
      })}
    </ul>
  );

// ---------------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------------

const SubForm: React.FC<{
  title: string;
  description?: string;
  error: string | null;
  isSaving: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent) => void;
  children: React.ReactNode;
}> = ({ title, description, error, isSaving, submitLabel, onCancel, onSubmit, children }) => (
  <Modal isOpen onClose={onCancel} title={title} description={description}>
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {children}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
          {submitLabel}
        </Button>
      </div>
    </form>
  </Modal>
);

const CareForm: React.FC<{
  stay: Stay;
  settings: HospitalizationSettings;
  ctx: WriteContext | null;
  onCancel: () => void;
  onDone: () => Promise<void>;
}> = ({ stay, settings, ctx, onCancel, onDone }) => {
  const [form, setForm] = useState({
    ...emptyCare,
    careType: settings.careTypes[0] ?? 'Constantes vitales',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    setIsSaving(true);
    setError(null);
    try {
      await recordCare(
        {
          hospitalizationId: stay.id,
          careType: form.careType,
          temperature: num(form.temperature),
          systolic: num(form.systolic),
          diastolic: num(form.diastolic),
          heartRate: num(form.heartRate),
          respiratoryRate: num(form.respiratoryRate),
          oxygenSaturation: num(form.oxygenSaturation),
          weightKg: num(form.weightKg),
          painLevel: num(form.painLevel),
          observations: form.observations,
          incident: form.incident,
          nutrition: form.nutrition,
        },
        ctx,
      );
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
      setIsSaving(false);
    }
  };

  const measures: { key: keyof typeof emptyCare; label: string; step?: string }[] = [
    { key: 'temperature', label: 'Température (°C)', step: '0.1' },
    { key: 'systolic', label: 'Systolique (mmHg)' },
    { key: 'diastolic', label: 'Diastolique (mmHg)' },
    { key: 'heartRate', label: 'Pouls (bpm)' },
    { key: 'respiratoryRate', label: 'Respiration (/min)' },
    { key: 'oxygenSaturation', label: 'Saturation (%)' },
    { key: 'weightKg', label: 'Poids (kg)', step: '0.1' },
    { key: 'painLevel', label: 'Douleur (0 à 10)' },
  ];

  return (
    <SubForm
      title="Enregistrer un soin"
      description="Laissez vides les mesures qui n’ont pas été relevées."
      error={error}
      isSaving={isSaving}
      submitLabel="Enregistrer"
      onCancel={onCancel}
      onSubmit={submit}
    >
      <Field label="Nature du soin *">
        <Select
          required
          value={form.careType}
          onChange={(value) => setForm({ ...form, careType: value })}
          options={settings.careTypes.map((type) => ({ value: type, label: type }))}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {measures.map((measure) => (
          <Field key={measure.key} label={measure.label} htmlFor={`care-${measure.key}`}>
            <input
              id={`care-${measure.key}`}
              type="number"
              step={measure.step}
              className={FIELD}
              value={form[measure.key]}
              onChange={(event) => setForm({ ...form, [measure.key]: event.target.value })}
            />
          </Field>
        ))}
      </div>

      <Field label="Observations" htmlFor="care-observations">
        <textarea
          id="care-observations"
          rows={2}
          className={FIELD}
          value={form.observations}
          onChange={(event) => setForm({ ...form, observations: event.target.value })}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Incident" htmlFor="care-incident">
          <input
            id="care-incident"
            className={FIELD}
            value={form.incident}
            onChange={(event) => setForm({ ...form, incident: event.target.value })}
          />
        </Field>
        <Field label="Alimentation" htmlFor="care-nutrition">
          <input
            id="care-nutrition"
            className={FIELD}
            value={form.nutrition}
            onChange={(event) => setForm({ ...form, nutrition: event.target.value })}
          />
        </Field>
      </div>
    </SubForm>
  );
};

const VisitForm: React.FC<{
  stay: Stay;
  ctx: WriteContext | null;
  doctorId: string;
  onCancel: () => void;
  onDone: () => Promise<void>;
}> = ({ stay, ctx, doctorId, onCancel, onDone }) => {
  const [form, setForm] = useState({
    observations: '',
    evolution: '',
    diagnosis: '',
    treatmentChanges: '',
    additionalExams: '',
    decision: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    setIsSaving(true);
    setError(null);
    try {
      await recordVisit(
        {
          hospitalizationId: stay.id,
          // Le praticien de la visite est celui qui la saisit lorsqu'il en est
          // un ; à défaut, le référent du séjour. La colonne n'accepte pas de
          // valeur nulle : une visite sans auteur ne serait pas opposable.
          doctorId: doctorId || stay.doctorId,
          ...form,
        },
        ctx,
      );
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
      setIsSaving(false);
    }
  };

  return (
    <SubForm
      title="Visite médicale"
      error={error}
      isSaving={isSaving}
      submitLabel="Enregistrer la visite"
      onCancel={onCancel}
      onSubmit={submit}
    >
      <Field label="Observations *" htmlFor="visit-observations">
        <textarea
          id="visit-observations"
          required
          rows={3}
          className={FIELD}
          value={form.observations}
          onChange={(event) => setForm({ ...form, observations: event.target.value })}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Évolution">
          <Select
            value={form.evolution}
            onChange={(value) => setForm({ ...form, evolution: value })}
            placeholder="— Non précisée —"
            options={EVOLUTIONS.map((value) => ({ value, label: value }))}
          />
        </Field>
        <Field label="Décision">
          <Select
            value={form.decision}
            onChange={(value) => setForm({ ...form, decision: value })}
            placeholder="— Non précisée —"
            options={DECISIONS.map((value) => ({ value, label: value }))}
          />
        </Field>
      </div>

      <Field label="Diagnostic" htmlFor="visit-diagnosis">
        <input
          id="visit-diagnosis"
          className={FIELD}
          value={form.diagnosis}
          onChange={(event) => setForm({ ...form, diagnosis: event.target.value })}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Modification du traitement" htmlFor="visit-treatment">
          <input
            id="visit-treatment"
            className={FIELD}
            value={form.treatmentChanges}
            onChange={(event) => setForm({ ...form, treatmentChanges: event.target.value })}
          />
        </Field>
        <Field label="Examens complémentaires" htmlFor="visit-exams">
          <input
            id="visit-exams"
            className={FIELD}
            value={form.additionalExams}
            onChange={(event) => setForm({ ...form, additionalExams: event.target.value })}
          />
        </Field>
      </div>
    </SubForm>
  );
};

const TransferForm: React.FC<{
  stay: Stay;
  beds: readonly Bed[];
  settings: HospitalizationSettings;
  ctx: WriteContext | null;
  onCancel: () => void;
  onDone: () => Promise<void>;
}> = ({ stay, beds, settings, ctx, onCancel, onDone }) => {
  const [form, setForm] = useState({
    transferType: 'bed',
    bedId: '',
    toService: '',
    externalDestination: '',
    reason: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isExternal = form.transferType === 'external';
  const isService = form.transferType === 'service';

  // Seuls les lits réellement attribuables sont proposés : la base refuserait
  // les autres, autant ne pas les offrir.
  const available = beds.filter((bed) => bed.isAssignable && bed.id !== stay.bedId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    setIsSaving(true);
    setError(null);
    try {
      const target = available.find((bed) => bed.id === form.bedId);

      await transferPatient(
        {
          hospitalizationId: stay.id,
          transferType: form.transferType,
          toRoomId: target?.roomId ?? null,
          toBedId: target?.id ?? null,
          toService: isService ? form.toService : (target?.service ?? null),
          externalDestination: isExternal ? form.externalDestination : null,
          reason: form.reason,
        },
        { roomId: stay.roomId, bedId: stay.bedId, service: stay.service },
        ctx,
      );
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfert impossible.');
      setIsSaving(false);
    }
  };

  return (
    <SubForm
      title="Transférer le patient"
      description="Le mouvement est historisé, quel que soit son type (BP16 §10)."
      error={error}
      isSaving={isSaving}
      submitLabel="Enregistrer le transfert"
      onCancel={onCancel}
      onSubmit={submit}
    >
      <Field label="Nature du transfert *">
        <Select
          value={form.transferType}
          onChange={(value) => setForm({ ...form, transferType: value, bedId: '' })}
          options={TRANSFER_TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
        />
      </Field>

      {!isExternal && !isService && (
        <Field
          label="Nouveau lit *"
          hint={
            available.length === 0
              ? 'Aucun lit disponible : libérez-en un ou créez-en un nouveau.'
              : undefined
          }
        >
          <Select
            required
            value={form.bedId}
            onChange={(value) => setForm({ ...form, bedId: value })}
            options={available.map((bed) => ({
              value: bed.id,
              label: `Chambre ${bed.roomCode} — Lit ${bed.code}`,
              hint: [bed.roomType, bed.service].filter(Boolean).join(' · '),
            }))}
          />
        </Field>
      )}

      {isService && (
        <Field label="Nouveau service *">
          <Select
            required
            value={form.toService}
            onChange={(value) => setForm({ ...form, toService: value })}
            options={settings.admissionServices.map((service) => ({
              value: service,
              label: service,
            }))}
          />
        </Field>
      )}

      {isExternal && (
        <Field
          label="Établissement destinataire *"
          htmlFor="transfer-external"
          hint="Le séjour sera clos et le lit libéré."
        >
          <input
            id="transfer-external"
            required
            className={FIELD}
            value={form.externalDestination}
            onChange={(event) => setForm({ ...form, externalDestination: event.target.value })}
          />
        </Field>
      )}

      <Field label="Motif *" htmlFor="transfer-reason">
        <textarea
          id="transfer-reason"
          required
          rows={2}
          className={FIELD}
          value={form.reason}
          onChange={(event) => setForm({ ...form, reason: event.target.value })}
        />
      </Field>
    </SubForm>
  );
};

const DischargeForm: React.FC<{
  stay: Stay;
  settings: HospitalizationSettings;
  ctx: WriteContext | null;
  onCancel: () => void;
  onDone: () => Promise<void>;
}> = ({ stay, settings, ctx, onCancel, onDone }) => {
  const [form, setForm] = useState({
    dischargeReason: settings.dischargeReasons[0] ?? '',
    patientCondition: 'Amélioré',
    dischargeSummary: '',
    recommendations: '',
    nextAppointmentDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    setIsSaving(true);
    setError(null);
    try {
      await dischargePatient({ hospitalizationId: stay.id, ...form }, ctx);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sortie impossible.');
      setIsSaving(false);
    }
  };

  return (
    <SubForm
      title="Sortie du patient"
      description="Le lit sera automatiquement libéré (BR-060)."
      error={error}
      isSaving={isSaving}
      submitLabel="Enregistrer la sortie"
      onCancel={onCancel}
      onSubmit={submit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Motif de sortie *">
          <Select
            required
            value={form.dischargeReason}
            onChange={(value) => setForm({ ...form, dischargeReason: value })}
            options={settings.dischargeReasons.map((reason) => ({ value: reason, label: reason }))}
          />
        </Field>
        <Field label="État du patient *">
          <Select
            required
            value={form.patientCondition}
            onChange={(value) => setForm({ ...form, patientCondition: value })}
            options={CONDITIONS.map((value) => ({ value, label: value }))}
          />
        </Field>
      </div>

      <Field label="Compte rendu de sortie *" htmlFor="discharge-summary">
        <textarea
          id="discharge-summary"
          required
          rows={4}
          className={FIELD}
          value={form.dischargeSummary}
          onChange={(event) => setForm({ ...form, dischargeSummary: event.target.value })}
        />
      </Field>

      <Field label="Recommandations" htmlFor="discharge-reco">
        <textarea
          id="discharge-reco"
          rows={2}
          className={FIELD}
          value={form.recommendations}
          onChange={(event) => setForm({ ...form, recommendations: event.target.value })}
        />
      </Field>

      <Field label="Prochain rendez-vous" htmlFor="discharge-next">
        <input
          id="discharge-next"
          type="date"
          className={FIELD}
          value={form.nextAppointmentDate}
          onChange={(event) => setForm({ ...form, nextAppointmentDate: event.target.value })}
        />
      </Field>

      {settings.requireDischargeValidation && (
        <Notice tone="info">
          <ClipboardList className="mr-1 inline h-3.5 w-3.5" />
          Les Paramètres exigent une validation médicale : elle sera enregistrée à votre nom.
        </Notice>
      )}
    </SubForm>
  );
};

export const StayActivityIcon = Activity;
