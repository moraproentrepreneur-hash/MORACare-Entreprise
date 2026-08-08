-- MORACare Enterprise - Chambres, lits et parcours d'hospitalisation (BP16)
-- Version: 3.1.0
--
-- Contexte
-- --------
-- Le formulaire d'admission demandait de saisir un numéro de chambre et un
-- numéro de lit au clavier. Rien n'empêchait donc d'inventer une chambre, ni
-- d'affecter deux patients au même lit — BR-058 l'interdit pourtant
-- explicitement. Aucun taux d'occupation n'était calculable, et les rapports du
-- BP16 §15 n'avaient aucune donnée sur laquelle s'appuyer.
--
-- Cette migration fait des chambres et des lits de véritables ressources, puis
-- construit le parcours complet du séjour : affectations, transferts, soins,
-- visites médicales et sortie.
--
-- Choix structurant
-- -----------------
-- L'occupation d'un lit n'est pas un champ que l'application met à jour : elle
-- est déduite des affectations en cours et garantie par un index unique
-- partiel. Une règle métier tenue par l'applicatif seul finit toujours par être
-- contournée — par un second onglet, une reprise de données, un correctif
-- pressé. Ici, la base refuse.

-- ==========================================
-- 1. TYPES
-- ==========================================
DO $$ BEGIN
  CREATE TYPE public.room_state AS ENUM ('available', 'occupied', 'maintenance', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- BP16 §7 : disponible, occupé, réservé, en nettoyage, hors service.
  CREATE TYPE public.bed_state AS ENUM (
    'available', 'occupied', 'reserved', 'cleaning', 'out_of_service'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- BP16 §12 : cycle de vie complet du séjour.
  CREATE TYPE public.stay_state AS ENUM (
    'pre_admission', 'admitted', 'in_stay', 'transferring',
    'discharge_planned', 'discharged', 'canceled', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 2. CHAMBRES (BP16 §6)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  -- Numéro affiché : « 204 », « A-12 ». Unique dans l'établissement, sans quoi
  -- deux chambres homonymes rendraient toute affectation ambiguë.
  code VARCHAR(30) NOT NULL,
  name VARCHAR(120),
  -- Type et service proviennent des Paramètres de l'établissement : texte
  -- libre en base, liste fermée à la saisie. BP16 §6 laisse chaque
  -- établissement définir ses propres catégories.
  room_type VARCHAR(80) NOT NULL,
  service VARCHAR(80),
  floor VARCHAR(30),
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 40),
  daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (daily_rate >= 0),
  status public.room_state NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

-- L'unicité ignore les chambres supprimées : un numéro libéré doit pouvoir
-- être réattribué.
CREATE UNIQUE INDEX IF NOT EXISTS rooms_code_per_establishment
  ON public.rooms (establishment_id, lower(code)) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS rooms_establishment_idx ON public.rooms (establishment_id);

-- ==========================================
-- 3. LITS (BP16 §7)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  code VARCHAR(30) NOT NULL,
  status public.bed_state NOT NULL DEFAULT 'available',
  -- BP16 §7 : date à partir de laquelle le lit redevient disponible, renseignée
  -- lorsqu'il est en nettoyage ou hors service.
  available_from TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS beds_code_per_room
  ON public.beds (room_id, lower(code)) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS beds_room_idx ON public.beds (room_id);
CREATE INDEX IF NOT EXISTS beds_establishment_idx ON public.beds (establishment_id);

/*
 * Intégrité d'un lit : rattachement et capacité.
 *
 * Les deux contrôles tiennent dans un seul déclencheur, et dans cet ordre.
 * PostgreSQL exécute les déclencheurs BEFORE par ordre alphabétique de leur
 * nom : séparés, c'est la capacité qui aurait répondu la première, et un lit
 * rattaché à la chambre d'un autre établissement aurait été refusé au motif
 * d'une chambre pleine. Le message aurait désigné la mauvaise cause, et masqué
 * une tentative d'écriture hors périmètre.
 *
 * Le rattachement n'est pas une commodité : les politiques RLS s'appuient sur
 * `establishment_id`, une divergence avec la chambre ouvrirait une fuite entre
 * établissements.
 */
CREATE OR REPLACE FUNCTION public.enforce_bed_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_room RECORD;
  v_count INT;
BEGIN
  SELECT establishment_id, capacity INTO v_room
    FROM public.rooms WHERE id = NEW.room_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chambre introuvable.';
  END IF;

  IF NEW.establishment_id IS DISTINCT FROM v_room.establishment_id THEN
    RAISE EXCEPTION 'Le lit doit appartenir au même établissement que sa chambre.';
  END IF;

  -- La capacité ne serait qu'un commentaire sans ce contrôle, et le taux
  -- d'occupation du BP16 §15 pourrait dépasser 100 %.
  IF NEW.deleted_at IS NULL THEN
    SELECT count(*) INTO v_count
      FROM public.beds
     WHERE room_id = NEW.room_id
       AND deleted_at IS NULL
       AND id IS DISTINCT FROM NEW.id;

    IF v_count + 1 > v_room.capacity THEN
      RAISE EXCEPTION 'La chambre ne peut pas recevoir plus de % lit(s).', v_room.capacity;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_beds_establishment ON public.beds;
DROP TRIGGER IF EXISTS trig_beds_capacity ON public.beds;
DROP TRIGGER IF EXISTS trig_beds_integrity ON public.beds;
CREATE TRIGGER trig_beds_integrity
  BEFORE INSERT OR UPDATE OF room_id, establishment_id, deleted_at ON public.beds
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bed_integrity();

-- ==========================================
-- 4. HOSPITALISATIONS : RESSOURCES ET CYCLE DE VIE
-- ==========================================
-- Les colonnes texte `room_number` et `bed_number` sont conservées : elles
-- portent l'historique déjà saisi, que l'on ne peut pas rattacher après coup à
-- des chambres qui n'existaient pas. Les nouvelles admissions renseignent les
-- références, et l'application n'écrit plus le texte libre.
ALTER TABLE public.hospitalizations
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id),
  ADD COLUMN IF NOT EXISTS bed_id UUID REFERENCES public.beds(id),
  ADD COLUMN IF NOT EXISTS service VARCHAR(80),
  ADD COLUMN IF NOT EXISTS admission_origin VARCHAR(40),
  ADD COLUMN IF NOT EXISTS stay_status public.stay_state NOT NULL DEFAULT 'in_stay',
  ADD COLUMN IF NOT EXISTS discharge_reason VARCHAR(80),
  ADD COLUMN IF NOT EXISTS patient_condition VARCHAR(80),
  ADD COLUMN IF NOT EXISTS recommendations TEXT,
  ADD COLUMN IF NOT EXISTS next_appointment_date DATE,
  ADD COLUMN IF NOT EXISTS discharge_validated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS discharge_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Le texte libre devient facultatif : il n'est plus la source de vérité.
ALTER TABLE public.hospitalizations ALTER COLUMN room_number DROP NOT NULL;
ALTER TABLE public.hospitalizations ALTER COLUMN bed_number DROP NOT NULL;

CREATE INDEX IF NOT EXISTS hospitalizations_bed_idx ON public.hospitalizations (bed_id);
CREATE INDEX IF NOT EXISTS hospitalizations_stay_status_idx ON public.hospitalizations (stay_status);

/*
 * BR-058 : un lit ne peut être occupé que par un seul patient à la fois.
 *
 * L'index partiel est la garantie : deux séjours en cours ne peuvent pas
 * référencer le même lit, quelle que soit la voie d'écriture. Les séjours
 * terminés, annulés ou archivés en sont exclus — le lit est alors libre.
 */
CREATE UNIQUE INDEX IF NOT EXISTS hospitalizations_one_patient_per_bed
  ON public.hospitalizations (bed_id)
  WHERE bed_id IS NOT NULL
    AND deleted_at IS NULL
    AND stay_status IN ('pre_admission', 'admitted', 'in_stay', 'transferring', 'discharge_planned');

/*
 * Contrôles d'affectation, et tenue de l'état du lit.
 *
 * Le lit passe à « occupé » lorsqu'il est affecté et redevient « disponible »
 * lorsque le séjour se termine (BR-060). L'application n'a donc jamais à
 * synchroniser cet état elle-même : c'est la source d'incohérence la plus
 * courante dans ce genre de module.
 */
CREATE OR REPLACE FUNCTION public.sync_bed_occupancy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bed RECORD;
  v_active BOOLEAN;
  v_was_active BOOLEAN;
BEGIN
  v_active := NEW.deleted_at IS NULL
    AND NEW.stay_status IN ('pre_admission', 'admitted', 'in_stay', 'transferring', 'discharge_planned');

  v_was_active := TG_OP = 'UPDATE'
    AND OLD.deleted_at IS NULL
    AND OLD.stay_status IN ('pre_admission', 'admitted', 'in_stay', 'transferring', 'discharge_planned');

  IF NEW.bed_id IS NOT NULL AND v_active THEN
    SELECT b.id, b.status, b.room_id, b.establishment_id, r.establishment_id AS room_establishment
      INTO v_bed
      FROM public.beds b
      JOIN public.rooms r ON r.id = b.room_id
     WHERE b.id = NEW.bed_id AND b.deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Le lit sélectionné n''existe pas ou a été retiré du service.';
    END IF;

    IF v_bed.establishment_id IS DISTINCT FROM NEW.establishment_id THEN
      RAISE EXCEPTION 'Le lit sélectionné appartient à un autre établissement.';
    END IF;

    -- Chambre et lit doivent désigner la même ressource : l'un des deux
    -- champs a pu être changé sans l'autre.
    IF NEW.room_id IS NOT NULL AND v_bed.room_id IS DISTINCT FROM NEW.room_id THEN
      RAISE EXCEPTION 'Le lit sélectionné n''appartient pas à la chambre choisie.';
    END IF;

    -- Un lit hors service ou en nettoyage ne reçoit pas de patient. « Réservé »
    -- et « occupé » sont admis : l'index unique tranche les conflits réels, et
    -- l'état porté par le lit peut être en retard d'un instant.
    IF v_bed.status IN ('out_of_service', 'cleaning') THEN
      RAISE EXCEPTION 'Le lit sélectionné est indisponible (%).', v_bed.status;
    END IF;

    UPDATE public.beds
       SET status = 'occupied', available_from = NULL, updated_at = NOW()
     WHERE id = NEW.bed_id AND status <> 'occupied';
  END IF;

  -- Libération : le séjour se termine, ou change de lit.
  IF TG_OP = 'UPDATE' AND OLD.bed_id IS NOT NULL
     AND (OLD.bed_id IS DISTINCT FROM NEW.bed_id OR (v_was_active AND NOT v_active)) THEN
    -- Le lit ne redevient libre que si plus aucun séjour en cours ne l'occupe.
    UPDATE public.beds b
       SET status = 'available', available_from = NOW(), updated_at = NOW()
     WHERE b.id = OLD.bed_id
       AND b.status = 'occupied'
       AND NOT EXISTS (
         SELECT 1 FROM public.hospitalizations h
          WHERE h.bed_id = b.id
            AND h.id <> NEW.id
            AND h.deleted_at IS NULL
            AND h.stay_status IN ('pre_admission', 'admitted', 'in_stay', 'transferring', 'discharge_planned')
       );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_hospitalizations_bed ON public.hospitalizations;
CREATE TRIGGER trig_hospitalizations_bed
  AFTER INSERT OR UPDATE OF bed_id, room_id, stay_status, deleted_at ON public.hospitalizations
  FOR EACH ROW EXECUTE FUNCTION public.sync_bed_occupancy();

-- ==========================================
-- 5. TRANSFERTS (BP16 §10)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.hospitalization_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
  transfer_type VARCHAR(30) NOT NULL DEFAULT 'bed',
  from_room_id UUID REFERENCES public.rooms(id),
  from_bed_id UUID REFERENCES public.beds(id),
  from_service VARCHAR(80),
  to_room_id UUID REFERENCES public.rooms(id),
  to_bed_id UUID REFERENCES public.beds(id),
  to_service VARCHAR(80),
  -- Transfert externe : l'établissement destinataire n'est pas dans la base.
  external_destination VARCHAR(200),
  reason TEXT NOT NULL,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT transfer_type_known
    CHECK (transfer_type IN ('bed', 'room', 'service', 'external'))
);

CREATE INDEX IF NOT EXISTS transfers_hospitalization_idx
  ON public.hospitalization_transfers (hospitalization_id, transferred_at DESC);

-- ==========================================
-- 6. SOINS QUOTIDIENS (BP16 §8)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.hospitalization_care (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
  care_type VARCHAR(60) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  caregiver_id UUID REFERENCES public.profiles(id),
  -- Constantes vitales. Les bornes écartent la faute de frappe manifeste — une
  -- température à 380 °C, une tension à 3000 — sans prétendre juger du cas
  -- clinique.
  temperature NUMERIC(4,1) CHECK (temperature IS NULL OR temperature BETWEEN 25 AND 45),
  blood_pressure_systolic INT CHECK (blood_pressure_systolic IS NULL OR blood_pressure_systolic BETWEEN 40 AND 300),
  blood_pressure_diastolic INT CHECK (blood_pressure_diastolic IS NULL OR blood_pressure_diastolic BETWEEN 20 AND 200),
  heart_rate INT CHECK (heart_rate IS NULL OR heart_rate BETWEEN 20 AND 260),
  respiratory_rate INT CHECK (respiratory_rate IS NULL OR respiratory_rate BETWEEN 5 AND 80),
  oxygen_saturation INT CHECK (oxygen_saturation IS NULL OR oxygen_saturation BETWEEN 30 AND 100),
  weight_kg NUMERIC(5,2) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 0.3 AND 400),
  pain_level INT CHECK (pain_level IS NULL OR pain_level BETWEEN 0 AND 10),
  observations TEXT,
  incident TEXT,
  nutrition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS care_hospitalization_idx
  ON public.hospitalization_care (hospitalization_id, recorded_at DESC);

-- ==========================================
-- 7. VISITES MÉDICALES (BP16 §9)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.hospitalization_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  hospitalization_id UUID NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observations TEXT NOT NULL,
  evolution VARCHAR(40),
  diagnosis TEXT,
  treatment_changes TEXT,
  additional_exams TEXT,
  decision VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS visits_hospitalization_idx
  ON public.hospitalization_visits (hospitalization_id, visited_at DESC);

-- ==========================================
-- 8. RÉFÉRENCES MÉTIER (BP08)
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_rooms                     AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_beds                      AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_hospitalization_transfers  AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_hospitalization_care       AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_hospitalization_visits     AS BIGINT START 1;

/*
 * Référence métier des nouvelles tables.
 *
 * `generate_business_ref` couvre les tables historiques par une liste `CASE`
 * qu'il faudrait rouvrir à chaque ajout. Cette fonction-ci déduit le préfixe et
 * la séquence du nom de la table, passés en arguments du déclencheur : ajouter
 * une table ne demande plus de modifier du code existant.
 */
CREATE OR REPLACE FUNCTION public.generate_module_ref()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prefix TEXT := TG_ARGV[0];
  v_seq TEXT := 'public.seq_ref_' || TG_TABLE_NAME;
  v_next BIGINT;
BEGIN
  IF NEW.business_reference IS NULL OR NEW.business_reference = '' THEN
    EXECUTE format('SELECT nextval(%L)', v_seq) INTO v_next;
    NEW.business_reference := v_prefix || lpad(v_next::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_rooms_ref ON public.rooms;
CREATE TRIGGER trig_rooms_ref BEFORE INSERT ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-CHB-');

DROP TRIGGER IF EXISTS trig_beds_ref ON public.beds;
CREATE TRIGGER trig_beds_ref BEFORE INSERT ON public.beds
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-LIT-');

DROP TRIGGER IF EXISTS trig_transfers_ref ON public.hospitalization_transfers;
CREATE TRIGGER trig_transfers_ref BEFORE INSERT ON public.hospitalization_transfers
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-TRF-');

DROP TRIGGER IF EXISTS trig_care_ref ON public.hospitalization_care;
CREATE TRIGGER trig_care_ref BEFORE INSERT ON public.hospitalization_care
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-SOI-');

DROP TRIGGER IF EXISTS trig_visits_ref ON public.hospitalization_visits;
CREATE TRIGGER trig_visits_ref BEFORE INSERT ON public.hospitalization_visits
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-VIS-');

-- ==========================================
-- 9. HORODATAGE
-- ==========================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['rooms', 'beds', 'hospitalization_transfers',
                           'hospitalization_care', 'hospitalization_visits'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_updated BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ==========================================
-- 10. ISOLATION PAR ÉTABLISSEMENT (BP16 §18)
-- ==========================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['rooms', 'beds', 'hospitalization_transfers',
                           'hospitalization_care', 'hospitalization_visits'] LOOP
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

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.rooms, public.beds, public.hospitalization_transfers,
  public.hospitalization_care, public.hospitalization_visits
  TO authenticated;

-- ==========================================
-- 11. DISPONIBILITÉ ET OCCUPATION (BP16 §15)
-- ==========================================
/*
 * Lits avec leur chambre et leur occupant éventuel.
 *
 * La vue existe pour que la disponibilité soit calculée au même endroit pour
 * tout le monde : formulaire d'admission, tableau des lits, taux d'occupation.
 * `security_invoker` la fait évaluer avec les droits de l'appelant, donc sous
 * les politiques RLS des tables sous-jacentes — sans quoi elle deviendrait un
 * contournement de l'isolation.
 */
CREATE OR REPLACE VIEW public.bed_availability
WITH (security_invoker = true) AS
SELECT
  b.id AS bed_id,
  b.establishment_id,
  b.business_reference AS bed_reference,
  b.code AS bed_code,
  b.status AS bed_status,
  b.available_from,
  r.id AS room_id,
  r.code AS room_code,
  r.name AS room_name,
  r.room_type,
  r.service,
  r.floor,
  r.capacity,
  r.daily_rate,
  r.status AS room_status,
  h.id AS hospitalization_id,
  h.patient_id,
  h.admission_date,
  h.stay_status,
  -- Un lit est proposable s'il n'est ni occupé, ni retiré du service, et si sa
  -- chambre est elle-même ouverte.
  (h.id IS NULL
     AND b.status NOT IN ('out_of_service', 'cleaning', 'occupied')
     AND r.status = 'available') AS is_assignable
FROM public.beds b
JOIN public.rooms r ON r.id = b.room_id AND r.deleted_at IS NULL
LEFT JOIN public.hospitalizations h
  ON h.bed_id = b.id
 AND h.deleted_at IS NULL
 AND h.stay_status IN ('pre_admission', 'admitted', 'in_stay', 'transferring', 'discharge_planned')
WHERE b.deleted_at IS NULL;

GRANT SELECT ON public.bed_availability TO authenticated;

COMMENT ON VIEW public.bed_availability IS
  'Lits, leur chambre et leur occupant en cours. Source unique de la disponibilité (BP16 §7, §15).';

COMMENT ON TABLE public.rooms IS 'Chambres d''hospitalisation (BP16 §6).';
COMMENT ON TABLE public.beds IS 'Lits rattachés à une chambre (BP16 §7). BR-058 : un seul patient à la fois.';
COMMENT ON TABLE public.hospitalization_transfers IS 'Transferts de lit, chambre, service ou établissement (BP16 §10, BR-061).';
COMMENT ON TABLE public.hospitalization_care IS 'Soins quotidiens et constantes vitales (BP16 §8, BR-062).';
COMMENT ON TABLE public.hospitalization_visits IS 'Visites médicales du séjour (BP16 §9).';
