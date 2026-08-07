import 'server-only';

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateVerificationCode } from '@/lib/password-policy';
import type { AppDatabase, VerificationPurpose } from '@/types/database';

/**
 * Codes de vérification à six chiffres.
 *
 * Deux règles gouvernent ce module :
 *
 *   1. **Le code n'est jamais stocké.** Seul son condensé l'est, salé par un
 *      secret d'application. Une fuite de la base ne livre donc aucun code
 *      utilisable. Le code en clair n'existe qu'entre sa génération et son
 *      envoi.
 *   2. **La comparaison est à temps constant.** Comparer deux chaînes avec `===`
 *      s'arrête au premier caractère différent ; la durée de la réponse
 *      trahirait alors le préfixe correct, et six chiffres tomberaient en
 *      quelques dizaines de requêtes.
 */

type Client = SupabaseClient<AppDatabase>;

/**
 * Durée de validité : 24 heures.
 *
 * Un code d'activation n'est pas un second facteur de connexion : il est
 * transmis par courriel, parfois relayé à la main par MORA Shawiri, et son
 * destinataire n'est pas toujours devant son écran. Trente minutes obligeaient
 * à en réémettre plusieurs par compte, chacun invalidant le précédent — au
 * point que le code communiqué ne fonctionnait plus à l'arrivée.
 */
export const CODE_VALIDITY_MINUTES = 24 * 60;

/** Au-delà, le code est brûlé : il faut en demander un nouveau. */
const MAX_ATTEMPTS = 5;

/**
 * Sel du condensé.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` sert de secret : elle est déjà indispensable au
 * serveur, présente partout où ce module tourne, et jamais exposée au client.
 */
const digest = (code: string, profileId: string): string =>
  createHash('sha256')
    .update(`${profileId}:${code}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`)
    .digest('hex');

const equals = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

/**
 * Indique s'il existe déjà un code valide pour ce motif.
 *
 * Le code lui-même n'est pas récupérable — seul son condensé est stocké — mais
 * savoir qu'il est encore valide suffit à ne pas en émettre un second.
 */
export const findValidCode = async (
  admin: Client,
  profileId: string,
  purpose: VerificationPurpose,
): Promise<{ expiresAt: string } | null> => {
  const { data } = await admin
    .from('verification_codes')
    .select('expires_at')
    .eq('profile_id', profileId)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? { expiresAt: data.expires_at } : null;
};

/**
 * Émet un code et renvoie sa valeur en clair, à usage unique de l'appelant.
 *
 * Les codes précédents du même motif sont invalidés : deux codes valides
 * simultanément doubleraient la surface d'attaque sans rendre service.
 *
 * L'appelant doit donc vérifier `findValidCode` au préalable s'il ne veut pas
 * révoquer un code encore en circulation — c'est ce que fait la route
 * d'activation, sauf demande explicite de renouvellement.
 */
export const issueVerificationCode = async (
  admin: Client,
  profileId: string,
  purpose: VerificationPurpose,
): Promise<{ code: string; expiresAt: string }> => {
  const now = new Date();

  await admin
    .from('verification_codes')
    .update({ consumed_at: now.toISOString() })
    .eq('profile_id', profileId)
    .eq('purpose', purpose)
    .is('consumed_at', null);

  const code = generateVerificationCode();
  const expiresAt = new Date(now.getTime() + CODE_VALIDITY_MINUTES * 60_000).toISOString();

  const { error } = await admin.from('verification_codes').insert({
    id: randomUUID(),
    profile_id: profileId,
    purpose,
    code_hash: digest(code, profileId),
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error("Le code de vérification n'a pas pu être enregistré.");
  }

  return { code, expiresAt };
};

export type VerificationOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'too_many_attempts' | 'mismatch' };

/**
 * Vérifie un code et le consomme s'il est correct.
 *
 * Chaque échec incrémente le compteur de tentatives, y compris quand le code
 * est simplement expiré : sans cela, un code périmé offrirait un oracle gratuit.
 */
export const consumeVerificationCode = async (
  admin: Client,
  profileId: string,
  purpose: VerificationPurpose,
  submitted: string,
): Promise<VerificationOutcome> => {
  const { data: record } = await admin
    .from('verification_codes')
    .select('*')
    .eq('profile_id', profileId)
    .eq('purpose', purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!record) return { ok: false, reason: 'not_found' };

  if (record.attempts >= MAX_ATTEMPTS) {
    await admin
      .from('verification_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', record.id);
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await admin
      .from('verification_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);
    return { ok: false, reason: 'expired' };
  }

  if (!equals(record.code_hash, digest(submitted, profileId))) {
    await admin
      .from('verification_codes')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);
    return { ok: false, reason: 'mismatch' };
  }

  await admin
    .from('verification_codes')
    .update({ consumed_at: new Date().toISOString(), attempts: record.attempts + 1 })
    .eq('id', record.id);

  return { ok: true };
};

/** Message affiché à l'utilisateur pour chaque motif d'échec. */
export const describeVerificationFailure = (
  reason: Exclude<VerificationOutcome, { ok: true }>['reason'],
): string => {
  switch (reason) {
    case 'not_found':
      return "Aucun code en attente. Demandez l'envoi d'un nouveau code.";
    case 'expired':
      return 'Ce code a expiré. Demandez-en un nouveau.';
    case 'too_many_attempts':
      return 'Trop de tentatives. Un nouveau code doit être demandé.';
    case 'mismatch':
      return 'Code incorrect.';
  }
};
