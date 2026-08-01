-- MORACare Enterprise - Official Database Schema
-- Version: 1.0.0
-- Reference: TD-002 & BP-011
-- Description: Complete multi-tenant PostgreSQL schema for MORACare with Row Level Security (RLS) and Audit Trail.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. ENUMS & TYPES
-- ==========================================
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('super_admin', 'establishment_admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech', 'radiologist', 'accountant', 'patient');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE establishment_type AS ENUM ('cabinet', 'clinique', 'centre_medical', 'hopital', 'laboratoire', 'imagerie', 'ong');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'trial', 'past_due', 'canceled', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- 2. CORE SYSTEM & TENANCY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.establishments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type establishment_type NOT NULL DEFAULT 'clinique',
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Comores',
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    subscription_plan VARCHAR(50) DEFAULT 'Enterprise',
    max_users INT DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    role user_role_type NOT NULL DEFAULT 'patient',
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    specialty VARCHAR(100),
    license_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 3. MEDICAL MODULES
-- ==========================================

-- PATIENTS
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    national_id VARCHAR(50),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    blood_group VARCHAR(10),
    allergies TEXT[],
    chronic_conditions TEXT[],
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id),
    appointment_date TIMESTAMPTZ NOT NULL,
    duration_minutes INT DEFAULT 30,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, canceled
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- CONSULTATIONS
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id),
    appointment_id UUID REFERENCES public.appointments(id),
    consultation_date TIMESTAMPTZ DEFAULT NOW(),
    chief_complaint TEXT NOT NULL,
    symptoms TEXT,
    physical_examination TEXT,
    weight_kg NUMERIC(5,2),
    height_cm NUMERIC(5,2),
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    temperature_celsius NUMERIC(4,2),
    heart_rate_bpm INT,
    diagnosis_summary TEXT,
    treatment_plan TEXT,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id),
    medications JSONB NOT NULL, -- list of {name, dosage, frequency, duration, instructions}
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, dispensed, expired
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- HOSPITALIZATIONS
CREATE TABLE IF NOT EXISTS public.hospitalizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id),
    room_number VARCHAR(50) NOT NULL,
    bed_number VARCHAR(50) NOT NULL,
    admission_date TIMESTAMPTZ DEFAULT NOW(),
    discharge_date TIMESTAMPTZ,
    admission_reason TEXT NOT NULL,
    discharge_summary TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, discharged, transferred
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- PHARMACY & INVENTORY
CREATE TABLE IF NOT EXISTS public.pharmacy_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    stock_quantity INT DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL,
    expiry_date DATE,
    reorder_level INT DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- LAB ORDERS & RESULTS
CREATE TABLE IF NOT EXISTS public.lab_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id),
    test_type VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'routine', -- routine, urgent, emergency
    status VARCHAR(50) DEFAULT 'pending', -- pending, sample_collected, in_progress, completed, canceled
    results TEXT,
    normal_reference_range TEXT,
    performed_by UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- IMAGING ORDERS
CREATE TABLE IF NOT EXISTS public.imaging_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id),
    modality VARCHAR(50) NOT NULL, -- X-Ray, Ultrasound, CT, MRI, ECG
    body_part VARCHAR(100) NOT NULL,
    clinical_notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, canceled
    report_text TEXT,
    image_url TEXT,
    radiologist_id UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- FINANCE & INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    invoice_date TIMESTAMPTZ DEFAULT NOW(),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending', -- pending, partially_paid, paid, canceled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL, -- cash, card, mobile_money, bank_transfer
    amount NUMERIC(12,2) NOT NULL,
    transaction_ref VARCHAR(100),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    received_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- HUMAN RESOURCES & EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL,
    base_salary NUMERIC(12,2) NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'CDI',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imaging_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper policy function: check super_admin or matching establishment_id
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies Example
CREATE POLICY "Super admins full access to profiles" ON public.profiles FOR ALL USING (public.is_super_admin() OR auth.uid() = id);
CREATE POLICY "Users read own establishment patients" ON public.patients FOR SELECT USING (public.is_super_admin() OR establishment_id IN (SELECT establishment_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users edit own establishment patients" ON public.patients FOR ALL USING (public.is_super_admin() OR establishment_id IN (SELECT establishment_id FROM public.profiles WHERE id = auth.uid()));

-- ==========================================
-- 5. AUTOMATIC BUSINESS REFERENCE TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION generate_business_ref() 
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT := 'MORA-';
  seq TEXT := LPAD(FLOOR(RANDOM() * 899999 + 100000)::TEXT, 6, '0');
BEGIN
  IF NEW.business_reference IS NULL OR NEW.business_reference = '' THEN
    IF TG_TABLE_NAME = 'patients' THEN prefix := 'MORA-PAT-';
    ELSIF TG_TABLE_NAME = 'appointments' THEN prefix := 'MORA-RDV-';
    ELSIF TG_TABLE_NAME = 'consultations' THEN prefix := 'MORA-CON-';
    ELSIF TG_TABLE_NAME = 'prescriptions' THEN prefix := 'MORA-ORD-';
    ELSIF TG_TABLE_NAME = 'hospitalizations' THEN prefix := 'MORA-HOS-';
    ELSIF TG_TABLE_NAME = 'pharmacy_items' THEN prefix := 'MORA-PHA-';
    ELSIF TG_TABLE_NAME = 'lab_orders' THEN prefix := 'MORA-LAB-';
    ELSIF TG_TABLE_NAME = 'imaging_orders' THEN prefix := 'MORA-IMG-';
    ELSIF TG_TABLE_NAME = 'invoices' THEN prefix := 'MORA-FAC-';
    ELSIF TG_TABLE_NAME = 'payments' THEN prefix := 'MORA-PAY-';
    ELSIF TG_TABLE_NAME = 'employees' THEN prefix := 'MORA-EMP-';
    ELSIF TG_TABLE_NAME = 'establishments' THEN prefix := 'MORA-EST-';
    ELSIF TG_TABLE_NAME = 'profiles' THEN prefix := 'MORA-USR-';
    END IF;
    NEW.business_reference := prefix || seq;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER trig_patient_ref BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_appointment_ref BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_consultation_ref BEFORE INSERT ON public.consultations FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_prescription_ref BEFORE INSERT ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_hospitalization_ref BEFORE INSERT ON public.hospitalizations FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_pharmacy_ref BEFORE INSERT ON public.pharmacy_items FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_lab_ref BEFORE INSERT ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_imaging_ref BEFORE INSERT ON public.imaging_orders FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_invoice_ref BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_payment_ref BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_employee_ref BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_establishment_ref BEFORE INSERT ON public.establishments FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
CREATE TRIGGER trig_profile_ref BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION generate_business_ref();
