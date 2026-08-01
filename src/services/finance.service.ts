import { auditColumns, failIf, getClient, type WriteContext } from './base.service';
import type { Invoice } from '@/types';

/** Facturation (BP22A). */

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceInput {
  patient_id: string;
  items: InvoiceLineInput[];
  tax_amount?: number;
  discount_amount?: number;
  insurance_coverage_amount?: number;
}

const PATIENT_JOIN = 'patient:patients(first_name, last_name)';
const ITEMS_JOIN = 'items:invoice_items(description, quantity, unit_price)';

type JoinedInvoice = {
  patient?: { first_name: string; last_name: string } | null;
  items?: Array<{ description: string; quantity: number; unit_price: number }> | null;
};

export const listInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await getClient()
    .from('invoices')
    .select(`*, ${PATIENT_JOIN}, ${ITEMS_JOIN}`)
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false });

  failIf(error, 'Chargement des factures');

  return (data ?? []).map((row) => {
    const joined = row as unknown as JoinedInvoice;
    return {
      id: row.id,
      business_reference: row.business_reference,
      establishment_id: row.establishment_id ?? '',
      patient_id: row.patient_id ?? '',
      patient_name: joined.patient
        ? `${joined.patient.first_name} ${joined.patient.last_name}`.trim()
        : '',
      invoice_date: row.invoice_date ?? row.created_at,
      items: (joined.items ?? []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })),
      subtotal: Number(row.subtotal),
      tax_amount: Number(row.tax_amount ?? 0),
      discount_amount: Number(row.discount_amount ?? 0),
      total_amount: Number(row.total_amount),
      paid_amount: Number(row.paid_amount ?? 0),
      status: (row.status ?? 'pending') as Invoice['status'],
      created_at: row.created_at,
    };
  });
};

/**
 * Crée une facture et ses lignes.
 *
 * Les totaux sont recalculés ici à partir des lignes : ne jamais faire confiance
 * à un total transmis par le client.
 */
export const createInvoice = async (input: InvoiceInput, ctx: WriteContext): Promise<void> => {
  const client = getClient();

  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const tax = input.tax_amount ?? 0;
  const discount = input.discount_amount ?? 0;
  const insurance = input.insurance_coverage_amount ?? 0;
  const total = Math.max(0, subtotal + tax - discount - insurance);

  const { data, error } = await client
    .from('invoices')
    .insert({
      ...auditColumns(ctx),
      patient_id: input.patient_id,
      subtotal,
      tax_amount: tax,
      discount_amount: discount,
      insurance_coverage_amount: insurance,
      total_amount: total,
      paid_amount: 0,
      status: 'pending',
    })
    .select('id')
    .single();

  failIf(error, 'Création de la facture');

  const invoiceId = (data as { id: string }).id;

  if (input.items.length > 0) {
    const { error: itemsError } = await client.from('invoice_items').insert(
      input.items.map((i) => ({
        establishment_id: ctx.establishmentId,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        invoice_id: invoiceId,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    );

    // La facture existe déjà : signaler l'échec partiel plutôt que de le taire.
    failIf(itemsError, 'Enregistrement des lignes de facture');
  }
};
