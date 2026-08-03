'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccess } from '@/context/AccessContext';
import { listAllRolePermissions, updateRolePermission } from '@/services/access.service';
import { recordAudit } from '@/services/audit.service';
import { ROLE_LABELS } from '@/lib/roles';
import type { UserRole } from '@/types';

/**
 * Matrice des permissions rôle × module (BP26A).
 *
 * Les droits sont lus et écrits en base : rien n'est codé en dur. Seul le
 * Super Admin peut les modifier — la politique RLS `role_permissions_write` le
 * garantit côté serveur, quelle que soit l'interface.
 */

const ACTIONS = [
  { key: 'canView', label: 'Voir' },
  { key: 'canCreate', label: 'Créer' },
  { key: 'canUpdate', label: 'Modifier' },
  { key: 'canDelete', label: 'Supprimer' },
] as const;

type PermissionRow = {
  role: UserRole;
  moduleId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export const PermissionsMatrix: React.FC = () => {
  const { user } = useAuth();
  const { snapshot } = useAccess();

  const [rows, setRows] = useState<PermissionRow[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('doctor');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const canEdit = user?.role === 'super_admin';
  const modules = snapshot?.modules ?? [];

  const load = useCallback(async () => {
    try {
      setRows(await listAllRolePermissions());
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

  const permissionFor = (moduleId: string): PermissionRow | undefined =>
    rows.find((r) => r.role === selectedRole && r.moduleId === moduleId);

  const handleToggle = async (
    moduleId: string,
    action: (typeof ACTIONS)[number]['key'],
    current: boolean,
  ) => {
    if (!canEdit || !user) return;

    setError(null);
    try {
      await updateRolePermission(selectedRole, moduleId, { [action]: !current });
      await recordAudit(
        {
          action: 'permission_changed',
          entityName: 'role_permissions',
          entityId: moduleId,
          previousValues: { role: selectedRole, [action]: current },
          newValues: { role: selectedRole, [action]: !current },
        },
        user.establishment_id ?? null,
        user.id,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-mora-green" /> Matrice des permissions
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Contrôle d&apos;accès granulaire par rôle et par module. Les droits sont stockés en base,
          jamais dans le code.
        </p>

        {!canEdit && (
          <p className="mt-3 text-[11px] text-amber-400">
            Consultation seule : seul le Super Admin peut modifier la matrice.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedRole === role
                  ? 'bg-mora-blue text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold">
              <tr>
                <th className="p-3">Module</th>
                {ACTIONS.map((a) => (
                  <th key={a.key} className="p-3 text-center">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!isLoading &&
                modules.map((module) => {
                  const perm = permissionFor(module.id);
                  return (
                    <tr key={module.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <span className="font-semibold text-white">{module.name}</span>
                        <span className="ml-2 text-[10px] font-mono text-slate-500">
                          {module.code}
                        </span>
                      </td>
                      {ACTIONS.map((action) => {
                        const value = perm?.[action.key] ?? false;
                        return (
                          <td key={action.key} className="p-3 text-center">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => void handleToggle(module.id, action.key, value)}
                              aria-label={`${action.label} — ${module.name}`}
                              className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors disabled:cursor-not-allowed ${
                                value
                                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                                  : 'bg-slate-800/60 text-slate-600 hover:bg-slate-800'
                              }`}
                            >
                              {value ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
