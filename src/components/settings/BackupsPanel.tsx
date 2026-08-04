'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Database, Download, HardDrive, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { getPlatformSecurity } from '@/services/security.service';
import { countBackupScope, exportAuditLogCsv } from '@/services/backup.service';

/**
 * Sauvegardes et conservation des données.
 *
 * Deux mécanismes coexistent, et cet écran les distingue clairement :
 *
 *   - la **sauvegarde de l'infrastructure**, assurée en continu par PostgreSQL
 *     chez l'hébergeur : elle protège de la panne, pas de l'erreur humaine ;
 *   - la **conservation applicative**, que MORACare maîtrise : suppression
 *     logique des données critiques, journal d'audit inaltérable, durée de
 *     rétention configurable.
 *
 * L'export du journal est la seule opération qui produise un fichier ici, et
 * elle est réelle : les lignes sont lues en base et écrites en CSV.
 */
export const BackupsPanel: React.FC = () => {
  const { user } = useAuth();

  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [scope, setScope] = useState<{ auditLogs: number; patients: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [settings, counts] = await Promise.all([getPlatformSecurity(), countBackupScope()]);
      setRetentionDays(settings?.auditRetentionDays ?? null);
      setScope(counts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setNotice(null);
    try {
      const rows = await exportAuditLogCsv();
      setNotice(
        rows === 0
          ? "Le journal d'audit est vide : aucun fichier n'a été produit."
          : `${rows} entrée${rows > 1 ? 's' : ''} exportée${rows > 1 ? 's' : ''}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export impossible.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <Database className="h-4 w-4 shrink-0 text-mora-green" /> Sauvegardes & conservation
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Ce qui protège vos données, et ce que vous pouvez en extraire.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <h4 className="flex items-center gap-2 text-sm font-bold text-white">
            <HardDrive className="h-4 w-4 text-mora-green" /> Sauvegarde de l&apos;infrastructure
          </h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mora-green" />
              <span>
                La base est répliquée et sauvegardée par l&apos;hébergeur. La restauration d&apos;une
                sauvegarde complète relève de MORA Shawiri, sur demande.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mora-green" />
              <span>
                Les échanges sont chiffrés en transit, et l&apos;isolation entre établissements est
                appliquée par la base elle-même, pas par l&apos;interface.
              </span>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <h4 className="text-sm font-bold text-white">Conservation applicative</h4>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Rétention du journal</dt>
              <dd className="font-bold text-slate-200">
                {retentionDays === null ? '—' : `${retentionDays} jours`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Entrées au journal d&apos;audit</dt>
              <dd className="font-bold text-slate-200">{scope?.auditLogs ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Dossiers patients</dt>
              <dd className="font-bold text-slate-200">{scope?.patients ?? '—'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-slate-500">
            La durée de rétention se règle dans l&apos;onglet Sécurité. Les données critiques ne
            sont jamais supprimées physiquement : elles sont marquées comme supprimées et restent
            restaurables.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h4 className="text-sm font-bold text-white">Export du journal d&apos;audit</h4>
        <p className="mt-1 text-xs text-slate-400">
          Produit un fichier CSV des opérations enregistrées, à conserver hors de la plateforme ou
          à remettre à un auditeur.
          {user?.role !== 'super_admin' &&
            " L'export est limité aux opérations de votre établissement."}
        </p>
        <Button
          variant="outline"
          isLoading={isExporting}
          onClick={() => void handleExport()}
          className="mt-4 w-full gap-2 sm:w-auto"
        >
          <Download className="h-4 w-4" /> Exporter en CSV
        </Button>
      </section>
    </div>
  );
};
