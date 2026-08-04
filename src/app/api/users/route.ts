import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { loadSecuritySettings } from '@/lib/security/settings.server';
import { describePasswordError, generatePassword } from '@/lib/password-policy';
import { issueVerificationCode, CODE_VALIDITY_MINUTES } from '@/lib/security/verification.server';
import { dispatchMessage } from '@/lib/messaging/outbox.server';
import { activationCodeMessage, temporaryPasswordMessage } from '@/lib/messaging/templates';

/**
 * Création d'un compte utilisateur d'établissement (UG02 §5-6).
 *
 * Traitement serveur obligatoire : la création d'un compte passe par la clé
 * `service_role`, qui ne doit jamais atteindre le navigateur.
 *
 * BP06 §14 et TD06 §7 exigent que le contrôle d'accès soit vérifié côté
 * serveur. Le rôle de l'appelant est donc relu en base ici, sans faire
 * confiance à quoi que ce soit d'envoyé par le client.
 *
 * Le mot de passe est **généré par le serveur** si l'appelant n'en fournit pas.
 * Il est alors temporaire : son titulaire devra le remplacer avant tout accès,
 * et le compte attend en outre la saisie du code de vérification envoyé par
 * courriel. Ce mot de passe est renvoyé **une seule fois**, dans la réponse à
 * cette requête ; il n'est stocké nulle part en clair et ne peut plus être
 * relu ensuite.
 */

const createUserSchema = z.object({
  first_name: z.string().trim().min(1, 'Le prénom est obligatoire.'),
  last_name: z.string().trim().min(1, 'Le nom est obligatoire.'),
  username: z.string().trim().min(1).optional(),
  email: z.string().trim().email('Adresse e-mail invalide.'),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  /**
   * Établissement d'affectation. N'est lu que si l'appelant est Super Admin :
   * un responsable ne peut créer un compte que dans le sien.
   */
  establishment_id: z.string().uuid("L'établissement sélectionné est invalide.").optional(),
  role: z.enum([
    'establishment_admin',
    'doctor',
    'nurse',
    'receptionist',
    'pharmacist',
    'lab_tech',
    'radiologist',
    'accountant',
    'patient',
  ]),
  /** Absent : le serveur génère un mot de passe temporaire conforme. */
  password: z.string().optional(),
  /**
   * Exiger la saisie du code de vérification avant tout accès. Vrai par défaut
   * pour un responsable d'établissement : c'est lui qui ouvre l'accès à la
   * structure, son adresse doit être confirmée.
   */
  require_activation: z.boolean().optional(),
});

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
  }

  // Le rôle et l'établissement sont relus en base, jamais pris du corps de requête.
  const { data: caller } = await supabase
    .from('profiles')
    .select('role, establishment_id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!caller || caller.is_active === false) {
    return NextResponse.json({ error: 'Compte inactif ou introuvable.' }, { status: 403 });
  }

  const isSuperAdmin = caller.role === 'super_admin';
  const canManageUsers = isSuperAdmin || caller.role === 'establishment_admin';
  if (!canManageUsers) {
    return NextResponse.json(
      { error: "Votre rôle ne permet pas de créer des comptes utilisateurs." },
      { status: 403 },
    );
  }

  const parsed = createUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Requête invalide.' },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Le Super Admin désigne l'établissement — c'est ainsi qu'il crée les
  // administrateurs de ses clients. Tout autre rôle est confiné au sien : la
  // valeur envoyée par le client est ignorée, jamais arbitrée.
  const establishmentId = isSuperAdmin ? input.establishment_id : caller.establishment_id;

  if (!establishmentId) {
    return NextResponse.json(
      {
        error: isSuperAdmin
          ? "Sélectionnez l'établissement auquel rattacher ce compte."
          : "Votre compte n'est rattaché à aucun établissement.",
      },
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

  const settings = await loadSecuritySettings(admin, establishmentId);

  // Mot de passe fourni : il doit respecter la politique comme n'importe quel
  // autre. Mot de passe absent : le serveur en produit un, forcément conforme.
  const isGenerated = !input.password;
  const password = input.password ?? generatePassword(settings.password);

  if (input.password) {
    const policyError = describePasswordError(input.password, settings.password);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }
  }

  // Un responsable d'établissement confirme son adresse avant d'accéder aux
  // données : c'est lui qui ouvre ensuite l'accès à toute la structure.
  const requireActivation = input.require_activation ?? input.role === 'establishment_admin';
  const username = input.username || input.email.split('@')[0];

  // Le profil applicatif est créé par le trigger `handle_new_auth_user` à
  // partir de ces métadonnées : rien n'est inséré à la main dans `profiles`.
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone ?? '',
      role: input.role,
      establishment_id: establishmentId,
    },
  });

  if (error) {
    const isDuplicate = error.message.toLowerCase().includes('already');
    return NextResponse.json(
      { error: isDuplicate ? 'Un compte existe déjà avec cette adresse e-mail.' : error.message },
      { status: isDuplicate ? 409 : 400 },
    );
  }

  const newUserId = created.user?.id ?? null;

  if (newUserId) {
    // Ces colonnes ne passent pas par le trigger : elles sont posées ici.
    await admin
      .from('profiles')
      .update({
        department: input.department ?? null,
        must_change_password: true,
        password_changed_at: null,
        activation_required: requireActivation,
      })
      .eq('id', newUserId);
  }

  const { data: establishment } = await admin
    .from('establishments')
    .select('name')
    .eq('id', establishmentId)
    .maybeSingle();

  const establishmentName = establishment?.name ?? 'MORACare';

  // Remise des identifiants. L'envoi peut échouer sans compromettre la création :
  // le mot de passe est aussi rendu à l'écran, où l'administrateur le copie.
  const credentials = temporaryPasswordMessage({
    firstName: input.first_name,
    username,
    password,
    establishmentName,
  });

  const credentialsDelivery = await dispatchMessage(admin, {
    recipient: input.email,
    subject: credentials.subject,
    body: credentials.body,
    template: credentials.template,
    relatedType: 'profiles',
    relatedId: newUserId ?? undefined,
  });

  // Code d'activation, si le compte doit être confirmé avant tout accès.
  let activationDelivered = false;
  if (requireActivation && newUserId) {
    const { code } = await issueVerificationCode(admin, newUserId, 'account_activation');
    const message = activationCodeMessage({
      firstName: input.first_name,
      establishmentName,
      code,
      validMinutes: CODE_VALIDITY_MINUTES,
    });

    const delivery = await dispatchMessage(admin, {
      recipient: input.email,
      subject: message.subject,
      body: message.body,
      template: message.template,
      relatedType: 'profiles',
      relatedId: newUserId,
    });

    activationDelivered = delivery.delivered;
  }

  await admin.from('audit_logs').insert({
    establishment_id: establishmentId,
    user_id: user.id,
    action: 'user_created',
    entity_name: 'profiles',
    entity_id: newUserId,
    new_values: {
      email: input.email,
      role: input.role,
      establishment_id: establishmentId,
      password_generated: isGenerated,
      activation_required: requireActivation,
    },
  });

  return NextResponse.json(
    {
      success: true,
      id: newUserId,
      username,
      /* Unique occasion de lire ce mot de passe : il n'est stocké qu'en haché. */
      password,
      passwordGenerated: isGenerated,
      requireActivation,
      credentialsEmailSent: credentialsDelivery.delivered,
      activationEmailSent: activationDelivered,
    },
    { status: 201 },
  );
}
