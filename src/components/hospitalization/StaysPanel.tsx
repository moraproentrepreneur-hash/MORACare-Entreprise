'use client';

import React, { useMemo, useState } from 'react';
import { BedDouble, CalendarClock, FileText, FolderOpen, LogOut, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { DoctorSelect } from '@/components/ui/DoctorSelect';
import { formatDate } from '@/lib/utils';
import type { Patient } from '@/types';
import {
  ADMISSION_ORIGINS,
  STAY_STATE_LABELS,
  admitPatient,
  cancelStay,
  isActiveStay,
  planDischarge,
  type Bed,
  type Stay,
  type StayState,
} from '@/services/hospitalization.service';
import type { HospitalizationSettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice, ScrollTable } from './shared';

/**
 * Séjours et admissions (BP16 §5, §12).
 *
 * L'admission ne propose que des lits réellement attribuables : la chambre est
 * déduite du lit choisi, ce qui rend impossible l'incohérence entre les deux —
 * la base la refuserait de toute façon.
 */

const stayTone = (status: StayState): 'good' | 'warn' | 'bad' | 'info' | 'neutral' => {
  if (status === 'discharged' || status === 'archived') return 'neutral';
  if (status === 'canceled') return 'bad';
  if (status === 'discharge_planned' || status === 'transferring') return 'warn';
  if (status === 'in_stay' || status === 'admitted') return 'good';
  return 'info';
};

type Scope = 'current' | 'discharged' | 'all';

export const StaysPanel: React.FC<{
  stays: readonly Stay[];
  beds: readonly Bed[];
  patients: readonly Patient[];
  settings: HospitalizationSettings;
  canCreate: boolean;
  canEdit: boolean;
  ctx: WriteContext | null;
  onOpenStay: (stay: Stay) => void;
  onPrintBulletin: (stay: Stay) => void;
  onPrintDischarge: (stay: Stay) => void;
  onChanged: () => Promise<void>;
}> = ({
  stays,
  beds,
  patients,
  settings,
  canCreate,
  canEdit,
  ctx,
  onOpenStay,
  onPrintBulletin,
  onPrintDischarge,
  onChanged,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<Scope>('current');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [form, setForm] = useState({
    doctorId: '',
    bedId: '',
    admissionOrigin: 'consultation',
    admissionReason: '',
  });

  const assignable = useMemo(() => beds.filter((bed) => bed.isAssignable), [beds]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return stays
      .filter((stay) => {
        if (scope === 'current') return isActiveStay(stay.status);
        if (scope === 'discharged') return !isActiveStay(stay.status);
        return true;
      })
      .filter((stay) =>
        needle === ''
          ? true
          : `${stay.reference} ${stay.patientName} ${stay.roomCode ?? ''} ${stay.service ?? ''}`
              .toLowerCase()
              .includes(needle),
      );
  }, [stays, scope, search]);

  const openCreate = () => {
    setPatientId('');
    setForm({
      doctorId: '',
      bedId: '',
      admissionOrigin: 'consultation',
      admissionReason: '',
    });
    setError(null);
    setIsOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    if (!patientId || !form.doctorId) {
      setError('Sélectionnez un patient et un praticien enregistrés dans la base.');
      return;
    }

    const bed = assignable.find((entry) => entry.id === form.bedId);
    if (!bed) {
      setError('Sélectionnez un lit disponible.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await admitPatient(
        {
          patientId,
          doctorId: form.doctorId,
          // La chambre est déduite du lit : elle ne peut donc pas diverger.
          roomId: bed.roomId,
          bedId: bed.id,
          service: bed.service ?? settings.admissionServices[0] ?? '',
          admissionOrigin: form.admissionOrigin,
          admissionReason: form.admissionReason,
          // Le tarif est figé au moment de l'admission : le modifier plus tard
          // sur la chambre ne doit pas réécrire le coût d'un séjour en cours.
          dailyRate: bed.dailyRate || settings.dailyRate,
        },
        ctx,
      );
      await onChanged();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admission impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  const run = async (task: () => Promise<void>) => {
    setError(null);
    try {
      await task();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <input
          className={FIELD}
          placeholder="Rechercher un patient, une référence…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select<Scope>
          aria-label="Filtrer les séjours"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'current', label: 'Séjours en cours' },
            { value: 'discharged', label: 'Séjours terminés' },
            { value: 'all', label: 'Tous les séjours' },
          ]}
        />
        {canCreate && (
          <Button
            variant="secondary"
            onClick={openCreate}
            disabled={assignable.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Admettre un patient
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {assignable.length === 0 && canCreate && (
        <Notice tone="info">
          Aucun lit n’est disponible : toutes les places sont occupées, en nettoyage ou hors
          service. Libérez un lit ou créez-en un nouveau avant d’admettre un patient.
        </Notice>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={BedDouble}
            title={scope === 'current' ? 'Aucun patient hospitalisé' : 'Aucun séjour'}
            description={
              scope === 'current'
                ? 'Tous les lits sont libres. Une admission affecte un lit et le rend immédiatement indisponible.'
                : 'Aucun séjour ne correspond à ce filtre.'
            }
          />
        ) : (
          <ScrollTable minWidth="min-w-[56rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Chambre / Lit</th>
                <th className="p-4">Service</th>
                <th className="p-4">Admission</th>
                <th className="p-4">Durée</th>
                <th className="p-4">État</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((stay) => (
                <tr key={stay.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="p-4 font-mono font-bold text-mora-green">{stay.reference}</td>
                  <td className="p-4 font-bold text-white">{stay.patientName}</td>
                  <td className="p-4 font-semibold text-mora-gold">
                    {[stay.roomCode, stay.bedCode].filter(Boolean).join(' — ') || 'Non affecté'}
                  </td>
                  <td className="p-4">{stay.service ?? '—'}</td>
                  <td className="p-4">{formatDate(stay.admissionDate)}</td>
                  <td className="p-4">
                    {stay.lengthOfStay} j
                    {isActiveStay(stay.status) && stay.lengthOfStay > settings.maxStayDays && (
                      <span className="ml-1 text-amber-400" title="Durée surveillée dépassée">
                        !
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <Badge label={STAY_STATE_LABELS[stay.status]} tone={stayTone(stay.status)} />
                  </td>
                  <td className="p-4">
                    <ActionMenu
                      label={`Actions pour ${stay.patientName}`}
                      items={[
                        {
                          label: 'Ouvrir le dossier de séjour',
                          icon: FolderOpen,
                          onSelect: () => onOpenStay(stay),
                        },
                        {
                          label: "Bulletin d'hospitalisation",
                          icon: FileText,
                          onSelect: () => onPrintBulletin(stay),
                        },
                        {
                          label: 'Lettre de sortie',
                          icon: LogOut,
                          disabled: !stay.dischargeDate,
                          onSelect: () => onPrintDischarge(stay),
                        },
                        {
                          label: 'Programmer la sortie',
                          icon: CalendarClock,
                          disabled:
                            !canEdit || !ctx || !isActiveStay(stay.status) ||
                            stay.status === 'discharge_planned',
                          onSelect: () =>
                            void run(() => planDischarge(stay.id, ctx?.userId ?? '')),
                        },
                        {
                          label: "Annuler l'admission",
                          icon: XCircle,
                          destructive: true,
                          disabled: !canEdit || !ctx || !isActiveStay(stay.status),
                          onSelect: () => void run(() => cancelStay(stay.id, ctx?.userId ?? '')),
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

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Admission en hospitalisation"
        description="Seuls les lits réellement disponibles sont proposés."
      >
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}

          <PatientSelect
            patients={patients as Patient[]}
            selectedPatientId={patientId}
            onSelectPatient={(patient) => setPatientId(patient.id)}
          />

          <DoctorSelect
            value={form.doctorId}
            onChange={(doctorId) => setForm({ ...form, doctorId })}
          />

          <Field
            label="Lit à affecter *"
            hint="La chambre et le service en découlent automatiquement."
          >
            <Select
              required
              value={form.bedId}
              onChange={(value) => setForm({ ...form, bedId: value })}
              placeholder="— Choisir un lit disponible —"
              options={assignable.map((bed) => ({
                value: bed.id,
                label: `Chambre ${bed.roomCode} — Lit ${bed.code}`,
                hint: [bed.roomType, bed.service].filter(Boolean).join(' · '),
              }))}
            />
          </Field>

          <Field label="Origine de l’admission *">
            <Select
              required
              value={form.admissionOrigin}
              onChange={(value) => setForm({ ...form, admissionOrigin: value })}
              options={ADMISSION_ORIGINS.map((entry) => ({
                value: entry.value,
                label: entry.label,
              }))}
            />
          </Field>

          <Field label="Motif d’admission *" htmlFor="admission-reason">
            <textarea
              id="admission-reason"
              required
              rows={2}
              className={FIELD}
              placeholder="Surveillance post-opératoire…"
              value={form.admissionReason}
              onChange={(event) => setForm({ ...form, admissionReason: event.target.value })}
            />
          </Field>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
              Valider l’admission
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
