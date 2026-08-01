// MORACare Strict TypeScript Domain Definitions - Expanded

export type UserRole = 
  | 'super_admin'
  | 'establishment_admin'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'lab_tech'
  | 'radiologist'
  | 'accountant'
  | 'patient';

export type EstablishmentType =
  | 'cabinet'
  | 'clinique'
  | 'centre_medical'
  | 'hopital'
  | 'laboratoire'
  | 'imagerie'
  | 'ong';

export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'canceled' | 'suspended';

export interface UserProfile {
  id: string;
  business_reference: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  department?: string;
  establishment_id?: string | null;
  is_active: boolean;
  avatar_url?: string;
  specialty?: string;
  license_number?: string;
  created_at: string;
  updated_at: string;
}

export interface UserAccount {
  id: string;
  business_reference: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: UserRole;
  department: string;
  status: 'active' | 'suspended' | 'archived';
  created_at: string;
  last_login?: string;
}

export interface Establishment {
  id: string;
  business_reference: string;
  name: string;
  type: EstablishmentType;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country: string;
  subscription_status: SubscriptionStatus;
  subscription_plan: string;
  max_users: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  business_reference: string;
  establishment_id: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F' | 'Autre';
  birth_date: string;
  national_id?: string;
  phone: string;
  email?: string;
  address?: string;
  blood_group?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  business_reference: string;
  establishment_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'canceled';
  reason: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  business_reference: string;
  establishment_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  consultation_date: string;
  chief_complaint: string;
  symptoms?: string;
  physical_examination?: string;
  weight_kg?: number;
  height_cm?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  temperature_celsius?: number;
  heart_rate_bpm?: number;
  diagnosis_summary?: string;
  treatment_plan?: string;
  status: 'completed' | 'draft';
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string;
  business_reference: string;
  establishment_id: string;
  consultation_id?: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  notes?: string;
  status: 'active' | 'dispensed' | 'expired';
  created_at: string;
}

export interface Hospitalization {
  id: string;
  business_reference: string;
  establishment_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  room_number: string;
  bed_number: string;
  admission_date: string;
  discharge_date?: string;
  admission_reason: string;
  discharge_summary?: string;
  status: 'active' | 'discharged' | 'transferred';
  created_at: string;
}

export interface PharmacyItem {
  id: string;
  business_reference: string;
  establishment_id: string;
  name: string;
  generic_name?: string;
  category: string;
  stock_quantity: number;
  unit_price: number;
  expiry_date?: string;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
}

export interface LabOrder {
  id: string;
  business_reference: string;
  establishment_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  test_type: string;
  priority: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'sample_collected' | 'in_progress' | 'completed' | 'canceled';
  results?: string;
  normal_reference_range?: string;
  completed_at?: string;
  created_at: string;
}

export interface ImagingOrder {
  id: string;
  business_reference: string;
  establishment_id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name: string;
  modality: 'X-Ray' | 'Ultrasound' | 'CT' | 'MRI' | 'ECG';
  body_part: string;
  clinical_notes?: string;
  status: 'pending' | 'completed' | 'canceled';
  report_text?: string;
  image_url?: string;
  completed_at?: string;
  created_at: string;
}

// BP-022A, BP-022B, BP-022C FINANCE ERP DEFINITIONS
export interface FinancialQuote {
  id: string;
  business_reference: string;
  patient_id: string;
  patient_name: string;
  date: string;
  valid_until: string;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'draft' | 'validated' | 'rejected' | 'converted';
}

export interface Invoice {
  id: string;
  business_reference: string;
  establishment_id: string;
  patient_id: string;
  patient_name: string;
  invoice_date: string;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  insurance_coverage_amount?: number;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'canceled';
  created_at: string;
}

export interface CashRegister {
  id: string;
  business_reference: string;
  name: string;
  cashier_name: string;
  opening_balance: number;
  current_balance: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at?: string;
}

export interface CashMovement {
  id: string;
  business_reference: string;
  cash_register_id: string;
  type: 'encaissement' | 'decaissement' | 'transfert';
  payment_method: 'Espèces' | 'Holo' | 'Mvola' | 'Wakati' | 'Chèque' | 'Carte';
  amount: number;
  reason: string;
  patient_name?: string;
  date: string;
}

export interface CashClosure {
  id: string;
  business_reference: string;
  cash_register_id: string;
  closing_date: string;
  theoretical_balance: number;
  physical_cash_count: number;
  variance_amount: number; // gap/écart
  explanation?: string;
  cashier_name: string;
}

// BP-23A, BP-23B, BP-23C HR ERP DEFINITIONS
export interface Employee {
  id: string;
  business_reference: string;
  establishment_id: string;
  full_name: string;
  department: string;
  position: string;
  hire_date: string;
  base_salary: number;
  contract_type: 'CDI' | 'CDD' | 'Vacation' | 'Stage' | 'Consultant';
  phone: string;
  email: string;
  diploma?: string;
  status: 'active' | 'on_leave' | 'suspended' | 'terminated';
  created_at: string;
}

export interface ShiftSchedule {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  date: string;
  shift_type: 'Garde Jour' | 'Garde Nuit' | 'Astreinte' | 'Aprem';
  start_time: string;
  end_time: string;
}

export interface PayrollSlip {
  id: string;
  business_reference: string;
  employee_id: string;
  employee_name: string;
  month_year: string;
  base_salary: number;
  guard_bonuses: number;
  deductions: number;
  net_salary: number;
  payment_status: 'paid' | 'pending';
}

export interface AuditLog {
  id: string;
  establishment_id?: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_name: string;
  entity_id?: string;
  created_at: string;
  ip_address?: string;
}

export interface ActiveModulesState {
  patients: boolean;
  appointments: boolean;
  consultations: boolean;
  hospitalizations: boolean;
  pharmacy: boolean;
  laboratory: boolean;
  imaging: boolean;
  finance: boolean;
  hr: boolean;
  ged: boolean;
  user_management: boolean;
}
