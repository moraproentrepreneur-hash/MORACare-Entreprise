import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { loadSecuritySettings } from '@/lib/security/settings.server';
import { describePasswordError } from '@/lib/password-policy';

/**
 * Changement de mot de passe par son titulaire.
 *
 * Sert au changement obligatoire de la première connexion comme au changement
 * volontaire. Deux garde-fous :
 *
 *   - le mot de passe actuel est **revérifié** ici. Détenir une session ne
 *     suffit pas : un poste laissé déverrouillé permettrait sinon à un tiers de
 *     s'approprier le compte ;
 *   - la politique est relue en base et appliquée côté serveur. Le contrôle du
 *     navigateur ne guide que la saisie.
 */

const schema = z.object({
  current_password: z.string().min(1, 'Mot de passe actuel requis.'),
  new_password: z.string().min(1, 'Nouveau mot de passe requis.'),
});

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Requête invalide.' },
      { status: 400 },
    );
  }

  const { current_password, new_password } = parsed.data;

  if (current_password === new_password) {
    return NextResponse.json(
      { error: 'Le nouveau mot de passe doit être différent de l’actuel.' },
      { status: 400 },
    );
  }

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json(
      { error: 'Le service est momentanément indisponible.' },
      { status: 503 },
    );
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, establishment_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) {
    return NextResponse.json({ error: 'Compte inactif ou introuvable.' }, { status: 403 });
  }

  const settings = await loadSecuritySettings(admin, profile.establishment_id);

  const policyError = describePasswordError(new_password, settings.password);
  if (policyError) {
    return NextResponse.json({ error: policyError }, { status: 400 });
  }

  // Revérification du mot de passe actuel, sur un client isolé pour ne pas
  // toucher aux cookies de la session en cours.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  });

  if (signInError) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 401 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: new_password,
  });

  if (updateError) {
    return NextResponse.json(
      { error: "Le mot de passe n'a pas pu être modifié." },
      { status: 400 },
    );
  }

  await admin
    .from('profiles')
    .update({
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', user.id);

  // Le mot de passe lui-même n'est évidemment jamais journalisé.
  await admin.from('audit_logs').insert({
    establishment_id: profile.establishment_id,
    user_id: user.id,
    action: 'password_changed_by_owner',
    entity_name: 'profiles',
    entity_id: user.id,
  });

  return NextResponse.json({ success: true });
}
