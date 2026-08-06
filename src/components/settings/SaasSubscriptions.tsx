'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Select } from '@/components/ui/Select';
import {
  ArrowLeftRight,
  CreditCard,
  History,
  KeyRound,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatDate } from '@/lib/utils';
import { listEstablishments } from '@/services/establishment.service';
import {
  listPlans,
  listSubscriptions,
  listLicenses,
  listSubscriptionHistory,
  createSubscription,
  changeSubscriptionPlan,
  setSubscriptionStatus,
  setLicenseStatus,
  renewSubscription,
  describeRemaining,
  EVENT_LABELS,
  HEALTH_LABELS,
  HEALTH_TONES,
  type SubscriptionHistoryEntry,
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

/** Durées proposées : de 1 à 12 mois, sans mention tarifaire. */
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: index === 0 ? '1 mois' : `${index + 1} mois`,
}));

export const SaasSubscriptions: React.FC = () => {
  const { user } = useAuth();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [licenses, setLicenses] = useState<LicenseSummary[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    establishmentId: '',
    planId: '',
    durationMonths: '1',
    activate: true,
  });

  /** Abonnement en cours de modification, et nature de l'action demandée. */
  const [pending, setPending] = useState<
    { kind: 'plan' | 'renew' | 'history'; subscription: SubscriptionSummary } | null
  >(null);
  const [planChange, setPlanChange] = useState({ planId: '', durationMonths: '1', restart: true });
  const [renewMonths, setRenewMonths] = useState('12');
  const [history, setHistory] = useState<SubscriptionHistoryEntry[]>([]);
  const [isBusy, setIsBusy] = useState(false);

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

  /** Une formule à 0 KMF n'a ni durée à choisir ni échéance à calculer. */
  const selectedPlanIsPaid = plans.find((plan) => plan.id === form.planId)?.priceAmount
    ? true
    : false;

  const openPlanChange = (subscription: SubscriptionSummary) => {
    setPlanChange({
      planId: subscription.planId,
      durationMonths: String(subscription.durationMonths ?? 1),
      restart: true,
    });
    setPending({ kind: 'plan', subscription });
  };

  const openRenewal = (subscription: SubscriptionSummary) => {
    setRenewMonths('12');
    setPending({ kind: 'renew', subscription });
  };

  const openHistory = async (subscription: SubscriptionSummary) => {
    setPending({ kind: 'history', subscription });
    setHistory([]);
    try {
      setHistory(await listSubscriptionHistory(subscription.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Historique indisponible.');
    }
  };

  const run = async (
    action: () => Promise<void>,
    audit: { action: string; entity: string; id: string },
  ) => {
    setIsBusy(true);
    try {
      await guard(action, audit);
      setPending(null);
    } finally {
      setIsBusy(false);
    }
  };

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
            // La durée n'a de sens que pour une formule payante : l'essai porte
            // la sienne en jours, et le plan gratuit n'expire pas.
            durationMonths: selectedPlanIsPaid ? Number(form.durationMonths) : null,
            activateImmediately: form.activate,
          },
          user.id,
        ),
      { action: 'subscription_created', entity: 'subscriptions', id: form.establishmentId },
    );

    setIsCreateOpen(false);
    setForm({ establishmentId: '', planId: '', durationMonths: '1', activate: true });
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
                <th className="p-3">Temps restant</th>
                <th className="p-3">État</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Aucun abonnement enregistré.
                  </td>
                </tr>
              )}
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-mora-green font-bold">{sub.businessReference}</td>
                  <td className="p-3 font-bold text-white">{sub.establishmentName}</td>
                  <td className="p-3">
                    {sub.planName}
                    {sub.durationMonths && (
                      <span className="block text-[10px] text-slate-500">
                        {sub.durationMonths} mois
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3">{formatDate(sub.startDate)}</td>
                  <td className="whitespace-nowrap p-3">
                    {sub.endDate ? formatDate(sub.endDate) : 'Permanent'}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <span
                      className={
                        sub.health === 'expired'
                          ? 'text-red-400'
                          : sub.health === 'expiring_soon'
                            ? 'text-amber-400'
                            : 'text-slate-300'
                      }
                    >
                      {describeRemaining(sub.endDate)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${HEALTH_TONES[sub.health]}`}
                    >
                      {HEALTH_LABELS[sub.health]}
                    </span>
                  </td>
                  <td className="p-3">
                    <ActionMenu
                      label={`Actions pour ${sub.establishmentName}`}
                      items={[
                        {
                          label: 'Changer de formule',
                          icon: ArrowLeftRight,
                          onSelect: () => openPlanChange(sub),
                        },
                        {
                          label: 'Prolonger',
                          icon: RefreshCw,
                          onSelect: () => openRenewal(sub),
                        },
                        {
                          label: 'Voir l’historique',
                          icon: History,
                          onSelect: () => void openHistory(sub),
                        },
                        sub.status === 'active'
                          ? {
                              label: "Suspendre l'abonnement",
                              icon: PauseCircle,
                              destructive: true,
                              onSelect: () =>
                                void guard(
                                  () => setSubscriptionStatus(sub.id, 'suspended', user!.id),
                                  {
                                    action: 'subscription_suspended',
                                    entity: 'subscriptions',
                                    id: sub.id,
                                  },
                                ),
                            }
                          : {
                              label: "Activer l'abonnement",
                              icon: PlayCircle,
                              onSelect: () =>
                                void guard(
                                  () => setSubscriptionStatus(sub.id, 'active', user!.id),
                                  {
                                    action: 'subscription_activated',
                                    entity: 'subscriptions',
                                    id: sub.id,
                                  },
                                ),
                            },
                      ]}
                    />
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
                    <ActionMenu
                      label={`Actions pour la licence ${lic.licenseNumber}`}
                      items={[
                        lic.status === 'active'
                          ? {
                              label: 'Suspendre la licence',
                              icon: PauseCircle,
                              destructive: true,
                              onSelect: () =>
                                void guard(() => setLicenseStatus(lic.id, 'suspended', user!.id), {
                                  action: 'license_suspended',
                                  entity: 'licenses',
                                  id: lic.id,
                                }),
                            }
                          : {
                              label: 'Réactiver la licence',
                              icon: PlayCircle,
                              onSelect: () =>
                                void guard(() => setLicenseStatus(lic.id, 'active', user!.id), {
                                  action: 'license_reactivated',
                                  entity: 'licenses',
                                  id: lic.id,
                                }),
                            },
                      ]}
                    />
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
            <Select
              required
              value={form.establishmentId}
              onChange={(value) => setForm({ ...form, establishmentId: value })}
              placeholder="— Sélectionner —"
              options={establishments.map((est) => (
                ({ value: est.id, label: est.name })
              ))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Formule</label>
            <Select
              required
              value={form.planId}
              onChange={(value) => setForm({ ...form, planId: value })}
              placeholder="— Sélectionner —"
              options={plans.map((plan) => (
                ({ value: plan.id, label: plan.name })
              ))}
            />
          </div>

          {/* La durée ne concerne que les formules payantes : l'essai a la
              sienne, en jours, et le plan gratuit n'expire pas. */}
          {selectedPlanIsPaid && (
            <div>
              <label className="block text-xs font-semibold mb-1">Durée</label>
              <Select
                value={form.durationMonths}
                onChange={(value) => setForm({ ...form, durationMonths: value })}
                options={MONTH_OPTIONS}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                L&apos;échéance est calculée à partir de cette durée.
              </p>
            </div>
          )}

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

      {/* ---------------------- Changement de formule ---------------------- */}
      <Modal
        isOpen={pending?.kind === 'plan'}
        onClose={() => setPending(null)}
        title="Changer de formule"
        description={pending?.subscription.establishmentName}
        maxWidth="xl"
      >
        {pending?.kind === 'plan' && (
          <div className="space-y-4">
            <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 text-xs">
              <InfoRow label="Formule actuelle" value={pending.subscription.planName} />
              <InfoRow
                label="Échéance actuelle"
                value={
                  pending.subscription.endDate
                    ? formatDate(pending.subscription.endDate)
                    : 'Permanente'
                }
              />
            </dl>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Nouvelle formule
              </label>
              <Select
                value={planChange.planId}
                onChange={(value) => setPlanChange({ ...planChange, planId: value })}
                options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-950 p-3 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={planChange.restart}
                onChange={(e) => setPlanChange({ ...planChange, restart: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-mora-green"
              />
              <span>
                Démarrer une nouvelle période à compter d&apos;aujourd&apos;hui.
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Décoché, l&apos;échéance en cours est conservée : le client ne perd pas les jours
                  déjà réglés.
                </span>
              </span>
            </label>

            {planChange.restart && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Durée de la nouvelle période
                </label>
                <Select
                  value={planChange.durationMonths}
                  onChange={(value) => setPlanChange({ ...planChange, durationMonths: value })}
                  options={MONTH_OPTIONS}
                />
              </div>
            )}

            <p className="rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-400">
              Le changement est historisé, et la licence reprend automatiquement le plafond
              d&apos;utilisateurs et le stockage de la nouvelle formule. Aucune donnée de
              l&apos;établissement n&apos;est supprimée.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                variant="secondary"
                isLoading={isBusy}
                className="w-full py-2.5 font-bold sm:w-auto sm:px-8"
                onClick={() =>
                  void run(
                    () =>
                      changeSubscriptionPlan(
                        {
                          subscriptionId: pending.subscription.id,
                          planId: planChange.planId,
                          durationMonths: planChange.restart
                            ? Number(planChange.durationMonths)
                            : null,
                          restartPeriod: planChange.restart,
                        },
                        user!.id,
                      ),
                    {
                      action: 'subscription_plan_changed',
                      entity: 'subscriptions',
                      id: pending.subscription.id,
                    },
                  )
                }
              >
                Appliquer la nouvelle formule
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

      {/* -------------------------- Prolongation --------------------------- */}
      <Modal
        isOpen={pending?.kind === 'renew'}
        onClose={() => setPending(null)}
        title="Prolonger l'abonnement"
        description={pending?.subscription.establishmentName}
      >
        {pending?.kind === 'renew' && (
          <div className="space-y-4">
            <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 text-xs">
              <InfoRow label="Formule" value={pending.subscription.planName} />
              <InfoRow
                label="Échéance actuelle"
                value={
                  pending.subscription.endDate
                    ? formatDate(pending.subscription.endDate)
                    : 'Permanente'
                }
              />
              <InfoRow label="Temps restant" value={describeRemaining(pending.subscription.endDate)} />
            </dl>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Prolonger de
              </label>
              <Select
                value={renewMonths}
                onChange={setRenewMonths}
                options={MONTH_OPTIONS}
              />
            </div>

            <p className="rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-400">
              La prolongation part de l&apos;échéance en cours si elle est future, sinon
              d&apos;aujourd&apos;hui. Aucune donnée n&apos;est supprimée, aucune configuration
              n&apos;est perdue.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                variant="secondary"
                isLoading={isBusy}
                className="w-full py-2.5 font-bold sm:w-auto sm:px-8"
                onClick={() =>
                  void run(
                    () =>
                      renewSubscription(pending.subscription.id, Number(renewMonths), user!.id),
                    {
                      action: 'subscription_renewed',
                      entity: 'subscriptions',
                      id: pending.subscription.id,
                    },
                  )
                }
              >
                Prolonger
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

      {/* --------------------------- Historique ---------------------------- */}
      <Modal
        isOpen={pending?.kind === 'history'}
        onClose={() => setPending(null)}
        title="Historique de l'abonnement"
        description={pending?.subscription.establishmentName}
        maxWidth="xl"
      >
        {pending?.kind === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">Aucun événement enregistré.</p>
            ) : (
              <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
                {history.map((entry) => (
                  <li key={entry.id} className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">
                        {EVENT_LABELS[entry.eventType] ?? entry.eventType}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDate(entry.createdAt)}
                      </span>
                    </div>

                    {entry.previousPlanName !== entry.newPlanName && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {entry.previousPlanName ?? '—'} → {entry.newPlanName ?? '—'}
                      </p>
                    )}

                    {entry.previousStatus !== entry.newStatus && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Statut : {SUB_LABELS[entry.previousStatus ?? ''] ?? entry.previousStatus ?? '—'}{' '}
                        → {SUB_LABELS[entry.newStatus ?? ''] ?? entry.newStatus ?? '—'}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-slate-500">
              L&apos;historique est écrit automatiquement et ne peut être ni modifié ni supprimé.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 p-3">
    <dt className="text-slate-400">{label}</dt>
    <dd className="text-right font-semibold text-slate-200">{value}</dd>
  </div>
);
