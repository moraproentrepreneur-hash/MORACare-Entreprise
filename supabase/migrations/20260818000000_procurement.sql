-- MORACare Enterprise - Achats, approvisionnements et logistique (BP17)
-- Version: 3.7.0
--
-- Contexte
-- --------
-- Les bons de commande existaient en base sans écran ni circuit. Cette
-- migration construit la chaîne complète du BP17 : expression du besoin,
-- validation, consultation des fournisseurs, comparaison des offres, commande,
-- réception, contrôle qualité, mise en stock et retours.
--
-- Deux principes ont guidé les choix.
--
-- 1. BR-068 : « Les réceptions doivent être contrôlées avant la mise en stock. »
--    L'entrée en stock n'est donc pas produite à la saisie de la réception mais
--    à son acceptation. Une marchandise refusée ne doit jamais devenir du stock
--    disponible, même quelques minutes.
--
-- 2. BR-069 : « Toute réception validée crée automatiquement une entrée de
--    stock. » Cette entrée est créée par la base, pas par l'application : c'est
--    la seule façon de garantir qu'une réception acceptée ne reste jamais sans
--    effet sur le stock.

-- ==========================================
-- 1. TYPES
-- ==========================================
DO $$ BEGIN
  -- BP17 §18, restreint aux étapes que le circuit met réellement en œuvre.
  CREATE TYPE public.requisition_state AS ENUM (
    'draft', 'submitted', 'approved', 'rejected', 'ordered', 'closed', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.quality_result AS ENUM ('accepted', 'accepted_with_reserve', 'refused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 2. DEMANDES D'ACHAT (BP17 §6, §7)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  -- Service demandeur : dépôt, pharmacie, laboratoire, bloc… (BP17 §6).
  requesting_service VARCHAR(80) NOT NULL,
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  justification TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normale',
  needed_by DATE,
  status public.requisition_state NOT NULL DEFAULT 'draft',

  requested_by UUID REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ,
  -- Circuit de validation (BP17 §7). Chaque établissement définit le sien ; on
  -- enregistre qui a tranché et quand, ce qui suffit à reconstituer le parcours.
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ,
  decision_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT requisition_priority_known
    CHECK (priority IN ('basse', 'normale', 'haute', 'urgente'))
);

CREATE INDEX IF NOT EXISTS purchase_requisitions_status_idx
  ON public.purchase_requisitions (establishment_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.purchase_requisition_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisition_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.pharmacy_items(id),
  -- Un besoin peut porter sur un article absent du catalogue : le refuser
  -- obligerait à créer la fiche avant même de savoir si l'achat sera accordé.
  label VARCHAR(200) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit VARCHAR(30),
  estimated_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (estimated_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_requisition_lines_idx
  ON public.purchase_requisition_lines (requisition_id);

-- ==========================================
-- 3. CONSULTATION DES FOURNISSEURS (BP17 §8, §9)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.supplier_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  requisition_id UUID REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  -- BP17 §8 : demande de devis, consultation directe, appel d'offres.
  consultation_type VARCHAR(30) NOT NULL DEFAULT 'devis',
  requested_on DATE NOT NULL DEFAULT CURRENT_DATE,
  received_on DATE,
  valid_until DATE,

  -- Critères de comparaison du BP17 §9.
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  delivery_days INT CHECK (delivery_days IS NULL OR delivery_days BETWEEN 0 AND 365),
  warranty_months INT CHECK (warranty_months IS NULL OR warranty_months BETWEEN 0 AND 240),
  shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  payment_terms VARCHAR(160),
  quality_note INT CHECK (quality_note IS NULL OR quality_note BETWEEN 1 AND 5),

  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  selection_reason TEXT,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT quote_type_known
    CHECK (consultation_type IN ('devis', 'consultation', 'appel_offres', 'privilegie'))
);

-- Un fournisseur n'est consulté qu'une fois par demande : deux offres du même
-- fournisseur rendraient la comparaison ambiguë.
CREATE UNIQUE INDEX IF NOT EXISTS supplier_quotes_unique
  ON public.supplier_quotes (requisition_id, supplier_id)
  WHERE deleted_at IS NULL AND requisition_id IS NOT NULL;

-- BP17 §9 : « Le choix final est historisé. » Une seule offre retenue par
-- demande, sans quoi l'historique ne dirait pas laquelle a emporté la décision.
CREATE UNIQUE INDEX IF NOT EXISTS supplier_quotes_single_selection
  ON public.supplier_quotes (requisition_id)
  WHERE is_selected AND deleted_at IS NULL AND requisition_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.supplier_quote_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES public.supplier_quotes(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.pharmacy_items(id),
  label VARCHAR(200) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_quote_lines_idx ON public.supplier_quote_lines (quote_id);

-- ==========================================
-- 4. BONS DE COMMANDE (BP17 §10)
-- ==========================================
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS requisition_id UUID REFERENCES public.purchase_requisitions(id),
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.supplier_quotes(id),
  ADD COLUMN IF NOT EXISTS delivery_mode VARCHAR(80),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(160),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0;

/*
 * Total du bon de commande.
 *
 * Recalculé depuis les lignes à chaque écriture. Un total saisi à la main
 * finit toujours par diverger de son détail, et c'est le total qu'on paie.
 */
CREATE OR REPLACE FUNCTION public.refresh_purchase_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order UUID := COALESCE(NEW.order_id, OLD.order_id);
  v_lines NUMERIC(14,2);
BEGIN
  SELECT COALESCE(SUM(quantity_ordered * unit_price), 0)
    INTO v_lines
    FROM public.purchase_order_lines WHERE order_id = v_order;

  UPDATE public.purchase_orders
     SET total_amount = GREATEST(0, v_lines + tax_amount + shipping_cost - discount_amount),
         updated_at = NOW()
   WHERE id = v_order;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trig_purchase_order_total ON public.purchase_order_lines;
CREATE TRIGGER trig_purchase_order_total
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.refresh_purchase_order_total();

-- ==========================================
-- 5. RÉCEPTIONS ET CONTRÔLE QUALITÉ (BP17 §11, §12, §13)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  -- Magasin de réception. Par défaut le Dépôt Central ; une livraison directe
  -- vers un autre magasin suppose que l'établissement l'ait autorisée (BR-073).
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  delivery_note VARCHAR(120),
  received_on DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by UUID REFERENCES public.profiles(id),

  quality_result public.quality_result,
  quality_note TEXT,
  controlled_by UUID REFERENCES public.profiles(id),
  controlled_at TIMESTAMPTZ,
  -- Mise en stock effectuée : empêche qu'une réception acceptée deux fois
  -- crédite le stock deux fois.
  stocked_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS purchase_receipts_order_idx
  ON public.purchase_receipts (order_id, received_on DESC);

CREATE TABLE IF NOT EXISTS public.purchase_receipt_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  order_line_id UUID REFERENCES public.purchase_order_lines(id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id),
  quantity_received INT NOT NULL CHECK (quantity_received > 0),
  -- Contrôlés à la réception (BP17 §11).
  lot_number VARCHAR(60),
  manufactured_on DATE,
  expires_on DATE,
  serial_number VARCHAR(120),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT receipt_line_dates_consistent
    CHECK (manufactured_on IS NULL OR expires_on IS NULL OR manufactured_on <= expires_on)
);

CREATE INDEX IF NOT EXISTS purchase_receipt_lines_idx
  ON public.purchase_receipt_lines (receipt_id);

/*
 * Mise en stock d'une réception contrôlée (BR-068, BR-069).
 *
 * N'agit que sur une réception acceptée — avec ou sans réserve. Une réception
 * refusée ne crédite rien : la marchandise repart, elle n'a jamais été du
 * stock disponible.
 *
 * Le lot est créé s'il n'existe pas, puis alimenté par le mouvement : c'est le
 * mouvement qui porte la quantité, jamais le lot directement.
 */
CREATE OR REPLACE FUNCTION public.post_purchase_receipt(p_receipt_id UUID, p_user UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_receipt RECORD;
  v_order RECORD;
  v_line RECORD;
  v_lot UUID;
  v_posted INT := 0;
BEGIN
  SELECT * INTO v_receipt FROM public.purchase_receipts WHERE id = p_receipt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réception introuvable.';
  END IF;

  IF v_receipt.quality_result IS NULL THEN
    RAISE EXCEPTION
      'La réception doit être contrôlée avant sa mise en stock (BR-068).';
  END IF;

  IF v_receipt.quality_result = 'refused' THEN
    RAISE EXCEPTION 'Une réception refusée ne peut pas être mise en stock.';
  END IF;

  IF v_receipt.stocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Cette réception a déjà été mise en stock.';
  END IF;

  SELECT * INTO v_order FROM public.purchase_orders WHERE id = v_receipt.order_id;

  FOR v_line IN
    SELECT * FROM public.purchase_receipt_lines WHERE receipt_id = p_receipt_id
  LOOP
    v_lot := NULL;

    IF COALESCE(btrim(v_line.lot_number), '') <> '' THEN
      SELECT id INTO v_lot
        FROM public.medication_lots
       WHERE item_id = v_line.item_id
         AND lower(lot_number) = lower(btrim(v_line.lot_number))
         AND pharmacy_id IS NOT DISTINCT FROM v_receipt.pharmacy_id
         AND deleted_at IS NULL;

      IF v_lot IS NULL THEN
        INSERT INTO public.medication_lots (
          establishment_id, item_id, pharmacy_id, supplier_id, lot_number,
          manufactured_on, expires_on, unit_cost, quantity, created_by, updated_by
        ) VALUES (
          v_receipt.establishment_id, v_line.item_id, v_receipt.pharmacy_id,
          v_order.supplier_id, btrim(v_line.lot_number),
          v_line.manufactured_on, v_line.expires_on, v_line.unit_price, 0, p_user, p_user
        )
        RETURNING id INTO v_lot;
      END IF;
    END IF;

    INSERT INTO public.stock_movements (
      establishment_id, item_id, lot_id, pharmacy_id, kind, quantity, unit_cost,
      reason, source_table, source_id, performed_by, created_by
    ) VALUES (
      v_receipt.establishment_id, v_line.item_id, v_lot, v_receipt.pharmacy_id,
      'entry', v_line.quantity_received, v_line.unit_price,
      'Réception ' || v_receipt.business_reference,
      'purchase_receipts', p_receipt_id, p_user, p_user
    );

    -- Avancement de la commande.
    IF v_line.order_line_id IS NOT NULL THEN
      UPDATE public.purchase_order_lines
         SET quantity_received = LEAST(
               quantity_ordered,
               quantity_received + v_line.quantity_received
             ),
             updated_at = NOW()
       WHERE id = v_line.order_line_id;
    END IF;

    v_posted := v_posted + 1;
  END LOOP;

  UPDATE public.purchase_receipts
     SET stocked_at = NOW(), updated_at = NOW(), updated_by = p_user
   WHERE id = p_receipt_id;

  -- La commande est soldée quand toutes ses lignes le sont, partiellement
  -- livrée sinon.
  UPDATE public.purchase_orders o
     SET status = CASE
           WHEN NOT EXISTS (
             SELECT 1 FROM public.purchase_order_lines l
              WHERE l.order_id = o.id AND l.quantity_received < l.quantity_ordered
           ) THEN 'received'::public.purchase_state
           ELSE 'partially_received'::public.purchase_state
         END,
         received_on = CURRENT_DATE,
         updated_at = NOW()
   WHERE o.id = v_receipt.order_id;

  RETURN v_posted;
END;
$$;

REVOKE ALL ON FUNCTION public.post_purchase_receipt(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_purchase_receipt(UUID, UUID) TO authenticated;

-- ==========================================
-- 6. RETOURS FOURNISSEURS (BP17 §17, BR-074)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.supplier_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  order_id UUID REFERENCES public.purchase_orders(id),
  receipt_id UUID REFERENCES public.purchase_receipts(id),
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  -- BP17 §17 : retour total, partiel, remplacement, avoir.
  return_type VARCHAR(30) NOT NULL DEFAULT 'partiel',
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  returned_on DATE NOT NULL DEFAULT CURRENT_DATE,
  credit_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT return_type_known
    CHECK (return_type IN ('total', 'partiel', 'remplacement', 'avoir')),
  CONSTRAINT return_status_known CHECK (status IN ('draft', 'sent', 'settled', 'canceled'))
);

CREATE TABLE IF NOT EXISTS public.supplier_return_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES public.supplier_returns(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id),
  lot_id UUID REFERENCES public.medication_lots(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_return_lines_idx ON public.supplier_return_lines (return_id);

/*
 * Expédition d'un retour fournisseur (BR-074).
 *
 * La marchandise quitte le stock au moment où elle est renvoyée, pas à la
 * saisie du brouillon : tant que le retour n'est pas parti, les produits sont
 * encore là, et un stock qui les ignorerait ferait échouer une délivrance
 * pourtant possible.
 */
CREATE OR REPLACE FUNCTION public.post_supplier_return(p_return_id UUID, p_user UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_return RECORD;
  v_line RECORD;
  v_posted INT := 0;
BEGIN
  SELECT * INTO v_return FROM public.supplier_returns WHERE id = p_return_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retour introuvable.';
  END IF;

  IF v_return.posted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ce retour a déjà été expédié.';
  END IF;

  IF v_return.status = 'canceled' THEN
    RAISE EXCEPTION 'Ce retour est annulé.';
  END IF;

  FOR v_line IN
    SELECT * FROM public.supplier_return_lines WHERE return_id = p_return_id
  LOOP
    INSERT INTO public.stock_movements (
      establishment_id, item_id, lot_id, pharmacy_id, kind, quantity, unit_cost,
      reason, source_table, source_id, performed_by, created_by
    ) VALUES (
      v_return.establishment_id, v_line.item_id, v_line.lot_id, v_return.pharmacy_id,
      'return', -v_line.quantity, v_line.unit_price,
      'Retour fournisseur ' || v_return.business_reference,
      'supplier_returns', p_return_id, p_user, p_user
    );
    v_posted := v_posted + 1;
  END LOOP;

  UPDATE public.supplier_returns
     SET status = 'sent', posted_at = NOW(), updated_at = NOW(), updated_by = p_user
   WHERE id = p_return_id;

  RETURN v_posted;
END;
$$;

REVOKE ALL ON FUNCTION public.post_supplier_return(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_supplier_return(UUID, UUID) TO authenticated;

-- ==========================================
-- 7. RÉFÉRENCES ET HORODATAGE
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_purchase_requisitions AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_supplier_quotes       AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_purchase_receipts     AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_supplier_returns      AS BIGINT START 1;

DO $$
DECLARE
  spec RECORD;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('purchase_requisitions', 'MORA-DAC-'),
      ('supplier_quotes',       'MORA-DEV-'),
      ('purchase_receipts',     'MORA-REC-'),
      ('supplier_returns',      'MORA-RET-')
    ) AS t(table_name, prefix)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_ref ON public.%I', spec.table_name, spec.table_name);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_ref BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref(%L)',
      spec.table_name, spec.table_name, spec.prefix);
  END LOOP;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['purchase_requisitions', 'supplier_quotes',
                           'purchase_receipts', 'supplier_returns'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_updated BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ==========================================
-- 8. ISOLATION PAR ÉTABLISSEMENT (BP17 §24)
-- ==========================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['purchase_requisitions', 'supplier_quotes',
                           'purchase_receipts', 'supplier_returns'] LOOP
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

DO $$
DECLARE
  spec RECORD;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('purchase_requisition_lines', 'purchase_requisitions', 'requisition_id'),
      ('supplier_quote_lines',       'supplier_quotes',       'quote_id'),
      ('purchase_receipt_lines',     'purchase_receipts',     'receipt_id'),
      ('supplier_return_lines',      'supplier_returns',      'return_id')
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
  public.purchase_requisitions, public.purchase_requisition_lines,
  public.supplier_quotes, public.supplier_quote_lines,
  public.purchase_receipts, public.purchase_receipt_lines,
  public.supplier_returns, public.supplier_return_lines
  TO authenticated;

COMMENT ON TABLE public.purchase_requisitions IS 'Demandes d''achat et circuit de validation (BP17 §6, §7).';
COMMENT ON TABLE public.supplier_quotes IS 'Consultations, devis et appels d''offres (BP17 §8, §9).';
COMMENT ON TABLE public.purchase_receipts IS 'Réceptions et contrôle qualité (BP17 §11, §12, BR-068).';
COMMENT ON TABLE public.supplier_returns IS 'Retours fournisseurs (BP17 §17, BR-074).';
