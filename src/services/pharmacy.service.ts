import { auditColumns, failIf, getClient, type WriteContext } from './base.service';
import type { PharmacyItem } from '@/types';

/**
 * Module Pharmacie et gestion des stocks (BP17, BP18, BP19).
 *
 * BP19 §5 est explicite : « Le stock est géré exclusivement par le module Stock
 * & Inventaire ». Le catalogue décrit donc les produits, et tout ce qui touche
 * aux quantités passe par le registre des mouvements.
 *
 * Ce service n'écrit jamais une quantité directement. Une entrée, une sortie,
 * une délivrance ou un écart d'inventaire produisent un mouvement ; la base
 * reporte ensuite ce mouvement sur le lot et sur l'article, refuse les stocks
 * négatifs et interdit toute retouche du registre. C'est la seule façon d'avoir
 * un stock dont on puisse expliquer chaque unité — exigence de fond quand il
 * s'agit de médicaments.
 */

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

export type MovementKind =
  | 'entry'
  | 'exit'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment'
  | 'return'
  | 'correction'
  | 'inventory'
  | 'destruction';

export const MOVEMENT_LABELS: Record<MovementKind, string> = {
  entry: 'Entrée en stock',
  exit: 'Sortie de stock',
  transfer_in: 'Transfert entrant',
  transfer_out: 'Transfert sortant',
  adjustment: 'Ajustement',
  return: 'Retour',
  correction: 'Correction',
  inventory: "Écart d'inventaire",
  destruction: 'Destruction',
};

export type LotState = 'available' | 'quarantine' | 'expired' | 'returned' | 'recalled' | 'archived';

export const LOT_STATE_LABELS: Record<LotState, string> = {
  available: 'Disponible',
  quarantine: 'En quarantaine',
  expired: 'Périmé',
  returned: 'Retourné',
  recalled: 'Rappelé',
  archived: 'Archivé',
};

export type IssueRule = 'FEFO' | 'FIFO' | 'LIFO';

/** BP18 §4 : hiérarchie des emplacements. */
export type LocationLevel = 'site' | 'warehouse' | 'zone' | 'aisle' | 'shelf' | 'tier' | 'bin';

export const LOCATION_LEVEL_LABELS: Record<LocationLevel, string> = {
  site: 'Site de stockage',
  warehouse: 'Magasin',
  zone: 'Zone',
  aisle: 'Allée',
  shelf: 'Étagère',
  tier: 'Niveau',
  bin: 'Bac',
};

/** BP17 §5 : natures de fournisseur. */
export const SUPPLIER_TYPES = [
  'fabricant',
  'distributeur',
  'grossiste',
  'prestataire',
  'local',
  'international',
] as const;

/** BP19 §16 : catégories de médicaments réglementés. */
export const CONTROLLED_CLASSES = [
  'Stupéfiant',
  'Psychotrope',
  'Soumis à autorisation',
] as const;

// ---------------------------------------------------------------------------
// Modèles
// ---------------------------------------------------------------------------

/** Fiche produit enrichie du BP19 §5. */
export interface Medication {
  id: string;
  reference: string;
  name: string;
  genericName: string | null;
  category: string;
  form: string | null;
  dosage: string | null;
  administrationRoute: string | null;
  unit: string;
  packaging: string | null;
  atcCode: string | null;
  storageConditions: string | null;
  unitPrice: number;
  purchasePrice: number;
  reorderLevel: number;
  maxStock: number | null;
  isControlled: boolean;
  controlledClass: string | null;
  issueRule: IssueRule;
  isActive: boolean;
}

/** Ligne de l'état du stock, calculée par la base (vue `pharmacy_stock_state`). */
export interface StockState {
  itemId: string;
  reference: string;
  name: string;
  genericName: string | null;
  category: string;
  form: string | null;
  dosage: string | null;
  unit: string;
  unitPrice: number;
  purchasePrice: number;
  isControlled: boolean;
  issueRule: IssueRule;
  reorderLevel: number;
  quantity: number;
  lotCount: number;
  nextExpiry: string | null;
  expiredQuantity: number;
  expiringQuantity: number;
  stockValue: number;
}

export interface Lot {
  id: string;
  reference: string;
  itemId: string;
  itemName: string;
  pharmacyId: string | null;
  pharmacyName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  lotNumber: string;
  manufacturedOn: string | null;
  expiresOn: string | null;
  quantity: number;
  unitCost: number;
  state: LotState;
  recalledAt: string | null;
  recallReason: string | null;
}

export interface Movement {
  id: string;
  reference: string;
  itemId: string;
  itemName: string;
  lotNumber: string | null;
  pharmacyName: string | null;
  kind: MovementKind;
  quantity: number;
  unitCost: number;
  reason: string | null;
  sourceTable: string | null;
  patientName: string | null;
  performedByName: string | null;
  occurredAt: string;
}

export interface Pharmacy {
  id: string;
  reference: string;
  name: string;
  locationId: string | null;
  locationName: string | null;
  isServiceCabinet: boolean;
  service: string | null;
  suppliedBy: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface StockLocation {
  id: string;
  reference: string;
  parentId: string | null;
  level: LocationLevel;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  reference: string;
  name: string;
  supplierType: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  averageLeadDays: number | null;
  paymentTerms: string | null;
  rating: number | null;
  isActive: boolean;
}

export interface Dispensation {
  id: string;
  reference: string;
  channel: DispensationChannel;
  pharmacyName: string | null;
  patientId: string | null;
  patientName: string | null;
  /** Acquéreur d'une vente sans dossier patient. */
  customerName: string | null;
  prescriptionId: string | null;
  hospitalizationId: string | null;
  invoiceId: string | null;
  paymentMethod: string | null;
  paidAmount: number;
  status: string;
  dispensedAt: string;
  dispensedByName: string | null;
  totalAmount: number;
  notes: string | null;
  lines: DispensationLine[];
}

export interface DispensationLine {
  id: string;
  itemId: string;
  itemName: string;
  lotNumber: string | null;
  quantity: number;
  unitPrice: number;
  posology: string | null;
}

export interface Inventory {
  id: string;
  reference: string;
  pharmacyName: string | null;
  inventoryType: string;
  status: string;
  startedAt: string;
  closedAt: string | null;
  lineCount: number;
  varianceCount: number;
}

export interface InventoryLine {
  id: string;
  itemId: string;
  itemName: string;
  lotId: string | null;
  lotNumber: string | null;
  expectedQuantity: number;
  countedQuantity: number | null;
  variance: number;
  comment: string | null;
}

/** Suggestion FEFO renvoyée par la base (BR-087). */
export interface LotSuggestion {
  lotId: string;
  lotNumber: string;
  expiresOn: string | null;
  available: number;
  take: number;
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

interface NamedProfile {
  first_name?: string | null;
  last_name?: string | null;
}

const fullName = (person: NamedProfile | null | undefined): string =>
  person ? `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() : '';

const DAY = 86_400_000;

/** Jours restants avant péremption ; négatif si la date est dépassée. */
export const daysBeforeExpiry = (date: string | null): number | null =>
  date === null ? null : Math.ceil((new Date(date).getTime() - Date.now()) / DAY);

// ---------------------------------------------------------------------------
// Catalogue (BP19 §5)
// ---------------------------------------------------------------------------

export interface MedicationInput {
  name: string;
  genericName?: string;
  category: string;
  form?: string;
  dosage?: string;
  administrationRoute?: string;
  unit: string;
  packaging?: string;
  atcCode?: string;
  storageConditions?: string;
  unitPrice: number;
  purchasePrice: number;
  reorderLevel: number;
  maxStock?: number | null;
  isControlled: boolean;
  controlledClass?: string | null;
  issueRule: IssueRule;
}

export const listMedications = async (): Promise<Medication[]> => {
  const { data, error } = await getClient()
    .from('pharmacy_items')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  failIf(error, 'Chargement du catalogue');

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.business_reference,
    name: row.name,
    genericName: row.generic_name,
    category: row.category,
    form: row.form,
    dosage: row.dosage,
    administrationRoute: row.administration_route,
    unit: row.unit ?? 'Unité',
    packaging: row.packaging,
    atcCode: row.atc_code,
    storageConditions: row.storage_conditions,
    unitPrice: Number(row.unit_price ?? 0),
    purchasePrice: Number(row.purchase_price ?? 0),
    reorderLevel: row.reorder_level ?? 0,
    maxStock: row.max_stock,
    isControlled: row.is_controlled ?? false,
    controlledClass: row.controlled_class,
    issueRule: (row.issue_rule ?? 'FEFO') as IssueRule,
    isActive: row.is_active ?? true,
  }));
};

const medicationColumns = (input: MedicationInput) => ({
  name: input.name.trim(),
  generic_name: input.genericName?.trim() || null,
  category: input.category,
  form: input.form || null,
  dosage: input.dosage?.trim() || null,
  administration_route: input.administrationRoute || null,
  unit: input.unit,
  packaging: input.packaging?.trim() || null,
  atc_code: input.atcCode?.trim() || null,
  storage_conditions: input.storageConditions?.trim() || null,
  unit_price: input.unitPrice,
  purchase_price: input.purchasePrice,
  reorder_level: input.reorderLevel,
  max_stock: input.maxStock ?? null,
  is_controlled: input.isControlled,
  // La classe réglementaire n'a de sens que si le produit l'est : la conserver
  // après décochage laisserait une donnée contradictoire dans le registre.
  controlled_class: input.isControlled ? (input.controlledClass || null) : null,
  issue_rule: input.issueRule,
});

export const createMedication = async (
  input: MedicationInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('pharmacy_items')
    .insert({ ...auditColumns(ctx), ...medicationColumns(input) });

  failIf(error, 'Création du médicament');
};

export const updateMedication = async (
  id: string,
  input: MedicationInput,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('pharmacy_items')
    .update({ ...medicationColumns(input), updated_by: userId })
    .eq('id', id);

  failIf(error, 'Mise à jour du médicament');
};

/** BR-093 : aucune suppression physique. Le produit sort du catalogue actif. */
export const archiveMedication = async (id: string, userId: string): Promise<void> => {
  const { error } = await getClient()
    .from('pharmacy_items')
    .update({ is_active: false, updated_by: userId })
    .eq('id', id);

  failIf(error, 'Archivage du médicament');
};

// ---------------------------------------------------------------------------
// État du stock (BP18 §19, BP19 §22)
// ---------------------------------------------------------------------------

export const loadStockState = async (): Promise<StockState[]> => {
  const { data, error } = await getClient()
    .from('pharmacy_stock_state')
    .select('*')
    .order('name');

  failIf(error, "Chargement de l'état du stock");

  return (data ?? []).map((row) => ({
    itemId: row.item_id as string,
    reference: row.business_reference as string,
    name: row.name as string,
    genericName: row.generic_name as string | null,
    category: row.category as string,
    form: row.form as string | null,
    dosage: row.dosage as string | null,
    unit: (row.unit as string) ?? 'Unité',
    unitPrice: Number(row.unit_price ?? 0),
    purchasePrice: Number(row.purchase_price ?? 0),
    isControlled: (row.is_controlled as boolean) ?? false,
    issueRule: ((row.issue_rule as string) ?? 'FEFO') as IssueRule,
    reorderLevel: Number(row.effective_reorder_level ?? 0),
    // Les lots font foi dès qu'il en existe : ils sont détaillés et datés.
    quantity: Number(row.lot_count ?? 0) > 0
      ? Number(row.lot_quantity ?? 0)
      : Number(row.stock_quantity ?? 0),
    lotCount: Number(row.lot_count ?? 0),
    nextExpiry: row.next_expiry as string | null,
    expiredQuantity: Number(row.expired_quantity ?? 0),
    expiringQuantity: Number(row.expiring_quantity ?? 0),
    stockValue: Number(row.stock_value ?? 0),
  }));
};

/** Alertes du BP18 §15 et BP19 §15, déduites de l'état du stock. */
export interface StockAlerts {
  outOfStock: StockState[];
  lowStock: StockState[];
  expiring: StockState[];
  expired: StockState[];
  totalValue: number;
}

export const buildAlerts = (state: readonly StockState[]): StockAlerts => ({
  outOfStock: state.filter((line) => line.quantity <= 0),
  lowStock: state.filter((line) => line.quantity > 0 && line.quantity <= line.reorderLevel),
  expiring: state.filter((line) => line.expiringQuantity > 0),
  expired: state.filter((line) => line.expiredQuantity > 0),
  totalValue: state.reduce((total, line) => total + line.stockValue, 0),
});

// ---------------------------------------------------------------------------
// Pharmacies et emplacements (BP18 §5-§7, BP19 §4, §12)
// ---------------------------------------------------------------------------

export const listPharmacies = async (): Promise<Pharmacy[]> => {
  const { data, error } = await getClient()
    .from('pharmacies')
    .select('*, location:stock_locations(name)')
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('name');

  failIf(error, 'Chargement des pharmacies');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { location?: { name: string } | null };
    return {
      id: row.id,
      reference: row.business_reference,
      name: row.name,
      locationId: row.location_id,
      locationName: joined.location?.name ?? null,
      isServiceCabinet: row.is_service_cabinet,
      service: row.service,
      suppliedBy: row.supplied_by,
      isDefault: row.is_default,
      isActive: row.is_active,
    };
  });
};

export interface PharmacyInput {
  name: string;
  locationId?: string | null;
  isServiceCabinet: boolean;
  service?: string | null;
  suppliedBy?: string | null;
  isDefault: boolean;
}

export const createPharmacy = async (
  input: PharmacyInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('pharmacies')
    .insert({
      ...auditColumns(ctx),
      name: input.name.trim(),
      location_id: input.locationId || null,
      is_service_cabinet: input.isServiceCabinet,
      service: input.service || null,
      supplied_by: input.suppliedBy || null,
      is_default: input.isDefault,
    });

  failIf(error, 'Création de la pharmacie');
};

export const listLocations = async (): Promise<StockLocation[]> => {
  const { data, error } = await getClient()
    .from('stock_locations')
    .select('*')
    .is('deleted_at', null)
    .order('level')
    .order('code');

  failIf(error, 'Chargement des emplacements');

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.business_reference,
    parentId: row.parent_id,
    level: row.level as LocationLevel,
    code: row.code,
    name: row.name,
    isActive: row.is_active,
  }));
};

export const createLocation = async (
  input: { parentId: string | null; level: LocationLevel; code: string; name: string },
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('stock_locations')
    .insert({
      ...auditColumns(ctx),
      parent_id: input.parentId,
      level: input.level,
      code: input.code.trim(),
      name: input.name.trim(),
    });

  failIf(error, "Création de l'emplacement");
};

// ---------------------------------------------------------------------------
// Fournisseurs (BP17 §5)
// ---------------------------------------------------------------------------

export interface SupplierInput {
  name: string;
  supplierType: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  averageLeadDays?: number | null;
  paymentTerms?: string;
  rating?: number | null;
}

export const listSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await getClient()
    .from('suppliers')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  failIf(error, 'Chargement des fournisseurs');

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.business_reference,
    name: row.name,
    supplierType: row.supplier_type,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    country: row.country,
    averageLeadDays: row.average_lead_days,
    paymentTerms: row.payment_terms,
    rating: row.rating,
    isActive: row.is_active,
  }));
};

export const createSupplier = async (
  input: SupplierInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('suppliers')
    .insert({
      ...auditColumns(ctx),
      name: input.name.trim(),
      supplier_type: input.supplierType,
      contact_name: input.contactName?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      average_lead_days: input.averageLeadDays ?? null,
      payment_terms: input.paymentTerms?.trim() || null,
      rating: input.rating ?? null,
    });

  failIf(error, 'Création du fournisseur');
};

// ---------------------------------------------------------------------------
// Lots (BP18 §9, BP19 §14)
// ---------------------------------------------------------------------------

export const listLots = async (itemId?: string): Promise<Lot[]> => {
  let request = getClient()
    .from('medication_lots')
    .select(`
      *,
      item:pharmacy_items(name),
      pharmacy:pharmacies(name),
      supplier:suppliers(name)
    `)
    .is('deleted_at', null)
    .order('expires_on', { nullsFirst: false });

  if (itemId) request = request.eq('item_id', itemId);

  const { data, error } = await request;
  failIf(error, 'Chargement des lots');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      item?: { name: string } | null;
      pharmacy?: { name: string } | null;
      supplier?: { name: string } | null;
    };
    return {
      id: row.id,
      reference: row.business_reference,
      itemId: row.item_id,
      itemName: joined.item?.name ?? '',
      pharmacyId: row.pharmacy_id,
      pharmacyName: joined.pharmacy?.name ?? null,
      supplierId: row.supplier_id,
      supplierName: joined.supplier?.name ?? null,
      lotNumber: row.lot_number,
      manufacturedOn: row.manufactured_on,
      expiresOn: row.expires_on,
      quantity: row.quantity,
      unitCost: Number(row.unit_cost ?? 0),
      state: row.state as LotState,
      recalledAt: row.recalled_at,
      recallReason: row.recall_reason,
    };
  });
};

export interface StockEntryInput {
  itemId: string;
  pharmacyId: string | null;
  supplierId: string | null;
  lotNumber: string;
  manufacturedOn?: string | null;
  expiresOn?: string | null;
  quantity: number;
  unitCost: number;
  reason?: string;
}

/**
 * Entrée en stock : crée le lot s'il est nouveau, puis le mouvement.
 *
 * L'ordre importe. Le mouvement porte la quantité et c'est lui qui alimente le
 * lot : créer le lot avec sa quantité puis un mouvement la compterait deux
 * fois. Le lot naît donc vide, et le mouvement le remplit.
 */
export const recordStockEntry = async (
  input: StockEntryInput,
  ctx: WriteContext,
): Promise<void> => {
  const client = getClient();

  const { data: existing, error: lookupError } = await client
    .from('medication_lots')
    .select('id')
    .eq('item_id', input.itemId)
    .eq('lot_number', input.lotNumber.trim())
    .is('deleted_at', null)
    .maybeSingle();

  failIf(lookupError, 'Recherche du lot');

  let lotId = existing?.id ?? null;

  if (!lotId) {
    const { data: created, error: createError } = await client
      .from('medication_lots')
      .insert({
        ...auditColumns(ctx),
        item_id: input.itemId,
        pharmacy_id: input.pharmacyId,
        supplier_id: input.supplierId,
        lot_number: input.lotNumber.trim(),
        manufactured_on: input.manufacturedOn || null,
        expires_on: input.expiresOn || null,
        unit_cost: input.unitCost,
        quantity: 0,
      })
      .select('id')
      .single();

    failIf(createError, 'Création du lot');
    lotId = created?.id ?? null;
  }

  const { error } = await client.from('stock_movements').insert({
    establishment_id: ctx.establishmentId,
    created_by: ctx.userId,
    item_id: input.itemId,
    lot_id: lotId,
    pharmacy_id: input.pharmacyId,
    kind: 'entry',
    quantity: Math.abs(input.quantity),
    unit_cost: input.unitCost,
    reason: input.reason?.trim() || 'Entrée en stock',
    performed_by: ctx.userId,
  });

  failIf(error, "Enregistrement de l'entrée en stock");
};

export interface StockExitInput {
  itemId: string;
  lotId: string | null;
  pharmacyId: string | null;
  quantity: number;
  kind: Extract<MovementKind, 'exit' | 'adjustment' | 'return' | 'correction' | 'destruction'>;
  reason: string;
}

export const recordStockExit = async (
  input: StockExitInput,
  ctx: WriteContext,
): Promise<void> => {
  // Un ajustement peut être positif ; une sortie, une destruction et un retour
  // au fournisseur retirent toujours du stock.
  const signed =
    input.kind === 'adjustment' || input.kind === 'correction'
      ? input.quantity
      : -Math.abs(input.quantity);

  const { error } = await getClient().from('stock_movements').insert({
    establishment_id: ctx.establishmentId,
    created_by: ctx.userId,
    item_id: input.itemId,
    lot_id: input.lotId,
    pharmacy_id: input.pharmacyId,
    kind: input.kind,
    quantity: signed,
    reason: input.reason.trim(),
    performed_by: ctx.userId,
  });

  failIf(error, 'Enregistrement du mouvement');
};

export const recallLot = async (
  lotId: string,
  reason: string,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('medication_lots')
    .update({
      state: 'recalled',
      recalled_at: new Date().toISOString(),
      recall_reason: reason.trim(),
      updated_by: userId,
    })
    .eq('id', lotId);

  failIf(error, 'Rappel du lot');
};

// ---------------------------------------------------------------------------
// Mouvements (BP18 §11)
// ---------------------------------------------------------------------------

export const listMovements = async (limit = 200, itemId?: string): Promise<Movement[]> => {
  let request = getClient()
    .from('stock_movements')
    .select(`
      *,
      item:pharmacy_items(name),
      lot:medication_lots(lot_number),
      pharmacy:pharmacies(name),
      patient:patients(first_name, last_name),
      performer:profiles!stock_movements_performed_by_fkey(first_name, last_name)
    `)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (itemId) request = request.eq('item_id', itemId);

  const { data, error } = await request;
  failIf(error, 'Chargement des mouvements');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      item?: { name: string } | null;
      lot?: { lot_number: string } | null;
      pharmacy?: { name: string } | null;
      patient?: NamedProfile | null;
      performer?: NamedProfile | null;
    };
    return {
      id: row.id,
      reference: row.business_reference,
      itemId: row.item_id,
      itemName: joined.item?.name ?? '',
      lotNumber: joined.lot?.lot_number ?? null,
      pharmacyName: joined.pharmacy?.name ?? null,
      kind: row.kind as MovementKind,
      quantity: row.quantity,
      unitCost: Number(row.unit_cost ?? 0),
      reason: row.reason,
      sourceTable: row.source_table,
      patientName: joined.patient ? fullName(joined.patient) : null,
      performedByName: joined.performer ? fullName(joined.performer) : null,
      occurredAt: row.occurred_at,
    };
  });
};

// ---------------------------------------------------------------------------
// Délivrance (BP19 §9, §10)
// ---------------------------------------------------------------------------

/** Lots proposés par la base selon la règle de sortie de l'article (BR-087). */
export const suggestLots = async (
  itemId: string,
  pharmacyId: string | null,
  quantity: number,
): Promise<LotSuggestion[]> => {
  const { data, error } = await getClient().rpc('suggest_lots', {
    p_item_id: itemId,
    // La fonction accepte NULL — « toutes pharmacies confondues » — mais le
    // générateur de types déduit un argument obligatoire du seul fait qu'il
    // n'a pas de valeur par défaut.
    p_pharmacy_id: pharmacyId as string,
    p_quantity: quantity,
  });

  failIf(error, 'Sélection des lots');

  return (data ?? []).map((row) => ({
    lotId: row.lot_id as string,
    lotNumber: row.lot_number as string,
    expiresOn: row.expires_on as string | null,
    available: row.available as number,
    take: row.take as number,
  }));
};

/**
 * Canal d'une sortie de pharmacie (BP19 §10, §11).
 *
 * Délivrer sur ordonnance, vendre au comptoir et administrer en tournée sont le
 * même geste au regard du stock. Ce qui les distingue — la pièce justificative
 * et le règlement — tient dans ce canal, ce qui évite d'entretenir trois
 * circuits parallèles pour des médicaments soumis aux mêmes contrôles.
 */
export type DispensationChannel = 'prescription' | 'sale' | 'ward_round';

export const CHANNEL_LABELS: Record<DispensationChannel, string> = {
  prescription: 'Sur ordonnance',
  sale: 'Vente au comptoir',
  ward_round: 'Dispensation hospitalière',
};

export interface DispensationInput {
  channel?: DispensationChannel;
  pharmacyId: string | null;
  patientId: string | null;
  prescriptionId: string | null;
  hospitalizationId: string | null;
  therapeuticPlanId?: string | null;
  /** Acquéreur d'une vente sans dossier patient. */
  customerName?: string | null;
  paymentMethod?: string | null;
  paidAmount?: number;
  notes?: string;
  lines: {
    itemId: string;
    lotId: string | null;
    quantity: number;
    unitPrice: number;
    posology?: string;
  }[];
}

/**
 * Enregistre une délivrance et ses lignes.
 *
 * Chaque ligne déclenche côté base la création du mouvement de sortie, le
 * contrôle du lot — périmé, rappelé — et celui de la validation
 * pharmaceutique. Si l'une échoue, l'en-tête est retiré : une délivrance à
 * moitié servie fausserait le décompte et le dossier du patient.
 */
export const recordDispensation = async (
  input: DispensationInput,
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const { data: head, error: headError } = await client
    .from('dispensations')
    .insert({
      ...auditColumns(ctx),
      channel: input.channel ?? 'prescription',
      pharmacy_id: input.pharmacyId,
      patient_id: input.patientId,
      prescription_id: input.prescriptionId,
      hospitalization_id: input.hospitalizationId,
      therapeutic_plan_id: input.therapeuticPlanId ?? null,
      customer_name: input.customerName?.trim() || null,
      payment_method: input.paymentMethod ?? null,
      paid_amount: input.paidAmount ?? 0,
      status: 'delivered',
      dispensed_by: ctx.userId,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  failIf(headError, 'Création de la délivrance');
  const dispensationId = head?.id as string;

  const { error: linesError } = await client.from('dispensation_lines').insert(
    input.lines.map((line) => ({
      dispensation_id: dispensationId,
      item_id: line.itemId,
      lot_id: line.lotId,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      posology: line.posology?.trim() || null,
    })),
  );

  if (linesError) {
    await client.from('dispensations').delete().eq('id', dispensationId);
    failIf(linesError, 'Enregistrement des lignes de délivrance');
  }

  // Une prescription entièrement servie change d'état (BP19 §19).
  if (input.prescriptionId) {
    await client
      .from('prescriptions')
      .update({ pharmacy_status: 'dispensed', status: 'dispensed' })
      .eq('id', input.prescriptionId);
  }

  return dispensationId;
};

/**
 * Vente au comptoir (BP19 §10).
 *
 * Une vente est une délivrance dont le canal indique qu'elle est réglée sur
 * place. Elle emprunte donc exactement le même circuit — contrôle du lot,
 * blocage des périmés, refus des lots rappelés, mouvement de sortie,
 * décrémentation du stock — sans qu'aucune de ces règles n'ait été réécrite.
 *
 * La facture patient est créée dans la foulée lorsque l'acquéreur est un
 * patient de la base : c'est ce qui relie la pharmacie au module Finance
 * (BP19 §24). Son échec n'annule pas la vente — les médicaments sont sortis, le
 * stock doit le refléter — mais il est signalé à l'appelant.
 */
export interface SaleInput {
  pharmacyId: string | null;
  patientId: string | null;
  customerName: string | null;
  paymentMethod: string;
  paidAmount: number;
  notes?: string;
  lines: {
    itemId: string;
    lotId: string | null;
    quantity: number;
    unitPrice: number;
    posology?: string;
  }[];
}

export interface SaleResult {
  dispensationId: string;
  invoiceId: string | null;
  /** Renseigné si la vente a bien eu lieu mais que la facture a échoué. */
  invoiceWarning: string | null;
}

export const recordSale = async (input: SaleInput, ctx: WriteContext): Promise<SaleResult> => {
  const client = getClient();

  const dispensationId = await recordDispensation(
    {
      channel: 'sale',
      pharmacyId: input.pharmacyId,
      patientId: input.patientId,
      prescriptionId: null,
      hospitalizationId: null,
      customerName: input.customerName,
      paymentMethod: input.paymentMethod,
      paidAmount: input.paidAmount,
      notes: input.notes,
      lines: input.lines,
    },
    ctx,
  );

  const total = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  if (!input.patientId) {
    // Vente à un acquéreur sans dossier : le reçu tient lieu de justificatif,
    // et la facturation patient n'a pas d'objet.
    return { dispensationId, invoiceId: null, invoiceWarning: null };
  }

  try {
    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .insert({
        ...auditColumns(ctx),
        patient_id: input.patientId,
        invoice_date: new Date().toISOString(),
        subtotal: total,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: total,
        paid_amount: input.paidAmount,
        status: input.paidAmount >= total ? 'paid' : 'pending',
      })
      .select('id')
      .single();

    if (invoiceError) throw new Error(invoiceError.message);
    const invoiceId = invoice?.id as string;

    const { data: catalogue } = await client
      .from('pharmacy_items')
      .select('id, name, dosage, form')
      .in('id', [...new Set(input.lines.map((line) => line.itemId))]);

    const names = new Map(
      (catalogue ?? []).map((item) => [
        item.id,
        [item.name, item.form, item.dosage].filter(Boolean).join(' · '),
      ]),
    );

    const { error: itemsError } = await client.from('invoice_items').insert(
      input.lines.map((line) => ({
        establishment_id: ctx.establishmentId,
        invoice_id: invoiceId,
        description: names.get(line.itemId) ?? 'Médicament',
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: line.quantity * line.unitPrice,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      })),
    );

    if (itemsError) throw new Error(itemsError.message);

    await client
      .from('dispensations')
      .update({ invoice_id: invoiceId })
      .eq('id', dispensationId);

    return { dispensationId, invoiceId, invoiceWarning: null };
  } catch (err) {
    return {
      dispensationId,
      invoiceId: null,
      invoiceWarning:
        err instanceof Error
          ? `La vente est enregistrée et le stock à jour, mais la facture n'a pas pu être créée : ${err.message}`
          : "La vente est enregistrée, mais la facture n'a pas pu être créée.",
    };
  }
};

export const listDispensations = async (limit = 100): Promise<Dispensation[]> => {
  const { data, error } = await getClient()
    .from('dispensations')
    .select(`
      *,
      pharmacy:pharmacies(name),
      patient:patients(first_name, last_name),
      dispenser:profiles!dispensations_dispensed_by_fkey(first_name, last_name),
      lines:dispensation_lines(
        id, quantity, unit_price, posology,
        item:pharmacy_items(id, name),
        lot:medication_lots(lot_number)
      )
    `)
    .is('deleted_at', null)
    .order('dispensed_at', { ascending: false })
    .limit(limit);

  failIf(error, 'Chargement des délivrances');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      pharmacy?: { name: string } | null;
      patient?: NamedProfile | null;
      dispenser?: NamedProfile | null;
      lines?: {
        id: string;
        quantity: number;
        unit_price: number;
        posology: string | null;
        item?: { id: string; name: string } | null;
        lot?: { lot_number: string } | null;
      }[];
    };

    return {
      id: row.id,
      reference: row.business_reference,
      channel: (row.channel ?? 'prescription') as DispensationChannel,
      pharmacyName: joined.pharmacy?.name ?? null,
      patientId: row.patient_id,
      patientName: joined.patient ? fullName(joined.patient) : null,
      customerName: row.customer_name,
      prescriptionId: row.prescription_id,
      hospitalizationId: row.hospitalization_id,
      invoiceId: row.invoice_id,
      paymentMethod: row.payment_method,
      paidAmount: Number(row.paid_amount ?? 0),
      status: row.status,
      dispensedAt: row.dispensed_at,
      dispensedByName: joined.dispenser ? fullName(joined.dispenser) : null,
      totalAmount: Number(row.total_amount ?? 0),
      notes: row.notes,
      lines: (joined.lines ?? []).map((line) => ({
        id: line.id,
        itemId: line.item?.id ?? '',
        itemName: line.item?.name ?? '',
        lotNumber: line.lot?.lot_number ?? null,
        quantity: line.quantity,
        unitPrice: Number(line.unit_price ?? 0),
        posology: line.posology,
      })),
    };
  });
};

// ---------------------------------------------------------------------------
// Validation pharmaceutique (BP19 §8)
// ---------------------------------------------------------------------------

export interface PendingPrescription {
  id: string;
  reference: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  createdAt: string;
  pharmacyStatus: string;
  pharmacistNote: string | null;
  medications: { name?: string; dosage?: string; frequency?: string; duration?: string }[];
}

export const listPrescriptionsForPharmacy = async (): Promise<PendingPrescription[]> => {
  const { data, error } = await getClient()
    .from('prescriptions')
    .select(`
      *,
      patient:patients(first_name, last_name),
      doctor:profiles!prescriptions_doctor_id_fkey(first_name, last_name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  failIf(error, 'Chargement des prescriptions');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      patient?: NamedProfile | null;
      doctor?: NamedProfile | null;
    };
    return {
      id: row.id,
      reference: row.business_reference,
      patientId: row.patient_id,
      patientName: fullName(joined.patient),
      doctorName: fullName(joined.doctor),
      createdAt: row.created_at,
      pharmacyStatus: row.pharmacy_status ?? 'pending',
      pharmacistNote: row.pharmacist_note,
      medications: Array.isArray(row.medications)
        ? (row.medications as PendingPrescription['medications'])
        : [],
    };
  });
};

export const setPrescriptionPharmacyStatus = async (
  id: string,
  status: 'validated' | 'change_requested' | 'refused',
  note: string | null,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('prescriptions')
    .update({
      pharmacy_status: status,
      pharmacist_note: note?.trim() || null,
      validated_by: userId,
      validated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', id);

  failIf(error, 'Validation de la prescription');
};

// ---------------------------------------------------------------------------
// Inventaires (BP18 §13)
// ---------------------------------------------------------------------------

export const listInventories = async (): Promise<Inventory[]> => {
  const { data, error } = await getClient()
    .from('stock_inventories')
    .select('*, pharmacy:pharmacies(name), lines:stock_inventory_lines(id, variance, counted_quantity)')
    .is('deleted_at', null)
    .order('started_at', { ascending: false });

  failIf(error, 'Chargement des inventaires');

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      pharmacy?: { name: string } | null;
      lines?: { id: string; variance: number; counted_quantity: number | null }[];
    };
    const lines = joined.lines ?? [];

    return {
      id: row.id,
      reference: row.business_reference,
      pharmacyName: joined.pharmacy?.name ?? null,
      inventoryType: row.inventory_type,
      status: row.status,
      startedAt: row.started_at,
      closedAt: row.closed_at,
      lineCount: lines.length,
      varianceCount: lines.filter(
        (line) => line.counted_quantity !== null && line.variance !== 0,
      ).length,
    };
  });
};

/**
 * Ouvre un inventaire et fige les quantités théoriques.
 *
 * L'écart n'a de sens que rapporté à ce que le système annonçait au moment du
 * comptage : recalculer la quantité théorique à la clôture rendrait tout écart
 * ininterprétable si un mouvement a eu lieu entre-temps.
 */
export const openInventory = async (
  input: { pharmacyId: string | null; inventoryType: string; itemIds: string[] },
  ctx: WriteContext,
): Promise<string> => {
  const client = getClient();

  const { data: head, error: headError } = await client
    .from('stock_inventories')
    .insert({
      ...auditColumns(ctx),
      pharmacy_id: input.pharmacyId,
      inventory_type: input.inventoryType,
      status: 'open',
    })
    .select('id')
    .single();

  failIf(headError, "Ouverture de l'inventaire");
  const inventoryId = head?.id as string;

  const { data: lots, error: lotsError } = await client
    .from('medication_lots')
    .select('id, item_id, quantity')
    .in('item_id', input.itemIds)
    .is('deleted_at', null);

  failIf(lotsError, 'Chargement des lots à inventorier');

  const rows = (lots ?? []).map((lot) => ({
    inventory_id: inventoryId,
    item_id: lot.item_id,
    lot_id: lot.id,
    expected_quantity: lot.quantity,
  }));

  // Un produit sans lot est inventorié sur sa quantité globale : les
  // consommables n'ont pas toujours de numéro de lot.
  const withLots = new Set((lots ?? []).map((lot) => lot.item_id));
  for (const itemId of input.itemIds) {
    if (withLots.has(itemId)) continue;
    const { data: item } = await client
      .from('pharmacy_items')
      .select('stock_quantity')
      .eq('id', itemId)
      .single();

    rows.push({
      inventory_id: inventoryId,
      item_id: itemId,
      lot_id: null as unknown as string,
      expected_quantity: item?.stock_quantity ?? 0,
    });
  }

  if (rows.length > 0) {
    const { error } = await client.from('stock_inventory_lines').insert(rows);
    failIf(error, "Préparation des lignes d'inventaire");
  }

  return inventoryId;
};

export const listInventoryLines = async (inventoryId: string): Promise<InventoryLine[]> => {
  const { data, error } = await getClient()
    .from('stock_inventory_lines')
    .select('*, item:pharmacy_items(name), lot:medication_lots(lot_number)')
    .eq('inventory_id', inventoryId)
    .order('id');

  failIf(error, "Chargement des lignes d'inventaire");

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      item?: { name: string } | null;
      lot?: { lot_number: string } | null;
    };
    return {
      id: row.id,
      itemId: row.item_id,
      itemName: joined.item?.name ?? '',
      lotId: row.lot_id,
      lotNumber: joined.lot?.lot_number ?? null,
      expectedQuantity: row.expected_quantity,
      countedQuantity: row.counted_quantity,
      variance: row.variance ?? 0,
      comment: row.comment,
    };
  });
};

export const saveInventoryCount = async (
  lineId: string,
  countedQuantity: number,
  comment: string | null,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('stock_inventory_lines')
    .update({
      counted_quantity: countedQuantity,
      comment: comment?.trim() || null,
      counted_by: userId,
      counted_at: new Date().toISOString(),
    })
    .eq('id', lineId);

  failIf(error, 'Enregistrement du comptage');
};

/** Clôture : les écarts deviennent des mouvements d'inventaire. */
export const closeInventory = async (
  inventoryId: string,
  userId: string,
): Promise<number> => {
  const { data, error } = await getClient().rpc('close_stock_inventory', {
    p_inventory_id: inventoryId,
    p_user: userId,
  });

  failIf(error, "Clôture de l'inventaire");
  return (data as number) ?? 0;
};

// ---------------------------------------------------------------------------
// Compatibilité avec le contexte de données partagé
// ---------------------------------------------------------------------------

/**
 * Liste réduite du catalogue, au format historique.
 *
 * `DataContext` alimente le tableau de bord et la fiche patient : ils n'ont
 * besoin que du nom, de la quantité et du seuil. Conserver cette forme évite de
 * propager le modèle enrichi dans des écrans qui n'en font rien.
 */
export const listPharmacyItems = async (): Promise<PharmacyItem[]> => {
  const { data, error } = await getClient()
    .from('pharmacy_items')
    .select('*')
    .is('deleted_at', null)
    .order('name');

  failIf(error, 'Chargement du stock pharmaceutique');

  return (data ?? []).map((row) => ({
    id: row.id,
    business_reference: row.business_reference,
    establishment_id: row.establishment_id ?? '',
    name: row.name,
    generic_name: row.generic_name ?? undefined,
    category: row.category,
    stock_quantity: row.stock_quantity ?? 0,
    unit_price: Number(row.unit_price ?? 0),
    expiry_date: row.expiry_date ?? undefined,
    reorder_level: row.reorder_level ?? 0,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
  }));
};
