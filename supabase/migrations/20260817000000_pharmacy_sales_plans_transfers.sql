-- MORACare Enterprise - Vente, plans thérapeutiques, tournées et transferts
-- Version: 3.6.0
-- Références : BP18 §12 (réapprovisionnements internes), BP19 §6 (plans
-- thérapeutiques), §10 (délivrance), §11 (dispensation hospitalière), §12
-- (armoires de service).
--
-- Choix structurant : la vente n'est pas une seconde délivrance
-- -------------------------------------------------------------
-- Vendre un médicament au comptoir et le délivrer sur ordonnance sont le même
-- geste au regard du stock : on sort une quantité d'un lot, pour un patient, et
-- l'on trace. Ce qui diffère, c'est le motif et le règlement.
--
-- Créer une table de ventes séparée aurait dupliqué tout le circuit —
-- vérification du lot, blocage des périmés, contrôle des rappels, mouvement de
-- stock, cumul du montant — avec la certitude que les deux copies finiraient
-- par diverger. Sur des médicaments, une règle appliquée d'un côté et pas de
-- l'autre est un défaut grave.
--
-- `dispensations` gagne donc un canal et les informations de règlement. Toutes
-- les garanties déjà en place s'appliquent à la vente sans une ligne de plus.

-- ==========================================
-- 1. CANAL ET RÈGLEMENT D'UNE DÉLIVRANCE
-- ==========================================
DO $$ BEGIN
  CREATE TYPE public.dispensation_channel AS ENUM ('prescription', 'sale', 'ward_round');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.dispensations
  ADD COLUMN IF NOT EXISTS channel public.dispensation_channel NOT NULL DEFAULT 'prescription',
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(60),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id),
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS therapeutic_plan_id UUID,
  ADD COLUMN IF NOT EXISTS ward_round_id UUID;

CREATE INDEX IF NOT EXISTS dispensations_channel_idx
  ON public.dispensations (establishment_id, channel, dispensed_at DESC);

/*
 * Une vente au comptoir n'exige pas de prescription.
 *
 * BR-085 lie la délivrance à une prescription, mais le BP19 §10 admet la vente
 * directe : la contrainte porte donc sur le canal. Une délivrance sur
 * ordonnance sans prescription reste refusée.
 */
CREATE OR REPLACE FUNCTION public.enforce_dispensation_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.channel = 'prescription' AND NEW.prescription_id IS NULL
     AND NEW.patient_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Une délivrance nominative doit être rattachée à une prescription (BR-085).';
  END IF;

  IF NEW.channel = 'ward_round' AND NEW.hospitalization_id IS NULL THEN
    RAISE EXCEPTION 'Une dispensation hospitalière doit être rattachée à un séjour.';
  END IF;

  -- Une vente identifie son acquéreur : un patient de la base, ou à défaut un
  -- nom saisi. Sans l'un ni l'autre, le reçu ne désigne personne.
  IF NEW.channel = 'sale' AND NEW.patient_id IS NULL
     AND COALESCE(btrim(NEW.customer_name), '') = '' THEN
    RAISE EXCEPTION 'Une vente doit désigner un patient ou un acquéreur.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_dispensation_channel ON public.dispensations;
CREATE TRIGGER trig_dispensation_channel
  BEFORE INSERT OR UPDATE OF channel, prescription_id, hospitalization_id, patient_id
  ON public.dispensations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_dispensation_channel();

/*
 * La validation pharmaceutique ne s'applique qu'aux prescriptions.
 *
 * Reprend le contrôle des lignes de délivrance en tenant compte du canal : une
 * vente au comptoir n'a pas de prescription à valider, et exiger l'inverse
 * bloquerait toute vente dès que le réglage est actif.
 */
CREATE OR REPLACE FUNCTION public.post_dispensation_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dispensation RECORD;
  v_lot RECORD;
  v_settings JSONB;
  v_block_expired BOOLEAN;
  v_require_validation BOOLEAN;
  v_prescription_status TEXT;
BEGIN
  SELECT d.id, d.establishment_id, d.pharmacy_id, d.patient_id, d.prescription_id,
         d.dispensed_by, d.dispensed_at, d.channel
    INTO v_dispensation
    FROM public.dispensations d WHERE d.id = NEW.dispensation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Délivrance introuvable.';
  END IF;

  SELECT COALESCE(module_settings->'pharmacy', '{}'::JSONB)
    INTO v_settings
    FROM public.establishments WHERE id = v_dispensation.establishment_id;

  v_block_expired := COALESCE((v_settings->>'blockExpiredDispensing')::BOOLEAN, TRUE);
  v_require_validation := COALESCE((v_settings->>'requirePharmacistValidation')::BOOLEAN, TRUE);

  IF v_require_validation
     AND v_dispensation.channel <> 'sale'
     AND v_dispensation.prescription_id IS NOT NULL THEN
    SELECT pharmacy_status INTO v_prescription_status
      FROM public.prescriptions WHERE id = v_dispensation.prescription_id;

    IF v_prescription_status NOT IN ('validated', 'dispensed') THEN
      RAISE EXCEPTION
        'La prescription doit être validée par le pharmacien avant toute délivrance.';
    END IF;
  END IF;

  IF NEW.lot_id IS NOT NULL THEN
    SELECT expires_on, state, lot_number INTO v_lot
      FROM public.medication_lots WHERE id = NEW.lot_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lot introuvable.';
    END IF;

    -- Un rappel de lot ne se négocie pas : aucun réglage ne le lève.
    IF v_lot.state = 'recalled' THEN
      RAISE EXCEPTION 'Le lot % fait l''objet d''un rappel : délivrance interdite.', v_lot.lot_number;
    END IF;

    IF v_block_expired AND v_lot.expires_on IS NOT NULL AND v_lot.expires_on < CURRENT_DATE THEN
      RAISE EXCEPTION 'Le lot % est périmé depuis le % : délivrance interdite.',
        v_lot.lot_number, to_char(v_lot.expires_on, 'DD/MM/YYYY');
    END IF;
  END IF;

  INSERT INTO public.stock_movements (
    establishment_id, item_id, lot_id, pharmacy_id, kind, quantity, unit_cost,
    reason, source_table, source_id, patient_id, performed_by, occurred_at, created_by
  ) VALUES (
    v_dispensation.establishment_id, NEW.item_id, NEW.lot_id, v_dispensation.pharmacy_id,
    'exit', -NEW.quantity, NEW.unit_price,
    CASE v_dispensation.channel
      WHEN 'sale' THEN 'Vente au comptoir'
      WHEN 'ward_round' THEN 'Dispensation hospitalière'
      ELSE 'Délivrance'
    END,
    'dispensations', v_dispensation.id, v_dispensation.patient_id,
    v_dispensation.dispensed_by, v_dispensation.dispensed_at, v_dispensation.dispensed_by
  );

  UPDATE public.dispensations
     SET total_amount = total_amount + (NEW.quantity * NEW.unit_price), updated_at = NOW()
   WHERE id = NEW.dispensation_id;

  RETURN NEW;
END;
$$;

-- ==========================================
-- 2. PLANS THÉRAPEUTIQUES (BP19 §6)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.therapeutic_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospitalization_id UUID REFERENCES public.hospitalizations(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.profiles(id),
  label VARCHAR(200) NOT NULL,
  indication TEXT,
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_on DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT plan_status_known CHECK (status IN ('active', 'suspended', 'completed', 'canceled')),
  CONSTRAINT plan_dates_ordered CHECK (ended_on IS NULL OR ended_on >= started_on)
);

CREATE INDEX IF NOT EXISTS therapeutic_plans_patient_idx
  ON public.therapeutic_plans (patient_id, started_on DESC);

/*
 * Ligne du plan : un traitement, sa posologie et son rythme.
 *
 * Le médicament est référencé au catalogue quand il y figure, et nommé
 * librement sinon : un traitement prescrit hors dotation doit pouvoir être
 * porté au plan, même si la pharmacie ne le détient pas.
 */
CREATE TABLE IF NOT EXISTS public.therapeutic_plan_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.therapeutic_plans(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.pharmacy_items(id),
  medication_label VARCHAR(200) NOT NULL,
  treatment_type VARCHAR(30) NOT NULL DEFAULT 'medication',
  dosage VARCHAR(120),
  route VARCHAR(60),
  frequency VARCHAR(120),
  administration_times TEXT[],
  duration_days INT CHECK (duration_days IS NULL OR duration_days BETWEEN 1 AND 3650),
  quantity_per_intake NUMERIC(10,2) CHECK (quantity_per_intake IS NULL OR quantity_per_intake > 0),
  is_continuous BOOLEAN NOT NULL DEFAULT FALSE,
  instructions TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_line_type_known
    CHECK (treatment_type IN ('medication', 'infusion', 'injection', 'one_off', 'continuous')),
  CONSTRAINT plan_line_status_known CHECK (status IN ('active', 'suspended', 'stopped'))
);

CREATE INDEX IF NOT EXISTS therapeutic_plan_lines_idx ON public.therapeutic_plan_lines (plan_id);

-- BR-084 : toute prescription est rattachée à un plan thérapeutique.
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS therapeutic_plan_id UUID REFERENCES public.therapeutic_plans(id);

DO $$ BEGIN
  ALTER TABLE public.dispensations
    ADD CONSTRAINT dispensations_plan_fk
    FOREIGN KEY (therapeutic_plan_id) REFERENCES public.therapeutic_plans(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 3. DISPENSATION HOSPITALIÈRE PAR TOURNÉE (BP19 §11)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.ward_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  service VARCHAR(80),
  round_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- BP19 §11 : la distribution est quotidienne, par tournée, nominative.
  slot VARCHAR(20) NOT NULL DEFAULT 'matin',
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  prepared_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT round_slot_known CHECK (slot IN ('matin', 'midi', 'soir', 'nuit')),
  CONSTRAINT round_status_known CHECK (status IN ('planned', 'in_progress', 'closed', 'canceled'))
);

-- Une seule tournée par service, date et moment : deux tournées concurrentes
-- feraient administrer le traitement deux fois.
CREATE UNIQUE INDEX IF NOT EXISTS ward_rounds_unique_slot
  ON public.ward_rounds (establishment_id, round_date, slot, COALESCE(service, ''))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.ward_round_administrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID NOT NULL REFERENCES public.ward_rounds(id) ON DELETE CASCADE,
  hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
  plan_line_id UUID REFERENCES public.therapeutic_plan_lines(id) ON DELETE SET NULL,
  item_id UUID REFERENCES public.pharmacy_items(id),
  medication_label VARCHAR(200) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'planned',
  administered_at TIMESTAMPTZ,
  administered_by UUID REFERENCES public.profiles(id),
  refusal_reason TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT administration_status_known
    CHECK (status IN ('planned', 'administered', 'refused', 'postponed', 'canceled'))
);

CREATE INDEX IF NOT EXISTS ward_round_administrations_idx
  ON public.ward_round_administrations (round_id);

/*
 * L'administration est consignée dans le dossier du patient.
 *
 * BP19 §11 : « Chaque administration est enregistrée dans le dossier médical ».
 * Le soin est créé par la base, au moment où l'administration est constatée :
 * laisser l'application s'en charger reviendrait à accepter qu'une
 * administration puisse ne jamais figurer au dossier.
 */
CREATE OR REPLACE FUNCTION public.record_administration_in_care()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_establishment UUID;
BEGIN
  IF NEW.status <> 'administered' OR OLD.status = 'administered' THEN
    RETURN NEW;
  END IF;

  SELECT establishment_id INTO v_establishment
    FROM public.hospitalizations WHERE id = NEW.hospitalization_id;

  INSERT INTO public.hospitalization_care (
    establishment_id, hospitalization_id, care_type, recorded_at, caregiver_id,
    observations, created_by, updated_by
  ) VALUES (
    v_establishment, NEW.hospitalization_id, 'Administration de médicament',
    COALESCE(NEW.administered_at, NOW()), NEW.administered_by,
    NEW.medication_label || ' — ' || NEW.quantity::TEXT ||
      COALESCE(' · ' || NEW.observations, ''),
    NEW.administered_by, NEW.administered_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_administration_care ON public.ward_round_administrations;
CREATE TRIGGER trig_administration_care
  AFTER UPDATE OF status ON public.ward_round_administrations
  FOR EACH ROW EXECUTE FUNCTION public.record_administration_in_care();

-- ==========================================
-- 4. RÉAPPROVISIONNEMENTS INTERNES (BP18 §12, BP17 §14)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  from_pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id),
  to_pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  requested_on DATE NOT NULL DEFAULT CURRENT_DATE,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  requested_by UUID REFERENCES public.profiles(id),
  shipped_by UUID REFERENCES public.profiles(id),
  received_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT transfer_status_known
    CHECK (status IN ('draft', 'requested', 'shipped', 'received', 'canceled')),
  -- Un magasin ne se réapprovisionne pas auprès de lui-même.
  CONSTRAINT transfer_distinct_stores CHECK (from_pharmacy_id <> to_pharmacy_id)
);

CREATE TABLE IF NOT EXISTS public.stock_transfer_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id),
  lot_id UUID REFERENCES public.medication_lots(id),
  quantity_requested INT NOT NULL CHECK (quantity_requested > 0),
  quantity_shipped INT NOT NULL DEFAULT 0 CHECK (quantity_shipped >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transfer_line_not_over_shipped CHECK (quantity_shipped <= quantity_requested)
);

CREATE INDEX IF NOT EXISTS stock_transfer_lines_idx ON public.stock_transfer_lines (transfer_id);

/*
 * Expédition d'un transfert interne.
 *
 * BR-071 : chaque réapprovisionnement génère une sortie du magasin source et
 * une entrée dans le magasin destinataire. Les deux mouvements sont créés dans
 * la même transaction : une sortie sans entrée ferait disparaître le stock.
 *
 * Le lot suit la marchandise. Un lot propre au magasin destinataire est créé au
 * besoin, avec les mêmes numéro, péremption et fournisseur : sans cela, la
 * traçabilité s'arrêterait à la porte du magasin.
 */
CREATE OR REPLACE FUNCTION public.ship_stock_transfer(p_transfer_id UUID, p_user UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_transfer RECORD;
  v_line RECORD;
  v_source_lot RECORD;
  v_target_lot UUID;
  v_moved INT := 0;
  v_quantity INT;
BEGIN
  SELECT * INTO v_transfer FROM public.stock_transfers WHERE id = p_transfer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfert introuvable.';
  END IF;

  IF v_transfer.status IN ('shipped', 'received') THEN
    RAISE EXCEPTION 'Ce transfert a déjà été expédié.';
  END IF;

  IF v_transfer.status = 'canceled' THEN
    RAISE EXCEPTION 'Ce transfert est annulé.';
  END IF;

  FOR v_line IN
    SELECT * FROM public.stock_transfer_lines WHERE transfer_id = p_transfer_id
  LOOP
    v_quantity := GREATEST(v_line.quantity_shipped, 0);
    IF v_quantity = 0 THEN
      v_quantity := v_line.quantity_requested;
    END IF;

    -- Sortie du magasin source. Le contrôle de stock suffisant est celui du
    -- registre : il refusera si la quantité n'y est pas.
    INSERT INTO public.stock_movements (
      establishment_id, item_id, lot_id, pharmacy_id, kind, quantity,
      reason, source_table, source_id, performed_by, created_by
    ) VALUES (
      v_transfer.establishment_id, v_line.item_id, v_line.lot_id,
      v_transfer.from_pharmacy_id, 'transfer_out', -v_quantity,
      'Transfert ' || v_transfer.business_reference,
      'stock_transfers', p_transfer_id, p_user, p_user
    );

    v_target_lot := NULL;

    IF v_line.lot_id IS NOT NULL THEN
      SELECT lot_number, expires_on, manufactured_on, supplier_id, unit_cost
        INTO v_source_lot
        FROM public.medication_lots WHERE id = v_line.lot_id;

      SELECT id INTO v_target_lot
        FROM public.medication_lots
       WHERE item_id = v_line.item_id
         AND pharmacy_id = v_transfer.to_pharmacy_id
         AND lower(lot_number) = lower(v_source_lot.lot_number)
         AND deleted_at IS NULL;

      IF v_target_lot IS NULL THEN
        INSERT INTO public.medication_lots (
          establishment_id, item_id, pharmacy_id, supplier_id, lot_number,
          manufactured_on, expires_on, unit_cost, quantity, created_by, updated_by
        ) VALUES (
          v_transfer.establishment_id, v_line.item_id, v_transfer.to_pharmacy_id,
          v_source_lot.supplier_id, v_source_lot.lot_number,
          v_source_lot.manufactured_on, v_source_lot.expires_on,
          v_source_lot.unit_cost, 0, p_user, p_user
        )
        RETURNING id INTO v_target_lot;
      END IF;
    END IF;

    INSERT INTO public.stock_movements (
      establishment_id, item_id, lot_id, pharmacy_id, kind, quantity,
      reason, source_table, source_id, performed_by, created_by
    ) VALUES (
      v_transfer.establishment_id, v_line.item_id, v_target_lot,
      v_transfer.to_pharmacy_id, 'transfer_in', v_quantity,
      'Transfert ' || v_transfer.business_reference,
      'stock_transfers', p_transfer_id, p_user, p_user
    );

    UPDATE public.stock_transfer_lines
       SET quantity_shipped = v_quantity WHERE id = v_line.id;

    v_moved := v_moved + 1;
  END LOOP;

  UPDATE public.stock_transfers
     SET status = 'shipped', shipped_at = NOW(), shipped_by = p_user, updated_at = NOW()
   WHERE id = p_transfer_id;

  RETURN v_moved;
END;
$$;

REVOKE ALL ON FUNCTION public.ship_stock_transfer(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ship_stock_transfer(UUID, UUID) TO authenticated;

/*
 * Le mouvement d'entrée d'un transfert n'ajoute pas deux fois.
 *
 * `apply_stock_movement` incrémente la quantité de l'article à chaque
 * mouvement. Pour un transfert interne, la sortie et l'entrée se compensent
 * exactement : le stock total de l'établissement ne change pas, seule sa
 * répartition entre magasins évolue. Le comportement est donc déjà correct,
 * et ce commentaire existe pour qu'on ne « corrige » pas ce qui n'est pas cassé.
 */

-- ==========================================
-- 5. RÉFÉRENCES ET HORODATAGE
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_therapeutic_plans AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_ward_rounds       AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_stock_transfers   AS BIGINT START 1;

DROP TRIGGER IF EXISTS trig_therapeutic_plans_ref ON public.therapeutic_plans;
CREATE TRIGGER trig_therapeutic_plans_ref BEFORE INSERT ON public.therapeutic_plans
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-PLT-');

DROP TRIGGER IF EXISTS trig_ward_rounds_ref ON public.ward_rounds;
CREATE TRIGGER trig_ward_rounds_ref BEFORE INSERT ON public.ward_rounds
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-TRN-');

DROP TRIGGER IF EXISTS trig_stock_transfers_ref ON public.stock_transfers;
CREATE TRIGGER trig_stock_transfers_ref BEFORE INSERT ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-TSF-');

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['therapeutic_plans', 'therapeutic_plan_lines', 'ward_rounds',
                           'ward_round_administrations', 'stock_transfers'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_updated BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ==========================================
-- 6. ISOLATION PAR ÉTABLISSEMENT
-- ==========================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['therapeutic_plans', 'ward_rounds', 'stock_transfers'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || t, t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL TO authenticated
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

-- Tables de lignes : l'isolation est déduite du document parent, qui est
-- lui-même protégé. Dupliquer `establishment_id` ouvrirait la porte à une
-- divergence, donc à une fuite.
DO $$
DECLARE
  spec RECORD;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('therapeutic_plan_lines',     'therapeutic_plans', 'plan_id'),
      ('ward_round_administrations', 'ward_rounds',       'round_id'),
      ('stock_transfer_lines',       'stock_transfers',   'transfer_id')
    ) AS t(child, parent, fk)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', spec.child);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'tenant_isolation_' || spec.child, spec.child);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.%I p
             WHERE p.id = public.%I.%I
               AND (public.is_super_admin() OR p.establishment_id = public.current_establishment_id())
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.%I p
             WHERE p.id = public.%I.%I
               AND (public.is_super_admin() OR p.establishment_id = public.current_establishment_id())
          )
        )
    $f$, 'tenant_isolation_' || spec.child, spec.child,
         spec.parent, spec.child, spec.fk,
         spec.parent, spec.child, spec.fk);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.therapeutic_plans, public.therapeutic_plan_lines,
  public.ward_rounds, public.ward_round_administrations,
  public.stock_transfers, public.stock_transfer_lines
  TO authenticated;

COMMENT ON TABLE public.therapeutic_plans IS 'Plans thérapeutiques du patient (BP19 §6, BR-084).';
COMMENT ON TABLE public.ward_rounds IS 'Tournées de dispensation hospitalière (BP19 §11).';
COMMENT ON TABLE public.stock_transfers IS 'Réapprovisionnements internes entre magasins (BP18 §12, BR-071).';
