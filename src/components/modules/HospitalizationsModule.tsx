'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, BedDouble, DoorOpen, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDocument } from '@/hooks/useDocument';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DEFAULT_MODULE_SETTINGS } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import {
  ADMISSION_ORIGINS,
  STAY_STATE_LABELS,
  buildOccupancy,
  listBeds,
  listRooms,
  listStays,
  type Bed,
  type Room,
  type Stay,
} from '@/services/hospitalization.service';
import { RoomsPanel } from '@/components/hospitalization/RoomsPanel';
import { BedsPanel } from '@/components/hospitalization/BedsPanel';
import { StaysPanel } from '@/components/hospitalization/StaysPanel';
import { StayDetail } from '@/components/hospitalization/StayDetail';
import { Metric, Notice } from '@/components/hospitalization/shared';

/**
 * Module Hospitalisation (BP16).
 *
 * Quatre onglets, dans l'ordre où les données se construisent : les chambres
 * portent les lits, les lits reçoivent les admissions, l'occupation se déduit
 * des deux. Cet ordre n'est pas cosmétique — un établissement qui commence par
 * l'admission ne trouve rien à sélectionner, et le module paraît cassé.
 */

type Tab = 'stays' | 'rooms' | 'beds' | 'occupancy';

const TABS: readonly { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'stays', label: 'Séjours', icon: BedDouble },
  { id: 'rooms', label: 'Chambres', icon: DoorOpen },
  { id: 'beds', label: 'Lits', icon: ArrowRightLeft },
  { id: 'occupancy', label: 'Occupation', icon: LayoutGrid },
];

export const HospitalizationsModule: React.FC = () => {
  const { user } = useAuth();
  const { patients, refresh } = useData();
  const { canCreate, canUpdate } = usePermissions();
  const { print, error: documentError, profile } = useDocument();

  const [tab, setTab] = useState<Tab>('stays');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Stay | null>(null);

  const settings = profile?.moduleSettings.hospitalization ?? DEFAULT_MODULE_SETTINGS.hospitalization;
  const currency = profile?.currency ?? 'KMF';

  const canManage = canUpdate('hospitalizations');
  const canAdmit = canCreate('hospitalizations');

  const ctx: WriteContext | null = useMemo(
    () =>
      user?.establishment_id && user.id
        ? { establishmentId: user.establishment_id, userId: user.id }
        : null,
    [user],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedRooms, loadedBeds, loadedStays] = await Promise.all([
        listRooms(),
        listBeds(),
        listStays(),
      ]);
      setRooms(loadedRooms);
      setBeds(loadedBeds);
      setStays(loadedStays);
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

  /**
   * Rechargement après écriture.
   *
   * `refresh` du contexte partagé est appelé en plus : le tableau de bord et la
   * fiche patient comptent les séjours en cours, et resteraient sinon sur une
   * situation périmée.
   */
  const reload = useCallback(async () => {
    await load();
    await refresh();
  }, [load, refresh]);

  // Le dossier ouvert doit suivre les écritures qu'on y fait : sans cela, la
  // durée de séjour et l'état affichés en tête resteraient ceux de l'ouverture.
  const openedStay = opened ? (stays.find((stay) => stay.id === opened.id) ?? opened) : null;

  const occupancy = useMemo(() => buildOccupancy(beds, stays), [beds, stays]);

  const originLabel = (value: string | null): string =>
    ADMISSION_ORIGINS.find((entry) => entry.value === value)?.label ?? 'Non précisée';

  /** Bulletin d'hospitalisation (BP16, BP28C §7). */
  const printBulletin = (stay: Stay) => {
    void print({
      kind: 'hospitalization',
      reference: stay.reference,
      title: "Bulletin d'hospitalisation",
      subtitle: `Admission du ${formatDate(stay.admissionDate)}`,
      highlight: [
        { label: 'Patient', value: stay.patientName },
        { label: 'Praticien référent', value: stay.doctorName || '—' },
        {
          label: 'Chambre / lit',
          value: [stay.roomCode, stay.bedCode].filter(Boolean).join(' — ') || 'Non affecté',
        },
        { label: 'Statut', value: STAY_STATE_LABELS[stay.status] },
      ],
      sections: [
        {
          title: 'Séjour',
          fields: [
            { label: 'Service', value: stay.service ?? '—' },
            { label: "Origine de l'admission", value: originLabel(stay.admissionOrigin) },
            { label: "Date d'admission", value: formatDate(stay.admissionDate) },
            {
              label: 'Date de sortie',
              value: stay.dischargeDate ? formatDate(stay.dischargeDate) : 'Séjour en cours',
            },
            { label: 'Durée', value: `${stay.lengthOfStay} jour(s)` },
            {
              label: 'Tarif journalier',
              value: stay.dailyRate > 0 ? formatCurrency(stay.dailyRate, currency) : 'Non facturé',
            },
            {
              label: 'Coût du séjour à ce jour',
              value:
                stay.dailyRate > 0
                  ? formatCurrency(stay.dailyRate * stay.lengthOfStay, currency)
                  : '—',
            },
          ],
        },
        {
          title: "Motif d'admission",
          paragraphs: [stay.admissionReason || 'Non renseigné'],
        },
      ],
      note: stay.dischargeDate
        ? undefined
        : "Séjour en cours. Ce bulletin reflète la situation à la date d'édition.",
    });
  };

  /** Lettre de sortie (BP16 §11, BP28C §7). */
  const printDischarge = (stay: Stay) => {
    void print({
      kind: 'discharge',
      reference: stay.reference,
      title: 'Lettre de sortie',
      subtitle: stay.dischargeDate ? `Sortie du ${formatDate(stay.dischargeDate)}` : undefined,
      highlight: [
        { label: 'Patient', value: stay.patientName },
        { label: 'Praticien référent', value: stay.doctorName || '—' },
        { label: 'Admission', value: formatDate(stay.admissionDate) },
        {
          label: 'Sortie',
          value: stay.dischargeDate ? formatDate(stay.dischargeDate) : '—',
        },
      ],
      sections: [
        {
          title: 'Séjour',
          fields: [
            {
              label: 'Chambre / lit',
              value: [stay.roomCode, stay.bedCode].filter(Boolean).join(' — ') || '—',
            },
            { label: 'Service', value: stay.service ?? '—' },
            { label: 'Durée', value: `${stay.lengthOfStay} jour(s)` },
            { label: "Motif d'admission", value: stay.admissionReason || '—' },
            { label: 'Motif de sortie', value: stay.dischargeReason ?? '—' },
            { label: 'État du patient', value: stay.patientCondition ?? '—' },
          ],
        },
        {
          title: 'Compte rendu de sortie',
          paragraphs: [
            stay.dischargeSummary?.trim() || 'Aucun compte rendu de sortie saisi.',
          ],
        },
        ...(stay.recommendations?.trim()
          ? [{ title: 'Recommandations', paragraphs: [stay.recommendations] }]
          : []),
        ...(stay.nextAppointmentDate
          ? [
              {
                title: 'Suivi',
                fields: [
                  {
                    label: 'Prochain rendez-vous',
                    value: formatDate(stay.nextAppointmentDate),
                  },
                ],
              },
            ]
          : []),
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
          <BedDouble className="h-5 w-5 shrink-0 text-mora-green" /> Hospitalisation
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Chambres, lits, admissions, soins, transferts et sorties.
        </p>
      </div>

      {(error || documentError) && <Notice tone="error">{error ?? documentError}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Patients hospitalisés"
          value={occupancy.currentStays}
          tone={occupancy.currentStays > 0 ? 'good' : 'neutral'}
        />
        <Metric
          label="Lits disponibles"
          value={occupancy.availableBeds}
          hint={`${occupancy.totalBeds} lit(s) au total`}
          tone={occupancy.availableBeds === 0 ? 'bad' : 'good'}
        />
        <Metric
          label="Taux d'occupation"
          value={`${occupancy.occupancyRate} %`}
          tone={occupancy.occupancyRate >= 90 ? 'warn' : 'neutral'}
        />
        <Metric
          label="Durée moyenne de séjour"
          value={occupancy.averageLengthOfStay > 0 ? `${occupancy.averageLengthOfStay} j` : '—'}
          hint="Sur les séjours terminés"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {TABS.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === entry.id
                  ? 'bg-mora-blue text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
      ) : (
        <>
          {tab === 'stays' && (
            <StaysPanel
              stays={stays}
              beds={beds}
              patients={patients}
              settings={settings}
              canCreate={canAdmit}
              canEdit={canManage}
              ctx={ctx}
              onOpenStay={setOpened}
              onPrintBulletin={printBulletin}
              onPrintDischarge={printDischarge}
              onChanged={reload}
            />
          )}

          {tab === 'rooms' && (
            <RoomsPanel
              rooms={rooms}
              settings={settings}
              currency={currency}
              canManage={canManage}
              ctx={ctx}
              onChanged={reload}
            />
          )}

          {tab === 'beds' && (
            <BedsPanel
              beds={beds}
              rooms={rooms}
              canManage={canManage}
              ctx={ctx}
              onChanged={reload}
            />
          )}

          {tab === 'occupancy' && <OccupancyPanel report={occupancy} />}
        </>
      )}

      {openedStay && (
        <StayDetail
          stay={openedStay}
          beds={beds}
          settings={settings}
          canEdit={canManage}
          ctx={ctx}
          doctorId={user?.role === 'doctor' ? user.id : ''}
          onClose={() => setOpened(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
};

/** Taux d'occupation par service (BP16 §15). */
const OccupancyPanel: React.FC<{ report: ReturnType<typeof buildOccupancy> }> = ({ report }) => (
  <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Chambres" value={report.totalRooms} hint={`${report.availableRooms} avec un lit libre`} />
      <Metric label="Lits occupés" value={report.occupiedBeds} tone="warn" />
      <Metric label="Lits disponibles" value={report.availableBeds} tone="good" />
      <Metric
        label="Indisponibles"
        value={report.outOfServiceBeds}
        hint="Nettoyage ou hors service"
        tone={report.outOfServiceBeds > 0 ? 'warn' : 'neutral'}
      />
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <h3 className="text-sm font-bold text-white">Occupation par service</h3>
        <p className="mt-1 text-xs text-slate-400">
          Répartition des lits selon le service de leur chambre.
        </p>
      </div>

      {report.byService.length === 0 ? (
        <p className="p-8 text-center text-xs text-slate-500">
          Aucun lit enregistré : le taux d&apos;occupation sera calculé dès la création des chambres
          et des lits.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800">
          {report.byService.map((entry) => {
            const rate = entry.beds === 0 ? 0 : Math.round((entry.occupied / entry.beds) * 100);
            return (
              <li key={entry.service} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-200">{entry.service}</span>
                  <span className="text-xs text-slate-400">
                    {entry.occupied} / {entry.beds} · {rate} %
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${rate >= 90 ? 'bg-amber-500' : 'bg-mora-green'}`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  </div>
);
