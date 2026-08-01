import { auditColumns, failIf, getClient, type WriteContext } from './base.service';
import type { Employee, PayrollSlip, ShiftSchedule } from '@/types';

/** Dossiers du personnel, plannings et paie (BP23A, BP23B, BP23C). */

export interface EmployeeInput {
  full_name: string;
  department: string;
  position: string;
  hire_date: string;
  base_salary: number;
  contract_type: Employee['contract_type'];
  phone: string;
  email: string;
  diploma?: string;
}

export const listEmployees = async (): Promise<Employee[]> => {
  const { data, error } = await getClient()
    .from('employees')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement du personnel');

  return (data ?? []).map((row) => ({
    id: row.id,
    business_reference: row.business_reference,
    establishment_id: row.establishment_id ?? '',
    full_name: row.full_name ?? '',
    department: row.department,
    position: row.position,
    hire_date: row.hire_date,
    base_salary: Number(row.base_salary),
    contract_type: (row.contract_type ?? 'CDI') as Employee['contract_type'],
    phone: row.phone ?? '',
    email: row.email ?? '',
    diploma: row.diploma ?? undefined,
    status: (row.status ?? 'active') as Employee['status'],
    created_at: row.created_at,
  }));
};

export const createEmployee = async (input: EmployeeInput, ctx: WriteContext): Promise<void> => {
  const { error } = await getClient()
    .from('employees')
    .insert({
      ...auditColumns(ctx),
      full_name: input.full_name,
      department: input.department,
      position: input.position,
      hire_date: input.hire_date,
      base_salary: input.base_salary,
      contract_type: input.contract_type,
      phone: input.phone,
      email: input.email,
      diploma: input.diploma ?? null,
      status: 'active',
    });

  failIf(error, "Création de la fiche employé");
};

// ------------------------------------------------------- Plannings (BP23B)

const EMPLOYEE_JOIN = 'employee:employees(full_name, department)';

type JoinedEmployee = { employee?: { full_name: string | null; department: string } | null };

export interface ShiftScheduleInput {
  employee_id: string;
  shift_date: string;
  shift_type: ShiftSchedule['shift_type'];
  start_time: string;
  end_time: string;
}

export const listShiftSchedules = async (): Promise<ShiftSchedule[]> => {
  const { data, error } = await getClient()
    .from('shift_schedules')
    .select(`*, ${EMPLOYEE_JOIN}`)
    .is('deleted_at', null)
    .order('shift_date', { ascending: false });

  failIf(error, 'Chargement des plannings de garde');

  return (data ?? []).map((row) => {
    const joined = row as unknown as JoinedEmployee;
    return {
      id: row.id,
      employee_id: row.employee_id,
      employee_name: joined.employee?.full_name ?? '',
      department: joined.employee?.department ?? '',
      date: row.shift_date,
      shift_type: row.shift_type as ShiftSchedule['shift_type'],
      start_time: row.start_time,
      end_time: row.end_time,
    };
  });
};

export const createShiftSchedule = async (
  input: ShiftScheduleInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('shift_schedules')
    .insert({ ...auditColumns(ctx), ...input });

  failIf(error, 'Création du planning de garde');
};

// ------------------------------------------------------------ Paie (BP23C)

export interface PayrollSlipInput {
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  guard_bonuses: number;
  deductions: number;
}

export const listPayrollSlips = async (): Promise<PayrollSlip[]> => {
  const { data, error } = await getClient()
    .from('payroll_slips')
    .select(`*, ${EMPLOYEE_JOIN}`)
    .is('deleted_at', null)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  failIf(error, 'Chargement des bulletins de paie');

  return (data ?? []).map((row) => {
    const joined = row as unknown as JoinedEmployee;
    return {
      id: row.id,
      business_reference: row.business_reference,
      employee_id: row.employee_id,
      employee_name: joined.employee?.full_name ?? '',
      month_year: `${String(row.period_month).padStart(2, '0')}/${row.period_year}`,
      base_salary: Number(row.base_salary),
      guard_bonuses: Number(row.guard_bonuses),
      deductions: Number(row.deductions),
      // Colonne générée par PostgreSQL : jamais calculée côté client.
      net_salary: Number(row.net_salary),
      payment_status: (row.payment_status ?? 'pending') as PayrollSlip['payment_status'],
    };
  });
};

export const createPayrollSlip = async (
  input: PayrollSlipInput,
  ctx: WriteContext,
): Promise<void> => {
  const { error } = await getClient()
    .from('payroll_slips')
    .insert({ ...auditColumns(ctx), ...input, payment_status: 'pending' });

  failIf(error, 'Création du bulletin de paie');
};
