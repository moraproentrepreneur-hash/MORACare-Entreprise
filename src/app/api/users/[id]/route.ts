import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import type { ProfileRow } from '@/types/database';

/**
 * Administration d'un compte utilisateur (UG01 §9, UG02 §5-6).
 *
 * Opérations couvertes : changement de rôle, réinitialisation du mot de passe,
 * transfert entre établissements, activation et suspension.
 *
 * Traitement serveur obligatoire : la réinitialisation d'un mot de passe passe
 * par la clé `service_role`, qui ne doit jamais atteindre le navigateur. Les
 * droits de l'appelant sont relus en base, jamais déduits de la requête.
 */

const ROLES = [
  'establishment_admin',
  'doctor',
  'nurse',
  'receptionist',
  'pharmacist',
  'lab_tech',
  'radiologist',
  'accountant',
  'patient',
] as const;

const patchSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    password: z.string().min(12, 'Le mot de passe doit contenir au moins 12 caractères.').optional(),
    establishment_id: z.string().uuid().nullable().optional(),
    is_active: z.boolean().optional(),
    department: z.string().trim().max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucune modification demandée.' });

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const targetId = params.id;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role, establishment_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!caller || caller.is_active === false) {
    return NextResponse.json({ error: 'Compte inactif ou introuvable.' }, { status: 403 });
  }

  const isSuperAdmin = caller.role === 'super_admin';
  const isEstablishmentAdmin = caller.role === 'establishment_admin';

  if (!isSuperAdmin && !isEstablishmentAdmin) {
    return NextResponse.json(
      { error: 'Votre rôle ne permet pas de gérer les comptes utilisateurs.' },
      { status: 403 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Requête invalide.' },
      { status: 400 },
    );
  }
  const input = parsed.data;

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Configuration serveur incomplète.' },
      { status: 500 },
    );
  }

  const { data: target } = await admin
    .from('profiles')
    .select('id, role, establishment_id')
    .eq('id', targetId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  // Un responsable n'agit que sur les comptes de SON établissement (UG02 §5).
  if (isEstablishmentAdmin && target.establishment_id !== caller.establishment_id) {
    return NextResponse.json(
      { error: "Cet utilisateur n'appartient pas à votre établissement." },
      { status: 403 },
    );
  }

  // BP06 §11 : « Il ne peut jamais créer un rôle supérieur au sien. »
  if (isEstablishmentAdmin && input.role === 'establishment_admin' && target.role !== 'establishment_admin') {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas attribuer un rôle équivalent au vôtre.' },
      { status: 403 },
    );
  }

  // Le transfert entre établissements relève de la plateforme (BR-295).
  if (input.establishment_id !== undefined && !isSuperAdmin) {
    return NextResponse.json(
      { error: 'Seul MORA Shawiri peut transférer un utilisateur entre établissements.' },
      { status: 403 },
    );
  }

  // Un Super Admin ne peut jamais être rétrogradé par cette route : son rôle
  // n'est pas dans la liste autorisée, mais la cible pourrait en être un.
  if (target.role === 'super_admin' && !isSuperAdmin) {
    return NextResponse.json({ error: 'Compte non modifiable.' }, { status: 403 });
  }

  // 1. Mot de passe — via l'API d'administration Supabase Auth.
  if (input.password) {
    const { error } = await admin.auth.admin.updateUserById(targetId, {
      password: input.password,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  // 2. Profil applicatif.
  const profileUpdate: Partial<ProfileRow> = {};
  if (input.role !== undefined) profileUpdate.role = input.role;
  if (input.is_active !== undefined) profileUpdate.is_active = input.is_active;
  if (input.department !== undefined) profileUpdate.department = input.department;
  if (input.establishment_id !== undefined) profileUpdate.establishment_id = input.establishment_id;

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await admin.from('profiles').update(profileUpdate).eq('id', targetId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  // 3. Journalisation (BP26B). L'échec n'annule pas l'opération.
  await admin.from('audit_logs').insert({
    establishment_id: target.establishment_id,
    user_id: user.id,
    action: input.password ? 'user_password_reset' : 'user_updated',
    entity_name: 'profiles',
    entity_id: targetId,
    old_values: { role: target.role, establishment_id: target.establishment_id },
    // Le mot de passe n'est évidemment jamais journalisé.
    new_values: profileUpdate,
  });

  return NextResponse.json({ success: true });
}

/**
 * Suppression définitive d'un compte (UG01 §9).
 *
 * Réservée à MORA Shawiri. La suppression porte sur le compte d'authentification ;
 * le profil suit par cascade. Elle échoue volontairement si le compte a produit
 * des données métier : un dossier signé par un praticien ne doit pas perdre son
 * auteur. La désactivation reste alors la bonne réponse, et c'est ce que dit le
 * message d'erreur.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const targetId = params.id;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!caller || caller.is_active === false || caller.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Seul MORA Shawiri peut supprimer un compte.' },
      { status: 403 },
    );
  }

  if (targetId === user.id) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Configuration serveur incomplète.' },
      { status: 500 },
    );
  }

  const { data: target } = await admin
    .from('profiles')
    .select('id, role, email, establishment_id')
    .eq('id', targetId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 404 });
  }

  if (target.role === 'super_admin') {
    return NextResponse.json(
      { error: 'Un compte Super Admin ne peut pas être supprimé depuis cette console.' },
      { status: 403 },
    );
  }

  // Journalisé AVANT la suppression : après, la trace de qui a été supprimé
  // n'existerait plus nulle part.
  await admin.from('audit_logs').insert({
    establishment_id: target.establishment_id,
    user_id: user.id,
    action: 'user_deleted',
    entity_name: 'profiles',
    entity_id: targetId,
    old_values: { email: target.email, role: target.role },
  });

  const { error } = await admin.auth.admin.deleteUser(targetId);

  if (error) {
    return NextResponse.json(
      {
        error:
          "Ce compte ne peut pas être supprimé : il est rattaché à des données médicales ou comptables. Désactivez-le pour lui retirer tout accès sans détruire l'historique.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true });
}
