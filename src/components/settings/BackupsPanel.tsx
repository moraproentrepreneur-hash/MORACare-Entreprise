'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Download,
  FileJson,
  HardDrive,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { getPlatformSecurity } from '@/services/security.service';
import {
  countBackupScope,
  createBackup,
  downloadBackup,
  exportAuditLogCsv,
  parseBackupFile,
  recordBackupEvent,
  restoreBackup,
  type ParsedBackup,
} from '@/services/backup.service';
import { getEstablishmentProfile } from '@/services/establishment.service';

/**
 * Sauvegardes et conservation des données (UG02 §19).
 *
 * Trois mécanismes coexistent, et cet écran les distingue :
 *
 *   - la **sauvegarde de l'infrastructure**, assurée en continu par PostgreSQL
 *     chez l'hébergeur : elle protège de la panne, pas de l'erreur humaine ;
 *   - la **sauvegarde applicative**, que le responsable déclenche et emporte :
 *     un fichier JSON qui contient les données métier de son établissement ;
 *   - la **conservation**, réglée par MORA Shawiri : suppression logique,
 *     journal inaltérable, durée de rétention.
 *
 * La restauration ne remplace jamais l'existant : elle réinsère ce qui manque.
 * Elle ne peut donc pas détruire un enregistrement créé depuis la sauvegarde,
 * ce qui serait le contraire du service attendu.
 */
export const BackupsPanel: React.FC = () => {
  const { user } = useAuth();

  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [scope, setScope] = useState<{ auditLogs: number; patients: number } | null>(null);
  const [establishmentName, setEstablishmentName] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pending, setPending] = useState<ParsedBackup | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const establishmentId = user?.establishment_id ?? null;

  const load = useCallback(async () => {
    try {
      const [settings, counts] = await Promise.all([getPlatformSecurity(), countBackupScope()]);
      setRetentionDays(settings?.auditRetentionDays ?? null);
      setScope(counts);

      if (establishmentId) {
        const profile = await getEstablishmentProfile(establishmentId);
        setEstablishmentName(profile?.name ?? '');
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    }
  }, [establishmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExportAudit = async () => {
    setIsExporting(true);
    setError(null);
    setNotice(null);
    try {
      const rows = await exportAuditLogCsv();
      setNotice(
        rows === 0
          ? "Le journal d'audit est vide : aucun fichier n'a été produit."
          : `${rows} entrée${rows > 1 ? 's' : ''} exportée${rows > 1 ? 's' : ''} au format CSV.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export impossible.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!establishmentId || !user) return;

    setIsBackingUp(true);
    setError(null);
    setNotice(null);
    try {
      const backup = await createBackup(establishmentId, establishmentName || 'Établissement');
      const total = Object.values(backup.counts).reduce((sum, n) => sum + n, 0);
      const filename = downloadBackup(backup);

      await recordBackupEvent(establishmentId, user.id, 'backup_created', {
        filename,
        totalRows: total,
        counts: backup.counts,
      });

      setNotice(
        `Sauvegarde créée : ${total} enregistrement${total > 1 ? 's' : ''} dans ${filename}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!establishmentId) return;

    setError(null);
    setNotice(null);
    try {
      setPending(await parseBackupFile(file, establishmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fichier illisible.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!pending || !establishmentId || !user) return;

    setIsRestoring(true);
    setError(null);
    try {
      const result = await restoreBackup(pending.backup, establishmentId);

      await recordBackupEvent(establishmentId, user.id, 'backup_restored', {
        backupDate: pending.backup.createdAt,
        restored: result.restored,
        skipped: result.skipped,
        perTable: result.perTable,
      });

      await load();
      setPending(null);
      setNotice(
        result.restored === 0
          ? 'Aucun enregistrement à restaurer : vos données sont déjà à jour.'
          : `${result.restored} enregistrement${result.restored > 1 ? 's' : ''} restauré${
              result.restored > 1 ? 's' : ''
            }. ${result.skipped} déjà présent${result.skipped > 1 ? 's' : ''}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restauration impossible.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
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

      {/* ------------------------ Sauvegarde applicative ---------------------- */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <FileJson className="h-4 w-4 shrink-0 text-mora-green" /> Sauvegarde de vos données
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Produit un fichier JSON contenant les données métier de votre établissement : patients,
            consultations, prescriptions, hospitalisations, examens, facturation, caisses et
            personnel. Conservez-le hors de la plateforme.
          </p>
        </div>

        {!establishmentId ? (
          <p className="rounded-xl bg-slate-950 p-3 text-xs text-slate-400">
            Cette fonction concerne les établissements. Votre compte n&apos;en administre aucun.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                isLoading={isBackingUp}
                onClick={() => void handleCreateBackup()}
                className="w-full gap-2 font-bold sm:w-auto sm:px-6"
              >
                <Download className="h-4 w-4" /> Créer une sauvegarde
              </Button>

              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="w-full gap-2 sm:w-auto sm:px-6"
              >
                <Upload className="h-4 w-4" /> Restaurer un fichier
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mora-green" />
              <span>
                La restauration ajoute les enregistrements absents et laisse les autres intacts.
                Rien de ce qui a été saisi depuis la sauvegarde ne sera perdu. Chaque sauvegarde et
                chaque restauration sont inscrites au journal d&apos;audit.
              </span>
            </div>
          </>
        )}
      </div>

      {/* -------------------------- Conservation ------------------------------ */}
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <Database className="h-4 w-4 shrink-0 text-mora-green" /> Conservation des données
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Volumétrie actuelle et durée de rétention appliquée.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Dossiers patients" value={scope?.patients ?? '—'} />
          <Metric label="Entrées du journal" value={scope?.auditLogs ?? '—'} />
          <Metric
            label="Rétention"
            value={retentionDays === null ? '—' : `${retentionDays} jours`}
          />
        </div>

        <Button
          variant="outline"
          isLoading={isExporting}
          onClick={() => void handleExportAudit()}
          className="w-full gap-2 sm:w-auto"
        >
          <Download className="h-4 w-4" /> Exporter le journal d&apos;audit (CSV)
        </Button>
      </div>

      {/* ------------------------ Sauvegarde infrastructure ------------------- */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <HardDrive className="h-4 w-4 shrink-0 text-mora-green" /> Sauvegarde de l&apos;hébergement
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          La base est sauvegardée en continu par l&apos;infrastructure PostgreSQL de MORA Shawiri.
          Cette protection couvre la panne matérielle ; elle ne remplace pas la sauvegarde
          ci-dessus, qui vous appartient et vous protège d&apos;une suppression accidentelle.
        </p>
      </div>

      {/* --------------------- Confirmation de restauration ------------------- */}
      <Modal
        isOpen={pending !== null}
        onClose={() => setPending(null)}
        title="Confirmer la restauration"
        description={
          pending
            ? `Sauvegarde du ${new Date(pending.backup.createdAt).toLocaleString('fr-FR')}`
            : ''
        }
        maxWidth="xl"
      >
        {pending && (
          <div className="space-y-4">
            <dl className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950 text-xs">
              <Row label="Établissement d'origine" value={pending.backup.establishmentName} />
              <Row label="Enregistrements dans le fichier" value={String(pending.totalRows)} />
              <Row
                label="Tables concernées"
                value={String(Object.keys(pending.backup.tables).length)}
              />
            </dl>

            {pending.foreign && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200/90">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Ce fichier provient d&apos;un <strong>autre établissement</strong>. Les données
                  seront rattachées au vôtre. Vérifiez qu&apos;il s&apos;agit bien du fichier
                  attendu.
                </span>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mora-green" />
              <span>
                Seuls les enregistrements absents seront réinsérés. Ceux qui existent déjà ne seront
                ni modifiés ni dupliqués, et aucune donnée actuelle ne sera supprimée.
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                variant="secondary"
                isLoading={isRestoring}
                onClick={() => void handleRestore()}
                className="w-full py-2.5 font-bold sm:w-auto sm:px-8"
              >
                Restaurer maintenant
              </Button>
              <Button
                variant="outline"
                onClick={() => setPending(null)}
                className="w-full py-2.5 sm:w-auto sm:px-6"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-black tabular-nums text-white">{value}</p>
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 p-3">
    <dt className="text-slate-400">{label}</dt>
    <dd className="text-right font-semibold text-slate-200">{value}</dd>
  </div>
);
