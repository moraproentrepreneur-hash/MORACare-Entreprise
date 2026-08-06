'use client';

import React from 'react';
import {
  CreditCard,
  KeyRound,
  CalendarClock,
  Hourglass,
  Users,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import {
  HEALTH_LABELS,
  HEALTH_TONES,
  daysRemaining,
  describeRemaining,
  healthOf,
  monthsRemaining,
} from '@/services/subscription.service';
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

  /*
   * L'état affiché est calculé par la même fonction que côté Super Admin.
   * Les deux interfaces disent donc exactement la même chose : se contredire
   * sur l'échéance d'un contrat serait le plus sûr moyen de perdre la confiance
   * du client.
   */
  const health = subscription ? healthOf(subscription.status, subscription.endDate) : null;
  const daysLeft = subscription ? daysRemaining(subscription.endDate) : null;
  const monthsLeft = subscription ? monthsRemaining(subscription.endDate) : null;

  return (
    <div className="space-y-4">
      {subscription && health && (
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-mora-green" /> Abonnement
            </h3>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${HEALTH_TONES[health]}`}
            >
              {HEALTH_LABELS[health]}
            </span>
          </div>

          <div className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400 flex items-center gap-1">
                <Hourglass className="w-3 h-3" /> Temps restant
              </p>
              <p
                className={`mt-1 text-sm font-bold ${
                  health === 'expired'
                    ? 'text-red-400'
                    : health === 'expiring_soon'
                      ? 'text-amber-400'
                      : 'text-white'
                }`}
              >
                {describeRemaining(subscription.endDate)}
              </p>
              {monthsLeft !== null && monthsLeft > 0 && daysLeft !== null && daysLeft > 30 && (
                <p className="mt-0.5 text-[11px] text-slate-500">
                  soit {monthsLeft} mois plein{monthsLeft > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {(health === 'expiring_soon' || health === 'expired') && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-200/90">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                {health === 'expired'
                  ? 'Votre abonnement est arrivé à échéance.'
                  : `Votre abonnement expire dans ${daysLeft} jour${(daysLeft ?? 0) > 1 ? 's' : ''}.`}{' '}
                Contactez MORA Shawiri pour le renouveler — aucune donnée n&apos;est supprimée.
              </span>
            </div>
          )}

          {health === 'suspended' && (
            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-start gap-2 text-[11px] text-orange-200/90">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
              <span>
                Votre abonnement est suspendu. Vos données restent intactes : contactez MORA
                Shawiri pour rétablir l&apos;accès.
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
