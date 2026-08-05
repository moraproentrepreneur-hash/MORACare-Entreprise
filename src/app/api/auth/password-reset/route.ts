import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { dispatchMessage } from '@/lib/messaging/outbox.server';
import { passwordResetAcknowledgement } from '@/lib/messaging/templates';
import { notifyPlatform } from '@/lib/notifications/publish.server';

/**
 * Dépôt d'une demande « mot de passe oublié ».
 *
 * MORACare ne renvoie pas de lien de réinitialisation par courriel : les comptes
 * sont créés et administrés par MORA Shawiri, et un lien auto-porteur envoyé à
 * une adresse potentiellement compromise contournerait ce contrôle. La demande
 * est donc enregistrée, puis traitée par un administrateur qui délivre un mot de
 * passe temporaire.
 *
 * La réponse est **toujours la même**, que l'identifiant existe ou non. Répondre
 * « compte inconnu » transformerait ce formulaire public en outil d'énumération
 * des comptes du personnel soignant.
 */

const schema = z.object({
  identifier: z.string().trim().min(1, 'Identifiant requis.').max(255),
});

const CONFIRMATION =
  'Votre demande a été enregistrée. Elle sera traitée par un administrateur.';

const looksLikeEmail = (value: string): boolean => value.includes('@');

const clientAddress = (request: Request): string =>
  (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() ||
  request.headers.get('x-real-ip') ||
  'inconnue';

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Requête invalide.' },
      { status: 400 },
    );
  }

  const identifier = parsed.data.identifier.toLowerCase();

  let admin;
  try {
    admin = createAdminSupabaseClient();
  } catch {
    return NextResponse.json(
      { error: 'Le service est momentanément indisponible. Réessayez dans un instant.' },
      { status: 503 },
    );
  }

  // Colonne choisie selon la forme de la saisie : la valeur ne doit jamais être
  // interpolée dans un filtre composé.
  const column = looksLikeEmail(identifier) ? 'email' : 'username';

  const { data: profile } = await admin
    .from('profiles')
    .select('id, first_name, last_name, email, establishment_id')
    .eq(column, identifier)
    .is('deleted_at', null)
    .maybeSingle();

  // Une demande est enregistrée même sans profil correspondant : le Super Admin
  // voit ainsi les saisies erronées — un utilisateur qui se trompe d'identifiant
  // a besoin d'aide, pas d'un silence.
  const { data: created, error } = await admin
    .from('password_reset_requests')
    .insert({
      profile_id: profile?.id ?? null,
      establishment_id: profile?.establishment_id ?? null,
      identifier,
      full_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : null,
      email: profile?.email ?? null,
      status: 'pending',
      ip_address: clientAddress(request),
    })
    .select('business_reference')
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant." },
      { status: 500 },
    );
  }

  await notifyPlatform(admin, {
    category: 'password_reset',
    severity: 'warning',
    title: 'Demande de réinitialisation',
    message: profile
      ? `${profile.first_name} ${profile.last_name} — ${identifier}`
      : `Identifiant inconnu — ${identifier}`,
    link: '/admin/reinitialisations',
    establishmentId: profile?.establishment_id ?? null,
    metadata: {
      reference: created.business_reference,
      identifier,
      email: profile?.email ?? null,
      accountFound: Boolean(profile),
    },
  });

  // Accusé de réception, uniquement si une adresse est connue. Il n'expose rien :
  // il ne part que vers l'adresse déjà enregistrée pour ce compte.
  if (profile?.email) {
    const message = passwordResetAcknowledgement({
      identifier,
      reference: created.business_reference,
    });

    await dispatchMessage(admin, {
      recipient: profile.email,
      subject: message.subject,
      body: message.body,
      template: message.template,
      relatedType: 'password_reset_requests',
      relatedId: profile.id,
    });
  }

  return NextResponse.json({ success: true, message: CONFIRMATION }, { status: 201 });
}
