'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Search, ShieldAlert, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { AdminAccountForm } from '@/components/admin/AdminAccountForm';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  createEstablishment,
  listEstablishments,
  setEstablishmentActive,
} from '@/services/establishment.service';
import { listEstablishmentsWithAdmin } from '@/services/platform-admin.service';
import { recordAudit } from '@/services/audit.service';
import type { Establishment, EstablishmentType } from '@/types';

/**
 * Gestion des établissements clients (BP30 §4-5, UG01 §5-6).
 *
 * La création se fait en deux temps, volontairement enchaînés : l'établissement,
 * puis son administrateur. Un établissement sans administrateur ne peut recevoir
 * personne — aucun compte ne peut y être créé, aucun paramètre réglé. Les
 * établissements qui se trouvent dans cet état sont signalés dans la liste tant
 * qu'ils n'en ont pas.
 *
 * Les abonnements et licences sont administrés sur leur propre écran
 * (/admin/abonnements) : BP30 §3 les distingue de la gestion des établissements.
 */

const TYPE_LABELS: Record<EstablishmentType, string> = {
  cabinet: 'Cabinet médical',
  clinique: 'Clinique',
  centre_medical: 'Centre médical',
  hopital: 'Hôpital',
  laboratoire: 'Laboratoire',
  imagerie: "Centre d'imagerie",
  ong: 'ONG médicale',
};

const EMPTY_FORM = {
  name: '',
  type: 'clinique' as EstablishmentType,
  email: '',
  phone: '',
  city: '',
  country: 'Comores',
};

export const SuperAdminHub: React.FC = () => {
  const { user } = useAuth();

  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [withAdmin, setWithAdmin] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  /** Établissement dont on crée l'administrateur, s'il y en a un en cours. */
  const [adminTarget, setAdminTarget] = useState<Establishment | null>(null);
  /** Vrai lorsque l'étape suit immédiatement une création d'établissement. */
  const [isChainedStep, setIsChainedStep] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    try {
      const [orgs, admins] = await Promise.all([
        listEstablishments(),
        listEstablishmentsWithAdmin(),
      ]);
      setEstablishments(orgs);
      setWithAdmin(admins);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setNotice(null);
    setIsSaving(true);
    try {
      const created = await createEstablishment(form);
      await recordAudit(
        {
          action: 'establishment_created',
          entityName: 'establishments',
          entityId: created.id,
          newValues: { name: created.name },
        },
        null,
        user.id,
      );
      await load();
      setIsCreateOpen(false);
      setForm(EMPTY_FORM);

      // Enchaînement immédiat : l'établissement existe, il lui faut un
      // administrateur avant que quiconque puisse s'en servir.
      setAdminTarget(created);
      setIsChainedStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (est: Establishment) => {
    if (!user) return;
    setError(null);
    try {
      await setEstablishmentActive(est.id, !est.is_active);
      await recordAudit(
        {
          action: est.is_active ? 'establishment_suspended' : 'establishment_reactivated',
          entityName: 'establishments',
          entityId: est.id,
        },
        null,
        user.id,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  const filtered = establishments.filter((est) =>
    `${est.name} ${est.business_reference} ${est.city ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const orphanCount = establishments.filter((est) => !withAdmin.has(est.id)).length;

  const fieldClass =
    'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-mora-blue';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
            <Building2 className="h-5 w-5 shrink-0 text-mora-green" /> Établissements clients
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Création, suspension et réactivation des organisations utilisant MORACare.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setIsCreateOpen(true)}
          className="w-full shrink-0 gap-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Nouvel établissement
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

      {!isLoading && orphanCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200/90">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span>
            {orphanCount === 1
              ? "Un établissement n'a pas d'administrateur actif"
              : `${orphanCount} établissements n'ont pas d'administrateur actif`}{' '}
            : personne ne peut s&apos;y connecter tant que ce compte n&apos;est pas créé.
          </span>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, référence ou ville…"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-mora-blue"
        />
      </div>

      {/* Vue mobile */}
      <div className="space-y-3 lg:hidden">
        {isLoading && <p className="py-8 text-center text-xs text-slate-500">Chargement…</p>}

        {!isLoading && filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">
            Aucun établissement client enregistré.
          </p>
        )}

        {filtered.map((est) => (
          <article
            key={est.id}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold text-mora-green">
                  {est.business_reference}
                </p>
                <p className="truncate text-sm font-bold text-white">{est.name}</p>
                <p className="truncate text-xs text-slate-400">
                  {TYPE_LABELS[est.type] ?? est.type}
                </p>
              </div>
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                  est.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {est.is_active ? 'Actif' : 'Suspendu'}
              </span>
            </div>

            <dl className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between gap-3">
                <dt>Localisation</dt>
                <dd className="text-right text-slate-200">
                  {[est.city, est.country].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Créé le</dt>
                <dd className="text-right text-slate-200">{formatDate(est.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Administrateur</dt>
                <dd className="text-right">
                  <AdminState hasAdmin={withAdmin.has(est.id)} />
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2">
              {!withAdmin.has(est.id) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsChainedStep(false);
                    setAdminTarget(est);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-mora-green px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-mora-green/90"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Créer l&apos;administrateur
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleToggle(est)}
                className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
              >
                {est.is_active ? 'Suspendre' : 'Réactiver'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Vue large */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" className="p-4">
                  Référence
                </th>
                <th scope="col" className="p-4">
                  Nom
                </th>
                <th scope="col" className="p-4">
                  Type
                </th>
                <th scope="col" className="p-4">
                  Localisation
                </th>
                <th scope="col" className="p-4">
                  Créé le
                </th>
                <th scope="col" className="p-4">
                  Administrateur
                </th>
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
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Aucun établissement client enregistré.
                  </td>
                </tr>
              )}

              {filtered.map((est) => (
                <tr key={est.id} className="hover:bg-slate-800/50">
                  <td className="whitespace-nowrap p-4 font-mono font-bold text-mora-green">
                    {est.business_reference}
                  </td>
                  <td className="p-4 font-bold text-white">{est.name}</td>
                  <td className="p-4">{TYPE_LABELS[est.type] ?? est.type}</td>
                  <td className="p-4">{[est.city, est.country].filter(Boolean).join(', ')}</td>
                  <td className="whitespace-nowrap p-4">{formatDate(est.created_at)}</td>
                  <td className="p-4">
                    <AdminState hasAdmin={withAdmin.has(est.id)} />
                  </td>
                  <td className="p-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                        est.is_active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {est.is_active ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {!withAdmin.has(est.id) && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsChainedStep(false);
                            setAdminTarget(est);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-mora-green px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-mora-green/90"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Administrateur
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleToggle(est)}
                        className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        {est.is_active ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Étape 1 — l'établissement */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Création d'un établissement client"
        description="Étape 1 sur 2 — son administrateur est créé juste après."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="est-name" className="mb-1 block text-xs font-semibold text-slate-300">
              Nom de l&apos;établissement *
            </label>
            <input
              id="est-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="est-type" className="mb-1 block text-xs font-semibold text-slate-300">
                Type
              </label>
              <select
                id="est-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EstablishmentType })}
                className={fieldClass}
              >
                {(Object.keys(TYPE_LABELS) as EstablishmentType[]).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="est-city" className="mb-1 block text-xs font-semibold text-slate-300">
                Ville
              </label>
              <input
                id="est-city"
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="est-email" className="mb-1 block text-xs font-semibold text-slate-300">
                Email *
              </label>
              <input
                id="est-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="est-phone" className="mb-1 block text-xs font-semibold text-slate-300">
                Téléphone *
              </label>
              <input
                id="est-phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            className="w-full py-2.5 font-bold"
          >
            Créer et continuer
          </Button>
        </form>
      </Modal>

      {/* Étape 2 — son administrateur */}
      <Modal
        isOpen={adminTarget !== null}
        onClose={() => setAdminTarget(null)}
        title="Administrateur de l'établissement"
        description={
          isChainedStep
            ? 'Étape 2 sur 2 — sans ce compte, personne ne peut se connecter à cet établissement.'
            : "Ce compte donnera accès à l'établissement et permettra d'y créer les autres utilisateurs."
        }
        maxWidth="xl"
      >
        {adminTarget && (
          <AdminAccountForm
            establishments={establishments}
            lockedEstablishment={adminTarget}
            defaultRole="establishment_admin"
            submitLabel="Créer l'administrateur"
            onCancel={() => setAdminTarget(null)}
            onCreated={async () => {
              setNotice(`L'administrateur de ${adminTarget.name} a été créé.`);
              setAdminTarget(null);
              await load();
            }}
          />
        )}
      </Modal>
    </div>
  );
};

/** État « a un administrateur » d'un établissement, sous forme de pastille. */
const AdminState: React.FC<{ hasAdmin: boolean }> = ({ hasAdmin }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
      hasAdmin ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
    }`}
  >
    {hasAdmin ? 'Rattaché' : 'Manquant'}
  </span>
);
