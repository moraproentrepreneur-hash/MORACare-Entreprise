'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, KeyRound, RefreshCw, PauseCircle, PlayCircle, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { listEstablishments } from '@/services/establishment.service';
import {
  listPlans,
  listSubscriptions,
  listLicenses,
  createSubscription,
  setSubscriptionStatus,
  setLicenseStatus,
  renewSubscription,
  type SubscriptionPlan,
  type SubscriptionSummary,
  type LicenseSummary,
} from '@/services/subscription.service';
import { recordAudit } from '@/services/audit.service';
import type { Establishment } from '@/types';

/**
 * Administration des abonnements et licences SaaS (BP09, BP30).
 *
 * Réservé au Super Admin (BR-295). Les cinq formules affichées sont lues en
 * base, tarifs et limites compris : cet écran ne redéfinit rien, il montre ce
 * qui est réellement vendu.
 */

const SUB_LABELS: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  suspended: 'Suspendu',
  expired: 'Expiré',
  terminated: 'Résilié',
};

const LIC_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspendue',
  expired: 'Expirée',
  terminated: 'Résiliée',
};

const tone = (status: string): string =>
  status === 'active'
    ? 'bg-emerald-500/15 text-emerald-400'
    : status === 'pending'
      ? 'bg-amber-500/15 text-amber-400'
      : 'bg-red-500/15 text-red-400';

export const SaasSubscriptions: React.FC = () => {
  const { user } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [licenses, setLicenses] = useState<LicenseSummary[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ establishmentId: '', planId: '', activate: true });

  const load = useCallback(async () => {
    try {
      const [p, s, l, e] = await Promise.all([
        listPlans(),
        listSubscriptions(),
        listLicenses(),
        listEstablishments(),
      ]);
      setPlans(p);
      setSubscriptions(s);
      setLicenses(l);
      setEstablishments(e);
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

  const guard = async (action: () => Promise<void>, audit: { action: string; entity: string; id: string }) => {
    if (!user) return;
    setError(null);
    try {
      await action();
      await recordAudit(
        { action: audit.action, entityName: audit.entity, entityId: audit.id },
        null,
        user.id,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opération impossible.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.establishmentId || !form.planId) {
      setError('Sélectionnez un établissement et une formule.');
      return;
    }

    await guard(
      () =>
        createSubscription(
          {
            establishmentId: form.establishmentId,
            planId: form.planId,
            activateImmediately: form.activate,
          },
          user.id,
        ),
      { action: 'subscription_created', entity: 'subscriptions', id: form.establishmentId },
    );

    setIsCreateOpen(false);
    setForm({ establishmentId: '', planId: '', activate: true });
  };

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-mora-green" /> Abonnements & Licences
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Formules, abonnements et licences des établissements clients.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsCreateOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nouvel abonnement
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Formules commercialisées — tarifs et limites lus en base. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {plans.map((plan) => (
          <div key={plan.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <p className="text-sm font-black text-white">{plan.name}</p>
            <p className="mt-1 text-base font-bold text-mora-green">
              {plan.priceAmount === 0
                ? 'Gratuit'
                : `${new Intl.NumberFormat('fr-FR').format(plan.priceAmount)} ${plan.priceCurrency}`}
              {plan.billingPeriod === 'month' && (
                <span className="text-[10px] font-semibold text-slate-500"> / mois</span>
              )}
            </p>
            <div className="mt-3 space-y-1 text-[10px] text-slate-500">
              <p>
                Durée :{' '}
                <span className="text-slate-300">
                  {plan.durationDays ? `${plan.durationDays} jours` : 'Permanente'}
                </span>
              </p>
              <p>
                Utilisateurs :{' '}
                <span className="text-slate-300">{plan.maxUsers ?? 'Illimités'}</span>
              </p>
              <p>
                Enregistrements / module :{' '}
                <span className="text-slate-300">{plan.maxRecordsPerModule ?? 'Illimités'}</span>
              </p>
              {plan.isAutomatic && <p className="text-emerald-400">Création automatique</p>}
              {plan.requiresApproval && <p className="text-amber-400">Validation Super Admin</p>}
              {plan.requiresPayment && <p className="text-blue-400">Validation du paiement</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Abonnements */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-bold text-white text-sm">
          Abonnements des établissements clients
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold">
              <tr>
                <th className="p-3">Référence</th>
                <th className="p-3">Établissement</th>
                <th className="p-3">Formule</th>
                <th className="p-3">Début</th>
                <th className="p-3">Échéance</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Aucun abonnement enregistré.
                  </td>
                </tr>
              )}
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-mora-green font-bold">{sub.businessReference}</td>
                  <td className="p-3 font-bold text-white">{sub.establishmentName}</td>
                  <td className="p-3">{sub.planName}</td>
                  <td className="p-3">{formatDate(sub.startDate)}</td>
                  <td className="p-3">{sub.endDate ? formatDate(sub.endDate) : 'Permanent'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tone(sub.status)}`}>
                      {SUB_LABELS[sub.status] ?? sub.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        title="Renouveler de 365 jours"
                        onClick={() =>
                          void guard(() => renewSubscription(sub.id, 365, user!.id), {
                            action: 'subscription_renewed',
                            entity: 'subscriptions',
                            id: sub.id,
                          })
                        }
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      {sub.status === 'active' ? (
                        <button
                          title="Suspendre"
                          onClick={() =>
                            void guard(() => setSubscriptionStatus(sub.id, 'suspended', user!.id), {
                              action: 'subscription_suspended',
                              entity: 'subscriptions',
                              id: sub.id,
                            })
                          }
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          title="Activer"
                          onClick={() =>
                            void guard(() => setSubscriptionStatus(sub.id, 'active', user!.id), {
                              action: 'subscription_activated',
                              entity: 'subscriptions',
                              id: sub.id,
                            })
                          }
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Licences */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-bold text-white text-sm flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-mora-green" /> Licences
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold">
              <tr>
                <th className="p-3">Numéro</th>
                <th className="p-3">Établissement</th>
                <th className="p-3">Expiration</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {licenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Aucune licence enregistrée.
                  </td>
                </tr>
              )}
              {licenses.map((lic) => (
                <tr key={lic.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-mora-green font-bold">{lic.licenseNumber}</td>
                  <td className="p-3 font-bold text-white">{lic.establishmentName}</td>
                  <td className="p-3">{lic.expiresAt ? formatDate(lic.expiresAt) : 'Permanente'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${tone(lic.status)}`}>
                      {LIC_LABELS[lic.status] ?? lic.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {lic.status === 'active' ? (
                      <button
                        onClick={() =>
                          void guard(() => setLicenseStatus(lic.id, 'suspended', user!.id), {
                            action: 'license_suspended',
                            entity: 'licenses',
                            id: lic.id,
                          })
                        }
                        className="px-2.5 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[11px] font-semibold"
                      >
                        Suspendre
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          void guard(() => setLicenseStatus(lic.id, 'active', user!.id), {
                            action: 'license_reactivated',
                            entity: 'licenses',
                            id: lic.id,
                          })
                        }
                        className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold"
                      >
                        Réactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-[11px] text-slate-500 border-t border-slate-800">
          La suspension d&apos;une licence n&apos;entraîne jamais la suppression des données de
          l&apos;établissement.
        </p>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nouvel abonnement"
        description="Associer une formule officielle à un établissement client."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-slate-900 dark:text-slate-100">
          <div>
            <label className="block text-xs font-semibold mb-1">Établissement</label>
            <select
              required
              value={form.establishmentId}
              onChange={(e) => setForm({ ...form, establishmentId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            >
              <option value="">— Sélectionner —</option>
              {establishments.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Formule</label>
            <select
              required
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            >
              <option value="">— Sélectionner —</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.activate}
              onChange={(e) => setForm({ ...form, activate: e.target.checked })}
              className="rounded border-slate-600"
            />
            Activer immédiatement (sinon l&apos;abonnement reste « En attente »)
          </label>

          <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
            Créer l&apos;abonnement et la licence
          </Button>
        </form>
      </Modal>
    </div>
  );
};
