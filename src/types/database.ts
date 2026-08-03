/**
 * Typage de la base PostgreSQL.
 *
 * `database.generated.ts` est produit par l'API Supabase à partir du schéma
 * réel — il fait foi et ne doit jamais être édité à la main. À régénérer après
 * toute migration :
 *
 *   SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=... npm run db:gen-types
 *
 * Ce fichier n'ajoute rien : il se contente d'exposer des alias lisibles pour
 * que les services n'aient pas à écrire
 * `Database['public']['Tables']['patients']['Row']` à chaque ligne.
 */

import type { Database } from './database.generated';

export type { Database, Json } from './database.generated';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];

/**
 * Colonnes `NOT NULL` remplies par un trigger `BEFORE INSERT`.
 *
 * Le générateur les voit obligatoires puisqu'elles n'ont pas de DEFAULT, mais
 * l'application ne doit surtout pas les fournir : les références métier sont
 * attribuées par des séquences PostgreSQL (TD02 §8). On les rend donc
 * facultatives à l'insertion.
 */
type TriggerFilledColumn = 'business_reference' | 'license_number';

type RelaxTriggerColumns<T> = T extends { Insert: infer I }
  ? Omit<T, 'Insert'> & {
      Insert: Omit<I, TriggerFilledColumn> &
        Partial<Pick<I, Extract<TriggerFilledColumn, keyof I>>>;
    }
  : T;

/**
 * Schéma tel que l'application le manipule.
 *
 * Identique au schéma généré, aux colonnes remplies par trigger près. C'est ce
 * type que reçoivent les clients Supabase.
 */
export type AppDatabase = Omit<Database, 'public'> & {
  public: Omit<Database['public'], 'Tables'> & {
    Tables: { [K in keyof Tables]: RelaxTriggerColumns<Tables[K]> };
  };
};

/** Ligne d'une table, par son nom. */
type Row<T extends keyof Tables> = Tables[T]['Row'];

// ---------------------------------------------------------------------------
// Énumérations PostgreSQL
// ---------------------------------------------------------------------------

export type SubscriptionState = Enums['subscription_state'];
export type LicenseState = Enums['license_state'];

/**
 * Espace auquel appartient un module.
 *
 * `modules.workspace` est une colonne texte libre côté base : la contrainte est
 * portée par le seed. Le type la restitue ici pour l'application.
 */
export type ModuleWorkspace = 'establishment' | 'platform' | 'portal';

// ---------------------------------------------------------------------------
// Alias de lignes
// ---------------------------------------------------------------------------

export type EstablishmentRow = Row<'establishments'>;
export type ProfileRow = Row<'profiles'>;
export type PatientRow = Row<'patients'>;
export type AppointmentRow = Row<'appointments'>;
export type ConsultationRow = Row<'consultations'>;
export type PrescriptionRow = Row<'prescriptions'>;
export type HospitalizationRow = Row<'hospitalizations'>;
export type PharmacyItemRow = Row<'pharmacy_items'>;
export type LabOrderRow = Row<'lab_orders'>;
export type ImagingOrderRow = Row<'imaging_orders'>;
export type InvoiceRow = Row<'invoices'>;
export type InvoiceItemRow = Row<'invoice_items'>;
export type PaymentRow = Row<'payments'>;
export type QuoteRow = Row<'quotes'>;
export type QuoteItemRow = Row<'quote_items'>;
export type CashRegisterRow = Row<'cash_registers'>;
export type CashMovementRow = Row<'cash_movements'>;
export type CashClosureRow = Row<'cash_closures'>;
export type EmployeeRow = Row<'employees'>;
export type ShiftScheduleRow = Row<'shift_schedules'>;
export type PayrollSlipRow = Row<'payroll_slips'>;
export type AuditLogRow = Row<'audit_logs'>;
export type NotificationRow = Row<'notifications'>;
export type SystemSettingRow = Row<'system_settings'>;

// Référentiel SaaS
export type ModuleRow = Row<'modules'>;
export type SubscriptionPlanRow = Row<'subscription_plans'>;
export type PlanModuleRow = Row<'plan_modules'>;
export type SubscriptionRow = Row<'subscriptions'>;
export type SubscriptionEventRow = Row<'subscription_events'>;
export type LicenseRow = Row<'licenses'>;
export type LicenseEventRow = Row<'license_events'>;
export type EstablishmentModuleRow = Row<'establishment_modules'>;
export type RolePermissionRow = Row<'role_permissions'>;
export type RegistrationRequestRow = Row<'registration_requests'>;
export type ContactRequestRow = Row<'contact_requests'>;

/** Statuts de traitement communs aux demandes et aux prises de contact. */
export type RequestStatus =
  | 'pending'
  | 'in_progress'
  | 'contacted'
  | 'accepted'
  | 'rejected'
  | 'closed';
