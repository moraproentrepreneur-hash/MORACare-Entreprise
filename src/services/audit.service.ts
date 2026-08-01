import { failIf, getClient } from './base.service';
import type { AuditLog } from '@/types';
import type { Json } from '@/types/database';

/**
 * Journal d'audit (BP26B, BP30 §19, TD05 §9).
 *
 * Le journal est inaltérable par conception : la migration de durcissement ne
 * crée aucune politique UPDATE ni DELETE sur `audit_logs`. PostgreSQL refuse
 * donc toute modification, y compris au Super Admin.
 */

export interface AuditEntryInput {
  action: string;
  entityName: string;
  entityId?: string;
  /** Colonnes JSONB : la valeur doit être sérialisable, pas un objet arbitraire. */
  previousValues?: Json;
  newValues?: Json;
}

export const listAuditLogs = async (limit = 200): Promise<AuditLog[]> => {
  const { data, error } = await getClient()
    .from('audit_logs')
    .select('*, actor:profiles!user_id(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  failIf(error, "Chargement du journal d'audit");

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      actor?: { first_name: string; last_name: string } | null;
    };
    return {
      id: row.id,
      establishment_id: row.establishment_id ?? undefined,
      user_id: row.user_id ?? undefined,
      user_name: joined.actor
        ? `${joined.actor.first_name} ${joined.actor.last_name}`.trim()
        : undefined,
      action: row.action,
      entity_name: row.entity_name,
      entity_id: row.entity_id ?? undefined,
      created_at: row.created_at,
      ip_address: row.ip_address ?? undefined,
    };
  });
};

/**
 * Consigne une opération.
 *
 * L'échec d'écriture n'interrompt jamais l'action métier qui l'a déclenchée :
 * perdre une ligne de journal est préférable à faire échouer une consultation
 * médicale. L'erreur est remontée en console pour investigation.
 */
export const recordAudit = async (
  entry: AuditEntryInput,
  establishmentId: string | null,
  userId: string,
): Promise<void> => {
  try {
    const { error } = await getClient().from('audit_logs').insert({
      establishment_id: establishmentId,
      user_id: userId,
      action: entry.action,
      entity_name: entry.entityName,
      entity_id: entry.entityId ?? null,
      old_values: entry.previousValues ?? null,
      new_values: entry.newValues ?? null,
    });

    if (error) {
      console.error("Journal d'audit : écriture impossible", error.message);
    }
  } catch (err) {
    console.error("Journal d'audit : écriture impossible", err);
  }
};
