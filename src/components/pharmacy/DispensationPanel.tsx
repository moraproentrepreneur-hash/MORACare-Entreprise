'use client';

import React, { useMemo, useState } from 'react';
import { Check, FileText, HandCoins, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Patient } from '@/types';
import {
  recordDispensation,
  setPrescriptionPharmacyStatus,
  suggestLots,
  type Dispensation,
  type LotSuggestion,
  type PendingPrescription,
  type Pharmacy,
  type StockState,
} from '@/services/pharmacy.service';
import type { PharmacySettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice, ScrollTable } from '@/components/hospitalization/shared';

/**
 * Validation pharmaceutique et délivrance (BP19 §8, §9, §10).
 *
 * Les lots ne sont pas choisis à la main : la base les propose selon la règle
 * de sortie de l'article — FEFO par défaut, BR-087. Laisser l'opérateur les
 * désigner reviendrait à laisser périmer les lots les plus anciens au fond de
 * l'étagère.
 */

const PRESCRIPTION_STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' | 'info' }> = {
  pending: { label: 'À valider', tone: 'warn' },
  validated: { label: 'Validée', tone: 'good' },
  change_requested: { label: 'Modification demandée', tone: 'info' },
  refused: { label: 'Refusée', tone: 'bad' },
  dispensed: { label: 'Délivrée', tone: 'neutral' },
};

interface DraftLine {
  key: string;
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  posology: string;
  suggestions: LotSuggestion[];
  /** Message affiché quand le stock ne couvre pas la quantité demandée. */
  shortfall: number;
}

export const DispensationPanel: React.FC<{
  dispensations: readonly Dispensation[];
  prescriptions: readonly PendingPrescription[];
  stock: readonly StockState[];
  pharmacies: readonly Pharmacy[];
  patients: readonly Patient[];
  settings: PharmacySettings;
  currency: string;
  canDispense: boolean;
  ctx: WriteContext | null;
  onPrint: (dispensation: Dispensation) => void;
  onChanged: () => Promise<void>;
}> = ({
  dispensations,
  prescriptions,
  stock,
  pharmacies,
  patients,
  settings,
  currency,
  canDispense,
  ctx,
  onPrint,
  onChanged,
}) => {
  const [dialog, setDialog] = useState<'dispense' | null>(null);
  const [reviewing, setReviewing] = useState<PendingPrescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = useMemo(
    () => prescriptions.filter((entry) => entry.pharmacyStatus === 'pending'),
    [prescriptions],
  );

  const run = async (task: () => Promise<void>, message: string) => {
    setError(null);
    setNotice(null);
    try {
      await task();
      await onChanged();
      setNotice(message);
      setDialog(null);
      setReviewing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">
          {settings.requirePharmacistValidation
            ? 'Une prescription doit être validée avant toute délivrance (réglage actif).'
            : 'La validation pharmaceutique est désactivée dans les Paramètres.'}
        </p>
        {canDispense && (
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setDialog('dispense');
            }}
            className="shrink-0 gap-2"
          >
            <Plus className="h-4 w-4" /> Nouvelle délivrance
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <h3 className="text-sm font-bold text-white">
            Prescriptions à valider
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                {pending.length}
              </span>
            )}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Le pharmacien valide, demande une modification ou refuse avec justification.
          </p>
        </div>

        {prescriptions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucune prescription"
            description="Les prescriptions issues des consultations et des hospitalisations arrivent ici."
          />
        ) : (
          <ScrollTable minWidth="min-w-[44rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Prescripteur</th>
                <th className="p-4">Lignes</th>
                <th className="p-4">Date</th>
                <th className="p-4">État</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {prescriptions.slice(0, 30).map((entry) => {
                const status = PRESCRIPTION_STATUS[entry.pharmacyStatus] ?? {
                  label: entry.pharmacyStatus,
                  tone: 'neutral' as const,
                };
                return (
                  <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                    <td className="p-4 font-bold text-white">{entry.patientName}</td>
                    <td className="p-4">{entry.doctorName || '—'}</td>
                    <td className="p-4">{entry.medications.length}</td>
                    <td className="p-4">{formatDateTime(entry.createdAt)}</td>
                    <td className="p-4">
                      <Badge label={status.label} tone={status.tone} />
                    </td>
                    <td className="p-4">
                      <ActionMenu
                        label={`Actions pour ${entry.reference}`}
                        items={[
                          {
                            label: 'Examiner',
                            icon: Check,
                            disabled: !canDispense || entry.pharmacyStatus === 'dispensed',
                            onSelect: () => {
                              setError(null);
                              setReviewing(entry);
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ScrollTable>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-4">
          <h3 className="text-sm font-bold text-white">Délivrances</h3>
          <p className="mt-1 text-xs text-slate-400">
            Chaque délivrance décrémente le stock et reste rattachée au patient.
          </p>
        </div>

        {dispensations.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Aucune délivrance"
            description="Les bons de délivrance nominatifs apparaîtront ici, avec les lots servis."
          />
        ) : (
          <ScrollTable minWidth="min-w-[46rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Produits</th>
                <th className="p-4">Pharmacie</th>
                <th className="p-4">Date</th>
                <th className="p-4">Montant</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dispensations.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                  <td className="p-4 font-bold text-white">
                    {entry.patientName ?? 'Comptoir'}
                  </td>
                  <td className="p-4">
                    {entry.lines.map((line) => (
                      <span key={line.id} className="block text-[11px]">
                        {line.quantity} × {line.itemName}
                        {line.lotNumber && (
                          <span className="text-slate-500"> · lot {line.lotNumber}</span>
                        )}
                      </span>
                    ))}
                  </td>
                  <td className="p-4">{entry.pharmacyName ?? '—'}</td>
                  <td className="p-4">{formatDateTime(entry.dispensedAt)}</td>
                  <td className="p-4 font-semibold text-slate-200">
                    {formatCurrency(entry.totalAmount, currency)}
                  </td>
                  <td className="p-4">
                    <ActionMenu
                      label={`Actions pour ${entry.reference}`}
                      items={[
                        {
                          label: 'Bon de délivrance',
                          icon: FileText,
                          onSelect: () => onPrint(entry),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        )}
      </section>

      {reviewing && (
        <ReviewForm
          prescription={reviewing}
          error={error}
          onCancel={() => setReviewing(null)}
          onSubmit={(status, note) =>
            run(
              () =>
                setPrescriptionPharmacyStatus(reviewing.id, status, note, ctx?.userId ?? ''),
              status === 'validated'
                ? 'Prescription validée : la délivrance est possible.'
                : 'Décision enregistrée et historisée.',
            )
          }
        />
      )}

      {dialog === 'dispense' && (
        <DispenseForm
          stock={stock}
          pharmacies={pharmacies}
          patients={patients}
          prescriptions={prescriptions}
          currency={currency}
          error={error}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(
              async () => {
                await recordDispensation(input, ctx as WriteContext);
              },
              'Délivrance enregistrée : le stock a été mis à jour.',
            )
          }
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const ReviewForm: React.FC<{
  prescription: PendingPrescription;
  error: string | null;
  onCancel: () => void;
  onSubmit: (
    status: 'validated' | 'change_requested' | 'refused',
    note: string | null,
  ) => Promise<void>;
}> = ({ prescription, error, onCancel, onSubmit }) => {
  const [note, setNote] = useState(prescription.pharmacistNote ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (status: 'validated' | 'change_requested' | 'refused') => {
    if (status !== 'validated' && note.trim() === '') return;
    setBusy(status);
    await onSubmit(status, note);
    setBusy(null);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`Prescription ${prescription.reference}`}
      description={`${prescription.patientName} · prescrite par ${prescription.doctorName || 'praticien'}`}
    >
      <div className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        {prescription.medications.length === 0 ? (
          <Notice tone="info">Cette prescription ne comporte aucune ligne détaillée.</Notice>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
            {prescription.medications.map((medication, index) => (
              <li key={index} className="p-3">
                <p className="text-xs font-bold text-white">{medication.name ?? 'Médicament'}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {[medication.dosage, medication.frequency, medication.duration]
                    .filter(Boolean)
                    .join(' · ') || 'Posologie non précisée'}
                </p>
              </li>
            ))}
          </ul>
        )}

        <Field
          label="Observation du pharmacien"
          htmlFor="review-note"
          hint="Obligatoire pour une demande de modification ou un refus."
        >
          <textarea
            id="review-note"
            rows={3}
            className={FIELD}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant="secondary"
            isLoading={busy === 'validated'}
            onClick={() => void decide('validated')}
            className="gap-2 font-bold"
          >
            <Check className="h-4 w-4" /> Valider
          </Button>
          <Button
            variant="outline"
            isLoading={busy === 'change_requested'}
            disabled={note.trim() === ''}
            onClick={() => void decide('change_requested')}
          >
            Demander une modification
          </Button>
          <Button
            variant="danger"
            isLoading={busy === 'refused'}
            disabled={note.trim() === ''}
            onClick={() => void decide('refused')}
            className="gap-2"
          >
            <X className="h-4 w-4" /> Refuser
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const DispenseForm: React.FC<{
  stock: readonly StockState[];
  pharmacies: readonly Pharmacy[];
  patients: readonly Patient[];
  prescriptions: readonly PendingPrescription[];
  currency: string;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: {
    pharmacyId: string | null;
    patientId: string | null;
    prescriptionId: string | null;
    hospitalizationId: null;
    notes?: string;
    lines: {
      itemId: string;
      lotId: string | null;
      quantity: number;
      unitPrice: number;
      posology?: string;
    }[];
  }) => Promise<void>;
}> = ({ stock, pharmacies, patients, prescriptions, currency, error, onCancel, onSubmit }) => {
  const defaultPharmacy = pharmacies.find((entry) => entry.isDefault) ?? pharmacies[0] ?? null;

  const [pharmacyId, setPharmacyId] = useState(defaultPharmacy?.id ?? '');
  const [patientId, setPatientId] = useState('');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickItem, setPickItem] = useState('');
  const [pickQuantity, setPickQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Seules les prescriptions du patient choisi sont proposées : rattacher une
  // délivrance à la prescription d'un autre patient serait une faute grave.
  const patientPrescriptions = prescriptions.filter(
    (entry) => entry.patientId === patientId && entry.pharmacyStatus !== 'refused',
  );

  const available = stock.filter((line) => line.quantity > 0);

  const addLine = async () => {
    const item = available.find((entry) => entry.itemId === pickItem);
    if (!item || pickQuantity < 1) return;

    setLocalError(null);
    try {
      const suggestions = await suggestLots(item.itemId, pharmacyId || null, pickQuantity);
      const covered = suggestions.reduce((total, entry) => total + entry.take, 0);

      setLines((current) => [
        ...current,
        {
          key: `${item.itemId}-${Date.now()}`,
          itemId: item.itemId,
          itemName: item.name,
          unit: item.unit,
          quantity: pickQuantity,
          unitPrice: item.unitPrice,
          posology: '',
          suggestions,
          shortfall: Math.max(0, pickQuantity - covered),
        },
      ]);
      setPickItem('');
      setPickQuantity(1);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sélection des lots impossible.');
    }
  };

  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const blocked = lines.some((line) => line.shortfall > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lines.length === 0) {
      setLocalError('Ajoutez au moins un produit à délivrer.');
      return;
    }

    setIsSaving(true);
    // Une ligne peut être servie sur plusieurs lots : chacun devient une ligne
    // de délivrance, ce qui garde la trace du lot réellement remis au patient.
    const payload: {
      itemId: string;
      lotId: string | null;
      quantity: number;
      unitPrice: number;
      posology?: string;
    }[] = lines.flatMap((line) =>
      line.suggestions.length > 0
        ? line.suggestions.map((suggestion) => ({
            itemId: line.itemId,
            lotId: suggestion.lotId as string | null,
            quantity: suggestion.take,
            unitPrice: line.unitPrice,
            posology: line.posology,
          }))
        : [
            {
              itemId: line.itemId,
              lotId: null as string | null,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              posology: line.posology,
            },
          ],
    );

    await onSubmit({
      pharmacyId: pharmacyId || null,
      patientId: patientId || null,
      prescriptionId: prescriptionId || null,
      hospitalizationId: null,
      notes,
      lines: payload,
    });
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidth="xl"
      title="Nouvelle délivrance"
      description="Les lots sont sélectionnés automatiquement selon la règle de sortie du produit."
    >
      <form onSubmit={submit} className="space-y-4">
        {(error || localError) && <Notice tone="error">{error ?? localError}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pharmacie">
            <Select
              value={pharmacyId}
              onChange={setPharmacyId}
              placeholder="— Toutes pharmacies —"
              options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
          <Field label="Prescription rattachée" hint="Requise pour une délivrance nominative.">
            <Select
              value={prescriptionId}
              onChange={setPrescriptionId}
              placeholder={
                patientId ? '— Aucune prescription —' : '— Choisissez d’abord un patient —'
              }
              options={patientPrescriptions.map((entry) => ({
                value: entry.id,
                label: entry.reference,
                hint: PRESCRIPTION_STATUS[entry.pharmacyStatus]?.label,
              }))}
            />
          </Field>
        </div>

        <PatientSelect
          patients={patients as Patient[]}
          selectedPatientId={patientId}
          onSelectPatient={(patient) => {
            setPatientId(patient.id);
            setPrescriptionId('');
          }}
        />

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-300">Produits à délivrer</p>

          <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <Select
              aria-label="Médicament"
              value={pickItem}
              onChange={setPickItem}
              placeholder="— Choisir un médicament —"
              options={available.map((entry) => ({
                value: entry.itemId,
                label: entry.name,
                hint: `${entry.quantity} ${entry.unit} · ${formatCurrency(entry.unitPrice, currency)}`,
              }))}
            />
            <input
              type="number"
              min={1}
              aria-label="Quantité"
              className={FIELD}
              value={pickQuantity}
              onChange={(event) => setPickQuantity(Math.max(1, Number(event.target.value) || 1))}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pickItem === ''}
              onClick={() => void addLine()}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>

          {lines.length === 0 ? (
            <p className="mt-3 text-[11px] text-slate-500">Aucun produit ajouté.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lines.map((line) => (
                <li key={line.key} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">
                        {line.quantity} × {line.itemName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {line.suggestions.length === 0
                          ? 'Aucun lot suivi : sortie sur le stock global.'
                          : line.suggestions
                              .map(
                                (suggestion) =>
                                  `${suggestion.take} sur le lot ${suggestion.lotNumber}`,
                              )
                              .join(' · ')}
                      </p>
                      {line.shortfall > 0 && (
                        <p className="mt-1 text-[11px] text-red-400">
                          {line.shortfall} unité(s) manquante(s) en stock disponible.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300">
                        {formatCurrency(line.quantity * line.unitPrice, currency)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Retirer ${line.itemName}`}
                        onClick={() =>
                          setLines((current) => current.filter((entry) => entry.key !== line.key))
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <input
                    className={`${FIELD} mt-2`}
                    placeholder="Posologie remise au patient (facultatif)"
                    value={line.posology}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((entry) =>
                          entry.key === line.key
                            ? { ...entry, posology: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 && (
            <p className="mt-3 text-right text-sm font-bold text-white">
              Total : {formatCurrency(total, currency)}
            </p>
          )}
        </div>

        <Field label="Observations" htmlFor="dispense-notes">
          <textarea
            id="dispense-notes"
            rows={2}
            className={FIELD}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        {blocked && (
          <Notice tone="error">
            Le stock disponible ne couvre pas toutes les lignes. Retirez ou réduisez les quantités
            concernées avant d’enregistrer.
          </Notice>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            disabled={blocked || lines.length === 0}
            className="flex-1 font-bold"
          >
            Enregistrer la délivrance
          </Button>
        </div>
      </form>
    </Modal>
  );
};
