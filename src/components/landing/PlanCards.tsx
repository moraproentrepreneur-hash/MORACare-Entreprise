'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles, Users, Layers, Clock, ShieldCheck } from 'lucide-react';
import { listPublicPlans, type PublicPlan } from '@/services/subscription.service';
import { FALLBACK_PLANS, type FallbackPlan } from './landing-content';

/**
 * Cartes des formules d'abonnement.
 *
 * Volontairement courtes : elles n'affichent que les limites commerciales —
 * durée, utilisateurs, enregistrements par module. La liste des modules a été
 * retirée car tous les modules sont désormais inclus dans chaque formule ;
 * leur activation relève des Paramètres de l'établissement.
 *
 * Le contenu vient de la base : modifier une offre ne demande aucun
 * redéploiement. En cas d'indisponibilité, les valeurs officielles prennent
 * le relais — une page commerciale ne doit jamais rester sans tarifs.
 */

interface PlanCardsProps {
  /**
   * Reçoit la formule entière, pas son seul nom : le formulaire qui s'ouvre
   * doit connaître son tarif et ses limites sans avoir à les rechercher.
   */
  onSelectPlan: (plan: DisplayPlan) => void;
}

export type DisplayPlan = FallbackPlan | PublicPlan;

const keyOf = (plan: DisplayPlan): string => ('id' in plan ? plan.id : plan.code);

const formatPrice = (amount: number, currency: string): string =>
  amount === 0 ? 'Gratuit' : `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`;

const formatPeriod = (plan: DisplayPlan): string => {
  if (plan.billingPeriod === 'month') return 'par mois';
  if (plan.durationDays) return `pour ${plan.durationDays} jours`;
  return 'sans engagement';
};

/** Limites commerciales affichées : durée, validation, utilisateurs, volume. */
const commercialLimits = (plan: DisplayPlan): { icon: React.ElementType; text: string }[] => {
  const lines: { icon: React.ElementType; text: string }[] = [];

  if (plan.durationDays) {
    lines.push({ icon: Clock, text: `Durée ${plan.durationDays} jours` });
  }
  if (plan.requiresApproval) {
    lines.push({ icon: ShieldCheck, text: 'Validation obligatoire' });
  }

  lines.push({
    icon: Users,
    text:
      plan.maxUsers === null
        ? 'Utilisateurs illimités'
        : `${plan.maxUsers} utilisateur${plan.maxUsers > 1 ? 's' : ''}`,
  });

  lines.push({
    icon: Layers,
    text:
      plan.maxRecordsPerModule === null
        ? 'Enregistrements illimités'
        : `${plan.maxRecordsPerModule} enregistrements par module`,
  });

  return lines;
};

export const PlanCards: React.FC<PlanCardsProps> = ({ onSelectPlan }) => {
  const prefersReducedMotion = useReducedMotion();
  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    listPublicPlans()
      .then((result) => {
        if (!cancelled) setPlans(result.length > 0 ? result : FALLBACK_PLANS.slice());
      })
      .catch(() => {
        if (!cancelled) setPlans(FALLBACK_PLANS.slice());
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-3xl bg-slate-900" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {plans.map((plan, index) => (
        <motion.article
          key={keyOf(plan)}
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.4, delay: index * 0.06 }}
          whileHover={prefersReducedMotion ? undefined : { y: -5 }}
          className={`relative flex flex-col rounded-3xl border p-5 transition-shadow ${
            plan.isFeatured
              ? 'border-mora-green bg-slate-900 shadow-xl shadow-mora-green/15 ring-1 ring-mora-green/30'
              : 'border-slate-800 bg-slate-900 hover:shadow-lg'
          }`}
        >
          {plan.isFeatured && (
            <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-mora-green px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
              <Sparkles className="h-3 w-3" /> Recommandé
            </span>
          )}

          <h3 className="text-base font-black text-white">{plan.name}</h3>

          <div className="mt-3">
            <span className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {formatPrice(plan.priceAmount, plan.priceCurrency)}
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold text-slate-400">
              {formatPeriod(plan)}
            </span>
          </div>

          <ul className="mt-5 flex-1 space-y-2.5 border-t border-slate-800 pt-4">
            {commercialLimits(plan).map((line) => {
              const Icon = line.icon;
              return (
                <li key={line.text} className="flex items-start gap-2 text-xs">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mora-green" />
                  <span className="text-slate-300">{line.text}</span>
                </li>
              );
            })}
            <li className="flex items-start gap-2 text-xs">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mora-green" />
              <span className="text-slate-300">Tous les modules inclus</span>
            </li>
          </ul>

          <button
            onClick={() => onSelectPlan(plan)}
            className={`mt-5 w-full rounded-xl py-2.5 text-sm font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              plan.isFeatured
                ? 'bg-mora-green text-white shadow-lg shadow-mora-green/25 hover:bg-mora-green/90 focus-visible:ring-mora-green'
                : 'border border-white/20 text-white hover:bg-white/10 focus-visible:ring-mora-blue'
            }`}
          >
            {plan.ctaLabel ?? 'Demander une démonstration'}
          </button>
        </motion.article>
      ))}
    </div>
  );
};
