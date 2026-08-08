'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Patient,
  Appointment,
  Consultation,
  PharmacyItem,
  LabOrder,
  ImagingOrder,
  Invoice,
  Employee,
  UserAccount,
  CashRegister,
  CashMovement,
  ShiftSchedule,
  PayrollSlip,
  ActiveModulesState,
} from '@/types';
import { useAuth } from './AuthContext';
import { ServiceError, type WriteContext } from '@/services/base.service';
import * as patientService from '@/services/patient.service';
import * as clinicalService from '@/services/clinical.service';
import * as hospitalizationService from '@/services/hospitalization.service';
import * as diagnosticsService from '@/services/diagnostics.service';
import * as pharmacyService from '@/services/pharmacy.service';
import * as financeService from '@/services/finance.service';
import * as hrService from '@/services/hr.service';
import * as cashService from '@/services/cash.service';
import * as profileService from '@/services/profile.service';

/**
 * Données métier de l'établissement courant.
 *
 * Toutes les lectures et écritures passent par `src/services/` (TD04 §13).
 * L'isolation entre établissements est assurée par les politiques RLS de
 * PostgreSQL, pas par ce contexte : le frontend ne porte aucune logique
 * d'autorisation (TD04 §23).
 */

interface DataContextType {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  /**
   * Activation des modules.
   *
   * Encore en état local : le module Paramètres pilote (étape 7 de la feuille
   * de route) n'est pas développé, et le référentiel unique des modules n'est
   * pas arbitré. Volontairement laissé en l'état pour ne pas figer un modèle
   * qui devra changer.
   */
  activeModules: ActiveModulesState;
  toggleModule: (moduleKey: keyof ActiveModulesState) => void;

  userAccounts: UserAccount[];
  addUserAccount: (input: profileService.CreateUserInput) => Promise<void>;
  setUserAccountActive: (userId: string, isActive: boolean) => Promise<void>;
  updateUserAccount: (userId: string, changes: profileService.UpdateUserInput) => Promise<void>;

  staff: profileService.StaffMember[];
  doctors: profileService.StaffMember[];

  patients: Patient[];
  addPatient: (input: patientService.PatientInput) => Promise<void>;

  appointments: Appointment[];
  addAppointment: (input: clinicalService.AppointmentInput) => Promise<void>;

  consultations: Consultation[];
  addConsultation: (input: clinicalService.ConsultationInput) => Promise<void>;

  hospitalizations: hospitalizationService.Stay[];
  addHospitalization: (input: hospitalizationService.AdmissionInput) => Promise<void>;

  /**
   * Catalogue pharmaceutique réduit, pour le tableau de bord et la fiche
   * patient. La création et la modification passent par le module Pharmacie,
   * qui manipule le modèle complet du BP19 §5.
   */
  pharmacyItems: PharmacyItem[];

  labOrders: LabOrder[];
  addLabOrder: (input: diagnosticsService.LabOrderInput) => Promise<void>;

  imagingOrders: ImagingOrder[];
  addImagingOrder: (input: diagnosticsService.ImagingOrderInput) => Promise<void>;

  invoices: Invoice[];
  addInvoice: (input: financeService.InvoiceInput) => Promise<void>;

  cashRegisters: CashRegister[];
  openCashRegister: (input: cashService.CashRegisterInput) => Promise<void>;
  closeCashRegister: (input: cashService.CashClosureInput) => Promise<void>;
  cashMovements: CashMovement[];
  addCashMovement: (input: cashService.CashMovementInput) => Promise<void>;

  employees: Employee[];
  addEmployee: (input: hrService.EmployeeInput) => Promise<void>;
  shiftSchedules: ShiftSchedule[];
  addShiftSchedule: (input: hrService.ShiftScheduleInput) => Promise<void>;
  payrollSlips: PayrollSlip[];
  addPayrollSlip: (input: hrService.PayrollSlipInput) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEFAULT_ACTIVE_MODULES: ActiveModulesState = {
  patients: true,
  appointments: true,
  consultations: true,
  hospitalizations: true,
  pharmacy: true,
  laboratory: true,
  imaging: true,
  finance: true,
  hr: true,
  ged: true,
  user_management: true,
};

const describeError = (err: unknown): string =>
  err instanceof ServiceError || err instanceof Error
    ? err.message
    : 'Une erreur inattendue est survenue.';

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeModules, setActiveModules] = useState<ActiveModulesState>(DEFAULT_ACTIVE_MODULES);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [staff, setStaff] = useState<profileService.StaffMember[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [hospitalizations, setHospitalizations] = useState<hospitalizationService.Stay[]>([]);
  const [pharmacyItems, setPharmacyItems] = useState<PharmacyItem[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [imagingOrders, setImagingOrders] = useState<ImagingOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);
  const [payrollSlips, setPayrollSlips] = useState<PayrollSlip[]>([]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const [
        loadedPatients,
        loadedAppointments,
        loadedConsultations,
        loadedHospitalizations,
        loadedPharmacy,
        loadedLab,
        loadedImaging,
        loadedInvoices,
        loadedEmployees,
        loadedShifts,
        loadedPayroll,
        loadedRegisters,
        loadedMovements,
        loadedStaff,
        loadedAccounts,
      ] = await Promise.all([
        patientService.listPatients(),
        clinicalService.listAppointments(),
        clinicalService.listConsultations(),
        hospitalizationService.listStays(),
        pharmacyService.listPharmacyItems(),
        diagnosticsService.listLabOrders(),
        diagnosticsService.listImagingOrders(),
        financeService.listInvoices(),
        hrService.listEmployees(),
        hrService.listShiftSchedules(),
        hrService.listPayrollSlips(),
        cashService.listCashRegisters(),
        cashService.listCashMovements(),
        profileService.listStaff(),
        profileService.listUserAccounts(),
      ]);

      setPatients(loadedPatients);
      setAppointments(loadedAppointments);
      setConsultations(loadedConsultations);
      setHospitalizations(loadedHospitalizations);
      setPharmacyItems(loadedPharmacy);
      setLabOrders(loadedLab);
      setImagingOrders(loadedImaging);
      setInvoices(loadedInvoices);
      setEmployees(loadedEmployees);
      setShiftSchedules(loadedShifts);
      setPayrollSlips(loadedPayroll);
      setCashRegisters(loadedRegisters);
      setCashMovements(loadedMovements);
      setStaff(loadedStaff);
      setUserAccounts(loadedAccounts);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refresh();
    } else {
      setPatients([]);
      setAppointments([]);
      setConsultations([]);
      setHospitalizations([]);
      setPharmacyItems([]);
      setLabOrders([]);
      setImagingOrders([]);
      setInvoices([]);
      setEmployees([]);
      setShiftSchedules([]);
      setPayrollSlips([]);
      setCashRegisters([]);
      setCashMovements([]);
      setStaff([]);
      setUserAccounts([]);
    }
  }, [isAuthenticated, refresh]);

  /**
   * Contexte d'écriture. `null` tant que l'utilisateur n'est pas rattaché à un
   * établissement : dans ce cas toute écriture est refusée côté application,
   * et le serait de toute façon par la clause WITH CHECK des politiques RLS.
   */
  const writeContext: WriteContext | null = useMemo(() => {
    if (!user?.establishment_id) return null;
    return { establishmentId: user.establishment_id, userId: user.id };
  }, [user]);

  /** Exécute une écriture puis recharge, en remontant l'erreur à l'appelant. */
  const mutate = useCallback(
    async (action: (ctx: WriteContext) => Promise<void>) => {
      if (!writeContext) {
        const message =
          "Votre compte n'est rattaché à aucun établissement : l'enregistrement est impossible.";
        setError(message);
        throw new ServiceError(message);
      }

      try {
        await action(writeContext);
        await refresh();
      } catch (err) {
        setError(describeError(err));
        throw err;
      }
    },
    [writeContext, refresh],
  );

  const toggleModule = useCallback((moduleKey: keyof ActiveModulesState) => {
    setActiveModules((current) => ({ ...current, [moduleKey]: !current[moduleKey] }));
  }, []);

  const setUserAccountActive = useCallback(
    async (userId: string, isActive: boolean) => {
      try {
        await profileService.setUserActive(userId, isActive);
        await refresh();
      } catch (err) {
        setError(describeError(err));
        throw err;
      }
    },
    [refresh],
  );

  const addUserAccount = useCallback(
    async (input: profileService.CreateUserInput) => {
      try {
        await profileService.createUserAccount(input);
        await refresh();
      } catch (err) {
        setError(describeError(err));
        throw err;
      }
    },
    [refresh],
  );

  const updateUserAccount = useCallback(
    async (userId: string, changes: profileService.UpdateUserInput) => {
      try {
        await profileService.updateUserAccount(userId, changes);
        await refresh();
      } catch (err) {
        setError(describeError(err));
        throw err;
      }
    },
    [refresh],
  );

  const doctors = useMemo(() => staff.filter((member) => member.role === 'doctor'), [staff]);

  const value: DataContextType = {
    isLoading,
    error,
    refresh,
    activeModules,
    toggleModule,
    userAccounts,
    addUserAccount,
    setUserAccountActive,
    updateUserAccount,
    staff,
    doctors,
    patients,
    addPatient: (input) => mutate((ctx) => patientService.createPatient(input, ctx).then(() => undefined)),
    appointments,
    addAppointment: (input) => mutate((ctx) => clinicalService.createAppointment(input, ctx)),
    consultations,
    addConsultation: (input) => mutate((ctx) => clinicalService.createConsultation(input, ctx)),
    hospitalizations,
    addHospitalization: (input) => mutate((ctx) => hospitalizationService.admitPatient(input, ctx)),
    pharmacyItems,
    labOrders,
    addLabOrder: (input) => mutate((ctx) => diagnosticsService.createLabOrder(input, ctx)),
    imagingOrders,
    addImagingOrder: (input) => mutate((ctx) => diagnosticsService.createImagingOrder(input, ctx)),
    invoices,
    addInvoice: (input) => mutate((ctx) => financeService.createInvoice(input, ctx)),
    cashRegisters,
    openCashRegister: (input) => mutate((ctx) => cashService.openCashRegister(input, ctx)),
    closeCashRegister: (input) => mutate((ctx) => cashService.closeCashRegister(input, ctx)),
    cashMovements,
    addCashMovement: (input) => mutate((ctx) => cashService.createCashMovement(input, ctx)),
    employees,
    addEmployee: (input) => mutate((ctx) => hrService.createEmployee(input, ctx)),
    shiftSchedules,
    addShiftSchedule: (input) => mutate((ctx) => hrService.createShiftSchedule(input, ctx)),
    payrollSlips,
    addPayrollSlip: (input) => mutate((ctx) => hrService.createPayrollSlip(input, ctx)),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
