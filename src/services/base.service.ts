import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from '@/lib/supabase/config';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Socle de la couche services (TD04 §13).
 *
 * Toute la communication avec Supabase passe par ici et par les services qui en
 * dérivent. Aucun composant ne doit importer le client Supabase directement.
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly cause?: PostgrestError | Error,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Renvoie un client Supabase, ou échoue avec un message exploitable.
 *
 * Échouer bruyamment est délibéré : une configuration absente doit produire une
 * erreur visible, jamais une liste vide silencieuse.
 */
export const getClient = () => {
  if (!isSupabaseConfigured()) {
    throw new ServiceError(SUPABASE_SETUP_MESSAGE);
  }
  return createBrowserSupabaseClient();
};

/** Transforme une erreur PostgREST en ServiceError porteuse de contexte. */
export const failIf = (error: PostgrestError | null, context: string): void => {
  if (!error) return;

  // 42501 = insufficient_privilege : signature d'un refus RLS.
  if (error.code === '42501') {
    throw new ServiceError(
      `${context} : accès refusé par les politiques de sécurité (RLS). ` +
        "Vérifiez que votre compte est rattaché à un établissement actif.",
      error,
    );
  }

  throw new ServiceError(`${context} : ${error.message}`, error);
};

/**
 * Contexte d'écriture commun à toutes les créations.
 *
 * `establishmentId` est obligatoire : les politiques RLS comportent un
 * WITH CHECK sur `establishment_id`, une insertion sans cette valeur serait
 * rejetée par PostgreSQL.
 */
export interface WriteContext {
  establishmentId: string;
  userId: string;
}

/** Colonnes d'audit à joindre à toute création (TD02 §7). */
export const auditColumns = (ctx: WriteContext) => ({
  establishment_id: ctx.establishmentId,
  created_by: ctx.userId,
  updated_by: ctx.userId,
});
