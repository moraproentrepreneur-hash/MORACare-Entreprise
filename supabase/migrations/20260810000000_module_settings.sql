-- MORACare Enterprise - Paramètres des modules Hospitalisation et Pharmacie
-- Version: 2.10.0
--
-- BP16 et BP19 confient à l'établissement le réglage de ses propres règles :
-- types de chambres, états des lits, tarif journalier, seuils d'alerte, délai
-- de péremption surveillé, blocage de la délivrance d'un produit périmé.
--
-- Ces réglages sont regroupés dans une colonne JSONB plutôt qu'éclatés en
-- colonnes : ils sont propres à un module, hétérogènes, et destinés à
-- s'enrichir. Une colonne par réglage imposerait une migration à chaque ajout.

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS module_settings JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.establishments.module_settings IS
  'Réglages par module : { "hospitalization": { … }, "pharmacy": { … } }';

/*
 * Valeurs de départ.
 *
 * Un établissement qui n'a rien réglé doit fonctionner : les modules lisent
 * ces valeurs, et un objet vide les priverait de repères. Elles reprennent les
 * usages courants d'un établissement de santé comorien.
 */
UPDATE public.establishments
   SET module_settings = jsonb_build_object(
     'hospitalization', jsonb_build_object(
       'roomTypes', jsonb_build_array('Chambre individuelle', 'Chambre double', 'Salle commune', 'Soins intensifs'),
       'bedStates', jsonb_build_array('Libre', 'Occupé', 'En nettoyage', 'Hors service'),
       'dailyRate', 0,
       'maxStayDays', 30,
       'requireDischargeValidation', true,
       'admissionServices', jsonb_build_array('Médecine générale', 'Maternité', 'Pédiatrie', 'Chirurgie', 'Urgences')
     ),
     'pharmacy', jsonb_build_object(
       'lowStockThreshold', 10,
       'expiryWarningDays', 30,
       'blockExpiredDispensing', true,
       'requirePharmacistValidation', true,
       'trackLots', true,
       'categories', jsonb_build_array(
         'Antibiotique', 'Antalgique', 'Anti-inflammatoire', 'Antipaludique',
         'Antihypertenseur', 'Antidiabétique', 'Antiseptique', 'Vaccin',
         'Vitamine et complément', 'Solution injectable', 'Dispositif médical', 'Autre'
       )
     )
   )
 WHERE module_settings = '{}'::JSONB;
