import { failIf, getClient } from './base.service';
import type { Json } from '@/types/database';

/**
 * Export et volumétrie des données conservées.
 *
 * Les lectures passent par le client du navigateur : les politiques RLS
 * décident donc du périmètre. Un responsable d'établissement exporte le journal
 * de son établissement, le Super Admin celui de la plateforme — sans qu'aucun
 * filtre n'ait à être écrit ici, et sans qu'on puisse l'oublier.
 */

export interface BackupScope {
  auditLogs: number;
  patients: number;
}

export const countBackupScope = async (): Promise<BackupScope> => {
  const client = getClient();

  const [audit, patients] = await Promise.all([
    client.from('audit_logs').select('*', { count: 'exact', head: true }),
    client.from('patients').select('*', { count: 'exact', head: true }).is('deleted_at', null),
  ]);

  failIf(audit.error, 'Comptage du journal d’audit');
  failIf(patients.error, 'Comptage des dossiers patients');

  return { auditLogs: audit.count ?? 0, patients: patients.count ?? 0 };
};

/**
 * Échappement CSV.
 *
 * Une valeur contenant un point-virgule, un guillemet ou un retour à la ligne
 * décalerait toutes les colonnes suivantes : le champ est donc encadré et les
 * guillemets internes doublés, comme le veut le format.
 */
const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const COLUMNS = [
  'Date',
  'Action',
  'Entité',
  'Identifiant entité',
  'Utilisateur',
  'Établissement',
  'Adresse IP',
  'Valeurs précédentes',
  'Nouvelles valeurs',
] as const;

/**
 * Exporte le journal d'audit et déclenche le téléchargement.
 *
 * Renvoie le nombre de lignes exportées. Le point-virgule sépare les colonnes
 * et le fichier porte une marque d'ordre d'octets : sans elle, Excel en
 * francophonie affiche les accents en caractères illisibles.
 */
export const exportAuditLogCsv = async (): Promise<number> => {
  const { data, error } = await getClient()
    .from('audit_logs')
    .select('*, actor:profiles(first_name, last_name), establishment:establishments(name)')
    .order('created_at', { ascending: false })
    .limit(10_000);

  failIf(error, 'Lecture du journal d’audit');

  const rows = data ?? [];
  if (rows.length === 0) return 0;

  const lines = [COLUMNS.join(';')];

  for (const row of rows) {
    const joined = row as unknown as {
      actor?: { first_name: string; last_name: string } | null;
      establishment?: { name: string } | null;
    };

    lines.push(
      [
        csvCell(new Date(row.created_at).toLocaleString('fr-FR')),
        csvCell(row.action),
        csvCell(row.entity_name),
        csvCell(row.entity_id),
        csvCell(
          joined.actor ? `${joined.actor.first_name} ${joined.actor.last_name}`.trim() : row.user_id,
        ),
        csvCell(joined.establishment?.name ?? ''),
        csvCell(row.ip_address),
        csvCell(row.old_values),
        csvCell(row.new_values),
      ].join(';'),
    );
  }

  const blob = new Blob([`﻿${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `moracare-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Sans révocation, le contenu du fichier reste en mémoire jusqu'au
  // rechargement de la page.
  URL.revokeObjectURL(url);

  return rows.length;
};

// ===========================================================================
// Sauvegarde et restauration des données de l'établissement (UG02 §19)
// ===========================================================================

/**
 * Le fichier produit est un JSON lisible, que le responsable conserve où il
 * l'entend. C'est délibéré : une sauvegarde qui ne quitte jamais la plateforme
 * ne protège de rien, puisqu'elle disparaîtrait avec elle.
 *
 * La restauration n'écrase pas l'existant. Elle réinsère les enregistrements
 * absents en conservant leur identifiant : une ligne encore présente n'est pas
 * touchée, une ligne supprimée revient telle qu'elle était. Un écrasement
 * complet détruirait tout ce qui a été saisi depuis la sauvegarde — c'est-à-dire
 * précisément ce que l'on cherche à préserver en la restaurant.
 */

/**
 * Tables sauvegardées, dans l'ordre de restauration.
 *
 * L'ordre importe : une consultation référence un patient, une ligne de facture
 * référence une facture. Restaurer l'enfant avant le parent violerait la clé
 * étrangère.
 */
export const BACKED_UP_TABLES = [
  'patients',
  'appointments',
  'consultations',
  'prescriptions',
  'hospitalizations',
  'pharmacy_items',
  'lab_orders',
  'imaging_orders',
  'invoices',
  'invoice_items',
  'quotes',
  'quote_items',
  'payments',
  'cash_registers',
  'cash_movements',
  'cash_closures',
  'employees',
  'shift_schedules',
  'payroll_slips',
] as const;

type BackedUpTable = (typeof BACKED_UP_TABLES)[number];

/** Version du format. Un fichier d'une version inconnue est refusé. */
const BACKUP_FORMAT = 'moracare-backup-v1';

export interface BackupFile {
  format: string;
  createdAt: string;
  establishmentId: string;
  establishmentName: string;
  /** Nombre de lignes par table, pour contrôler un fichier sans le parcourir. */
  counts: Record<string, number>;
  tables: Record<string, Record<string, unknown>[]>;
}

export const createBackup = async (
  establishmentId: string,
  establishmentName: string,
): Promise<BackupFile> => {
  const client = getClient();
  const tables: Record<string, Record<string, unknown>[]> = {};
  const counts: Record<string, number> = {};

  for (const table of BACKED_UP_TABLES) {
    // RLS restreint déjà au périmètre de l'utilisateur ; le filtre explicite
    // couvre le cas du Super Admin, qui verrait sinon tous les établissements.
    const { data, error } = await client
      .from(table)
      .select('*')
      .eq('establishment_id', establishmentId);

    failIf(error, `Sauvegarde de la table ${table}`);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    tables[table] = rows;
    counts[table] = rows.length;
  }

  return {
    format: BACKUP_FORMAT,
    createdAt: new Date().toISOString(),
    establishmentId,
    establishmentName,
    counts,
    tables,
  };
};

/** Déclenche le téléchargement du fichier et renvoie son nom. */
export const downloadBackup = (backup: BackupFile): string => {
  const stamp = backup.createdAt.slice(0, 19).replace(/[:T]/g, '-');
  const slug = backup.establishmentName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const filename = `moracare-${slug || 'etablissement'}-${stamp}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return filename;
};

export interface ParsedBackup {
  backup: BackupFile;
  totalRows: number;
  /** Vrai si le fichier provient d'un autre établissement. */
  foreign: boolean;
}

/**
 * Analyse un fichier avant toute écriture.
 *
 * Un fichier mal formé, tronqué ou étranger doit être détecté ici et non au
 * milieu de la restauration : une restauration interrompue laisserait la base
 * à moitié peuplée.
 */
export const parseBackupFile = async (
  file: File,
  establishmentId: string,
): Promise<ParsedBackup> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }

  const backup = parsed as Partial<BackupFile>;

  if (backup.format !== BACKUP_FORMAT) {
    throw new Error("Ce fichier n'est pas une sauvegarde MORACare.");
  }
  if (!backup.tables || typeof backup.tables !== 'object') {
    throw new Error('La sauvegarde ne contient aucune donnée exploitable.');
  }

  const unknown = Object.keys(backup.tables).filter(
    (name) => !(BACKED_UP_TABLES as readonly string[]).includes(name),
  );
  if (unknown.length > 0) {
    throw new Error(`Tables inconnues dans la sauvegarde : ${unknown.join(', ')}.`);
  }

  let totalRows = 0;
  for (const [table, rows] of Object.entries(backup.tables)) {
    if (!Array.isArray(rows)) {
      throw new Error(`La table ${table} est corrompue dans la sauvegarde.`);
    }
    totalRows += rows.length;
  }

  return {
    backup: backup as BackupFile,
    totalRows,
    foreign: backup.establishmentId !== establishmentId,
  };
};

export interface RestoreResult {
  restored: number;
  skipped: number;
  perTable: Record<string, number>;
}

/**
 * Réinsère les enregistrements absents.
 *
 * `establishment_id` est réécrit à celui de l'utilisateur : un fichier importé
 * ne doit jamais pouvoir injecter des données dans un autre établissement, même
 * si son contenu l'indique. Les politiques RLS refuseraient l'écriture, mais
 * mieux vaut ne pas la tenter.
 */
export const restoreBackup = async (
  backup: BackupFile,
  establishmentId: string,
): Promise<RestoreResult> => {
  const client = getClient();
  const perTable: Record<string, number> = {};
  let restored = 0;
  let skipped = 0;

  for (const table of BACKED_UP_TABLES) {
    const rows = backup.tables[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const existing = await client.from(table).select('id').eq('establishment_id', establishmentId);
    failIf(existing.error, `Lecture de la table ${table}`);

    const present = new Set((existing.data ?? []).map((row) => (row as { id: string }).id));
    const missing = rows.filter((row) => !present.has(String(row.id)));

    skipped += rows.length - missing.length;

    if (missing.length === 0) {
      perTable[table] = 0;
      continue;
    }

    const payload = missing.map((row) => ({ ...row, establishment_id: establishmentId }));
    const { error } = await client.from(table).insert(payload as never);

    if (error) {
      throw new Error(
        `Restauration interrompue sur « ${table} » : ${error.message}. ` +
          `${restored} enregistrement(s) avaient déjà été restaurés.`,
      );
    }

    perTable[table] = missing.length;
    restored += missing.length;
  }

  return { restored, skipped, perTable };
};

/**
 * Inscrit l'opération au journal d'audit.
 *
 * Le journal n'autorise ni modification ni suppression : sauvegardes et
 * restaurations y laissent une trace définitive.
 */
export const recordBackupEvent = async (
  establishmentId: string,
  userId: string,
  action: 'backup_created' | 'backup_restored',
  details: Record<string, unknown>,
): Promise<void> => {
  const { error } = await getClient().from('audit_logs').insert({
    establishment_id: establishmentId,
    user_id: userId,
    action,
    entity_name: 'establishments',
    entity_id: establishmentId,
    new_values: details as Json,
  });

  failIf(error, "Journalisation de l'opération");
};

export type { BackedUpTable };
