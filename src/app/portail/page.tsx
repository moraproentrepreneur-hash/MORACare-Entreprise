'use client';

import React from 'react';
import { Calendar, Stethoscope, FlaskConical, Binary, CreditCard, Info } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';

/**
 * Tableau de bord du portail patient (UG10 §5, BP29).
 *
 * Les indicateurs affichés sont volontairement à zéro tant que le module
 * Portail Patient n'est pas développé : le patient doit accéder à SES données
 * via des politiques RLS qui lui sont propres, lesquelles n'existent pas
 * encore. Afficher des chiffres issus d'une autre source serait mensonger.
 */
export default function PortalHomePage() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h1 className="text-2xl font-black text-white">Mon espace santé</h1>
        <p className="text-xs text-slate-400 mt-1">
          Retrouvez vos rendez-vous, vos documents et le suivi de vos soins.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Prochains rendez-vous" value={0} icon={Calendar} />
        <StatCard label="Consultations récentes" value={0} icon={Stethoscope} />
        <StatCard label="Résultats d'analyses" value={0} icon={FlaskConical} />
        <StatCard label="Examens d'imagerie" value={0} icon={Binary} />
        <StatCard label="Factures" value={0} icon={CreditCard} />
      </div>

      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 space-y-1">
          <p className="font-bold text-amber-300">Module Portail Patient en cours de développement</p>
          <p>
            L&apos;espace est accessible et sécurisé, mais la consultation du dossier, la prise de
            rendez-vous en ligne et le téléchargement des documents restent à implémenter. Ils
            nécessitent des politiques d&apos;accès dédiées, permettant au patient de voir ses
            seules données.
          </p>
        </div>
      </div>
    </div>
  );
}
