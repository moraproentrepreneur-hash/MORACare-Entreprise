import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { notifyPlatform } from '@/lib/notifications/publish.server';

/**
 * Dépôt d'un message depuis le formulaire Contact de la vitrine.
 *
 * Le visiteur n'étant pas authentifié, l'insertion passe par la clé secrète
 * côté serveur. Les politiques RLS réservent la lecture au Super Admin, qui
 * traite les messages depuis « Prises de contact ».
 *
 * La référence métier renvoyée permet au visiteur de citer sa demande, et
 * alimente le message WhatsApp préparé côté navigateur.
 */

const contactSchema = z.object({
  full_name: z.string().trim().min(2, 'Nom complet requis.').max(200),
  email: z.string().trim().email('Adresse e-mail invalide.').max(255),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  subject: z.string().trim().min(2, 'Sujet requis.').max(255),
  message: z.string().trim().min(5, 'Message requis.').max(4000),
});

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));

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
  } catch {
    // L'état de configuration du serveur ne regarde pas le visiteur.
    return NextResponse.json(
      { error: 'Le service de contact est momentanément indisponible.' },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from('contact_requests')
    .insert({
      full_name: input.full_name,
      email: input.email.toLowerCase(),
      phone: input.phone || null,
      subject: input.subject,
      message: input.message,
      status: 'pending',
    })
    .select('id, business_reference')
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Votre message n'a pas pu être enregistré. Réessayez dans un instant." },
      { status: 500 },
    );
  }

  await notifyPlatform(admin, {
    category: 'contact_request',
    severity: 'info',
    title: 'Nouvelle prise de contact',
    message: `${input.full_name} — ${input.subject}`,
    link: '/admin/notifications',
    metadata: {
      reference: data.business_reference,
      requestId: data.id,
      fullName: input.full_name,
      email: input.email.toLowerCase(),
      phone: input.phone || null,
      subject: input.subject,
      message: input.message,
    },
  });

  return NextResponse.json(
    { success: true, reference: data.business_reference },
    { status: 201 },
  );
}
