-- MORACare Enterprise - Tables métier manquantes
-- Version: 1.2.0
-- Référence: BP22A/B/C (Finance), BP23B/C (RH), TD02 §7
--
-- Corrige l'écart P2-02 du RAPPORT-AUDIT-PHASE1-2 : plusieurs écrans déjà
-- construits manipulent des entités qui n'avaient aucune table.
--   * Lignes de facture : collectées par FinanceModule, stockées nulle part
--   * Devis, caisses, mouvements et clôtures de caisse (BP22B)
--   * Plannings de garde et bulletins de paie (BP23B, BP23C)

-- ==========================================
-- 1. LIGNES DE FACTURE (BP22A)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- Colonne d'assurance manquante sur invoices (type Invoice côté TypeScript)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS insurance_coverage_amount NUMERIC(12,2) DEFAULT 0;

-- ==========================================
-- 2. DEVIS (BP22A)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    quote_date TIMESTAMPTZ DEFAULT NOW(),
    valid_until DATE,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- draft, validated, rejected, converted
    converted_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 3. CAISSES (BP22B)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cashier_id UUID REFERENCES public.profiles(id),
    opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, closed
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- encaissement, decaissement, transfert
    payment_method VARCHAR(50) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    movement_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.cash_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    closing_date TIMESTAMPTZ DEFAULT NOW(),
    theoretical_balance NUMERIC(12,2) NOT NULL,
    physical_cash_count NUMERIC(12,2) NOT NULL,
    -- L'écart est calculé, jamais saisi : il ne peut pas être falsifié.
    variance_amount NUMERIC(12,2) GENERATED ALWAYS AS (physical_cash_count - theoretical_balance) STORED,
    explanation TEXT,
    closed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- 4. PLANNINGS ET PAIE (BP23B, BP23C)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.shift_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    shift_type VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.payroll_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_reference VARCHAR(50) UNIQUE NOT NULL,
    establishment_id UUID REFERENCES public.establishments(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    period_month SMALLINT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year SMALLINT NOT NULL CHECK (period_year BETWEEN 2000 AND 2200),
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    guard_bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
    deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(12,2) GENERATED ALWAYS AS (base_salary + guard_bonuses - deductions) STORED,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    deleted_at TIMESTAMPTZ,
    -- Un seul bulletin par employé et par période
    CONSTRAINT uq_payroll_employee_period UNIQUE (employee_id, period_year, period_month)
);

-- Colonnes RH manquantes sur employees (type Employee côté TypeScript)
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS phone   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS diploma VARCHAR(255),
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(200);

-- Colonne manquante sur profiles (type UserProfile côté TypeScript)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- ==========================================
-- 5. RLS, SÉQUENCES, TRIGGERS, INDEX
-- ==========================================

-- 5.1 Activation RLS
ALTER TABLE public.invoice_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_slips    ENABLE ROW LEVEL SECURITY;

-- 5.2 Isolation multi-tenant, identique aux autres tables métier
DO $$
DECLARE
  t TEXT;
  new_tables TEXT[] := ARRAY[
    'invoice_items', 'quotes', 'quote_items', 'cash_registers',
    'cash_movements', 'cash_closures', 'shift_schedules', 'payroll_slips'
  ];
BEGIN
  FOREACH t IN ARRAY new_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || t, t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL
        TO authenticated
        USING (
          public.is_super_admin()
          OR establishment_id = public.current_establishment_id()
        )
        WITH CHECK (
          public.is_super_admin()
          OR establishment_id = public.current_establishment_id()
        )
    $f$, 'tenant_isolation_' || t, t);
  END LOOP;
END $$;

-- 5.3 Séquences de références métier (TD02 §8)
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_quotes          AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_cash_registers  AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_cash_movements  AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_cash_closures   AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_shift_schedules AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_payroll_slips   AS BIGINT START 1;

-- Extension de la fonction de génération aux nouvelles tables
CREATE OR REPLACE FUNCTION public.generate_business_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prefix TEXT;
  v_seq    TEXT;
BEGIN
  IF NEW.business_reference IS NOT NULL AND NEW.business_reference <> '' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'patients'         THEN v_prefix := 'MORA-PAT-'; v_seq := 'public.seq_ref_patients';
    WHEN 'appointments'     THEN v_prefix := 'MORA-RDV-'; v_seq := 'public.seq_ref_appointments';
    WHEN 'consultations'    THEN v_prefix := 'MORA-CON-'; v_seq := 'public.seq_ref_consultations';
    WHEN 'prescriptions'    THEN v_prefix := 'MORA-ORD-'; v_seq := 'public.seq_ref_prescriptions';
    WHEN 'hospitalizations' THEN v_prefix := 'MORA-HOS-'; v_seq := 'public.seq_ref_hospitalizations';
    WHEN 'pharmacy_items'   THEN v_prefix := 'MORA-PHA-'; v_seq := 'public.seq_ref_pharmacy_items';
    WHEN 'lab_orders'       THEN v_prefix := 'MORA-LAB-'; v_seq := 'public.seq_ref_lab_orders';
    WHEN 'imaging_orders'   THEN v_prefix := 'MORA-IMG-'; v_seq := 'public.seq_ref_imaging_orders';
    WHEN 'invoices'         THEN v_prefix := 'MORA-FAC-'; v_seq := 'public.seq_ref_invoices';
    WHEN 'payments'         THEN v_prefix := 'MORA-PAY-'; v_seq := 'public.seq_ref_payments';
    WHEN 'employees'        THEN v_prefix := 'MORA-EMP-'; v_seq := 'public.seq_ref_employees';
    WHEN 'establishments'   THEN v_prefix := 'MORA-EST-'; v_seq := 'public.seq_ref_establishments';
    WHEN 'profiles'         THEN v_prefix := 'MORA-USR-'; v_seq := 'public.seq_ref_profiles';
    WHEN 'quotes'           THEN v_prefix := 'MORA-DEV-'; v_seq := 'public.seq_ref_quotes';
    WHEN 'cash_registers'   THEN v_prefix := 'MORA-CAI-'; v_seq := 'public.seq_ref_cash_registers';
    WHEN 'cash_movements'   THEN v_prefix := 'MORA-MVT-'; v_seq := 'public.seq_ref_cash_movements';
    WHEN 'cash_closures'    THEN v_prefix := 'MORA-CLO-'; v_seq := 'public.seq_ref_cash_closures';
    WHEN 'shift_schedules'  THEN v_prefix := 'MORA-GAR-'; v_seq := 'public.seq_ref_shift_schedules';
    WHEN 'payroll_slips'    THEN v_prefix := 'MORA-PAI-'; v_seq := 'public.seq_ref_payroll_slips';
    ELSE
      RAISE EXCEPTION 'generate_business_ref: aucune séquence définie pour la table %', TG_TABLE_NAME;
  END CASE;

  NEW.business_reference := v_prefix || LPAD(nextval(v_seq::regclass)::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- 5.4 Triggers sur les nouvelles tables à référence métier
DO $$
DECLARE
  t TEXT;
  ref_tables TEXT[] := ARRAY[
    'quotes', 'cash_registers', 'cash_movements',
    'cash_closures', 'shift_schedules', 'payroll_slips'
  ];
BEGIN
  FOREACH t IN ARRAY ref_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_ref ON public.%I', t, t);
    EXECUTE format($f$
      CREATE TRIGGER trig_%s_ref
        BEFORE INSERT ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.generate_business_ref()
    $f$, t, t);

    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_ref_immutable ON public.%I', t, t);
    EXECUTE format($f$
      CREATE TRIGGER trig_%s_ref_immutable
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.prevent_business_ref_update()
    $f$, t, t);
  END LOOP;
END $$;

-- 5.5 Trigger updated_at sur toutes les nouvelles tables
DO $$
DECLARE
  t TEXT;
  all_new TEXT[] := ARRAY[
    'invoice_items', 'quotes', 'quote_items', 'cash_registers',
    'cash_movements', 'cash_closures', 'shift_schedules', 'payroll_slips'
  ];
BEGIN
  FOREACH t IN ARRAY all_new LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated_at ON public.%I', t, t);
    EXECUTE format($f$
      CREATE TRIGGER trig_%s_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
    $f$, t, t);
  END LOOP;
END $$;

-- 5.6 Index (TD02 §16)
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice        ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_establishment  ON public.invoice_items(establishment_id);
CREATE INDEX IF NOT EXISTS idx_quotes_establishment         ON public.quotes(establishment_id);
CREATE INDEX IF NOT EXISTS idx_quotes_patient               ON public.quotes(patient_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote            ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_establishment ON public.cash_registers(establishment_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status        ON public.cash_registers(status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register      ON public.cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date          ON public.cash_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_closures_register       ON public.cash_closures(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_employee     ON public.shift_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_date         ON public.shift_schedules(shift_date);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_employee       ON public.payroll_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_period         ON public.payroll_slips(period_year, period_month);
