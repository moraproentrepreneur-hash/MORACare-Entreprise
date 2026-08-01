import { auditColumns, failIf, getClient, ServiceError, type WriteContext } from './base.service';
import type { CashClosure, CashMovement, CashRegister } from '@/types';

/** Caisses, encaissements et clôtures (BP22B). */

export interface CashRegisterInput {
  name: string;
  opening_balance: number;
}

export interface CashMovementInput {
  cash_register_id: string;
  type: CashMovement['type'];
  payment_method: CashMovement['payment_method'];
  amount: number;
  reason: string;
  patient_id?: string;
}

export interface CashClosureInput {
  cash_register_id: string;
  theoretical_balance: number;
  physical_cash_count: number;
  explanation?: string;
}

const CASHIER_JOIN = 'cashier:profiles!cashier_id(first_name, last_name)';

const fullName = (p?: { first_name: string; last_name: string } | null): string =>
  p ? `${p.first_name} ${p.last_name}`.trim() : '';

export const listCashRegisters = async (): Promise<CashRegister[]> => {
  const { data, error } = await getClient()
    .from('cash_registers')
    .select(`*, ${CASHIER_JOIN}`)
    .is('deleted_at', null)
    .order('opened_at', { ascending: false });

  failIf(error, 'Chargement des caisses');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { cashier?: { first_name: string; last_name: string } | null };
    return {
      id: row.id,
      business_reference: row.business_reference,
      name: row.name,
      cashier_name: fullName(joined.cashier),
      opening_balance: Number(row.opening_balance),
      current_balance: Number(row.current_balance),
      status: (row.status ?? 'open') as CashRegister['status'],
      opened_at: row.opened_at ?? row.created_at,
      closed_at: row.closed_at ?? undefined,
    };
  });
};

export const openCashRegister = async (
  input: CashRegisterInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('cash_registers')
    .insert({
      ...auditColumns(ctx),
      name: input.name,
      cashier_id: ctx.userId,
      opening_balance: input.opening_balance,
      current_balance: input.opening_balance,
      status: 'open',
    });

  failIf(error, "Ouverture de la caisse");
};

export const listCashMovements = async (): Promise<CashMovement[]> => {
  const { data, error } = await getClient()
    .from('cash_movements')
    .select('*, patient:patients(first_name, last_name)')
    .is('deleted_at', null)
    .order('movement_date', { ascending: false });

  failIf(error, 'Chargement des mouvements de caisse');

  return (data ?? []).map((row) => {
    const joined = row as unknown as { patient?: { first_name: string; last_name: string } | null };
    return {
      id: row.id,
      business_reference: row.business_reference,
      cash_register_id: row.cash_register_id,
      type: row.type as CashMovement['type'],
      payment_method: row.payment_method as CashMovement['payment_method'],
      amount: Number(row.amount),
      reason: row.reason,
      patient_name: joined.patient ? fullName(joined.patient) : undefined,
      date: row.movement_date ?? row.created_at,
    };
  });
};

/**
 * Enregistre un mouvement et répercute le solde de la caisse.
 *
 * Un encaissement crédite, un décaissement débite. Le solde n'est jamais saisi
 * à la main : il découle des mouvements.
 */
export const createCashMovement = async (
  input: CashMovementInput,
  ctx: WriteContext,
): Promise<void> => {
  const client = getClient();

  const { error } = await client.from('cash_movements').insert({
    ...auditColumns(ctx),
    cash_register_id: input.cash_register_id,
    type: input.type,
    payment_method: input.payment_method,
    amount: input.amount,
    reason: input.reason,
    patient_id: input.patient_id ?? null,
  });

  failIf(error, 'Enregistrement du mouvement de caisse');

  const { data: register, error: readError } = await client
    .from('cash_registers')
    .select('current_balance')
    .eq('id', input.cash_register_id)
    .single();

  failIf(readError, 'Lecture du solde de caisse');

  if (!register) {
    throw new ServiceError('Caisse introuvable : le solde ne peut pas être mis à jour.');
  }

  const delta = input.type === 'encaissement' ? input.amount : -input.amount;
  const { error: updateError } = await client
    .from('cash_registers')
    .update({ current_balance: Number(register.current_balance) + delta })
    .eq('id', input.cash_register_id);

  failIf(updateError, 'Mise à jour du solde de caisse');
};

export const closeCashRegister = async (
  input: CashClosureInput,
  ctx: WriteContext,
): Promise<void> => {
  const client = getClient();

  // variance_amount est une colonne générée : elle ne peut pas être falsifiée.
  const { error } = await client.from('cash_closures').insert({
    ...auditColumns(ctx),
    cash_register_id: input.cash_register_id,
    theoretical_balance: input.theoretical_balance,
    physical_cash_count: input.physical_cash_count,
    explanation: input.explanation ?? null,
    closed_by: ctx.userId,
  });

  failIf(error, 'Clôture de la caisse');

  const { error: updateError } = await client
    .from('cash_registers')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', input.cash_register_id);

  failIf(updateError, 'Fermeture de la caisse');
};

export const listCashClosures = async (): Promise<CashClosure[]> => {
  const { data, error } = await getClient()
    .from('cash_closures')
    .select('*')
    .is('deleted_at', null)
    .order('closing_date', { ascending: false });

  failIf(error, 'Chargement des clôtures de caisse');

  return (data ?? []).map((row) => ({
    id: row.id,
    business_reference: row.business_reference,
    cash_register_id: row.cash_register_id,
    closing_date: row.closing_date ?? row.created_at,
    theoretical_balance: Number(row.theoretical_balance),
    physical_cash_count: Number(row.physical_cash_count),
    variance_amount: Number(row.variance_amount),
    explanation: row.explanation ?? undefined,
    cashier_name: '',
  }));
};
