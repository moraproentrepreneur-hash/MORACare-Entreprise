'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import {
  listPasswordResetRequests,
  setPasswordResetStatus,
  type PasswordResetRequest,
} from '@/services/saas-requests.service';
import { regeneratePassword } from '@/services/platform-admin.service';
import type { RequestStatus } from '@/types/database';
import { CredentialsReveal, type Credentials } from './CredentialsReveal';
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
 * Demandes « mot de passe oublié ».
 *
 * L'écran ne se contente pas de lister : il permet de résoudre la demande sans
 * quitter la page. Un clic produit un mot de passe temporaire, l'affiche pour
 * qu'il soit transmis, et bascule la demande en « Accepté ».
 *
 * Une demande dont l'identifiant ne correspond à aucun compte est conservée et
 * signalée : c'est en général un utilisateur qui se trompe d'identifiant, et il
 * a besoin d'être rappelé — pas ignoré.
 */

type SortColumn = 'reference' | 'identifier' | 'fullName' | 'createdAt' | 'status';

export const PasswordResetRequestsPanel: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [issued, setIssued] = useState<Credentials | null>(null);
  const [confirming, setConfirming] = useState<PasswordResetRequest | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [sort, setSort] = useState<{ column: SortColumn; direction: 'asc' | 'desc' }>({
    column: 'createdAt',
    direction: 'desc',
  });

  const load = useCallback(async () => {
    try {
      setRequests(await listPasswordResetRequests());
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

  const handleStatus = async (request: PasswordResetRequest, status: RequestStatus) => {
    if (!user || status === request.status) return;
    setBusyId(request.id);
    setError(null);
    try {
      await setPasswordResetStatus(request.id, status, user.id);
      setRequests((list) =>
        list.map((item) => (item.id === request.id ? { ...item, status } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setBusyId(null);
    }
  };

  /** Produit le mot de passe temporaire et clôt la demande. */
  const handleIssue = async (request: PasswordResetRequest) => {
    if (!user || !request.profileId) return;
    setBusyId(request.id);
    setError(null);
    try {
      const credentials = await regeneratePassword(request.profileId);
      await setPasswordResetStatus(request.id, 'accepted', user.id);
      setConfirming(null);
      setIssued({
        username: credentials.username,
        password: credentials.password,
        email: credentials.email,
        fullName: request.fullName,
        establishmentName: request.establishmentName,
        emailSent: credentials.emailSent,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible.');
    } finally {
      setBusyId(null);
    }
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return requests
      .filter((request) => statusFilter === 'all' || request.status === statusFilter)
      .filter(
        (request) =>
          needle === '' ||
          `${request.reference} ${request.identifier} ${request.fullName} ${request.email} ${request.establishmentName}`
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
          <KeyRound className="h-5 w-5 shrink-0 text-mora-green" /> Demandes de réinitialisation
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Utilisateurs ayant déclaré avoir oublié leur mot de passe.
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
          placeholder="Rechercher par référence, identifiant, nom…"
        />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Vue mobile */}
      <div className="space-y-3 lg:hidden">
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
                <p className="font-mono text-[11px] font-bold text-mora-green">
                  {request.reference}
                </p>
                <p className="truncate text-sm font-bold text-white">{request.fullName}</p>
                <p className="truncate font-mono text-xs text-slate-400">{request.identifier}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <dl className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between gap-3">
                <dt>Établissement</dt>
                <dd className="truncate text-right text-slate-200">{request.establishmentName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>E-mail</dt>
                <dd className="truncate text-right text-slate-200">{request.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Date</dt>
                <dd className="text-right text-slate-200">{formatDate(request.createdAt)}</dd>
              </div>
            </dl>

            {request.profileId ? (
              <div className="flex justify-end">
                <ActionMenu
                  disabled={busyId === request.id}
                  label={`Actions pour ${request.fullName}`}
                  items={[
                    {
                      label: 'Générer un mot de passe',
                      icon: RefreshCw,
                      onSelect: () => setConfirming(request),
                    },
                  ]}
                />
              </div>
            ) : (
              <UnknownAccountNotice />
            )}

            <StatusSelect
              value={request.status}
              disabled={busyId === request.id}
              aria-label={`Statut de la demande ${request.reference}`}
              onChange={(status) => void handleStatus(request, status)}
            />
          </article>
        ))}
      </div>

      {/* Vue large */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <SortableHeader column="reference" label="Référence" sort={sort} onSort={handleSort} />
                <SortableHeader column="fullName" label="Nom" sort={sort} onSort={handleSort} />
                <SortableHeader
                  column="identifier"
                  label="Identifiant"
                  sort={sort}
                  onSort={handleSort}
                />
                <th scope="col" className="p-4">
                  E-mail
                </th>
                <th scope="col" className="p-4">
                  Établissement
                </th>
                <SortableHeader column="createdAt" label="Date" sort={sort} onSort={handleSort} />
                <SortableHeader column="status" label="Statut" sort={sort} onSort={handleSort} />
                <th scope="col" className="p-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Aucune demande à afficher.
                  </td>
                </tr>
              )}

              {visible.map((request) => (
                <tr key={request.id} className="align-top hover:bg-slate-800/50">
                  <td className="whitespace-nowrap p-4 font-mono font-bold text-mora-green">
                    {request.reference}
                  </td>
                  <td className="p-4 font-bold text-white">{request.fullName}</td>
                  <td className="p-4 font-mono">{request.identifier}</td>
                  <td className="p-4">{request.email}</td>
                  <td className="p-4">{request.establishmentName}</td>
                  <td className="whitespace-nowrap p-4">{formatDate(request.createdAt)}</td>
                  <td className="p-4">
                    <StatusSelect
                      value={request.status}
                      disabled={busyId === request.id}
                      aria-label={`Statut de la demande ${request.reference}`}
                      onChange={(status) => void handleStatus(request, status)}
                    />
                  </td>
                  <td className="p-4">
                    {request.profileId ? (
                      <ActionMenu
                        disabled={busyId === request.id}
                        label={`Actions pour ${request.fullName}`}
                        items={[
                          {
                            label: 'Générer un mot de passe',
                            icon: RefreshCw,
                            onSelect: () => setConfirming(request),
                          },
                        ]}
                      />
                    ) : (
                      <UnknownAccountNotice />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation */}
      <Modal
        isOpen={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Générer un mot de passe"
        description={confirming?.fullName}
      >
        {confirming && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-400">
              Un mot de passe temporaire va remplacer celui de{' '}
              <span className="font-mono text-slate-200">{confirming.identifier}</span>. Son
              titulaire devra en choisir un nouveau dès sa prochaine connexion, et la demande sera
              marquée comme acceptée.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                variant="secondary"
                isLoading={busyId === confirming.id}
                className="w-full py-2.5 font-bold sm:w-auto sm:px-8"
                onClick={() => void handleIssue(confirming)}
              >
                Générer et accepter
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirming(null)}
                className="w-full py-2.5 sm:w-auto sm:px-6"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Identifiants générés */}
      <Modal
        isOpen={issued !== null}
        onClose={() => setIssued(null)}
        title="Nouveau mot de passe"
        description="À communiquer à son titulaire par un canal sûr."
      >
        {issued && <CredentialsReveal credentials={issued} onClose={() => setIssued(null)} />}
      </Modal>
    </div>
  );
};

/** Une demande peut viser un identifiant qui n'existe pas : c'est une information. */
const UnknownAccountNotice: React.FC = () => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-amber-400">
    <ShieldAlert className="h-3.5 w-3.5" /> Identifiant inconnu
  </span>
);
