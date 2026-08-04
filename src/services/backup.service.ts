import { failIf, getClient } from './base.service';

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
