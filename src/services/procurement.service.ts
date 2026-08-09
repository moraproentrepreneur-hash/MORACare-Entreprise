import { auditColumns, failIf, getClient, type WriteContext } from './base.service';

/**
 * Achats, approvisionnements et logistique interne (BP17, BP18 §12).
 *
 * Le circuit va du besoin exprimé à la mise en stock : demande d'achat,
 * validation, consultation des fournisseurs, comparaison, commande, réception,
 * contrôle qualité, entrée en stock, puis retours éventuels.
 *
 * Deux opérations ne passent pas par ce service mais par la base : la mise en
 * stock d'une réception et l'expédition d'un retour. Elles créent des mouvements
 * et doivent être atomiques ; les confier à l'applicatif exposerait à une
 * réception à moitié stockée.
 */

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

export type RequisitionState =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'ordered'
  | 'closed'
  | 'canceled';

export const REQUISITION_LABELS: Record<RequisitionState, string> = {
  draft: 'Brouillon',
  submitted: 'En validation',
  approved: 'Validée',
  rejected: 'Refusée',
  ordered: 'Commandée',
  closed: 'Clôturée',
  canceled: 'Annulée',
};

export const REQUISITION_TONES: Record<
  RequisitionState,
  'good' | 'warn' | 'bad' | 'neutral' | 'info'
> = {
  draft: 'neutral',
  submitted: 'warn',
  approved: 'good',
  rejected: 'bad',
  ordered: 'info',
  closed: 'neutral',
  canceled: 'neutral',
};

export type PurchaseState =
  | 'draft'
  | 'awaiting_validation'
  | 'validated'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'canceled';

export const PURCHASE_LABELS: Record<PurchaseState, string> = {
  draft: 'Brouillon',
  awaiting_validation: 'En validation',
  validated: 'Validé',
  ordered: 'Commandé',
  partially_received: 'Livré partiellement',
  received: 'Livré',
  closed: 'Clôturé',
  canceled: 'Annulé',
};

export type QualityResult = 'accepted' | 'accepted_with_reserve' | 'refused';

export const QUALITY_LABELS: Record<QualityResult, string> = {
  accepted: 'Acceptée',
  accepted_with_reserve: 'Acceptée avec réserve',
  refused: 'Refusée',
};

/** BP17 §8. */
export const CONSULTATION_TYPES = [
  { value: 'devis', label: 'Demande de devis' },
  { value: 'consultation', label: 'Consultation directe' },
  { value: 'appel_offres', label: "Appel d'offres" },
  { value: 'privilegie', label: 'Fournisseur privilégié' },
] as const;

/** BP17 §17. */
export const RETURN_TYPES = [
  { value: 'total', label: 'Retour total' },
  { value: 'partiel', label: 'Retour partiel' },
  { value: 'remplacement', label: 'Remplacement' },
  { value: 'avoir', label: 'Avoir fournisseur' },
] as const;

export const PRIORITIES = [
  { value: 'basse', label: 'Basse' },
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'urgente', label: 'Urgente' },
] as const;

// ---------------------------------------------------------------------------
// Modèles
// ---------------------------------------------------------------------------

export interface RequisitionLine {
  id: string;
  itemId: string | null;
  label: string;
  quantity: number;
  unit: string | null;
  estimatedPrice: number;
  notes: string | null;
}

export interface Requisition {
  id: string;
  reference: string;
  requestingService: string;
  pharmacyId: string | null;
  justification: string;
  priority: string;
  neededBy: string | null;
  status: RequisitionState;
  requestedByName: string | null;
  submittedAt: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  lines: RequisitionLine[];
  /** Somme des lignes, pour situer l'engagement avant même la consultation. */
  estimatedTotal: number;
}

export interface QuoteLine {
  id: string;
  itemId: string | null;
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface SupplierQuote {
  id: string;
  reference: string;
  requisitionId: string | null;
  supplierId: string;
  supplierName: string;
  consultationType: string;
  requestedOn: string;
  receivedOn: string | null;
  validUntil: string | null;
  totalAmount: number;
  deliveryDays: number | null;
  warrantyMonths: number | null;
  shippingCost: number;
  paymentTerms: string | null;
  qualityNote: number | null;
  isSelected: boolean;
  selectionReason: string | null;
  lines: QuoteLine[];
}

export interface PurchaseOrderLine {
  id: string;
  itemId: string;
  itemName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  pharmacyId: string | null;
  pharmacyName: string | null;
  requisitionId: string | null;
  status: PurchaseState;
  orderedOn: string;
  expectedOn: string | null;
  receivedOn: string | null;
  priority: string;
  deliveryMode: string | null;
  paymentTerms: string | null;
  taxAmount: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  notes: string | null;
  lines: PurchaseOrderLine[];
}

export interface ReceiptLine {
  id: string;
  orderLineId: string | null;
  itemId: string;
  itemName: string;
  quantityReceived: number;
  lotNumber: string | null;
  manufacturedOn: string | null;
  expiresOn: string | null;
  serialNumber: string | null;
  unitPrice: number;
  observations: string | null;
}

export interface PurchaseReceipt {
  id: string;
  reference: string;
  orderId: string;
  orderReference: string;
  supplierName: string;
  pharmacyId: string | null;
  pharmacyName: string | null;
  deliveryNote: string | null;
  receivedOn: string;
  receivedByName: string | null;
  qualityResult: QualityResult | null;
  qualityNote: string | null;
  controlledByName: string | null;
  controlledAt: string | null;
  stockedAt: string | null;
  notes: string | null;
  lines: ReceiptLine[];
}

export interface SupplierReturnLine {
  id: string;
  itemId: string;
  itemName: string;
  lotId: string | null;
  lotNumber: string | null;
  quantity: number;
  unitPrice: number;
  observations: string | null;
}

export interface SupplierReturn {
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  orderId: string | null;
  receiptId: string | null;
  pharmacyId: string | null;
  returnType: string;
  reason: string;
  status: string;
  returnedOn: string;
  creditAmount: number;
  postedAt: string | null;
  lines: SupplierReturnLine[];
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

interface NamedProfile {
  first_name?: string | null;
  last_name?: string | null;
}

const fullName = (person: NamedProfile | null | undefined): string | null =>
  person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : null;

const num = (value: unknown): number => Number(value ?? 0);

// ---------------------------------------------------------------------------
// Demandes d'achat (BP17 §6, §7)
// ---------------------------------------------------------------------------

const REQUISITION_SELECT = `
  *,
  requester:profiles!purchase_requisitions_requested_by_fkey(first_name, last_name),
  decider:profiles!purchase_requisitions_decided_by_fkey(first_name, last_name),
  lines:purchase_requisition_lines(*)
`;

export const listRequisitions = async (): Promise<Requisition[]> => {
  const { data, error } = await getClient()
    .from('purchase_requisitions')
    .select(REQUISITION_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des demandes d’achat');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      requester?: NamedProfile | null;
      decider?: NamedProfile | null;
      lines?: {
        id: string;
        item_id: string | null;
        label: string;
        quantity: number;
        unit: string | null;
        estimated_price: number | string;
        notes: string | null;
      }[];
    };

    const lines = (joined.lines ?? []).map((line) => ({
      id: line.id,
      itemId: line.item_id,
      label: line.label,
      quantity: line.quantity,
      unit: line.unit,
      estimatedPrice: num(line.estimated_price),
      notes: line.notes,
    }));

    return {
      id: row.id,
      reference: row.business_reference,
      requestingService: row.requesting_service,
      pharmacyId: row.pharmacy_id,
      justification: row.justification,
      priority: row.priority,
      neededBy: row.needed_by,
      status: row.status as RequisitionState,
      requestedByName: fullName(joined.requester),
      submittedAt: row.submitted_at,
      decidedByName: fullName(joined.decider),
      decidedAt: row.decided_at,
      decisionNote: row.decision_note,
      createdAt: row.created_at,
      lines,
      estimatedTotal: lines.reduce(
        (total, line) => total + line.quantity * line.estimatedPrice,
        0,
      ),
    };
  });
};

export interface RequisitionInput {
  requestingService: string;
  pharmacyId: string | null;
  justification: string;
  priority: string;
  neededBy: string | null;
  lines: {
    itemId: string | null;
    label: string;
    quantity: number;
    unit: string | null;
    estimatedPrice: number;
  }[];
}

export const createRequisition = async (
  input: RequisitionInput,
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const { data, error } = await client
    .from('purchase_requisitions')
    .insert({
      ...auditColumns(ctx),
      requesting_service: input.requestingService,
      pharmacy_id: input.pharmacyId,
      justification: input.justification.trim(),
      priority: input.priority,
      needed_by: input.neededBy || null,
      status: 'draft',
      requested_by: ctx.userId,
    })
    .select('id')
    .single();

  failIf(error, 'Création de la demande d’achat');
  const id = data?.id as string;

  const { error: linesError } = await client.from('purchase_requisition_lines').insert(
    input.lines.map((line) => ({
      requisition_id: id,
      item_id: line.itemId,
      label: line.label.trim(),
      quantity: line.quantity,
      unit: line.unit,
      estimated_price: line.estimatedPrice,
    })),
  );

  if (linesError) {
    // Une demande sans ligne n'exprime aucun besoin : mieux vaut la retirer que
    // de laisser un en-tête vide dans le circuit de validation.
    await client.from('purchase_requisitions').delete().eq('id', id);
    failIf(linesError, 'Enregistrement des lignes de la demande');
  }

  return id;
};

export const submitRequisition = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('purchase_requisitions')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
    .eq('status', 'draft');

  failIf(error, 'Soumission de la demande');
};

/** BP17 §7 : la décision est tracée, avec son auteur et sa justification. */
export const decideRequisition = async (
  id: string,
  decision: 'approved' | 'rejected',
  note: string | null,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('purchase_requisitions')
    .update({
      status: decision,
      decided_by: userId,
      decided_at: new Date().toISOString(),
      decision_note: note?.trim() || null,
      updated_by: userId,
    })
    .eq('id', id);

  failIf(error, 'Enregistrement de la décision');
};

export const cancelRequisition = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('purchase_requisitions')
    .update({ status: 'canceled', updated_by: userId })
    .eq('id', id);

  failIf(error, 'Annulation de la demande');
};

// ---------------------------------------------------------------------------
// Consultations et devis (BP17 §8, §9)
// ---------------------------------------------------------------------------

export const listQuotes = async (requisitionId?: string): Promise<SupplierQuote[]> => {
  let request = getClient()
    .from('supplier_quotes')
    .select('*, supplier:suppliers(name), lines:supplier_quote_lines(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (requisitionId) request = request.eq('requisition_id', requisitionId);

  const { data, error } = await request;
  failIf(error, 'Chargement des offres');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      supplier?: { name: string } | null;
      lines?: {
        id: string;
        item_id: string | null;
        label: string;
        quantity: number;
        unit_price: number | string;
      }[];
    };

    return {
      id: row.id,
      reference: row.business_reference,
      requisitionId: row.requisition_id,
      supplierId: row.supplier_id,
      supplierName: joined.supplier?.name ?? '',
      consultationType: row.consultation_type,
      requestedOn: row.requested_on,
      receivedOn: row.received_on,
      validUntil: row.valid_until,
      totalAmount: num(row.total_amount),
      deliveryDays: row.delivery_days,
      warrantyMonths: row.warranty_months,
      shippingCost: num(row.shipping_cost),
      paymentTerms: row.payment_terms,
      qualityNote: row.quality_note,
      isSelected: row.is_selected,
      selectionReason: row.selection_reason,
      lines: (joined.lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        label: line.label,
        quantity: line.quantity,
        unitPrice: num(line.unit_price),
      })),
    };
  });
};

export interface QuoteInput {
  requisitionId: string | null;
  supplierId: string;
  consultationType: string;
  receivedOn: string | null;
  validUntil: string | null;
  deliveryDays: number | null;
  warrantyMonths: number | null;
  shippingCost: number;
  paymentTerms: string | null;
  qualityNote: number | null;
  lines: { itemId: string | null; label: string; quantity: number; unitPrice: number }[];
}

export const createQuote = async (input: QuoteInput, ctx: WriteContext): Promise<void> => {
  const client = getClient();

  // Le total est calculé ici et non saisi : la comparaison des offres perdrait
  // tout sens si le montant affiché ne correspondait pas au détail.
  const total =
    input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) +
    input.shippingCost;

  const { data, error } = await client
    .from('supplier_quotes')
    .insert({
      ...auditColumns(ctx),
      requisition_id: input.requisitionId,
      supplier_id: input.supplierId,
      consultation_type: input.consultationType,
      received_on: input.receivedOn || null,
      valid_until: input.validUntil || null,
      total_amount: total,
      delivery_days: input.deliveryDays,
      warranty_months: input.warrantyMonths,
      shipping_cost: input.shippingCost,
      payment_terms: input.paymentTerms?.trim() || null,
      quality_note: input.qualityNote,
    })
    .select('id')
    .single();

  failIf(error, 'Enregistrement de l’offre');
  const id = data?.id as string;

  if (input.lines.length > 0) {
    const { error: linesError } = await client.from('supplier_quote_lines').insert(
      input.lines.map((line) => ({
        quote_id: id,
        item_id: line.itemId,
        label: line.label.trim(),
        quantity: line.quantity,
        unit_price: line.unitPrice,
      })),
    );

    if (linesError) {
      await client.from('supplier_quotes').delete().eq('id', id);
      failIf(linesError, 'Enregistrement des lignes de l’offre');
    }
  }
};

/**
 * Retient une offre (BP17 §9).
 *
 * Les autres offres de la même demande sont désélectionnées d'abord : l'index
 * unique de la base n'en tolère qu'une, et l'ordre inverse le heurterait.
 */
export const selectQuote = async (
  quoteId: string,
  requisitionId: string | null,
  reason: string,
  userId: string,
): Promise<void> => {
  const client = getClient();

  if (requisitionId) {
    const { error } = await client
      .from('supplier_quotes')
      .update({ is_selected: false, updated_by: userId })
      .eq('requisition_id', requisitionId)
      .neq('id', quoteId);

    failIf(error, 'Mise à jour des offres concurrentes');
  }

  const { error } = await client
    .from('supplier_quotes')
    .update({
      is_selected: true,
      selection_reason: reason.trim() || null,
      updated_by: userId,
    })
    .eq('id', quoteId);

  failIf(error, 'Sélection de l’offre');
};

// ---------------------------------------------------------------------------
// Bons de commande (BP17 §10)
// ---------------------------------------------------------------------------

const ORDER_SELECT = `
  *,
  supplier:suppliers(name),
  pharmacy:pharmacies(name),
  lines:purchase_order_lines(*, item:pharmacy_items(name))
`;

export const listPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  const { data, error } = await getClient()
    .from('purchase_orders')
    .select(ORDER_SELECT)
    .is('deleted_at', null)
    .order('ordered_on', { ascending: false });

  failIf(error, 'Chargement des commandes');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      supplier?: { name: string } | null;
      pharmacy?: { name: string } | null;
      lines?: {
        id: string;
        item_id: string;
        quantity_ordered: number;
        quantity_received: number;
        unit_price: number | string;
        item?: { name: string } | null;
      }[];
    };

    return {
      id: row.id,
      reference: row.business_reference,
      supplierId: row.supplier_id,
      supplierName: joined.supplier?.name ?? '',
      pharmacyId: row.pharmacy_id,
      pharmacyName: joined.pharmacy?.name ?? null,
      requisitionId: row.requisition_id,
      status: row.status as PurchaseState,
      orderedOn: row.ordered_on,
      expectedOn: row.expected_on,
      receivedOn: row.received_on,
      priority: row.priority,
      deliveryMode: row.delivery_mode,
      paymentTerms: row.payment_terms,
      taxAmount: num(row.tax_amount),
      discountAmount: num(row.discount_amount),
      shippingCost: num(row.shipping_cost),
      totalAmount: num(row.total_amount),
      notes: row.notes,
      lines: (joined.lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemName: line.item?.name ?? '',
        quantityOrdered: line.quantity_ordered,
        quantityReceived: line.quantity_received,
        unitPrice: num(line.unit_price),
      })),
    };
  });
};

export interface PurchaseOrderInput {
  supplierId: string;
  pharmacyId: string | null;
  requisitionId: string | null;
  quoteId: string | null;
  expectedOn: string | null;
  priority: string;
  deliveryMode: string | null;
  paymentTerms: string | null;
  taxAmount: number;
  discountAmount: number;
  shippingCost: number;
  notes: string | null;
  lines: { itemId: string; quantityOrdered: number; unitPrice: number }[];
}

export const createPurchaseOrder = async (
  input: PurchaseOrderInput,
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const { data, error } = await client
    .from('purchase_orders')
    .insert({
      ...auditColumns(ctx),
      supplier_id: input.supplierId,
      pharmacy_id: input.pharmacyId,
      requisition_id: input.requisitionId,
      quote_id: input.quoteId,
      status: 'ordered',
      expected_on: input.expectedOn || null,
      priority: input.priority,
      delivery_mode: input.deliveryMode?.trim() || null,
      payment_terms: input.paymentTerms?.trim() || null,
      tax_amount: input.taxAmount,
      discount_amount: input.discountAmount,
      shipping_cost: input.shippingCost,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  failIf(error, 'Création du bon de commande');
  const id = data?.id as string;

  const { error: linesError } = await client.from('purchase_order_lines').insert(
    input.lines.map((line) => ({
      order_id: id,
      item_id: line.itemId,
      quantity_ordered: line.quantityOrdered,
      unit_price: line.unitPrice,
    })),
  );

  if (linesError) {
    await client.from('purchase_orders').delete().eq('id', id);
    failIf(linesError, 'Enregistrement des lignes de commande');
  }

  // La demande à l'origine de la commande change d'état : elle a produit son
  // effet et ne doit plus apparaître comme en attente de traitement.
  if (input.requisitionId) {
    await client
      .from('purchase_requisitions')
      .update({ status: 'ordered', updated_by: ctx.userId })
      .eq('id', input.requisitionId);
  }

  return id;
};

export const cancelPurchaseOrder = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('purchase_orders')
    .update({ status: 'canceled', updated_by: userId })
    .eq('id', id);

  failIf(error, 'Annulation de la commande');
};

// ---------------------------------------------------------------------------
// Réceptions et contrôle qualité (BP17 §11 à §13)
// ---------------------------------------------------------------------------

const RECEIPT_SELECT = `
  *,
  order:purchase_orders(business_reference, supplier:suppliers(name)),
  pharmacy:pharmacies(name),
  receiver:profiles!purchase_receipts_received_by_fkey(first_name, last_name),
  controller:profiles!purchase_receipts_controlled_by_fkey(first_name, last_name),
  lines:purchase_receipt_lines(*, item:pharmacy_items(name))
`;

export const listReceipts = async (): Promise<PurchaseReceipt[]> => {
  const { data, error } = await getClient()
    .from('purchase_receipts')
    .select(RECEIPT_SELECT)
    .is('deleted_at', null)
    .order('received_on', { ascending: false });

  failIf(error, 'Chargement des réceptions');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      order?: { business_reference: string; supplier?: { name: string } | null } | null;
      pharmacy?: { name: string } | null;
      receiver?: NamedProfile | null;
      controller?: NamedProfile | null;
      lines?: {
        id: string;
        order_line_id: string | null;
        item_id: string;
        quantity_received: number;
        lot_number: string | null;
        manufactured_on: string | null;
        expires_on: string | null;
        serial_number: string | null;
        unit_price: number | string;
        observations: string | null;
        item?: { name: string } | null;
      }[];
    };

    return {
      id: row.id,
      reference: row.business_reference,
      orderId: row.order_id,
      orderReference: joined.order?.business_reference ?? '',
      supplierName: joined.order?.supplier?.name ?? '',
      pharmacyId: row.pharmacy_id,
      pharmacyName: joined.pharmacy?.name ?? null,
      deliveryNote: row.delivery_note,
      receivedOn: row.received_on,
      receivedByName: fullName(joined.receiver),
      qualityResult: row.quality_result as QualityResult | null,
      qualityNote: row.quality_note,
      controlledByName: fullName(joined.controller),
      controlledAt: row.controlled_at,
      stockedAt: row.stocked_at,
      notes: row.notes,
      lines: (joined.lines ?? []).map((line) => ({
        id: line.id,
        orderLineId: line.order_line_id,
        itemId: line.item_id,
        itemName: line.item?.name ?? '',
        quantityReceived: line.quantity_received,
        lotNumber: line.lot_number,
        manufacturedOn: line.manufactured_on,
        expiresOn: line.expires_on,
        serialNumber: line.serial_number,
        unitPrice: num(line.unit_price),
        observations: line.observations,
      })),
    };
  });
};

export interface ReceiptInput {
  orderId: string;
  pharmacyId: string | null;
  deliveryNote: string | null;
  receivedOn: string;
  notes: string | null;
  lines: {
    orderLineId: string | null;
    itemId: string;
    quantityReceived: number;
    lotNumber: string | null;
    manufacturedOn: string | null;
    expiresOn: string | null;
    serialNumber: string | null;
    unitPrice: number;
    observations: string | null;
  }[];
}

export const createReceipt = async (
  input: ReceiptInput,
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const { data, error } = await client
    .from('purchase_receipts')
    .insert({
      ...auditColumns(ctx),
      order_id: input.orderId,
      pharmacy_id: input.pharmacyId,
      delivery_note: input.deliveryNote?.trim() || null,
      received_on: input.receivedOn,
      received_by: ctx.userId,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  failIf(error, 'Enregistrement de la réception');
  const id = data?.id as string;

  const { error: linesError } = await client.from('purchase_receipt_lines').insert(
    input.lines.map((line) => ({
      receipt_id: id,
      order_line_id: line.orderLineId,
      item_id: line.itemId,
      quantity_received: line.quantityReceived,
      lot_number: line.lotNumber?.trim() || null,
      manufactured_on: line.manufacturedOn || null,
      expires_on: line.expiresOn || null,
      serial_number: line.serialNumber?.trim() || null,
      unit_price: line.unitPrice,
      observations: line.observations?.trim() || null,
    })),
  );

  if (linesError) {
    await client.from('purchase_receipts').delete().eq('id', id);
    failIf(linesError, 'Enregistrement des lignes de réception');
  }

  return id;
};

/** BP17 §12 : acceptée, acceptée avec réserve, ou refusée — motif historisé. */
export const controlReceipt = async (
  id: string,
  result: QualityResult,
  note: string | null,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('purchase_receipts')
    .update({
      quality_result: result,
      quality_note: note?.trim() || null,
      controlled_by: userId,
      controlled_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', id);

  failIf(error, 'Contrôle qualité');
};

/**
 * Mise en stock d'une réception contrôlée (BR-068, BR-069).
 *
 * Confiée à la base : elle crée un mouvement par ligne, met à jour les lots et
 * fait avancer la commande, le tout dans une seule transaction.
 */
export const postReceipt = async (id: string, userId: string): Promise<number> => {
  const { data, error } = await getClient().rpc('post_purchase_receipt', {
    p_receipt_id: id,
    p_user: userId,
  });

  failIf(error, 'Mise en stock de la réception');
  return (data as number) ?? 0;
};

// ---------------------------------------------------------------------------
// Retours fournisseurs (BP17 §17)
// ---------------------------------------------------------------------------

export const listSupplierReturns = async (): Promise<SupplierReturn[]> => {
  const { data, error } = await getClient()
    .from('supplier_returns')
    .select(`
      *,
      supplier:suppliers(name),
      lines:supplier_return_lines(*, item:pharmacy_items(name), lot:medication_lots(lot_number))
    `)
    .is('deleted_at', null)
    .order('returned_on', { ascending: false });

  failIf(error, 'Chargement des retours');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      supplier?: { name: string } | null;
      lines?: {
        id: string;
        item_id: string;
        lot_id: string | null;
        quantity: number;
        unit_price: number | string;
        observations: string | null;
        item?: { name: string } | null;
        lot?: { lot_number: string } | null;
      }[];
    };

    return {
      id: row.id,
      reference: row.business_reference,
      supplierId: row.supplier_id,
      supplierName: joined.supplier?.name ?? '',
      orderId: row.order_id,
      receiptId: row.receipt_id,
      pharmacyId: row.pharmacy_id,
      returnType: row.return_type,
      reason: row.reason,
      status: row.status,
      returnedOn: row.returned_on,
      creditAmount: num(row.credit_amount),
      postedAt: row.posted_at,
      lines: (joined.lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemName: line.item?.name ?? '',
        lotId: line.lot_id,
        lotNumber: line.lot?.lot_number ?? null,
        quantity: line.quantity,
        unitPrice: num(line.unit_price),
        observations: line.observations,
      })),
    };
  });
};

export interface SupplierReturnInput {
  supplierId: string;
  orderId: string | null;
  receiptId: string | null;
  pharmacyId: string | null;
  returnType: string;
  reason: string;
  returnedOn: string;
  lines: {
    itemId: string;
    lotId: string | null;
    quantity: number;
    unitPrice: number;
    observations: string | null;
  }[];
}

export const createSupplierReturn = async (
  input: SupplierReturnInput,
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const credit = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  const { data, error } = await client
    .from('supplier_returns')
    .insert({
      ...auditColumns(ctx),
      supplier_id: input.supplierId,
      order_id: input.orderId,
      receipt_id: input.receiptId,
      pharmacy_id: input.pharmacyId,
      return_type: input.returnType,
      reason: input.reason.trim(),
      returned_on: input.returnedOn,
      credit_amount: credit,
      status: 'draft',
    })
    .select('id')
    .single();

  failIf(error, 'Création du retour');
  const id = data?.id as string;

  const { error: linesError } = await client.from('supplier_return_lines').insert(
    input.lines.map((line) => ({
      return_id: id,
      item_id: line.itemId,
      lot_id: line.lotId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      observations: line.observations?.trim() || null,
    })),
  );

  if (linesError) {
    await client.from('supplier_returns').delete().eq('id', id);
    failIf(linesError, 'Enregistrement des lignes du retour');
  }

  return id;
};

/** Expédition : la marchandise quitte le stock (BR-074). */
export const postSupplierReturn = async (id: string, userId: string): Promise<number> => {
  const { data, error } = await getClient().rpc('post_supplier_return', {
    p_return_id: id,
    p_user: userId,
  });

  failIf(error, 'Expédition du retour');
  return (data as number) ?? 0;
};

export const settleSupplierReturn = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('supplier_returns')
    .update({ status: 'settled', updated_by: userId })
    .eq('id', id);

  failIf(error, 'Clôture du retour');
};

// ---------------------------------------------------------------------------
// Réapprovisionnements internes (BP17 §14, BP18 §12)
// ---------------------------------------------------------------------------

export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  requested: 'Demandé',
  shipped: 'Expédié',
  received: 'Réceptionné',
  canceled: 'Annulé',
};

export interface TransferLine {
  id: string;
  itemId: string;
  itemName: string;
  lotId: string | null;
  lotNumber: string | null;
  quantityRequested: number;
  quantityShipped: number;
}

export interface StockTransfer {
  id: string;
  reference: string;
  fromPharmacyId: string;
  fromPharmacyName: string;
  toPharmacyId: string;
  toPharmacyName: string;
  status: string;
  requestedOn: string;
  shippedAt: string | null;
  receivedAt: string | null;
  notes: string | null;
  lines: TransferLine[];
}

export const listStockTransfers = async (): Promise<StockTransfer[]> => {
  const { data, error } = await getClient()
    .from('stock_transfers')
    .select(`
      *,
      source:pharmacies!stock_transfers_from_pharmacy_id_fkey(name),
      target:pharmacies!stock_transfers_to_pharmacy_id_fkey(name),
      lines:stock_transfer_lines(*, item:pharmacy_items(name), lot:medication_lots(lot_number))
    `)
    .is('deleted_at', null)
    .order('requested_on', { ascending: false });

  failIf(error, 'Chargement des transferts');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      source?: { name: string } | null;
      target?: { name: string } | null;
      lines?: {
        id: string;
        item_id: string;
        lot_id: string | null;
        quantity_requested: number;
        quantity_shipped: number;
        item?: { name: string } | null;
        lot?: { lot_number: string } | null;
      }[];
    };

    return {
      id: row.id,
      reference: row.business_reference,
      fromPharmacyId: row.from_pharmacy_id,
      fromPharmacyName: joined.source?.name ?? '',
      toPharmacyId: row.to_pharmacy_id,
      toPharmacyName: joined.target?.name ?? '',
      status: row.status,
      requestedOn: row.requested_on,
      shippedAt: row.shipped_at,
      receivedAt: row.received_at,
      notes: row.notes,
      lines: (joined.lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item_id,
        itemName: line.item?.name ?? '',
        lotId: line.lot_id,
        lotNumber: line.lot?.lot_number ?? null,
        quantityRequested: line.quantity_requested,
        quantityShipped: line.quantity_shipped,
      })),
    };
  });
};

export interface TransferInput {
  fromPharmacyId: string;
  toPharmacyId: string;
  notes: string | null;
  lines: { itemId: string; lotId: string | null; quantityRequested: number }[];
}

export const createStockTransfer = async (
  input: TransferInput,
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const { data, error } = await client
    .from('stock_transfers')
    .insert({
      ...auditColumns(ctx),
      from_pharmacy_id: input.fromPharmacyId,
      to_pharmacy_id: input.toPharmacyId,
      status: 'requested',
      requested_by: ctx.userId,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  failIf(error, 'Création du transfert');
  const id = data?.id as string;

  const { error: linesError } = await client.from('stock_transfer_lines').insert(
    input.lines.map((line) => ({
      transfer_id: id,
      item_id: line.itemId,
      lot_id: line.lotId,
      quantity_requested: line.quantityRequested,
    })),
  );

  if (linesError) {
    await client.from('stock_transfers').delete().eq('id', id);
    failIf(linesError, 'Enregistrement des lignes du transfert');
  }

  return id;
};

/**
 * Expédition (BR-071).
 *
 * Confiée à la base : elle crée la sortie du magasin source et l'entrée dans le
 * magasin destinataire dans la même transaction, en reportant le lot pour que
 * la traçabilité ne s'arrête pas à la porte du magasin.
 */
export const shipStockTransfer = async (id: string, userId: string): Promise<number> => {
  const { data, error } = await getClient().rpc('ship_stock_transfer', {
    p_transfer_id: id,
    p_user: userId,
  });

  failIf(error, 'Expédition du transfert');
  return (data as number) ?? 0;
};

/** Accusé de réception par le magasin destinataire. */
export const receiveStockTransfer = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('stock_transfers')
    .update({
      status: 'received',
      received_at: new Date().toISOString(),
      received_by: userId,
      updated_by: userId,
    })
    .eq('id', id)
    .eq('status', 'shipped');

  failIf(error, 'Réception du transfert');
};

export const cancelStockTransfer = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('stock_transfers')
    .update({ status: 'canceled', updated_by: userId })
    .eq('id', id)
    // Un transfert expédié a déjà déplacé du stock : l'annuler suppose un
    // transfert en sens inverse, pas un changement d'état.
    .in('status', ['draft', 'requested']);

  failIf(error, 'Annulation du transfert');
};
