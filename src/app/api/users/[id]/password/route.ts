import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { loadSecuritySettings } from '@/lib/security/settings.server';
import { generatePassword } from '@/lib/password-policy';
import { dispatchMessage } from '@/lib/messaging/outbox.server';
import { passwordResetIssuedMessage } from '@/lib/messaging/templates';

/**
 * Génération d'un mot de passe temporaire pour un compte existant.
 *
 * L'administrateur ne choisit pas le mot de passe : le serveur le produit avec
 * le générateur cryptographique, conforme à la politique en vigueur. Un mot de
 * passe choisi à la main par un tiers pressé serait faible et, surtout, connu
 * de lui.
 *
 * Le mot de passe est renvoyé **une seule fois** dans cette réponse, pour être
 * copié ou envoyé. Il n'est jamais stocké en clair et ne peut pas être relu.
 * Le compte est marqué « à changer » : son titulaire devra le remplacer dès sa
 * prochaine connexion.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
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
      { error: 'Votre rôle ne permet pas de gérer les mots de passe.' },
      { status: 403 },
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
    .select('id, role, email, username, first_name, establishment_id')
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

  if (target.role === 'super_admin' && !isSuperAdmin) {
    return NextResponse.json({ error: 'Compte non modifiable.' }, { status: 403 });
  }

  const settings = await loadSecuritySettings(admin, target.establishment_id);
  const password = generatePassword(settings.password);

  const { error: updateError } = await admin.auth.admin.updateUserById(targetId, { password });

  if (updateError) {
    return NextResponse.json(
      { error: "Le mot de passe n'a pas pu être régénéré." },
      { status: 400 },
    );
  }

  await admin
    .from('profiles')
    .update({
      must_change_password: true,
      password_changed_at: null,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq('id', targetId);

  // Envoi au titulaire. Un échec n'invalide pas l'opération : le mot de passe
  // est aussi rendu à l'écran pour être transmis autrement.
  let emailSent = false;
  if (target.email) {
    const message = passwordResetIssuedMessage({
      firstName: target.first_name,
      username: target.username,
      password,
    });

    const delivery = await dispatchMessage(admin, {
      recipient: target.email,
      subject: message.subject,
      body: message.body,
      template: message.template,
      relatedType: 'profiles',
      relatedId: targetId,
    });

    emailSent = delivery.delivered;
  }

  await admin.from('audit_logs').insert({
    establishment_id: target.establishment_id,
    user_id: user.id,
    action: 'user_password_generated',
    entity_name: 'profiles',
    entity_id: targetId,
    // Le mot de passe n'est évidemment jamais journalisé.
    new_values: { must_change_password: true, email_sent: emailSent },
  });

  return NextResponse.json({
    success: true,
    password,
    username: target.username,
    email: target.email,
    emailSent,
  });
}
