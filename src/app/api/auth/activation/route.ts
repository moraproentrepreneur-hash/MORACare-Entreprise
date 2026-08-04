import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  CODE_VALIDITY_MINUTES,
  consumeVerificationCode,
  describeVerificationFailure,
  issueVerificationCode,
} from '@/lib/security/verification.server';
import { dispatchMessage } from '@/lib/messaging/outbox.server';
import { activationCodeMessage } from '@/lib/messaging/templates';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/database';

/**
 * Activation d'un compte par code à six chiffres.
 *
 * Tant que le code n'est pas saisi, le compte reste inactif et le tableau de
 * bord lui est refusé. C'est ce qui garantit que l'adresse déclarée à
 * l'inscription appartient bien à la personne — condition nécessaire pour lui
 * confier ensuite des données de santé.
 *
 * `POST` envoie ou renvoie un code, `PUT` le vérifie.
 */

const verifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Le code comporte six chiffres.'),
});

/** Contexte commun aux deux verbes : session valide et profil à activer. */
const requirePendingProfile = async () => {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'Authentification requise.' }, { status: 401 }) };
  }

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Le service est momentanément indisponible.' },
        { status: 503 },
      ),
    };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, first_name, email, establishment_id, activation_required, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return { error: NextResponse.json({ error: 'Compte introuvable.' }, { status: 404 }) };
  }

  return { admin, profile };
};

const establishmentName = async (
  admin: SupabaseClient<AppDatabase>,
  establishmentId: string | null,
): Promise<string> => {
  if (!establishmentId) return 'MORACare';
  const { data } = await admin
    .from('establishments')
    .select('name')
    .eq('id', establishmentId)
    .maybeSingle();
  return data?.name ?? 'MORACare';
};

/** Envoi ou renvoi du code. */
export async function POST() {
  const context = await requirePendingProfile();
  if ('error' in context) return context.error;

  const { admin, profile } = context;

  if (!profile.activation_required) {
    return NextResponse.json({ success: true, alreadyActive: true });
  }

  if (!profile.email) {
    return NextResponse.json(
      { error: "Aucune adresse e-mail n'est enregistrée pour ce compte." },
      { status: 400 },
    );
  }

  const { code } = await issueVerificationCode(admin, profile.id, 'account_activation');

  const message = activationCodeMessage({
    firstName: profile.first_name,
    establishmentName: await establishmentName(admin, profile.establishment_id),
    code,
    validMinutes: CODE_VALIDITY_MINUTES,
  });

  const delivery = await dispatchMessage(admin, {
    recipient: profile.email,
    subject: message.subject,
    body: message.body,
    template: message.template,
    relatedType: 'profiles',
    relatedId: profile.id,
  });

  return NextResponse.json({
    success: true,
    delivered: delivery.delivered,
    /*
     * Le code n'est jamais renvoyé au navigateur. Si aucun fournisseur n'est
     * configuré, le message reste en file et le Super Admin le relaie : mieux
     * vaut un acheminement manuel qu'un secret exposé dans une réponse HTTP.
     */
    reference: delivery.reference,
    email: profile.email.replace(/^(.).*(@.*)$/, '$1•••$2'),
    validMinutes: CODE_VALIDITY_MINUTES,
  });
}

/** Vérification du code saisi. */
export async function PUT(request: Request) {
  const context = await requirePendingProfile();
  if ('error' in context) return context.error;

  const { admin, profile } = context;

  const parsed = verifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Code invalide.' },
      { status: 400 },
    );
  }

  if (!profile.activation_required) {
    return NextResponse.json({ success: true, alreadyActive: true });
  }

  const outcome = await consumeVerificationCode(
    admin,
    profile.id,
    'account_activation',
    parsed.data.code,
  );

  if (!outcome.ok) {
    return NextResponse.json({ error: describeVerificationFailure(outcome.reason) }, { status: 400 });
  }

  const now = new Date().toISOString();

  await admin
    .from('profiles')
    .update({ activation_required: false, email_verified_at: now, is_active: true })
    .eq('id', profile.id);

  await admin.from('audit_logs').insert({
    establishment_id: profile.establishment_id,
    user_id: profile.id,
    action: 'account_activated',
    entity_name: 'profiles',
    entity_id: profile.id,
  });

  return NextResponse.json({ success: true });
}
