-- MORACare Enterprise - Circuit du médicament et gestion des stocks
-- Version: 3.2.0
-- Références : BP17 (Achats), BP18 (Stock & Inventaire), BP19 (Pharmacie).
--
-- Contexte
-- --------
-- Le module Pharmacie se réduisait à une table d'articles portant une quantité
-- et une date de péremption uniques. Aucun lot, donc aucune traçabilité, aucune
-- règle FEFO, aucun rappel possible ; aucun mouvement, donc aucun historique ni
-- inventaire ; aucune délivrance, donc aucun lien avec les prescriptions.
--
-- Architecture retenue
-- --------------------
-- BP19 §5 est explicite : « Le stock est géré exclusivement par le module Stock
-- & Inventaire ». Le catalogue reste donc dans `pharmacy_items`, enrichi des
-- champs du BP19 §5, et tout ce qui touche aux quantités passe par le registre
-- des mouvements.
--
-- Le registre des mouvements est la source de vérité. Les quantités portées par
-- les lots et par les articles en sont dérivées et tenues à jour par
-- déclencheur : elles servent la lecture, jamais l'écriture. Une quantité
-- corrigée à la main sans mouvement correspondant serait un stock dont personne
-- ne pourrait expliquer l'origine — inacceptable pour des médicaments.
--
-- La hiérarchie d'emplacements du BP18 §4 — site, magasin, zone, allée,
-- étagère, niveau, bac — est portée par une table unique récursive plutôt que
-- par sept tables jumelles. Le blueprint demande une structure « entièrement
-- configurable » : une clinique s'arrête au magasin, un centre hospitalier
-- descend jusqu'au bac, sans que le schéma change.

-- ==========================================
-- 1. TYPES
-- ==========================================
DO $$ BEGIN
  CREATE TYPE public.stock_location_level AS ENUM (
    'site', 'warehouse', 'zone', 'aisle', 'shelf', 'tier', 'bin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- BP18 §11 : entrées, sorties, transferts, ajustements, retours,
  -- corrections, inventaires.
  CREATE TYPE public.stock_movement_kind AS ENUM (
    'entry', 'exit', 'transfer_in', 'transfer_out',
    'adjustment', 'return', 'correction', 'inventory', 'destruction'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- BP17 §18, restreint à ce que le circuit pharmaceutique met réellement en
  -- œuvre aujourd'hui.
  CREATE TYPE public.purchase_state AS ENUM (
    'draft', 'awaiting_validation', 'validated', 'ordered',
    'partially_received', 'received', 'closed', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- BP19 §19, pour la délivrance.
  CREATE TYPE public.dispensation_state AS ENUM (
    'prepared', 'partially_delivered', 'delivered', 'canceled', 'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_state AS ENUM ('open', 'counted', 'closed', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 2. EMPLACEMENTS DE STOCKAGE (BP18 §4 à §7)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.stock_locations(id) ON DELETE CASCADE,
  level public.stock_location_level NOT NULL,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  manager_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  -- Seul un site est sans parent : les niveaux inférieurs sont toujours
  -- rattachés, sinon la hiérarchie du BP18 §4 se disloque.
  CONSTRAINT location_root_is_site CHECK ((parent_id IS NULL) = (level = 'site'))
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_locations_code
  ON public.stock_locations (establishment_id, lower(code)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS stock_locations_parent_idx ON public.stock_locations (parent_id);

-- ==========================================
-- 3. PHARMACIES (BP19 §4)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  -- BR-083 : chaque pharmacie est associée à un magasin du module Stock.
  location_id UUID REFERENCES public.stock_locations(id),
  -- BP19 §12 : une armoire de service est un magasin secondaire, réapprovisionné
  -- par une pharmacie. Le distinguer évite d'inventer une seconde table pour
  -- une entité qui obéit exactement aux mêmes règles.
  is_service_cabinet BOOLEAN NOT NULL DEFAULT FALSE,
  service VARCHAR(80),
  supplied_by UUID REFERENCES public.pharmacies(id),
  pharmacist_id UUID REFERENCES public.profiles(id),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS pharmacies_name
  ON public.pharmacies (establishment_id, lower(name)) WHERE deleted_at IS NULL;
-- Une seule pharmacie par défaut : c'est elle qui reçoit les délivrances
-- lorsque l'utilisateur n'en choisit pas.
CREATE UNIQUE INDEX IF NOT EXISTS pharmacies_single_default
  ON public.pharmacies (establishment_id) WHERE is_default AND deleted_at IS NULL;

-- ==========================================
-- 4. CATALOGUE (BP19 §5)
-- ==========================================
ALTER TABLE public.pharmacy_items
  ADD COLUMN IF NOT EXISTS form VARCHAR(60),
  ADD COLUMN IF NOT EXISTS dosage VARCHAR(60),
  ADD COLUMN IF NOT EXISTS administration_route VARCHAR(60),
  ADD COLUMN IF NOT EXISTS unit VARCHAR(30) NOT NULL DEFAULT 'Unité',
  ADD COLUMN IF NOT EXISTS packaging VARCHAR(80),
  ADD COLUMN IF NOT EXISTS atc_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS storage_conditions VARCHAR(160),
  ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  -- BP19 §16 : stupéfiants, psychotropes, médicaments soumis à autorisation.
  ADD COLUMN IF NOT EXISTS is_controlled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS controlled_class VARCHAR(40),
  -- BP18 §14 : le mode de sortie est configurable par catégorie d'article.
  ADD COLUMN IF NOT EXISTS issue_rule VARCHAR(10) NOT NULL DEFAULT 'FEFO',
  ADD COLUMN IF NOT EXISTS max_stock INT,
  ADD COLUMN IF NOT EXISTS default_location_id UUID REFERENCES public.stock_locations(id);

DO $$ BEGIN
  ALTER TABLE public.pharmacy_items
    ADD CONSTRAINT pharmacy_items_issue_rule CHECK (issue_rule IN ('FEFO', 'FIFO', 'LIFO'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 5. FOURNISSEURS (BP17 §5)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  supplier_type VARCHAR(40) NOT NULL DEFAULT 'distributeur',
  contact_name VARCHAR(160),
  email VARCHAR(255),
  phone VARCHAR(40),
  address TEXT,
  city VARCHAR(120),
  country VARCHAR(120),
  tax_id VARCHAR(60),
  product_categories TEXT[],
  average_lead_days INT CHECK (average_lead_days IS NULL OR average_lead_days BETWEEN 0 AND 365),
  payment_terms VARCHAR(160),
  rating INT CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_name
  ON public.suppliers (establishment_id, lower(name)) WHERE deleted_at IS NULL;

-- ==========================================
-- 6. LOTS (BP18 §9, BP19 §14)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.medication_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  location_id UUID REFERENCES public.stock_locations(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  lot_number VARCHAR(60) NOT NULL,
  manufactured_on DATE,
  expires_on DATE,
  -- Tenue par déclencheur depuis le registre des mouvements. Jamais écrite
  -- directement par l'application.
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  -- BP18 §16 : disponible, en quarantaine, périmé, retourné, archivé.
  state VARCHAR(20) NOT NULL DEFAULT 'available',
  recalled_at TIMESTAMPTZ,
  recall_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT lot_state_known
    CHECK (state IN ('available', 'quarantine', 'expired', 'returned', 'recalled', 'archived')),
  -- Une date de fabrication postérieure à la péremption trahit une saisie
  -- inversée : la laisser passer fausserait la règle FEFO.
  CONSTRAINT lot_dates_consistent
    CHECK (manufactured_on IS NULL OR expires_on IS NULL OR manufactured_on <= expires_on)
);

-- Un même numéro de lot peut exister chez deux fournisseurs : l'unicité porte
-- sur l'article et la pharmacie qui le détient.
CREATE UNIQUE INDEX IF NOT EXISTS medication_lots_unique
  ON public.medication_lots (item_id, COALESCE(pharmacy_id, '00000000-0000-0000-0000-000000000000'::UUID), lower(lot_number))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS medication_lots_item_idx ON public.medication_lots (item_id);
CREATE INDEX IF NOT EXISTS medication_lots_expiry_idx ON public.medication_lots (establishment_id, expires_on);

-- ==========================================
-- 7. REGISTRE DES MOUVEMENTS (BP18 §11)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.medication_lots(id) ON DELETE SET NULL,
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  location_id UUID REFERENCES public.stock_locations(id),
  kind public.stock_movement_kind NOT NULL,
  -- Signée : positive pour ce qui entre, négative pour ce qui sort. Le signe
  -- porte le sens, ce qui rend le cumul trivial et sans branche.
  quantity INT NOT NULL CHECK (quantity <> 0),
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  reason VARCHAR(200),
  -- Document à l'origine du mouvement : réception, délivrance, inventaire.
  source_table VARCHAR(60),
  source_id UUID,
  patient_id UUID REFERENCES public.patients(id),
  performed_by UUID REFERENCES public.profiles(id),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS stock_movements_item_idx
  ON public.stock_movements (item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_lot_idx ON public.stock_movements (lot_id);
CREATE INDEX IF NOT EXISTS stock_movements_establishment_idx
  ON public.stock_movements (establishment_id, occurred_at DESC);

/*
 * BR-079 : les mouvements sont entièrement historisés.
 *
 * Le registre est en écriture seule. Modifier ou supprimer un mouvement
 * effacerait la trace d'une sortie de médicament ; une erreur se corrige par un
 * mouvement inverse, qui reste visible.
 */
CREATE OR REPLACE FUNCTION public.stock_movements_are_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Le registre des mouvements est immuable : corrigez par un mouvement inverse.';
END;
$$;

DROP TRIGGER IF EXISTS trig_stock_movements_immutable ON public.stock_movements;
CREATE TRIGGER trig_stock_movements_immutable
  BEFORE UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.stock_movements_are_immutable();

/*
 * Report du mouvement sur les quantités.
 *
 * Le lot et l'article sont mis à jour dans la même transaction que le
 * mouvement. Une sortie qui rendrait le lot négatif est refusée ici : c'est le
 * seul endroit où le contrôle est fiable, puisque toutes les écritures y
 * passent.
 */
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_available INT;
  v_lot RECORD;
BEGIN
  IF NEW.lot_id IS NOT NULL THEN
    SELECT quantity, item_id, expires_on, state INTO v_lot
      FROM public.medication_lots WHERE id = NEW.lot_id FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lot introuvable.';
    END IF;

    IF v_lot.item_id IS DISTINCT FROM NEW.item_id THEN
      RAISE EXCEPTION 'Le lot ne correspond pas au produit du mouvement.';
    END IF;

    v_available := v_lot.quantity + NEW.quantity;

    IF v_available < 0 THEN
      RAISE EXCEPTION
        'Stock insuffisant sur le lot : % disponible(s), % demandé(s).',
        v_lot.quantity, abs(NEW.quantity);
    END IF;

    UPDATE public.medication_lots
       SET quantity = v_available,
           -- Un lot vidé n'est plus proposable, mais reste consultable : la
           -- traçabilité d'un lot délivré ne doit jamais disparaître.
           state = CASE
             WHEN state IN ('recalled', 'returned', 'archived') THEN state
             WHEN expires_on IS NOT NULL AND expires_on < CURRENT_DATE THEN 'expired'
             ELSE 'available'
           END,
           updated_at = NOW()
     WHERE id = NEW.lot_id;
  END IF;

  -- La quantité de l'article est la somme de ses lots lorsqu'il en a, et
  -- suit les mouvements directement lorsqu'il n'en a pas.
  UPDATE public.pharmacy_items i
     SET stock_quantity = GREATEST(0, COALESCE(i.stock_quantity, 0) + NEW.quantity),
         updated_at = NOW()
   WHERE i.id = NEW.item_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trig_apply_stock_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- ==========================================
-- 8. ACHATS ET RÉCEPTIONS (BP17 §10, §11, §13)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  status public.purchase_state NOT NULL DEFAULT 'draft',
  ordered_on DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_on DATE,
  received_on DATE,
  priority VARCHAR(20) NOT NULL DEFAULT 'normale',
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT purchase_priority_known CHECK (priority IN ('basse', 'normale', 'haute', 'urgente'))
);

CREATE TABLE IF NOT EXISTS public.purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id),
  quantity_ordered INT NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INT NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  lot_number VARCHAR(60),
  expires_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- BP17 §11 : on ne réceptionne pas plus que ce qui a été commandé sans
  -- passer par un avenant. Le dépassement silencieux masquerait une erreur de
  -- livraison.
  CONSTRAINT purchase_line_not_over_received CHECK (quantity_received <= quantity_ordered)
);

CREATE INDEX IF NOT EXISTS purchase_lines_order_idx ON public.purchase_order_lines (order_id);

-- ==========================================
-- 9. DÉLIVRANCE (BP19 §10)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.dispensations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  patient_id UUID REFERENCES public.patients(id),
  -- BR-085 : toute délivrance est liée à une prescription. Le champ reste
  -- facultatif pour la vente au comptoir, que le BP19 §10 admet, mais l'écran
  -- exige une prescription dès qu'un patient est renseigné.
  prescription_id UUID REFERENCES public.prescriptions(id),
  hospitalization_id UUID REFERENCES public.hospitalizations(id),
  status public.dispensation_state NOT NULL DEFAULT 'prepared',
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispensed_by UUID REFERENCES public.profiles(id),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.dispensation_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispensation_id UUID NOT NULL REFERENCES public.dispensations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id),
  lot_id UUID REFERENCES public.medication_lots(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  posology VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dispensation_lines_idx ON public.dispensation_lines (dispensation_id);
CREATE INDEX IF NOT EXISTS dispensations_patient_idx ON public.dispensations (patient_id, dispensed_at DESC);

/*
 * BR-086 : toute délivrance met automatiquement à jour le stock.
 *
 * Le mouvement est créé par la base, à l'insertion de la ligne. L'application
 * ne peut donc pas délivrer sans décrémenter — même en cas d'erreur de code,
 * d'appel partiel ou d'écriture directe.
 *
 * Le blocage des produits périmés est lu dans les Paramètres de
 * l'établissement : le réglage pilote réellement le module, il n'est pas un
 * simple affichage.
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
  v_block_expired BOOLEAN;
BEGIN
  SELECT d.id, d.establishment_id, d.pharmacy_id, d.patient_id, d.dispensed_by, d.dispensed_at
    INTO v_dispensation
    FROM public.dispensations d WHERE d.id = NEW.dispensation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Délivrance introuvable.';
  END IF;

  SELECT COALESCE((module_settings->'pharmacy'->>'blockExpiredDispensing')::BOOLEAN, TRUE)
    INTO v_block_expired
    FROM public.establishments WHERE id = v_dispensation.establishment_id;

  IF NEW.lot_id IS NOT NULL THEN
    SELECT expires_on, state, lot_number INTO v_lot
      FROM public.medication_lots WHERE id = NEW.lot_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lot introuvable.';
    END IF;

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
    'Délivrance', 'dispensations', v_dispensation.id, v_dispensation.patient_id,
    v_dispensation.dispensed_by, v_dispensation.dispensed_at, v_dispensation.dispensed_by
  );

  UPDATE public.dispensations
     SET total_amount = total_amount + (NEW.quantity * NEW.unit_price), updated_at = NOW()
   WHERE id = NEW.dispensation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_dispensation_line ON public.dispensation_lines;
CREATE TRIGGER trig_dispensation_line
  AFTER INSERT ON public.dispensation_lines
  FOR EACH ROW EXECUTE FUNCTION public.post_dispensation_line();

-- ==========================================
-- 10. INVENTAIRES (BP18 §13)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.stock_inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  pharmacy_id UUID REFERENCES public.pharmacies(id),
  location_id UUID REFERENCES public.stock_locations(id),
  inventory_type VARCHAR(20) NOT NULL DEFAULT 'general',
  status public.inventory_state NOT NULL DEFAULT 'open',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT inventory_type_known
    CHECK (inventory_type IN ('general', 'rolling', 'targeted', 'location'))
);

CREATE TABLE IF NOT EXISTS public.stock_inventory_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES public.stock_inventories(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.pharmacy_items(id),
  lot_id UUID REFERENCES public.medication_lots(id),
  -- Quantité théorique figée à l'ouverture : l'écart n'a de sens que rapporté
  -- à ce que le système annonçait au moment du comptage.
  expected_quantity INT NOT NULL DEFAULT 0,
  counted_quantity INT,
  -- Colonne calculée : un écart recopié à la main finirait par diverger.
  variance INT GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - expected_quantity) STORED,
  comment TEXT,
  counted_by UUID REFERENCES public.profiles(id),
  counted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_lines_idx ON public.stock_inventory_lines (inventory_id);

/*
 * Clôture d'un inventaire : les écarts constatés deviennent des mouvements.
 *
 * Sans cela, l'inventaire ne serait qu'un constat, et le stock resterait faux.
 * Chaque écart produit un mouvement d'inventaire, ce qui le rend explicable
 * ligne à ligne dans l'historique.
 */
CREATE OR REPLACE FUNCTION public.close_stock_inventory(p_inventory_id UUID, p_user UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inventory RECORD;
  v_line RECORD;
  v_adjusted INT := 0;
BEGIN
  SELECT * INTO v_inventory FROM public.stock_inventories WHERE id = p_inventory_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventaire introuvable.';
  END IF;

  IF v_inventory.status = 'closed' THEN
    RAISE EXCEPTION 'Cet inventaire est déjà clôturé.';
  END IF;

  FOR v_line IN
    SELECT * FROM public.stock_inventory_lines
     WHERE inventory_id = p_inventory_id
       AND counted_quantity IS NOT NULL
       AND counted_quantity <> expected_quantity
  LOOP
    INSERT INTO public.stock_movements (
      establishment_id, item_id, lot_id, pharmacy_id, kind, quantity,
      reason, source_table, source_id, performed_by, created_by
    ) VALUES (
      v_inventory.establishment_id, v_line.item_id, v_line.lot_id, v_inventory.pharmacy_id,
      'inventory', v_line.variance,
      'Écart d''inventaire ' || v_inventory.business_reference,
      'stock_inventories', p_inventory_id, p_user, p_user
    );
    v_adjusted := v_adjusted + 1;
  END LOOP;

  UPDATE public.stock_inventories
     SET status = 'closed', closed_at = NOW(), closed_by = p_user, updated_at = NOW()
   WHERE id = p_inventory_id;

  RETURN v_adjusted;
END;
$$;

REVOKE ALL ON FUNCTION public.close_stock_inventory(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_stock_inventory(UUID, UUID) TO authenticated;

-- ==========================================
-- 11. VALIDATION PHARMACEUTIQUE (BP19 §8)
-- ==========================================
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS pharmacy_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pharmacist_note TEXT;

DO $$ BEGIN
  ALTER TABLE public.prescriptions
    ADD CONSTRAINT prescriptions_pharmacy_status
    CHECK (pharmacy_status IN ('pending', 'validated', 'change_requested', 'refused', 'dispensed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 12. RÈGLE FEFO (BP19 §9, BR-087)
-- ==========================================
/*
 * Lots proposables pour une sortie, dans l'ordre de la règle de l'article.
 *
 * FEFO — premier périmé, premier sorti — est la règle par défaut du BP19 §9 :
 * elle limite les pertes, alors que FIFO ferait sortir un lot à longue
 * péremption avant un lot proche de la sienne. La règle est portée par
 * l'article (BP18 §14).
 *
 * Les lots périmés et rappelés sont exclus : ils ne doivent jamais être
 * proposés, même quand le blocage à la délivrance est désactivé.
 */
CREATE OR REPLACE FUNCTION public.suggest_lots(
  p_item_id UUID,
  p_pharmacy_id UUID,
  p_quantity INT
)
RETURNS TABLE (
  lot_id UUID,
  lot_number VARCHAR,
  expires_on DATE,
  available INT,
  take INT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_rule TEXT;
  v_remaining INT := GREATEST(p_quantity, 0);
  v_lot RECORD;
BEGIN
  SELECT issue_rule INTO v_rule FROM public.pharmacy_items WHERE id = p_item_id;
  v_rule := COALESCE(v_rule, 'FEFO');

  FOR v_lot IN
    SELECT l.id, l.lot_number, l.expires_on, l.quantity, l.created_at
      FROM public.medication_lots l
     WHERE l.item_id = p_item_id
       AND l.deleted_at IS NULL
       AND l.quantity > 0
       AND l.state = 'available'
       AND (p_pharmacy_id IS NULL OR l.pharmacy_id IS NOT DISTINCT FROM p_pharmacy_id)
       AND (l.expires_on IS NULL OR l.expires_on >= CURRENT_DATE)
     ORDER BY
       CASE WHEN v_rule = 'FEFO' THEN l.expires_on END ASC NULLS LAST,
       CASE WHEN v_rule = 'FIFO' THEN l.created_at END ASC,
       CASE WHEN v_rule = 'LIFO' THEN l.created_at END DESC,
       l.created_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;

    lot_id := v_lot.id;
    lot_number := v_lot.lot_number;
    expires_on := v_lot.expires_on;
    available := v_lot.quantity;
    take := LEAST(v_lot.quantity, v_remaining);
    v_remaining := v_remaining - take;

    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.suggest_lots(UUID, UUID, INT) TO authenticated;

-- ==========================================
-- 13. ÉTAT DU STOCK (BP19 §22, BP18 §19)
-- ==========================================
/*
 * Vue de synthèse du stock, seuils et péremptions.
 *
 * Les seuils viennent des Paramètres de l'établissement lorsque l'article n'en
 * porte pas : c'est ce qui fait du réglage « seuil de réapprovisionnement » un
 * paramètre effectif et non décoratif.
 */
CREATE OR REPLACE VIEW public.pharmacy_stock_state
WITH (security_invoker = true) AS
SELECT
  i.id AS item_id,
  i.establishment_id,
  i.business_reference,
  i.name,
  i.generic_name,
  i.category,
  i.form,
  i.dosage,
  i.unit,
  i.unit_price,
  i.purchase_price,
  i.is_controlled,
  i.issue_rule,
  COALESCE(NULLIF(i.reorder_level, 0),
           (e.module_settings->'pharmacy'->>'lowStockThreshold')::INT,
           10) AS effective_reorder_level,
  COALESCE(SUM(l.quantity) FILTER (WHERE l.deleted_at IS NULL AND l.state = 'available'), 0)::INT
    AS lot_quantity,
  i.stock_quantity,
  COUNT(l.id) FILTER (WHERE l.deleted_at IS NULL AND l.quantity > 0) AS lot_count,
  MIN(l.expires_on) FILTER (WHERE l.deleted_at IS NULL AND l.quantity > 0) AS next_expiry,
  COALESCE(SUM(l.quantity) FILTER (
    WHERE l.deleted_at IS NULL AND l.quantity > 0 AND l.expires_on < CURRENT_DATE
  ), 0)::INT AS expired_quantity,
  COALESCE(SUM(l.quantity) FILTER (
    WHERE l.deleted_at IS NULL AND l.quantity > 0
      AND l.expires_on >= CURRENT_DATE
      AND l.expires_on <= CURRENT_DATE
        + COALESCE((e.module_settings->'pharmacy'->>'expiryWarningDays')::INT, 30)
  ), 0)::INT AS expiring_quantity,
  (COALESCE(SUM(l.quantity) FILTER (WHERE l.deleted_at IS NULL AND l.state = 'available'), 0)
     * i.purchase_price)::NUMERIC(14,2) AS stock_value
FROM public.pharmacy_items i
JOIN public.establishments e ON e.id = i.establishment_id
LEFT JOIN public.medication_lots l ON l.item_id = i.id
WHERE i.deleted_at IS NULL
GROUP BY i.id, e.module_settings;

GRANT SELECT ON public.pharmacy_stock_state TO authenticated;

COMMENT ON VIEW public.pharmacy_stock_state IS
  'État du stock par article : quantités, lots, péremptions et valorisation (BP18 §19, BP19 §22).';

-- ==========================================
-- 14. RÉFÉRENCES MÉTIER
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_stock_locations    AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_pharmacies         AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_suppliers          AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_medication_lots    AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_stock_movements    AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_purchase_orders    AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_dispensations      AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_stock_inventories  AS BIGINT START 1;

DO $$
DECLARE
  spec RECORD;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('stock_locations',   'MORA-EMP-'),
      ('pharmacies',        'MORA-PHM-'),
      ('suppliers',         'MORA-FRN-'),
      ('medication_lots',   'MORA-LOT-'),
      ('stock_movements',   'MORA-MVT-'),
      ('purchase_orders',   'MORA-CMD-'),
      ('dispensations',     'MORA-DEL-'),
      ('stock_inventories', 'MORA-INV-')
    ) AS t(table_name, prefix)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_ref ON public.%I', spec.table_name, spec.table_name);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_ref BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref(%L)',
      spec.table_name, spec.table_name, spec.prefix);
  END LOOP;
END $$;

-- ==========================================
-- 15. HORODATAGE
-- ==========================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_locations', 'pharmacies', 'suppliers', 'medication_lots',
                           'purchase_orders', 'purchase_order_lines', 'dispensations',
                           'stock_inventories'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_updated BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ==========================================
-- 16. ISOLATION PAR ÉTABLISSEMENT (BP19 §25)
-- ==========================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stock_locations', 'pharmacies', 'suppliers', 'medication_lots',
                           'stock_movements', 'purchase_orders', 'dispensations',
                           'stock_inventories'] LOOP
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

/*
 * Tables de lignes : elles ne portent pas d'`establishment_id`.
 *
 * Le dupliquer ouvrirait la porte à une divergence avec l'en-tête, donc à une
 * fuite. L'isolation est déduite du document parent, qui est lui-même protégé.
 */
DO $$
DECLARE
  spec RECORD;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('purchase_order_lines',   'purchase_orders',   'order_id'),
      ('dispensation_lines',     'dispensations',     'dispensation_id'),
      ('stock_inventory_lines',  'stock_inventories', 'inventory_id')
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
  public.stock_locations, public.pharmacies, public.suppliers, public.medication_lots,
  public.purchase_orders, public.purchase_order_lines, public.dispensations,
  public.dispensation_lines, public.stock_inventories, public.stock_inventory_lines
  TO authenticated;

-- Le registre est en écriture seule : ni modification, ni suppression.
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;

-- ==========================================
-- 17. PERMISSIONS DES RÔLES (BP19 §23, BP16 §16)
-- ==========================================
-- Le responsable d'établissement n'avait que la consultation sur ses propres
-- modules Pharmacie et Hospitalisation : il ne pouvait donc ni créer une
-- chambre, ni ouvrir une pharmacie. BP06 lui confie la gestion de sa structure.
SELECT public.seed_role_permission('establishment_admin', 'pharmacy',         TRUE, TRUE, TRUE, TRUE);
SELECT public.seed_role_permission('establishment_admin', 'hospitalizations', TRUE, TRUE, TRUE, TRUE);

-- Le pharmacien consulte les séjours : la dispensation hospitalière du BP19 §11
-- est nominative, il doit savoir quel patient occupe quel lit.
SELECT public.seed_role_permission('pharmacist', 'hospitalizations', TRUE, FALSE, FALSE, FALSE);

-- Les autres rôles vérifient la disponibilité d'un produit avant de le
-- prescrire, sans jamais toucher au stock.
SELECT public.seed_role_permission('doctor',       'pharmacy', TRUE, FALSE, FALSE, FALSE);
SELECT public.seed_role_permission('nurse',        'pharmacy', TRUE, FALSE, FALSE, FALSE);
SELECT public.seed_role_permission('receptionist', 'pharmacy', TRUE, FALSE, FALSE, FALSE);

COMMENT ON TABLE public.stock_locations IS 'Hiérarchie des emplacements de stockage (BP18 §4).';
COMMENT ON TABLE public.pharmacies IS 'Pharmacies et armoires de service (BP19 §4, §12).';
COMMENT ON TABLE public.suppliers IS 'Fournisseurs (BP17 §5).';
COMMENT ON TABLE public.medication_lots IS 'Lots : péremption, quantité, traçabilité (BP18 §9, BP19 §14).';
COMMENT ON TABLE public.stock_movements IS 'Registre immuable des mouvements de stock (BP18 §11, BR-079).';
COMMENT ON TABLE public.dispensations IS 'Délivrances nominatives (BP19 §10, BR-085, BR-086).';
COMMENT ON TABLE public.stock_inventories IS 'Inventaires et écarts (BP18 §13).';
