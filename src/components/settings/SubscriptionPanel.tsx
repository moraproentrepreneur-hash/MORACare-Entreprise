'use client';

import React from 'react';
import { CreditCard, KeyRound, CalendarClock, Users, HardDrive, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate } from '@/lib/utils';

/**
 * Abonnement et licence de l'établissement (UG02 §17, BP09, BP30 §8).
 *
 * Consultation seule : BP30 BR-295 réserve l'administration des abonnements et
 * des licences aux administrateurs de MORA Shawiri.
 *
 * Aucune référence documentaire interne n'apparaît à l'écran : ces repères
 * servent au développement, pas à l'utilisateur.
 */

const SUBSCRIPTION_LABELS: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  suspended: 'Suspendu',
  expired: 'Expiré',
  terminated: 'Résilié',
};

const LICENSE_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspendue',
  expired: 'Expirée',
  terminated: 'Résiliée',
};

const toneFor = (status: string): string =>
  status === 'active'
    ? 'bg-emerald-500/15 text-emerald-400'
    : status === 'pending'
      ? 'bg-amber-500/15 text-amber-400'
      : 'bg-red-500/15 text-red-400';

export const SubscriptionPanel: React.FC = () => {
  const { subscription, license } = usePermissions();

  if (!subscription && !license) {
    return (
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <h3 className="text-base font-bold text-white">Abonnement & Licence</h3>
        <p className="text-xs text-slate-400">
          Aucun abonnement n&apos;est enregistré pour cet établissement. Chaque établissement doit
          disposer d&apos;une formule : contactez MORA Shawiri.
        </p>
      </div>
    );
  }

  const daysLeft = subscription?.endDate
    ? Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="space-y-4">
      {subscription && (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-mora-green" /> Abonnement
            </h3>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${toneFor(subscription.status)}`}
            >
              {SUBSCRIPTION_LABELS[subscription.status] ?? subscription.status}
            </span>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400">Formule souscrite</p>
              <p className="text-white font-bold text-sm mt-1">{subscription.planName || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400">Date de début</p>
              <p className="text-white font-bold text-sm mt-1">{formatDate(subscription.startDate)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> Échéance
              </p>
              <p className="text-white font-bold text-sm mt-1">
                {subscription.endDate ? formatDate(subscription.endDate) : 'Permanent'}
              </p>
            </div>
          </div>

          {daysLeft !== null && daysLeft <= 30 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-200/90">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                {daysLeft > 0
                  ? `Votre abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.`
                  : 'Votre abonnement est arrivé à échéance.'}{' '}
                Contactez MORA Shawiri pour le renouveler — aucune donnée n&apos;est supprimée.
              </span>
            </div>
          )}

          {/* Toutes les formules donnent accès à tous les modules : lister leurs
              codes n'apporterait rien. Seule l'activation, gérée dans l'onglet
              Modules, distingue un établissement d'un autre. */}
          <p className="text-[11px] text-slate-400">
            Tous les modules sont inclus dans votre formule. Leur activation se règle depuis
            l&apos;onglet <span className="text-slate-200 font-semibold">Modules</span>.
          </p>
        </div>
      )}

      {license && (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-mora-green" /> Licence
            </h3>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${toneFor(license.status)}`}
            >
              {LICENSE_LABELS[license.status] ?? license.status}
            </span>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400">Numéro</p>
              <p className="text-mora-green font-mono font-bold text-sm mt-1">
                {license.licenseNumber}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400">Expiration</p>
              <p className="text-white font-bold text-sm mt-1">
                {license.expiresAt ? formatDate(license.expiresAt) : 'Permanente'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3" /> Utilisateurs max.
              </p>
              <p className="text-white font-bold text-sm mt-1">
                {license.maxUsers ?? 'Non limité'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3 h-3" /> Stockage
              </p>
              <p className="text-white font-bold text-sm mt-1">
                {license.storageMb ? `${license.storageMb} Mo` : 'Non défini'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
