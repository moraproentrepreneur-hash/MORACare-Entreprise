'use client';

import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Lock, Info, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccess } from '@/context/AccessContext';
import { usePermissions } from '@/hooks/usePermissions';
import { setModuleEnabled } from '@/services/access.service';
import { recordAudit } from '@/services/audit.service';

/**
 * Activation et désactivation des modules (BP28A §12, BP12 BR-027).
 *
 * C'est ici que le module Paramètres pilote réellement l'application : une
 * désactivation retire immédiatement le module du menu, du tableau de bord et
 * des URL, puisque tout est dérivé du même référentiel via `usePermissions`.
 */
export const ModulesSettings: React.FC = () => {
  const { user } = useAuth();
  const { snapshot, refresh } = useAccess();
  const { subscription } = usePermissions();

  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modules = (snapshot?.modules ?? []).filter((m) => m.workspace === 'establishment');
  const disabled = new Set(snapshot?.disabledModuleCodes ?? []);

  const handleToggle = async (moduleId: string, moduleCode: string, nextEnabled: boolean) => {
    if (!user?.establishment_id) {
      setError("Votre compte n'est rattaché à aucun établissement.");
      return;
    }

    setPending(moduleId);
    setError(null);

    try {
      await setModuleEnabled(user.establishment_id, moduleId, nextEnabled, user.id);
      await recordAudit(
        {
          action: nextEnabled ? 'module_enabled' : 'module_disabled',
          entityName: 'establishment_modules',
          entityId: moduleId,
          newValues: { module: moduleCode, is_enabled: nextEnabled },
        },
        user.establishment_id,
        user.id,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-base font-bold text-white mb-2">Modules de l&apos;établissement</h3>
        <p className="text-xs text-slate-400">
          Un module désactivé disparaît du menu, du tableau de bord et des statistiques, et son URL
          devient inaccessible.
        </p>

        {subscription && subscription.planModuleCodes === null && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-200/90">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              La composition du plan <strong>{subscription.planName}</strong> n&apos;est pas définie
              dans la documentation officielle (BP09 §4 ne détaille que les plans Essai et VIP).
              Aucune restriction de plan n&apos;est donc appliquée. Définissez sa composition depuis
              la console SaaS.
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {modules.map((module) => {
          const isEnabled = !disabled.has(module.code);
          const inPlan =
            !subscription?.planModuleCodes || subscription.planModuleCodes.includes(module.code);

          return (
            <div
              key={module.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{module.name}</span>
                  {module.blueprintReference && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400">
                      {module.blueprintReference}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{module.description}</p>

                {module.isCore && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <Lock className="w-3 h-3" /> Module essentiel, non désactivable
                  </p>
                )}
                {!inPlan && (
                  <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-400">
                    <AlertTriangle className="w-3 h-3" /> Non inclus dans le plan souscrit
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={module.isCore || pending === module.id}
                onClick={() => void handleToggle(module.id, module.code, !isEnabled)}
                title={module.isCore ? 'Module essentiel' : isEnabled ? 'Désactiver' : 'Activer'}
                className={`shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isEnabled ? 'text-mora-green' : 'text-slate-600'
                }`}
              >
                {isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
