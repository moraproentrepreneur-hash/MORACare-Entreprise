'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

interface ModuleGuardProps {
  /** Code du module dans le référentiel (table `modules`). */
  module: string;
  children: React.ReactNode;
}

/**
 * Empêche le rendu d'un module interdit ou désactivé.
 *
 * Couvre les deux causes prévues par la documentation :
 *   - le rôle n'a pas accès au module (BP06 §8) ;
 *   - le module est désactivé pour l'établissement (BP12 BR-027).
 *
 * Ce garde rend l'exigence « inaccessible par URL » de CLAUDE.md effective
 * côté client. Le refus qui fait autorité reste celui de PostgreSQL : même
 * contourné, aucune donnée ne remonterait.
 */
export const ModuleGuard: React.FC<ModuleGuardProps> = ({ module, children }) => {
  const { canView } = usePermissions();

  if (!canView(module)) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white">Module indisponible</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Ce module est désactivé pour votre établissement, ou votre rôle ne vous y donne pas
          accès.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
