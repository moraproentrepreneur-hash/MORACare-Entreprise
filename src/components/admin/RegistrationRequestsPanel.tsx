'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import {
  listRegistrationRequests,
  setRegistrationRequestStatus,
  PAYMENT_LABELS,
  START_LABELS,
  type RegistrationRequest,
} from '@/services/saas-requests.service';
import type { RequestStatus } from '@/types/database';
import {
  SearchField,
  SortableHeader,
  StatusBadge,
  StatusFilter,
  StatusSelect,
  compareValues,
  nextSort,
} from './request-ui';

/**
 * Demandes de démonstration déposées depuis la Landing Page.
 *
 * Chaque ligne est un prospect : le Super Admin la fait avancer d'« En attente »
 * à « Clôturé ». Le statut est le seul champ modifiable — le reste vient du
 * visiteur et ne doit pas être réécrit après coup.
 */

const TYPE_LABELS: Record<string, string> = {
  cabinet: 'Cabinet médical',
  clinique: 'Clinique',
  centre_medical: 'Centre médical',
  hopital: 'Hôpital',
  laboratoire: 'Laboratoire',
  imagerie: "Centre d'imagerie",
  ong: 'ONG médicale',
};

type SortColumn = 'reference' | 'establishmentName' | 'fullName' | 'createdAt' | 'status';

const formatAmount = (amount: number, currency: string): string =>
  `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`;

/**
 * Détail commercial de la demande.
 *
 * Ce que le visiteur a vu dans son récapitulatif doit être retrouvé ici à
 * l'identique : c'est sur cette base que la relation commerciale s'engage.
 */
const OfferSummary: React.FC<{ request: RegistrationRequest; compact?: boolean }> = ({
  request,
  compact,
}) => {
  if (!request.planName) {
    return <span className="text-[11px] text-slate-500">Demande de démonstration</span>;
  }

  const rows: { label: string; value: string; tone?: string }[] = [
    { label: 'Offre', value: request.planName },
  ];

  if (request.durationMonths) {
    rows.push({ label: 'Durée', value: `${request.durationMonths} mois` });
  }
  if (request.monthlyPrice !== null) {
    rows.push({
      label: 'Prix mensuel',
      value:
        request.monthlyPrice === 0
          ? 'Gratuit'
          : formatAmount(request.monthlyPrice, request.currency),
    });
  }
  if (request.savingsAmount !== null && request.savingsAmount > 0) {
    rows.push({
      label: 'Économie totale',
      value: formatAmount(request.savingsAmount, request.currency),
      tone: 'text-mora-green',
    });
  }
  if (request.totalPrice !== null) {
    rows.push({
      label: 'Total',
      value:
        request.totalPrice === 0 ? 'Gratuit' : formatAmount(request.totalPrice, request.currency),
      tone: 'text-white font-bold',
    });
  }
  if (request.paymentMethod) {
    rows.push({
      label: 'Paiement',
      value: PAYMENT_LABELS[request.paymentMethod] ?? request.paymentMethod,
    });
  }
  if (request.startOption) {
    rows.push({
      label: 'Démarrage',
      value:
        request.startOption === 'custom' && request.startDate
          ? formatDate(request.startDate)
          : START_LABELS[request.startOption],
    });
  }

  return (
    <dl className={`space-y-1 text-[11px] ${compact ? '' : 'min-w-[13rem]'}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <dt className="text-slate-500">{row.label}</dt>
          <dd className={`text-right ${row.tone ?? 'text-slate-200'}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const RegistrationRequestsPanel: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [sort, setSort] = useState<{ column: SortColumn; direction: 'asc' | 'desc' }>({
    column: 'createdAt',
    direction: 'desc',
  });

  const load = useCallback(async () => {
    try {
      setRequests(await listRegistrationRequests());
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

  const handleStatus = async (request: RegistrationRequest, status: RequestStatus) => {
    if (!user || status === request.status) return;
    setSavingId(request.id);
    setError(null);
    try {
      await setRegistrationRequestStatus(request.id, status, user.id);
      setRequests((list) =>
        list.map((item) => (item.id === request.id ? { ...item, status } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setSavingId(null);
    }
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return requests
      .filter((request) => statusFilter === 'all' || request.status === statusFilter)
      .filter(
        (request) =>
          needle === '' ||
          `${request.reference} ${request.establishmentName} ${request.fullName} ${request.email} ${request.phone}`
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => compareValues(a[sort.column], b[sort.column], sort.direction));
  }, [requests, search, statusFilter, sort]);

  const pendingCount = requests.filter((request) => request.status === 'pending').length;
  const handleSort = (column: SortColumn) => setSort((current) => nextSort(current, column));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
          <Inbox className="h-5 w-5 shrink-0 text-mora-green" /> Gestion des Demandes
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Demandes de démonstration reçues depuis la Landing Page.
          {pendingCount > 0 && (
            <span className="ml-1 font-semibold text-amber-400">
              {pendingCount} en attente de traitement.
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par référence, établissement, nom, e-mail…"
        />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Vue mobile : une carte par demande. Un tableau à 8 colonnes est
          illisible sous 640 px, et le défilement horizontal cache l'action. */}
      <div className="space-y-3 md:hidden">
        {isLoading && <p className="py-8 text-center text-xs text-slate-500">Chargement…</p>}

        {!isLoading && visible.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">Aucune demande à afficher.</p>
        )}

        {visible.map((request) => (
          <article
            key={request.id}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold text-mora-green">{request.reference}</p>
                <p className="truncate text-sm font-bold text-white">{request.establishmentName}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <dl className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between gap-3">
                <dt>Demandeur</dt>
                <dd className="truncate text-right text-slate-200">{request.fullName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Type</dt>
                <dd className="text-right text-slate-200">
                  {request.establishmentType ? TYPE_LABELS[request.establishmentType] : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Date</dt>
                <dd className="text-right text-slate-200">{formatDate(request.createdAt)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-3 text-xs">
              <a
                href={`mailto:${request.email}`}
                className="inline-flex items-center gap-1.5 text-mora-green hover:underline"
              >
                <Mail className="h-3.5 w-3.5" /> {request.email}
              </a>
              {request.phone && (
                <a
                  href={`tel:${request.phone}`}
                  className="inline-flex items-center gap-1.5 text-slate-300 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" /> {request.phone}
                </a>
              )}
            </div>

            <div className="rounded-lg bg-slate-950 p-3">
              <OfferSummary request={request} compact />
            </div>

            {request.message && (
              <p className="rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-400">
                {request.message}
              </p>
            )}

            <StatusSelect
              value={request.status}
              disabled={savingId === request.id}
              aria-label={`Statut de la demande ${request.reference}`}
              onChange={(status) => void handleStatus(request, status)}
            />
          </article>
        ))}
      </div>

      {/* Vue large : tableau complet, triable. */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <SortableHeader column="reference" label="Référence" sort={sort} onSort={handleSort} />
                <SortableHeader
                  column="establishmentName"
                  label="Établissement"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortableHeader column="fullName" label="Nom" sort={sort} onSort={handleSort} />
                <th scope="col" className="p-4">
                  Téléphone
                </th>
                <th scope="col" className="p-4">
                  E-mail
                </th>
                <th scope="col" className="p-4">
                  Type
                </th>
                <th scope="col" className="p-4">
                  Offre demandée
                </th>
                <SortableHeader column="createdAt" label="Date" sort={sort} onSort={handleSort} />
                <SortableHeader column="status" label="Statut" sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Aucune demande à afficher.
                  </td>
                </tr>
              )}

              {visible.map((request) => (
                <tr key={request.id} className="align-top hover:bg-slate-800/50">
                  <td className="whitespace-nowrap p-4 font-mono font-bold text-mora-green">
                    {request.reference}
                  </td>
                  <td className="p-4 font-bold text-white">
                    {request.establishmentName}
                    {request.message && (
                      <span
                        title={request.message}
                        className="mt-1 block max-w-[16rem] truncate text-[11px] font-normal text-slate-500"
                      >
                        {request.message}
                      </span>
                    )}
                  </td>
                  <td className="p-4">{request.fullName}</td>
                  <td className="whitespace-nowrap p-4">
                    {request.phone ? (
                      <a href={`tel:${request.phone}`} className="hover:text-white hover:underline">
                        {request.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4">
                    <a
                      href={`mailto:${request.email}`}
                      className="text-mora-green hover:underline"
                    >
                      {request.email}
                    </a>
                  </td>
                  <td className="p-4">
                    {request.establishmentType ? TYPE_LABELS[request.establishmentType] : '—'}
                  </td>
                  <td className="p-4">
                    <OfferSummary request={request} />
                  </td>
                  <td className="whitespace-nowrap p-4">{formatDate(request.createdAt)}</td>
                  <td className="p-4">
                    <StatusSelect
                      value={request.status}
                      disabled={savingId === request.id}
                      aria-label={`Statut de la demande ${request.reference}`}
                      onChange={(status) => void handleStatus(request, status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
