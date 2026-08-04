import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * Dépôt d'une demande d'abonnement depuis la Landing Page.
 *
 * BP05 §3.2 : le visiteur qui soumet le formulaire devient un « Demandeur » et
 * une demande est créée dans le module Demandes d'inscription du Super Admin.
 * LP-001 §3 en fait l'unique action attendue du visiteur.
 *
 * Le visiteur n'étant pas authentifié, l'insertion passe par la clé
 * `service_role` côté serveur. Les politiques RLS ne laissent lire ces demandes
 * qu'au Super Admin.
 *
 * **Les montants ne sont jamais acceptés du navigateur.** Le client envoie le
 * code de la formule et le nombre de mois ; le serveur relit la grille en base
 * et recalcule tarif, total et économie. Sans cela, une demande à zéro franc
 * suffirait à une requête forgée, et le Super Admin traiterait un dossier au
 * mauvais prix sans le savoir.
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

  /** Offre retenue. Absente pour une demande de démonstration générique. */
  plan_code: z.string().trim().max(30).optional().nullable(),
  duration_months: z.number().int().min(1).max(36).optional().nullable(),
  payment_method: z.string().trim().max(30).optional().nullable(),
  start_option: z.enum(['immediate', 'next_month', 'custom']).optional().nullable(),
  start_date: z.string().trim().max(20).optional().nullable(),
});

/** Premier jour du mois suivant, en date seule. */
const firstDayNextMonth = (): string => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10);
};

const resolveStartDate = (
  option: 'immediate' | 'next_month' | 'custom' | null | undefined,
  submitted: string | null | undefined,
): string | null => {
  if (option === 'next_month') return firstDayNextMonth();
  if (option === 'custom' && submitted && /^\d{4}-\d{2}-\d{2}$/.test(submitted)) return submitted;
  // « Dès validation » n'a pas de date : elle dépend de la réponse de l'éditeur.
  return null;
};

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

  // ---------------------------------------------------------------------
  // Tarification, recalculée en base
  // ---------------------------------------------------------------------
  let planId: string | null = null;
  let planName: string | null = null;
  let monthlyPrice: number | null = null;
  let totalPrice: number | null = null;
  let savings: number | null = null;
  let currency = 'KMF';
  let months: number | null = null;

  if (input.plan_code) {
    const { data: plan } = await admin
      .from('subscription_plans')
      .select('id, code, name, price_amount, price_currency')
      .eq('code', input.plan_code)
      .eq('is_active', true)
      .maybeSingle();

    if (!plan) {
      return NextResponse.json({ error: "Cette formule n'existe pas." }, { status: 400 });
    }

    planId = plan.id;
    planName = plan.name;
    currency = plan.price_currency;

    const reference = Number(plan.price_amount);

    if (reference > 0) {
      months = input.duration_months ?? 1;

      const { data: tier } = await admin
        .from('plan_durations')
        .select('monthly_price, total_price')
        .eq('plan_id', plan.id)
        .eq('months', months)
        .maybeSingle();

      if (!tier) {
        return NextResponse.json(
          { error: "Cette durée n'est pas proposée pour cette formule." },
          { status: 400 },
        );
      }

      monthlyPrice = Number(tier.monthly_price);
      totalPrice = Number(tier.total_price);
      savings = Math.max(0, reference * months - totalPrice);
    } else {
      // Formule gratuite : ni durée ni montant, quoi qu'ait envoyé le client.
      monthlyPrice = 0;
      totalPrice = 0;
      savings = 0;
    }
  }

  // Le mode de paiement doit exister et être actif.
  let paymentMethod: string | null = null;
  if (input.payment_method && totalPrice !== null && totalPrice > 0) {
    const { data: method } = await admin
      .from('payment_methods')
      .select('code')
      .eq('code', input.payment_method)
      .eq('is_active', true)
      .maybeSingle();

    if (!method) {
      return NextResponse.json({ error: "Ce mode de paiement n'est pas proposé." }, { status: 400 });
    }
    paymentMethod = method.code;
  }

  const { data: created, error } = await admin
    .from('registration_requests')
    .insert({
      full_name: input.full_name,
      email: input.email.toLowerCase(),
      phone: input.phone || null,
      establishment_name: input.establishment_name,
      establishment_type: input.establishment_type ?? null,
      message: input.message || null,
      status: 'pending',
      requested_plan_id: planId,
      plan_code: input.plan_code ?? null,
      plan_name: planName,
      duration_months: months,
      monthly_price: monthlyPrice,
      total_price: totalPrice,
      savings_amount: savings,
      price_currency: currency,
      payment_method: paymentMethod,
      start_option: input.start_option ?? null,
      start_date: resolveStartDate(input.start_option, input.start_date),
    })
    .select('business_reference')
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, reference: created.business_reference },
    { status: 201 },
  );
}
