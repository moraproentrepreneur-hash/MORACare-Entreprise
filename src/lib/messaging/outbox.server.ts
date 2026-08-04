import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/database';

/**
 * File des messages sortants.
 *
 * Tout message quitte MORACare par ici, quel que soit son canal. L'appelant
 * décrit *ce qu'il veut dire* ; il ne sait rien du fournisseur qui l'acheminera.
 * Ajouter WhatsApp Business ou Wakati demain se résume à écrire un adaptateur
 * et à le déclarer dans `PROVIDERS` : aucun appelant ne change.
 *
 * Le message est **d'abord enregistré**, puis expédié. Cet ordre est délibéré :
 * si l'expédition échoue — fournisseur absent, quota dépassé, panne réseau — le
 * message reste en base, visible et rejouable. L'inverse perdrait silencieusement
 * un code d'activation, et l'utilisateur attendrait un courriel qui n'existe pas.
 */

type Client = SupabaseClient<AppDatabase>;

export type MessageChannel = 'email' | 'whatsapp' | 'sms';

export interface OutgoingMessage {
  channel?: MessageChannel;
  /** Adresse e-mail ou numéro, selon le canal. */
  recipient: string;
  subject?: string;
  body: string;
  /** Identifie le gabarit, pour retrouver tous les envois d'un même type. */
  template: string;
  relatedType?: string;
  relatedId?: string;
}

export interface DeliveryResult {
  /** La trace en base est toujours créée, même si l'envoi échoue. */
  reference: string | null;
  delivered: boolean;
  provider: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Adaptateurs de transport
// ---------------------------------------------------------------------------

interface TransportResult {
  providerMessageId?: string;
}

interface Transport {
  readonly name: string;
  /** Vrai si le fournisseur est configuré et utilisable maintenant. */
  isConfigured(): boolean;
  send(message: OutgoingMessage): Promise<TransportResult>;
}

/**
 * Resend — API HTTP, aucune dépendance à installer.
 *
 * Activé par `RESEND_API_KEY`. `MORACARE_MAIL_FROM` doit porter une adresse d'un
 * domaine vérifié chez le fournisseur, sans quoi il refusera l'envoi.
 */
const resendTransport: Transport = {
  name: 'resend',

  isConfigured: () => Boolean(process.env.RESEND_API_KEY && process.env.MORACARE_MAIL_FROM),

  async send(message) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MORACARE_MAIL_FROM,
        to: [message.recipient],
        subject: message.subject ?? 'MORACare',
        text: message.body,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      throw new Error(payload?.message ?? `Le fournisseur a répondu ${response.status}.`);
    }

    return { providerMessageId: payload?.id };
  },
};

/**
 * Transports disponibles, par canal.
 *
 * WhatsApp et SMS n'en ont pas encore : les messages de ces canaux sont
 * enregistrés en attente, jamais perdus. Le jour où Wakati est branché, il
 * suffit de l'ajouter ici.
 */
const PROVIDERS: Record<MessageChannel, Transport[]> = {
  email: [resendTransport],
  whatsapp: [],
  sms: [],
};

const selectTransport = (channel: MessageChannel): Transport | null =>
  PROVIDERS[channel].find((transport) => transport.isConfigured()) ?? null;

/** Vrai si au moins un fournisseur peut acheminer ce canal. */
export const canDeliver = (channel: MessageChannel = 'email'): boolean =>
  selectTransport(channel) !== null;

// ---------------------------------------------------------------------------
// Envoi
// ---------------------------------------------------------------------------

export const dispatchMessage = async (
  admin: Client,
  message: OutgoingMessage,
): Promise<DeliveryResult> => {
  const channel = message.channel ?? 'email';

  const { data: queued, error: queueError } = await admin
    .from('message_outbox')
    .insert({
      channel,
      recipient: message.recipient,
      subject: message.subject ?? null,
      body: message.body,
      template: message.template,
      status: 'pending',
      related_type: message.relatedType ?? null,
      related_id: message.relatedId ?? null,
    })
    .select('id, business_reference')
    .single();

  // Impossible d'enregistrer : on ne tente pas d'envoyer non plus. Un message
  // parti sans trace serait pire qu'un message non parti.
  if (queueError || !queued) {
    return {
      reference: null,
      delivered: false,
      provider: null,
      error: queueError?.message ?? "Le message n'a pas pu être enregistré.",
    };
  }

  const transport = selectTransport(channel);

  if (!transport) {
    await admin
      .from('message_outbox')
      .update({
        status: 'pending',
        error: `Aucun fournisseur configuré pour le canal « ${channel} ».`,
      })
      .eq('id', queued.id);

    return {
      reference: queued.business_reference,
      delivered: false,
      provider: null,
      error: `Aucun fournisseur configuré pour le canal « ${channel} ».`,
    };
  }

  try {
    const result = await transport.send(message);

    await admin
      .from('message_outbox')
      .update({
        status: 'sent',
        provider: transport.name,
        provider_message_id: result.providerMessageId ?? null,
        sent_at: new Date().toISOString(),
        attempts: 1,
        error: null,
      })
      .eq('id', queued.id);

    return {
      reference: queued.business_reference,
      delivered: true,
      provider: transport.name,
      error: null,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "L'envoi a échoué.";

    await admin
      .from('message_outbox')
      .update({ status: 'failed', provider: transport.name, attempts: 1, error: reason })
      .eq('id', queued.id);

    return {
      reference: queued.business_reference,
      delivered: false,
      provider: transport.name,
      error: reason,
    };
  }
};
