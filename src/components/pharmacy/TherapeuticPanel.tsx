'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  ListChecks,
  Pause,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Patient } from '@/types';
import {
  ADMINISTRATION_STATUS_LABELS,
  FREQUENCIES,
  PLAN_STATUS_LABELS,
  PLAN_STATUS_TONES,
  ROUND_SLOTS,
  ROUND_STATUS_LABELS,
  TREATMENT_TYPES,
  createTherapeuticPlan,
  listTherapeuticPlans,
  listWardRounds,
  prepareWardRound,
  setAdministrationStatus,
  setPlanStatus,
  type PlanStatus,
  type TherapeuticPlan,
  type WardRound,
} from '@/services/therapeutic.service';
import type { Medication, Pharmacy } from '@/services/pharmacy.service';
import type { HospitalizationSettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import {
  Badge,
  EmptyState,
  Field,
  FIELD,
  Notice,
  ScrollTable,
} from '@/components/hospitalization/shared';

/**
 * Plans thérapeutiques et dispensation hospitalière (BP19 §6, §11).
 *
 * Les deux vivent dans le même écran parce qu'ils se répondent : la tournée est
 * composée à partir des plans actifs des patients hospitalisés. Les séparer
 * obligerait à passer de l'un à l'autre pour comprendre ce qui doit être
 * distribué.
 */

type Tab = 'plans' | 'rounds';

interface DraftLine {
  key: string;
  itemId: string | null;
  medicationLabel: string;
  treatmentType: string;
  dosage: string;
  route: string;
  frequency: string;
  administrationTimes: string;
  durationDays: string;
  quantityPerIntake: string;
  isContinuous: boolean;
  instructions: string;
}

const emptyLine = (): DraftLine => ({
  key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  itemId: null,
  medicationLabel: '',
  treatmentType: 'medication',
  dosage: '',
  route: '',
  frequency: FREQUENCIES[1],
  administrationTimes: '',
  durationDays: '',
  quantityPerIntake: '1',
  isContinuous: false,
  instructions: '',
});

export const TherapeuticPanel: React.FC<{
  medications: readonly Medication[];
  pharmacies: readonly Pharmacy[];
  patients: readonly Patient[];
  settings: HospitalizationSettings;
  routes: readonly string[];
  canManage: boolean;
  ctx: WriteContext | null;
  onPrintPlan: (plan: TherapeuticPlan) => void;
  onPrintRound: (round: WardRound) => void;
}> = ({
  medications,
  pharmacies,
  patients,
  settings,
  routes,
  canManage,
  ctx,
  onPrintPlan,
  onPrintRound,
}) => {
  const [tab, setTab] = useState<Tab>('plans');
  const [plans, setPlans] = useState<TherapeuticPlan[]>([]);
  const [rounds, setRounds] = useState<WardRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'plan' | 'round' | null>(null);
  const [openedRound, setOpenedRound] = useState<WardRound | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedPlans, loadedRounds] = await Promise.all([
        listTherapeuticPlans(),
        listWardRounds(),
      ]);
      setPlans(loadedPlans);
      setRounds(loadedRounds);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Le détail ouvert doit suivre les écritures : sans cela, l'avancement de la
  // tournée resterait figé à son état d'ouverture.
  const currentRound = openedRound
    ? (rounds.find((entry) => entry.id === openedRound.id) ?? openedRound)
    : null;

  const run = async (task: () => Promise<void>, message: string) => {
    setError(null);
    setNotice(null);
    try {
      await task();
      await load();
      setNotice(message);
      setDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {(
            [
              { id: 'plans' as const, label: 'Plans thérapeutiques', icon: ClipboardList },
              { id: 'rounds' as const, label: 'Tournées', icon: ListChecks },
            ] satisfies { id: Tab; label: string; icon: React.ElementType }[]
          ).map((entry) => {
            const Icon = entry.icon;
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
              </button>
            );
          })}
        </div>

        {canManage && (
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setDialog(tab === 'plans' ? 'plan' : 'round');
            }}
            className="shrink-0 gap-2"
          >
            <Plus className="h-4 w-4" />
            {tab === 'plans' ? 'Nouveau plan' : 'Préparer une tournée'}
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
      ) : tab === 'plans' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {plans.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aucun plan thérapeutique"
              description="Le plan regroupe les traitements d’un patient : il alimente les tournées de dispensation et rattache les prescriptions."
            />
          ) : (
            <ScrollTable minWidth="min-w-[52rem]">
              <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4">Référence</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Intitulé</th>
                  <th className="p-4">Traitements</th>
                  <th className="p-4">Début</th>
                  <th className="p-4">État</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {plans.map((plan) => (
                  <tr key={plan.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="p-4 font-mono font-bold text-mora-green">{plan.reference}</td>
                    <td className="p-4 font-bold text-white">{plan.patientName}</td>
                    <td className="p-4">
                      {plan.label}
                      {plan.indication && (
                        <span className="block text-[11px] text-slate-500">{plan.indication}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {plan.lines.map((line) => (
                        <span key={line.id} className="block text-[11px]">
                          {line.medicationLabel}
                          {line.dosage && <span className="text-slate-500"> · {line.dosage}</span>}
                          {line.frequency && (
                            <span className="text-slate-500"> · {line.frequency}</span>
                          )}
                        </span>
                      ))}
                    </td>
                    <td className="p-4">{formatDate(plan.startedOn)}</td>
                    <td className="p-4">
                      <Badge
                        label={PLAN_STATUS_LABELS[plan.status]}
                        tone={PLAN_STATUS_TONES[plan.status]}
                      />
                    </td>
                    <td className="p-4">
                      <ActionMenu
                        label={`Actions pour ${plan.reference}`}
                        items={[
                          {
                            label: 'Imprimer le plan',
                            icon: FileText,
                            onSelect: () => onPrintPlan(plan),
                          },
                          {
                            label: 'Suspendre',
                            icon: Pause,
                            disabled: !canManage || plan.status !== 'active',
                            onSelect: () =>
                              void run(
                                () => setPlanStatus(plan.id, 'suspended', ctx?.userId ?? ''),
                                'Plan suspendu.',
                              ),
                          },
                          {
                            label: 'Reprendre',
                            icon: CheckCircle2,
                            disabled: !canManage || plan.status !== 'suspended',
                            onSelect: () =>
                              void run(
                                () => setPlanStatus(plan.id, 'active', ctx?.userId ?? ''),
                                'Plan repris.',
                              ),
                          },
                          {
                            label: 'Clôturer le plan',
                            icon: CheckCircle2,
                            disabled: !canManage || plan.status === 'completed',
                            onSelect: () =>
                              void run(
                                () => setPlanStatus(plan.id, 'completed', ctx?.userId ?? ''),
                                'Plan clôturé.',
                              ),
                          },
                          {
                            label: 'Annuler le plan',
                            icon: XCircle,
                            destructive: true,
                            disabled: !canManage || plan.status === 'canceled',
                            onSelect: () =>
                              void run(
                                () => setPlanStatus(plan.id, 'canceled', ctx?.userId ?? ''),
                                'Plan annulé.',
                              ),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollTable>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {rounds.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Aucune tournée"
              description="La tournée est composée automatiquement à partir des plans actifs des patients hospitalisés du service."
            />
          ) : (
            <ScrollTable minWidth="min-w-[48rem]">
              <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4">Référence</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Moment</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Avancement</th>
                  <th className="p-4">État</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rounds.map((round) => (
                  <tr key={round.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="p-4 font-mono font-bold text-mora-green">{round.reference}</td>
                    <td className="p-4">{formatDate(round.roundDate)}</td>
                    <td className="p-4 capitalize">{round.slot}</td>
                    <td className="p-4">{round.service ?? 'Tous services'}</td>
                    <td className="p-4">
                      <span
                        className={
                          round.doneCount === round.totalCount && round.totalCount > 0
                            ? 'font-bold text-mora-green'
                            : 'text-slate-200'
                        }
                      >
                        {round.doneCount} / {round.totalCount}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge
                        label={ROUND_STATUS_LABELS[round.status] ?? round.status}
                        tone={round.status === 'closed' ? 'good' : 'warn'}
                      />
                    </td>
                    <td className="p-4">
                      <ActionMenu
                        label={`Actions pour ${round.reference}`}
                        items={[
                          {
                            label: 'Ouvrir la tournée',
                            icon: ListChecks,
                            onSelect: () => setOpenedRound(round),
                          },
                          {
                            label: 'Feuille de tournée',
                            icon: FileText,
                            onSelect: () => onPrintRound(round),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollTable>
          )}
        </div>
      )}

      {dialog === 'plan' && (
        <PlanForm
          medications={medications}
          patients={patients}
          routes={routes}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              await createTherapeuticPlan(input, ctx as WriteContext);
            }, 'Plan thérapeutique enregistré.')
          }
        />
      )}

      {dialog === 'round' && (
        <RoundForm
          pharmacies={pharmacies}
          services={settings.admissionServices}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              const result = await prepareWardRound(input, ctx as WriteContext);
              if (result.planned === 0) {
                throw new Error(
                  'Aucun traitement actif à distribuer : la tournée est créée mais vide. Vérifiez les plans thérapeutiques des patients hospitalisés.',
                );
              }
            }, 'Tournée préparée à partir des plans actifs.')
          }
        />
      )}

      {currentRound && (
        <RoundDetail
          round={currentRound}
          canManage={canManage}
          ctx={ctx}
          onClose={() => setOpenedRound(null)}
          onPrint={() => onPrintRound(currentRound)}
          onChanged={load}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const PlanForm: React.FC<{
  medications: readonly Medication[];
  patients: readonly Patient[];
  routes: readonly string[];
  onCancel: () => void;
  onSubmit: (input: {
    patientId: string;
    hospitalizationId: null;
    doctorId: null;
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
  }) => Promise<void>;
}> = ({ medications, patients, routes, onCancel, onSubmit }) => {
  const [patientId, setPatientId] = useState('');
  const [label, setLabel] = useState('');
  const [indication, setIndication] = useState('');
  const [startedOn, setStartedOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const updateLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!patientId) {
      setLocalError('Sélectionnez le patient concerné.');
      return;
    }

    const filled = lines.filter((line) => line.medicationLabel.trim() !== '');
    if (filled.length === 0) {
      setLocalError('Ajoutez au moins un traitement au plan.');
      return;
    }

    setIsSaving(true);
    await onSubmit({
      patientId,
      hospitalizationId: null,
      doctorId: null,
      label: label.trim() || 'Plan thérapeutique',
      indication: indication.trim() || null,
      startedOn,
      notes: notes.trim() || null,
      lines: filled.map((line) => ({
        itemId: line.itemId,
        medicationLabel: line.medicationLabel,
        treatmentType: line.treatmentType,
        dosage: line.dosage || null,
        route: line.route || null,
        frequency: line.frequency || null,
        // « 08:00, 14:00, 20:00 » devient une liste : c'est elle qui composera
        // les tournées.
        administrationTimes: line.administrationTimes
          .split(',')
          .map((time) => time.trim())
          .filter((time) => time !== ''),
        durationDays: line.durationDays === '' ? null : Number(line.durationDays),
        quantityPerIntake:
          line.quantityPerIntake === '' ? null : Number(line.quantityPerIntake),
        isContinuous: line.isContinuous,
        instructions: line.instructions || null,
      })),
    });
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidth="2xl"
      title="Nouveau plan thérapeutique"
      description="Le plan regroupe les traitements du patient et alimente les tournées de dispensation."
    >
      <form onSubmit={submit} className="space-y-4">
        {localError && <Notice tone="error">{localError}</Notice>}

        <PatientSelect
          patients={patients as Patient[]}
          selectedPatientId={patientId}
          onSelectPatient={(entry) => setPatientId(entry.id)}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Intitulé du plan *" htmlFor="plan-label">
            <input
              id="plan-label"
              required
              className={FIELD}
              placeholder="Antibiothérapie"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </Field>
          <Field label="Indication" htmlFor="plan-indication">
            <input
              id="plan-indication"
              className={FIELD}
              placeholder="Pneumopathie"
              value={indication}
              onChange={(event) => setIndication(event.target.value)}
            />
          </Field>
          <Field label="Début *" htmlFor="plan-start">
            <input
              id="plan-start"
              type="date"
              required
              className={FIELD}
              value={startedOn}
              onChange={(event) => setStartedOn(event.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-300">Traitements</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLines((current) => [...current, emptyLine()])}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>

          {lines.map((line, index) => (
            <div key={line.key} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Traitement {index + 1}
                </p>
                {lines.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Retirer le traitement ${index + 1}`}
                    onClick={() =>
                      setLines((current) => current.filter((entry) => entry.key !== line.key))
                    }
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Médicament du catalogue" htmlFor={`plan-item-${line.key}`}>
                  <Select
                    id={`plan-item-${line.key}`}
                    value={line.itemId ?? ''}
                    onChange={(value) => {
                      const found = medications.find((entry) => entry.id === value);
                      updateLine(line.key, {
                        itemId: value || null,
                        medicationLabel: found?.name ?? line.medicationLabel,
                        dosage: found?.dosage ?? line.dosage,
                        route: found?.administrationRoute ?? line.route,
                      });
                    }}
                    placeholder="— Hors catalogue —"
                    options={medications.map((entry) => ({
                      value: entry.id,
                      label: entry.name,
                      hint: [entry.form, entry.dosage].filter(Boolean).join(' · '),
                    }))}
                  />
                </Field>
                <Field
                  label="Libellé du traitement *"
                  htmlFor={`plan-label-${line.key}`}
                  hint="Renseigné automatiquement depuis le catalogue, modifiable."
                >
                  <input
                    id={`plan-label-${line.key}`}
                    className={FIELD}
                    value={line.medicationLabel}
                    onChange={(event) =>
                      updateLine(line.key, { medicationLabel: event.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Nature" htmlFor={`plan-type-${line.key}`}>
                  <Select
                    id={`plan-type-${line.key}`}
                    value={line.treatmentType}
                    onChange={(value) => updateLine(line.key, { treatmentType: value })}
                    options={TREATMENT_TYPES.map((entry) => ({
                      value: entry.value,
                      label: entry.label,
                    }))}
                  />
                </Field>
                <Field label="Dosage" htmlFor={`plan-dose-${line.key}`}>
                  <input
                    id={`plan-dose-${line.key}`}
                    className={FIELD}
                    placeholder="500 mg"
                    value={line.dosage}
                    onChange={(event) => updateLine(line.key, { dosage: event.target.value })}
                  />
                </Field>
                <Field label="Voie" htmlFor={`plan-route-${line.key}`}>
                  <Select
                    id={`plan-route-${line.key}`}
                    value={line.route}
                    onChange={(value) => updateLine(line.key, { route: value })}
                    placeholder="— Non précisée —"
                    options={routes.map((entry) => ({ value: entry, label: entry }))}
                  />
                </Field>
                <Field label="Fréquence" htmlFor={`plan-freq-${line.key}`}>
                  <Select
                    id={`plan-freq-${line.key}`}
                    value={line.frequency}
                    onChange={(value) => updateLine(line.key, { frequency: value })}
                    options={FREQUENCIES.map((entry) => ({ value: entry, label: entry }))}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field
                  label="Horaires d’administration"
                  htmlFor={`plan-times-${line.key}`}
                  hint="Séparés par une virgule : 08:00, 14:00, 20:00"
                >
                  <input
                    id={`plan-times-${line.key}`}
                    className={FIELD}
                    value={line.administrationTimes}
                    onChange={(event) =>
                      updateLine(line.key, { administrationTimes: event.target.value })
                    }
                  />
                </Field>
                <Field label="Durée (jours)" htmlFor={`plan-days-${line.key}`}>
                  <input
                    id={`plan-days-${line.key}`}
                    type="number"
                    min={1}
                    className={FIELD}
                    value={line.durationDays}
                    onChange={(event) =>
                      updateLine(line.key, { durationDays: event.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Quantité par prise"
                  htmlFor={`plan-qty-${line.key}`}
                  hint="Reprise telle quelle dans les tournées."
                >
                  <input
                    id={`plan-qty-${line.key}`}
                    type="number"
                    min={0}
                    step="0.5"
                    className={FIELD}
                    value={line.quantityPerIntake}
                    onChange={(event) =>
                      updateLine(line.key, { quantityPerIntake: event.target.value })
                    }
                  />
                </Field>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-mora-green"
                  checked={line.isContinuous}
                  onChange={(event) =>
                    updateLine(line.key, { isContinuous: event.target.checked })
                  }
                />
                Traitement continu, sans durée déterminée
              </label>

              <Field label="Consignes" htmlFor={`plan-instr-${line.key}`}>
                <input
                  id={`plan-instr-${line.key}`}
                  className={FIELD}
                  placeholder="À prendre au cours du repas"
                  value={line.instructions}
                  onChange={(event) => updateLine(line.key, { instructions: event.target.value })}
                />
              </Field>
            </div>
          ))}
        </div>

        <Field label="Observations générales" htmlFor="plan-notes">
          <textarea
            id="plan-notes"
            rows={2}
            className={FIELD}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Enregistrer le plan
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const RoundForm: React.FC<{
  pharmacies: readonly Pharmacy[];
  services: readonly string[];
  onCancel: () => void;
  onSubmit: (input: {
    pharmacyId: string | null;
    service: string | null;
    roundDate: string;
    slot: string;
    notes: string | null;
  }) => Promise<void>;
}> = ({ pharmacies, services, onCancel, onSubmit }) => {
  const defaultPharmacy = pharmacies.find((entry) => entry.isDefault) ?? pharmacies[0] ?? null;

  const [pharmacyId, setPharmacyId] = useState(defaultPharmacy?.id ?? '');
  const [service, setService] = useState('');
  const [roundDate, setRoundDate] = useState(new Date().toISOString().slice(0, 10));
  const [slot, setSlot] = useState('matin');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Préparer une tournée"
      description="La liste est composée depuis les traitements actifs des patients hospitalisés."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSaving(true);
          await onSubmit({
            pharmacyId: pharmacyId || null,
            service: service || null,
            roundDate,
            slot,
            notes: notes.trim() || null,
          });
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date *" htmlFor="round-date">
            <input
              id="round-date"
              type="date"
              required
              className={FIELD}
              value={roundDate}
              onChange={(event) => setRoundDate(event.target.value)}
            />
          </Field>
          <Field
            label="Moment *"
            hint="Une seule tournée par service, date et moment."
          >
            <Select
              value={slot}
              onChange={setSlot}
              options={ROUND_SLOTS.map((entry) => ({ value: entry.value, label: entry.label }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service">
            <Select
              value={service}
              onChange={setService}
              placeholder="— Tous les services —"
              options={services.map((entry) => ({ value: entry, label: entry }))}
            />
          </Field>
          <Field label="Pharmacie">
            <Select
              value={pharmacyId}
              onChange={setPharmacyId}
              placeholder="— Non précisée —"
              options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
        </div>

        <Field label="Observations" htmlFor="round-notes">
          <textarea
            id="round-notes"
            rows={2}
            className={FIELD}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Préparer la tournée
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const RoundDetail: React.FC<{
  round: WardRound;
  canManage: boolean;
  ctx: WriteContext | null;
  onClose: () => void;
  onPrint: () => void;
  onChanged: () => Promise<void>;
}> = ({ round, canManage, ctx, onClose, onPrint, onChanged }) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mark = async (
    id: string,
    status: 'administered' | 'refused' | 'postponed',
    reason?: string,
  ) => {
    if (!ctx) return;
    setBusyId(id);
    setError(null);
    try {
      await setAdministrationStatus(id, status, { reason }, ctx.userId);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    } finally {
      setBusyId(null);
    }
  };

  // Les administrations sont regroupées par patient et par lit : c'est dans cet
  // ordre que la tournée se fait, chambre après chambre.
  const grouped = useMemo(() => {
    const map = new Map<string, WardRound['administrations']>();
    for (const entry of round.administrations) {
      const key = `${entry.patientName}||${entry.roomCode ?? ''}||${entry.bedCode ?? ''}`;
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return [...map.entries()];
  }, [round.administrations]);

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="2xl"
      title={`Tournée ${round.reference}`}
      description={`${formatDate(round.roundDate)} · ${round.slot} · ${round.service ?? 'Tous services'} — ${round.doneCount} / ${round.totalCount} administré(s)`}
    >
      <div className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        <Button variant="outline" onClick={onPrint} className="gap-2">
          <FileText className="h-4 w-4" /> Feuille de tournée
        </Button>

        {grouped.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Tournée vide"
            description="Aucun traitement actif à distribuer pour ce service. Vérifiez les plans thérapeutiques des patients hospitalisés."
          />
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto overscroll-contain">
            {grouped.map(([key, entries]) => {
              const [name, room, bed] = key.split('||');
              return (
                <div key={key} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs font-bold text-white">
                    {name}
                    <span className="ml-2 font-normal text-slate-500">
                      {[room && `Chambre ${room}`, bed && `Lit ${bed}`].filter(Boolean).join(' · ')}
                    </span>
                  </p>

                  <ul className="mt-2 space-y-2">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900 p-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-slate-200">
                            {entry.quantity} × {entry.medicationLabel}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {ADMINISTRATION_STATUS_LABELS[entry.status] ?? entry.status}
                            {entry.administeredAt && ` · ${formatDateTime(entry.administeredAt)}`}
                            {entry.administeredByName && ` · ${entry.administeredByName}`}
                          </p>
                        </div>

                        {canManage && entry.status === 'planned' ? (
                          <div className="flex shrink-0 gap-1.5">
                            <Button
                              variant="secondary"
                              size="sm"
                              isLoading={busyId === entry.id}
                              onClick={() => void mark(entry.id, 'administered')}
                              className="gap-1.5"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Administré
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === entry.id}
                              onClick={() => void mark(entry.id, 'refused', 'Refus du patient')}
                            >
                              Refusé
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            label={ADMINISTRATION_STATUS_LABELS[entry.status] ?? entry.status}
                            tone={
                              entry.status === 'administered'
                                ? 'good'
                                : entry.status === 'refused'
                                  ? 'bad'
                                  : 'neutral'
                            }
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        <Notice tone="info">
          Chaque administration constatée est automatiquement consignée dans le dossier du patient.
        </Notice>
      </div>
    </Modal>
  );
};

export type { PlanStatus };
