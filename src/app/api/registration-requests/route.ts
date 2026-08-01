import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * Dépôt d'une demande de démonstration depuis la Landing Page.
 *
 * BP05 §3.2 : le visiteur qui soumet le formulaire devient un « Demandeur » et
 * une demande est créée dans le module Demandes d'inscription du Super Admin.
 * LP-001 §3 en fait l'unique action attendue du visiteur.
 *
 * Le visiteur n'étant pas authentifié, l'insertion passe par la clé
 * `service_role` côté serveur. Les politiques RLS ne laissent lire ces demandes
 * qu'au Super Admin.
 */

const requestSchema = z.object({
  full_name: z.string().trim().min(2, 'Nom complet requis.').max(200),
  email: z.string().trim().email('Adresse e-mail invalide.').max(255),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  establishment_name: z.string().trim().min(2, "Nom de l'établissement requis.").max(255),
  establishment_type: z
    .enum(['cabinet', 'clinique', 'centre_medical', 'hopital', 'laboratoire', 'imagerie', 'ong'])
    .optional(),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

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
    // Ne jamais exposer la cause exacte : le visiteur n'a pas à connaître
    // l'état de configuration du serveur.
    return NextResponse.json(
      { error: 'Le service de demande est momentanément indisponible.' },
      { status: 503 },
    );
  }

  const { error } = await admin.from('registration_requests').insert({
    full_name: input.full_name,
    email: input.email.toLowerCase(),
    phone: input.phone || null,
    establishment_name: input.establishment_name,
    establishment_type: input.establishment_type ?? null,
    message: input.message || null,
    status: 'pending',
  });

  if (error) {
    return NextResponse.json(
      { error: "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
