import { auditColumns, failIf, getClient, type WriteContext } from './base.service';
import type { PharmacyItem } from '@/types';

/** Stock pharmaceutique (BP19). */

export interface PharmacyItemInput {
  name: string;
  generic_name?: string;
  category: string;
  stock_quantity: number;
  unit_price: number;
  expiry_date?: string;
  reorder_level: number;
}

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
    unit_price: row.unit_price,
    expiry_date: row.expiry_date ?? undefined,
    reorder_level: row.reorder_level ?? 0,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
  }));
};

export const createPharmacyItem = async (
  input: PharmacyItemInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('pharmacy_items')
    .insert({
      ...auditColumns(ctx),
      name: input.name,
      generic_name: input.generic_name ?? null,
      category: input.category,
      stock_quantity: input.stock_quantity,
      unit_price: input.unit_price,
      expiry_date: input.expiry_date ?? null,
      reorder_level: input.reorder_level,
    });

  failIf(error, "Création de l'article pharmaceutique");
};
