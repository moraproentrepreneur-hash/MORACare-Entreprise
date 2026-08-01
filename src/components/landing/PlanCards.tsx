'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  X,
  Sparkles,
  Users,
  HeartPulse,
  HardDrive,
  Headphones,
  DatabaseBackup,
  Archive,
  AlertCircle,
} from 'lucide-react';
import { listPublicPlans, type PublicPlan } from '@/services/subscription.service';

/**
 * Cartes des formules d'abonnement.
 *
 * Entièrement pilotées par la base : nom, tarif, période de facturation,
 * modules inclus, quotas, avantages, limitations et libellé du bouton
 * proviennent tous de `subscription_plans`. Modifier une offre ne demande
 * aucun redéploiement.
 *
 * Note de conformité : LP-001 §7 indiquait « Ne pas afficher de prix ». Les
 * tarifs officiels ayant été arrêtés par l'éditeur, ils sont désormais
 * affichés — cet écart avec LP-001 §7 est signalé dans le rapport de phase.
 */

interface PlanCardsProps {
  onSelectPlan: (planName: string) => void;
}

const formatPrice = (amount: number, currency: string): string =>
  amount === 0 ? 'Gratuit' : `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`;

const formatPeriod = (plan: PublicPlan): string => {
  if (plan.billingPeriod === 'month') return 'par mois';
  if (plan.durationDays) return `pour ${plan.durationDays} jours`;
  return 'sans engagement';
};

const formatQuota = (value: number | null, suffix: string): string =>
  value === null ? `${suffix} illimités` : `${new Intl.NumberFormat('fr-FR').format(value)} ${suffix}`;

const formatStorage = (mb: number | null): string => {
  if (mb === null) return 'Stockage illimité';
  return mb >= 1024 ? `${Math.round(mb / 1024)} Go de stockage` : `${mb} Mo de stockage`;
};

const formatRetention = (days: number | null): string => {
  if (days === null) return 'Conservation non définie';
  if (days >= 365) {
    const years = Math.round(days / 365);
    return `Conservation ${years} an${years > 1 ? 's' : ''}`;
  }
  return `Conservation ${days} jours`;
};

export const PlanCards: React.FC<PlanCardsProps> = ({ onSelectPlan }) => {
  const prefersReducedMotion = useReducedMotion();
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    listPublicPlans()
      .then((result) => {
        if (!cancelled) setPlans(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Chargement des formules impossible.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[30rem] rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || plans.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200/90">
          <p className="font-bold">Nos formules ne sont pas disponibles pour le moment.</p>
          <p className="mt-1 text-xs">
            Contactez MORA Shawiri pour obtenir le détail des offres et un devis personnalisé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
      {plans.map((plan, index) => (
        <motion.article
          key={plan.id}
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, delay: index * 0.07 }}
          whileHover={prefersReducedMotion ? undefined : { y: -6 }}
          className={`relative flex flex-col rounded-3xl border p-6 transition-shadow ${
            plan.isFeatured
              ? 'border-mora-green bg-white dark:bg-slate-900 shadow-xl shadow-mora-green/15 ring-1 ring-mora-green/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-lg'
          }`}
        >
          {plan.isFeatured && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-mora-green text-white text-[10px] font-black uppercase tracking-wider shadow-md">
              <Sparkles className="w-3 h-3" /> Recommandé
            </span>
          )}

          {/* Nom, prix et période de facturation */}
          <header>
            <h3 className="text-lg font-black">{plan.name}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 min-h-[2.5rem] leading-relaxed">
              {plan.description}
            </p>

            <div className="mt-4">
              <span className="text-3xl font-black tracking-tight text-mora-blue dark:text-white">
                {formatPrice(plan.priceAmount, plan.priceCurrency)}
              </span>
              <span className="block mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {formatPeriod(plan)}
              </span>
            </div>
          </header>

          {/* Quotas et services — exploités automatiquement par le système */}
          <ul className="mt-5 space-y-2 border-y border-slate-100 dark:border-slate-800 py-4">
            {[
              { icon: Users, text: formatQuota(plan.maxUsers, 'utilisateurs') },
              { icon: HeartPulse, text: formatQuota(plan.maxPatients, 'patients') },
              { icon: HardDrive, text: formatStorage(plan.storageMb) },
              { icon: Headphones, text: plan.supportLevel ?? 'Support non défini' },
              { icon: DatabaseBackup, text: `Sauvegarde ${(plan.backupFrequency ?? '—').toLowerCase()}` },
              { icon: Archive, text: formatRetention(plan.retentionDays) },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.text} className="flex items-start gap-2 text-[11px]">
                  <Icon className="w-3.5 h-3.5 text-mora-blue dark:text-mora-green shrink-0 mt-0.5" />
                  <span className="text-slate-600 dark:text-slate-300">{row.text}</span>
                </li>
              );
            })}
          </ul>

          {/* Avantages */}
          {plan.highlights.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Avantages
              </p>
              <ul className="mt-2 space-y-1.5">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px]">
                    <Check className="w-3.5 h-3.5 text-mora-green shrink-0 mt-0.5" />
                    <span className="text-slate-700 dark:text-slate-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Modules inclus */}
          {plan.moduleNames.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Modules inclus ({plan.moduleNames.length})
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {plan.moduleNames.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded-md bg-mora-light dark:bg-slate-800 text-[9px] font-semibold text-slate-600 dark:text-slate-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Limitations */}
          {plan.limitations.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Limitations
              </p>
              <ul className="mt-2 space-y-1.5">
                {plan.limitations.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[11px]">
                    <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-slate-500 dark:text-slate-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => onSelectPlan(plan.name)}
            className={`mt-6 w-full py-2.5 rounded-xl text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              plan.isFeatured
                ? 'bg-mora-green text-white shadow-lg shadow-mora-green/25 hover:bg-mora-green/90 focus-visible:ring-mora-green'
                : 'border border-mora-blue/25 dark:border-white/20 text-mora-blue dark:text-white hover:bg-mora-blue/5 dark:hover:bg-white/10 focus-visible:ring-mora-blue'
            }`}
          >
            {plan.ctaLabel ?? 'Demander une démonstration'}
          </button>
        </motion.article>
      ))}
    </div>
  );
};
