import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * Création d'un compte utilisateur d'établissement (UG02 §5-6).
 *
 * Traitement serveur obligatoire : la création d'un compte passe par la clé
 * `service_role`, qui ne doit jamais atteindre le navigateur.
 *
 * BP06 §14 et TD06 §7 exigent que le contrôle d'accès soit vérifié côté
 * serveur. Le rôle de l'appelant est donc relu en base ici, sans faire
 * confiance à quoi que ce soit d'envoyé par le client.
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
  password: z.string().min(12, 'Le mot de passe doit contenir au moins 12 caractères.'),
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

  // Le profil applicatif est créé par le trigger `handle_new_auth_user` à
  // partir de ces métadonnées : rien n'est inséré à la main dans `profiles`.
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username: input.username || input.email.split('@')[0],
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

  // Le service n'est renseigné qu'après coup : le trigger ne le reçoit pas.
  if (input.department && created.user) {
    await admin.from('profiles').update({ department: input.department }).eq('id', created.user.id);
  }

  await admin.from('audit_logs').insert({
    establishment_id: establishmentId,
    user_id: user.id,
    action: 'user_created',
    entity_name: 'profiles',
    entity_id: created.user?.id ?? null,
    new_values: { email: input.email, role: input.role, establishment_id: establishmentId },
  });

  return NextResponse.json({ success: true, id: created.user?.id ?? null }, { status: 201 });
}
