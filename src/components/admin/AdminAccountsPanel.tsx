'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/lib/roles';
import { listEstablishments } from '@/services/establishment.service';
import {
  deletePlatformUser,
  listPlatformUsers,
  updatePlatformUser,
  type PlatformUser,
} from '@/services/platform-admin.service';
import type { Establishment, UserRole } from '@/types';
import { AdminAccountForm } from './AdminAccountForm';
import { SearchField, SortableHeader, compareValues, nextSort } from './request-ui';

/**
 * Gestion des comptes des établissements clients, depuis la console éditeur.
 *
 * Le filtre de rôle s'ouvre sur les responsables d'établissement : ce sont eux
 * que cet écran sert à administrer. Les autres rôles restent accessibles d'un
 * clic, sans quoi un compte créé ici disparaîtrait de la liste.
 *
 * La suppression est proposée mais reste l'exception : elle échoue côté serveur
 * dès que le compte a produit des données médicales, et la désactivation est
 * alors la bonne réponse.
 */

type SortColumn = 'fullName' | 'establishmentName' | 'role' | 'createdAt';
type PendingAction = { user: PlatformUser; kind: 'password' | 'delete' | 'edit' } | null;

export const AdminAccountsPanel: React.FC = () => {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('establishment_admin');
  const [editEstablishment, setEditEstablishment] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('establishment_admin');
  const [establishmentFilter, setEstablishmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sort, setSort] = useState<{ column: SortColumn; direction: 'asc' | 'desc' }>({
    column: 'createdAt',
    direction: 'desc',
  });

  const load = useCallback(async () => {
    try {
      const [accounts, orgs] = await Promise.all([listPlatformUsers(), listEstablishments()]);
      setUsers(accounts);
      setEstablishments(orgs);
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

  const run = async (userId: string, task: () => Promise<void>, message: string) => {
    setBusyId(userId);
    setError(null);
    setNotice(null);
    try {
      await task();
      await load();
      setNotice(message);
      setPending(null);
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (user: PlatformUser) => {
    setEditRole(user.role);
    setEditEstablishment(user.establishmentId ?? '');
    setPending({ user, kind: 'edit' });
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return users
      .filter((user) => roleFilter === 'all' || user.role === roleFilter)
      .filter((user) => establishmentFilter === 'all' || user.establishmentId === establishmentFilter)
      .filter(
        (user) =>
          statusFilter === 'all' ||
          (statusFilter === 'active' ? user.isActive : !user.isActive),
      )
      .filter(
        (user) =>
          needle === '' ||
          `${user.businessReference} ${user.fullName} ${user.email} ${user.username} ${user.phone} ${user.establishmentName}`
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => compareValues(a[sort.column], b[sort.column], sort.direction));
  }, [users, search, roleFilter, establishmentFilter, statusFilter, sort]);

  const handleSort = (column: SortColumn) => setSort((current) => nextSort(current, column));

  const selectClass =
    'w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-mora-blue';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
            <ShieldCheck className="h-5 w-5 shrink-0 text-mora-green" /> Gestion des Admins
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Comptes d&apos;administration des établissements clients : création, rôle, accès et
            mot de passe.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsCreateOpen(true)}
          className="w-full shrink-0 gap-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Nouvel administrateur
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          {notice}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un compte…"
          />
        </div>

        <select
          aria-label="Filtrer par rôle"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className={selectClass}
        >
          <option value="all">Tous les rôles</option>
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrer par établissement"
          value={establishmentFilter}
          onChange={(e) => setEstablishmentFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">Tous les établissements</option>
          {establishments.map((est) => (
            <option key={est.id} value={est.id}>
              {est.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrer par statut"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className={selectClass}
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Désactivés</option>
        </select>
      </div>

      {/* Vue mobile */}
      <div className="space-y-3 lg:hidden">
        {isLoading && <p className="py-8 text-center text-xs text-slate-500">Chargement…</p>}

        {!isLoading && visible.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">Aucun compte à afficher.</p>
        )}

        {visible.map((user) => (
          <article
            key={user.id}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold text-mora-green">
                  {user.businessReference}
                </p>
                <p className="truncate text-sm font-bold text-white">{user.fullName}</p>
                <p className="truncate text-xs text-slate-400">{user.establishmentName}</p>
              </div>
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  user.isActive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                {user.isActive ? 'Actif' : 'Désactivé'}
              </span>
            </div>

            <dl className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between gap-3">
                <dt>Rôle</dt>
                <dd className="text-right text-slate-200">{ROLE_LABELS[user.role]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Identifiant</dt>
                <dd className="truncate text-right font-mono text-slate-200">{user.username}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>E-mail</dt>
                <dd className="truncate text-right text-slate-200">{user.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Téléphone</dt>
                <dd className="text-right text-slate-200">{user.phone || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Créé le</dt>
                <dd className="text-right text-slate-200">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              <ActionButtons
                user={user}
                busy={busyId === user.id}
                onEdit={() => openEdit(user)}
                onPassword={() => setPending({ user, kind: 'password' })}
                onToggle={() =>
                  void run(
                    user.id,
                    () => updatePlatformUser(user.id, { is_active: !user.isActive }),
                    user.isActive ? 'Compte désactivé.' : 'Compte réactivé.',
                  )
                }
                onDelete={() => setPending({ user, kind: 'delete' })}
              />
            </div>
          </article>
        ))}
      </div>

      {/* Vue large */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="p-4">
                  Référence
                </th>
                <SortableHeader column="fullName" label="Nom" sort={sort} onSort={handleSort} />
                <SortableHeader
                  column="establishmentName"
                  label="Établissement"
                  sort={sort}
                  onSort={handleSort}
                />
                <th scope="col" className="p-4">
                  Identifiant
                </th>
                <th scope="col" className="p-4">
                  E-mail
                </th>
                <th scope="col" className="p-4">
                  Téléphone
                </th>
                <SortableHeader column="role" label="Rôle" sort={sort} onSort={handleSort} />
                <th scope="col" className="p-4">
                  Statut
                </th>
                <th scope="col" className="p-4">
                  Actions
                </th>
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
                    Aucun compte à afficher.
                  </td>
                </tr>
              )}

              {visible.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50">
                  <td className="whitespace-nowrap p-4 font-mono font-bold text-mora-green">
                    {user.businessReference}
                  </td>
                  <td className="p-4 font-bold text-white">{user.fullName}</td>
                  <td className="p-4">{user.establishmentName}</td>
                  <td className="p-4 font-mono">{user.username}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="whitespace-nowrap p-4">{user.phone || '—'}</td>
                  <td className="whitespace-nowrap p-4">{ROLE_LABELS[user.role]}</td>
                  <td className="p-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        user.isActive
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {user.isActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      <ActionButtons
                        user={user}
                        busy={busyId === user.id}
                        onEdit={() => openEdit(user)}
                        onPassword={() => setPending({ user, kind: 'password' })}
                        onToggle={() =>
                          void run(
                            user.id,
                            () => updatePlatformUser(user.id, { is_active: !user.isActive }),
                            user.isActive ? 'Compte désactivé.' : 'Compte réactivé.',
                          )
                        }
                        onDelete={() => setPending({ user, kind: 'delete' })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Création */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nouvel administrateur"
        description="Le compte d'authentification, le profil et les permissions du rôle sont créés en une seule opération."
        maxWidth="xl"
      >
        <AdminAccountForm
          establishments={establishments}
          onCancel={() => setIsCreateOpen(false)}
          onCreated={async () => {
            setIsCreateOpen(false);
            setNotice('Le compte a été créé.');
            await load();
          }}
        />
      </Modal>

      {/* Modification du rôle et de l'établissement */}
      <Modal
        isOpen={pending?.kind === 'edit'}
        onClose={() => setPending(null)}
        title="Modifier le compte"
        description={pending?.user.fullName}
      >
        {pending?.kind === 'edit' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-role" className="mb-1 block text-xs font-semibold text-slate-300">
                Rôle
              </label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className={selectClass}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="edit-est" className="mb-1 block text-xs font-semibold text-slate-300">
                Établissement
              </label>
              <select
                id="edit-est"
                value={editEstablishment}
                onChange={(e) => setEditEstablishment(e.target.value)}
                className={selectClass}
              >
                {establishments.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Le transfert d&apos;un compte vers un autre établissement change immédiatement les
                données auxquelles il accède.
              </p>
            </div>

            <Button
              variant="secondary"
              isLoading={busyId === pending.user.id}
              className="w-full py-2.5 font-bold"
              onClick={() =>
                void run(
                  pending.user.id,
                  () =>
                    updatePlatformUser(pending.user.id, {
                      role: editRole,
                      establishment_id: editEstablishment || null,
                    }),
                  'Le compte a été modifié.',
                )
              }
            >
              Enregistrer
            </Button>
          </div>
        )}
      </Modal>

      {/* Réinitialisation du mot de passe */}
      <Modal
        isOpen={pending?.kind === 'password'}
        onClose={() => setPending(null)}
        title="Réinitialiser le mot de passe"
        description={pending?.user.fullName}
      >
        {pending?.kind === 'password' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="new-pwd" className="mb-1 block text-xs font-semibold text-slate-300">
                Nouveau mot de passe
              </label>
              <input
                id="new-pwd"
                type="password"
                minLength={12}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-mora-blue"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                12 caractères minimum. Communiquez-le à son titulaire par un canal sûr.
              </p>
            </div>

            <Button
              variant="secondary"
              disabled={newPassword.length < 12}
              isLoading={busyId === pending.user.id}
              className="w-full py-2.5 font-bold"
              onClick={() =>
                void run(
                  pending.user.id,
                  () => updatePlatformUser(pending.user.id, { password: newPassword }),
                  'Le mot de passe a été réinitialisé.',
                )
              }
            >
              Réinitialiser
            </Button>
          </div>
        )}
      </Modal>

      {/* Suppression */}
      <Modal
        isOpen={pending?.kind === 'delete'}
        onClose={() => setPending(null)}
        title="Supprimer le compte"
        description={pending?.user.fullName}
      >
        {pending?.kind === 'delete' && (
          <div className="space-y-4">
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs leading-relaxed text-red-300">
              La suppression est définitive. Si ce compte a produit des données médicales ou
              comptables, l&apos;opération sera refusée : désactivez-le pour lui retirer tout accès
              sans détruire l&apos;historique.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                variant="danger"
                isLoading={busyId === pending.user.id}
                className="w-full py-2.5 font-bold sm:w-auto sm:px-8"
                onClick={() =>
                  void run(
                    pending.user.id,
                    () => deletePlatformUser(pending.user.id),
                    'Le compte a été supprimé.',
                  )
                }
              >
                Supprimer définitivement
              </Button>
              <Button
                variant="outline"
                onClick={() => setPending(null)}
                className="w-full py-2.5 sm:w-auto sm:px-6"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/** Actions d'une ligne. Extrait pour rester identique entre carte et tableau. */
const ActionButtons: React.FC<{
  user: PlatformUser;
  busy: boolean;
  onEdit: () => void;
  onPassword: () => void;
  onToggle: () => void;
  onDelete: () => void;
}> = ({ user, busy, onEdit, onPassword, onToggle, onDelete }) => {
  const base =
    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50';

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={onEdit}
        className={`${base} bg-slate-800 text-slate-200 hover:bg-slate-700`}
      >
        <UserCog className="h-3.5 w-3.5" /> Modifier
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onPassword}
        className={`${base} bg-slate-800 text-slate-200 hover:bg-slate-700`}
      >
        <KeyRound className="h-3.5 w-3.5" /> Mot de passe
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onToggle}
        className={`${base} ${
          user.isActive
            ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
            : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
        }`}
      >
        {user.isActive ? 'Désactiver' : 'Activer'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onDelete}
        className={`${base} bg-red-500/10 text-red-400 hover:bg-red-500/20`}
      >
        <Trash2 className="h-3.5 w-3.5" /> Supprimer
      </button>
    </>
  );
};
