-- MORACare Enterprise - Réglages de module réellement appliqués
-- Version: 3.3.0
--
-- Trois corrections, toutes tournées vers le même objectif : qu'un réglage
-- change le comportement du module, et non seulement l'écran qui l'affiche.
--
--   1. La colonne `module_settings` avait pour valeur par défaut un objet vide.
--      Les valeurs de départ n'étaient posées que sur les établissements
--      existants au moment de la migration : tout établissement créé ensuite
--      démarrait sans aucun réglage. Ses listes de types de chambres et de
--      catégories étaient vides, et sa pharmacie retombait sur des valeurs
--      codées en dur. La valeur par défaut porte désormais les réglages
--      complets.
--
--   2. Les réglages gagnent ce qui manquait aux modules pour fonctionner sans
--      valeur codée en dur : motifs de sortie, natures de soins, formes
--      galéniques, voies d'administration, règle de sortie de stock.
--
--   3. L'exigence de validation pharmaceutique devient effective : une
--      délivrance adossée à une prescription non validée est refusée par la
--      base, et non par le seul formulaire.
--
-- Un réglage retiré : la liste libre des « états possibles d'un lit ». BP16 §7
-- fixe ces états — disponible, occupé, réservé, en nettoyage, hors service — et
-- ils sont désormais un type énuméré de la base. Les laisser saisir librement
-- laissait croire à un choix qui n'existe pas, et aucune valeur ajoutée
-- n'aurait été reconnue par le module.

-- ==========================================
-- 1. VALEURS DE DÉPART
-- ==========================================
CREATE OR REPLACE FUNCTION public.default_module_settings()
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'hospitalization', jsonb_build_object(
      'roomTypes', jsonb_build_array(
        'Chambre individuelle', 'Chambre double', 'Salle commune',
        'Soins intensifs', 'Réanimation', 'Isolement', 'Maternité', 'Pédiatrie'
      ),
      'admissionServices', jsonb_build_array(
        'Médecine générale', 'Maternité', 'Pédiatrie', 'Chirurgie', 'Urgences'
      ),
      'careTypes', jsonb_build_array(
        'Constantes vitales', 'Soins infirmiers', 'Administration de médicament',
        'Observation', 'Incident', 'Alimentation', 'Évolution clinique'
      ),
      'dischargeReasons', jsonb_build_array(
        'Guérison', 'Amélioration', 'Sortie contre avis médical',
        'Transfert externe', 'Décès'
      ),
      'dailyRate', 0,
      'maxStayDays', 30,
      'requireDischargeValidation', true
    ),
    'pharmacy', jsonb_build_object(
      'lowStockThreshold', 10,
      'expiryWarningDays', 30,
      'blockExpiredDispensing', true,
      'requirePharmacistValidation', true,
      'trackLots', true,
      'defaultIssueRule', 'FEFO',
      'categories', jsonb_build_array(
        'Antibiotique', 'Antalgique', 'Anti-inflammatoire', 'Antipaludique',
        'Antihypertenseur', 'Antidiabétique', 'Antiseptique', 'Vaccin',
        'Vitamine et complément', 'Solution injectable', 'Dispositif médical', 'Autre'
      ),
      'forms', jsonb_build_array(
        'Comprimé', 'Gélule', 'Sirop', 'Suspension buvable', 'Solution injectable',
        'Poudre pour injection', 'Suppositoire', 'Pommade', 'Crème', 'Collyre',
        'Solution pour perfusion', 'Patch'
      ),
      'administrationRoutes', jsonb_build_array(
        'Orale', 'Intraveineuse', 'Intramusculaire', 'Sous-cutanée', 'Rectale',
        'Cutanée', 'Oculaire', 'Nasale', 'Inhalée', 'Vaginale'
      )
    )
  );
$$;

COMMENT ON FUNCTION public.default_module_settings() IS
  'Réglages de départ des modules Hospitalisation et Pharmacie (BP16, BP19).';

ALTER TABLE public.establishments
  ALTER COLUMN module_settings SET DEFAULT public.default_module_settings();

-- ==========================================
-- 2. REPRISE DE L'EXISTANT
-- ==========================================
-- Les réglages déjà personnalisés sont préservés : seules les clés absentes
-- sont complétées. `||` fait primer l'opérande de droite, d'où l'ordre choisi
-- pour chaque sous-objet.
UPDATE public.establishments
   SET module_settings = jsonb_build_object(
     'hospitalization',
       (public.default_module_settings()->'hospitalization')
       || COALESCE(module_settings->'hospitalization', '{}'::JSONB),
     'pharmacy',
       (public.default_module_settings()->'pharmacy')
       || COALESCE(module_settings->'pharmacy', '{}'::JSONB)
   );

-- Le réglage retiré disparaît des établissements qui le portaient encore.
UPDATE public.establishments
   SET module_settings = jsonb_set(
     module_settings, '{hospitalization}',
     (module_settings->'hospitalization') - 'bedStates'
   )
 WHERE module_settings->'hospitalization' ? 'bedStates';

-- ==========================================
-- 3. VALIDATION PHARMACEUTIQUE EFFECTIVE (BP19 §8)
-- ==========================================
/*
 * Contrôles appliqués à chaque ligne de délivrance.
 *
 * Reprend la version précédente et y ajoute l'exigence de validation
 * pharmaceutique. Le pharmacien qui n'a pas encore examiné une prescription ne
 * doit pas voir ses lignes sortir du stock : c'est précisément ce que le BP19
 * §8 place entre la prescription et la préparation.
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
         d.dispensed_by, d.dispensed_at
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

  -- BP19 §8 : validation avant préparation et délivrance.
  IF v_require_validation AND v_dispensation.prescription_id IS NOT NULL THEN
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
    'Délivrance', 'dispensations', v_dispensation.id, v_dispensation.patient_id,
    v_dispensation.dispensed_by, v_dispensation.dispensed_at, v_dispensation.dispensed_by
  );

  UPDATE public.dispensations
     SET total_amount = total_amount + (NEW.quantity * NEW.unit_price), updated_at = NOW()
   WHERE id = NEW.dispensation_id;

  RETURN NEW;
END;
$$;

-- ==========================================
-- 4. VALIDATION AVANT SORTIE (BP16 §11)
-- ==========================================
/*
 * Le réglage « Exiger une validation médicale avant la sortie » devient
 * effectif : sans accord d'un praticien, la sortie ne peut pas être
 * enregistrée. Laisser ce contrôle au seul formulaire l'aurait rendu
 * contournable par un second onglet.
 */
CREATE OR REPLACE FUNCTION public.enforce_discharge_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_required BOOLEAN;
BEGIN
  IF NEW.stay_status = 'discharged' AND OLD.stay_status IS DISTINCT FROM 'discharged' THEN
    SELECT COALESCE(
             (module_settings->'hospitalization'->>'requireDischargeValidation')::BOOLEAN, TRUE)
      INTO v_required
      FROM public.establishments WHERE id = NEW.establishment_id;

    IF v_required AND NEW.discharge_validated_by IS NULL THEN
      RAISE EXCEPTION
        'La sortie doit être validée par un praticien avant d''être enregistrée.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_hospitalizations_discharge ON public.hospitalizations;
CREATE TRIGGER trig_hospitalizations_discharge
  BEFORE UPDATE OF stay_status ON public.hospitalizations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_discharge_validation();
