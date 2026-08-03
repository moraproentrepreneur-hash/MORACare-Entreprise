'use client';

import React from 'react';
import { BarChart3, Info } from 'lucide-react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';

/**
 * Rapports, KPI & Business Intelligence (BP-024A, BP-024B).
 *
 * Le module figure au référentiel officiel (BP12 §4 « Rapports ») et doit donc
 * exister pour que les permissions qui le désignent aient une cible. Son
 * contenu reste à développer : afficher des indicateurs inventés serait pire
 * que d'annoncer honnêtement l'état d'avancement.
 */
function Reports() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-mora-green" /> Rapports & Statistiques
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          États, impressions, indicateurs et tableaux de bord analytiques.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 space-y-1">
          <p className="font-bold text-amber-300">Module en cours de développement</p>
          <p>
            Les rapports d&apos;activité, les exports et les indicateurs filtrables par période
            restent à implémenter.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ModuleGuard module="reports">
      <Reports />
    </ModuleGuard>
  );
}
