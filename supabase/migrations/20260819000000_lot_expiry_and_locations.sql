-- MORACare Enterprise - Péremption obligatoire et gestion des emplacements
-- Version: 3.8.0
--
-- Deux corrections issues de la recette.
--
-- 1. La date de péremption d'un lot était facultative. Or c'est elle qui fait
--    fonctionner la règle FEFO, les alertes, le blocage de délivrance et
--    l'inventaire : un lot sans péremption sort toujours en dernier et
--    n'alerte jamais. Elle devient obligatoire à la création.
--
--    La contrainte est portée par un déclencheur sur l'insertion, et non par
--    une contrainte de colonne : les lots déjà enregistrés sans date restent
--    valides et consultables. Les invalider rétroactivement aurait rendu
--    inaccessible un stock réellement présent dans les rayons.
--
-- 2. Les pharmacies et les emplacements se créaient sans pouvoir être modifiés
--    ni désactivés. Un magasin fermé restait proposé à la vente et au
--    transfert.

-- ==========================================
-- 1. PÉREMPTION OBLIGATOIRE À LA CRÉATION D'UN LOT
-- ==========================================
CREATE OR REPLACE FUNCTION public.enforce_lot_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tracks BOOLEAN;
BEGIN
  IF NEW.expires_on IS NOT NULL THEN
    RETURN NEW;
  END IF;

  /*
   * Le réglage « Suivre les numéros de lot » décide.
   *
   * Un établissement qui ne suit pas les lots gère des consommables sans
   * péremption — compresses, seringues — et exiger une date le bloquerait sur
   * des produits qui n'en portent pas.
   */
  SELECT COALESCE((module_settings->'pharmacy'->>'trackLots')::BOOLEAN, TRUE)
    INTO v_tracks
    FROM public.establishments WHERE id = NEW.establishment_id;

  IF v_tracks THEN
    RAISE EXCEPTION
      'La date de péremption est obligatoire à la création d''un lot. '
      'Elle commande la règle FEFO, les alertes et le blocage des produits périmés.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_lot_expiry ON public.medication_lots;
CREATE TRIGGER trig_lot_expiry
  BEFORE INSERT ON public.medication_lots
  FOR EACH ROW EXECUTE FUNCTION public.enforce_lot_expiry();

COMMENT ON FUNCTION public.enforce_lot_expiry() IS
  'Exige une date de péremption à la création d''un lot lorsque l''établissement suit les lots (BP19 §14, §15).';

-- ==========================================
-- 2. EMPLACEMENTS ET PHARMACIES : ÉTAT ET TRAÇABILITÉ
-- ==========================================
ALTER TABLE public.pharmacies
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS opening_hours VARCHAR(160),
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.stock_locations
  ADD COLUMN IF NOT EXISTS capacity INT CHECK (capacity IS NULL OR capacity >= 0),
  ADD COLUMN IF NOT EXISTS notes TEXT;

/*
 * Une pharmacie désactivée ne doit plus recevoir de mouvement.
 *
 * Sans ce contrôle, elle disparaissait des listes mais restait une destination
 * valide pour un transfert enregistré depuis un écran resté ouvert, ou pour
 * une reprise de données.
 */
CREATE OR REPLACE FUNCTION public.enforce_active_pharmacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_active BOOLEAN;
  v_name TEXT;
BEGIN
  IF NEW.pharmacy_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT is_active, name INTO v_active, v_name
    FROM public.pharmacies WHERE id = NEW.pharmacy_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La pharmacie sélectionnée n''existe plus.';
  END IF;

  IF NOT v_active THEN
    RAISE EXCEPTION 'La pharmacie « % » est désactivée : aucun mouvement ne peut y être enregistré.', v_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_movement_active_pharmacy ON public.stock_movements;
CREATE TRIGGER trig_movement_active_pharmacy
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_active_pharmacy();

-- ==========================================
-- 3. STOCK PAR EMPLACEMENT (BP18 §7)
-- ==========================================
/*
 * Où se trouve précisément un produit, et en quelle quantité.
 *
 * La vue existante donne le stock global d'un article ; celle-ci le ventile par
 * pharmacie et par emplacement. C'est ce qui permet de répondre à « de quel
 * magasin sort ce médicament ? » avant une vente ou un transfert.
 *
 * `security_invoker` la fait évaluer avec les droits de l'appelant : sans cela
 * elle contournerait l'isolation entre établissements.
 */
CREATE OR REPLACE VIEW public.pharmacy_stock_by_location
WITH (security_invoker = true) AS
SELECT
  l.establishment_id,
  l.item_id,
  i.name AS item_name,
  i.unit,
  i.purchase_price,
  l.pharmacy_id,
  p.name AS pharmacy_name,
  p.is_service_cabinet,
  p.is_active AS pharmacy_active,
  l.location_id,
  loc.name AS location_name,
  loc.code AS location_code,
  COUNT(*) FILTER (WHERE l.quantity > 0) AS lot_count,
  COALESCE(SUM(l.quantity) FILTER (WHERE l.state = 'available'), 0)::INT AS available_quantity,
  COALESCE(SUM(l.quantity), 0)::INT AS total_quantity,
  MIN(l.expires_on) FILTER (WHERE l.quantity > 0 AND l.state = 'available') AS next_expiry
FROM public.medication_lots l
JOIN public.pharmacy_items i ON i.id = l.item_id
LEFT JOIN public.pharmacies p ON p.id = l.pharmacy_id
LEFT JOIN public.stock_locations loc ON loc.id = l.location_id
WHERE l.deleted_at IS NULL
GROUP BY
  l.establishment_id, l.item_id, i.name, i.unit, i.purchase_price,
  l.pharmacy_id, p.name, p.is_service_cabinet, p.is_active,
  l.location_id, loc.name, loc.code;

GRANT SELECT ON public.pharmacy_stock_by_location TO authenticated;

COMMENT ON VIEW public.pharmacy_stock_by_location IS
  'Ventilation du stock par pharmacie et par emplacement (BP18 §7, BP19 §4).';
