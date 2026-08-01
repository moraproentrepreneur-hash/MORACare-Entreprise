'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  createEstablishment,
  listEstablishments,
  setEstablishmentActive,
} from '@/services/establishment.service';
import { recordAudit } from '@/services/audit.service';
import type { Establishment, EstablishmentType } from '@/types';

/**
 * Gestion des établissements clients (BP30 §4-5, UG01 §5-6).
 *
 * Les abonnements et licences sont administrés sur leur propre écran
 * (/admin/abonnements) : BP30 §3 les distingue de la gestion des établissements.
 *
 * Aucun revenu n'est affiché : la documentation ne fixe aucun tarif, un montant
 * y serait donc nécessairement inventé.
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

export const SuperAdminHub: React.FC = () => {
  const { user } = useAuth();

  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'clinique' as EstablishmentType,
    email: '',
    phone: '',
    city: '',
    country: 'Comores',
  });

  const load = useCallback(async () => {
    try {
      setEstablishments(await listEstablishments());
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
    try {
      await createEstablishment(form);
      await recordAudit(
        { action: 'establishment_created', entityName: 'establishments', newValues: { name: form.name } },
        null,
        user.id,
      );
      await load();
      setIsCreateOpen(false);
      setForm({ name: '', type: 'clinique', email: '', phone: '', city: '', country: 'Comores' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
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

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-mora-green" /> Établissements clients
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Création, suspension et réactivation des organisations utilisant MORACare.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nouvel établissement
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, référence ou ville…"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-mora-blue"
        />
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Nom</th>
                <th className="p-4">Type</th>
                <th className="p-4">Localisation</th>
                <th className="p-4">Créé le</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Aucun établissement client enregistré.
                  </td>
                </tr>
              )}

              {filtered.map((est) => (
                <tr key={est.id} className="hover:bg-slate-800/50">
                  <td className="p-4 font-mono text-mora-green font-bold">
                    {est.business_reference}
                  </td>
                  <td className="p-4 font-bold text-white">{est.name}</td>
                  <td className="p-4">{TYPE_LABELS[est.type] ?? est.type}</td>
                  <td className="p-4">{[est.city, est.country].filter(Boolean).join(', ')}</td>
                  <td className="p-4">{formatDate(est.created_at)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        est.is_active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {est.is_active ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => void handleToggle(est)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                    >
                      {est.is_active ? 'Suspendre' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Création d'un établissement client"
        description="L'abonnement et la licence se créent ensuite depuis Abonnements & Licences."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-slate-900 dark:text-slate-100">
          <div>
            <label className="block text-xs font-semibold mb-1">Nom de l&apos;établissement *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EstablishmentType })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              >
                {(Object.keys(TYPE_LABELS) as EstablishmentType[]).map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Ville</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Téléphone *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
            Créer l&apos;établissement
          </Button>
        </form>
      </Modal>
    </div>
  );
};
