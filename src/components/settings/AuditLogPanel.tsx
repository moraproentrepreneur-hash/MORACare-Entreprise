'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { listAuditLogs } from '@/services/audit.service';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/types';

/**
 * Journal d'audit (BP26B, UG01 §12).
 *
 * Consultation seule, par conception : la table n'a aucune politique UPDATE ni
 * DELETE. Aucun bouton de suppression n'est donc proposé — il échouerait.
 */
export const AuditLogPanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLogs(await listAuditLogs());
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

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-mora-green" /> Journal d&apos;audit
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Traçabilité des opérations sensibles. Ce journal est <strong>inaltérable</strong> : la
          base refuse toute modification ou suppression, y compris au Super Admin.
        </p>
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Utilisateur</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entité</th>
                <th className="p-3">Adresse IP</th>
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

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                    Aucune opération journalisée pour le moment.
                  </td>
                </tr>
              )}

              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-slate-400">{formatDateTime(log.created_at)}</td>
                  <td className="p-3 text-white font-semibold">{log.user_name ?? '—'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-mora-blue/20 text-blue-300 font-mono text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">{log.entity_name}</td>
                  <td className="p-3 font-mono text-slate-500">{log.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
