-- MORACare Enterprise - Patients, Rendez-vous et Consultations (BP13, BP14, BP15)
-- Version: 4.0.0
--
-- Les trois modules cliniques fondateurs étaient réduits à leurs colonnes
-- minimales. Cette migration les met en conformité avec leurs blueprints, en
-- commençant par les règles métier — ce sont elles qui ne peuvent pas être
-- ajoutées après coup sans reprendre les données.
--
-- Ce qui est tenu par la base, et non par l'écran :
--
--   BR-031  les doublons sont contrôlés avant toute création ;
--   BR-032  le dossier médical est créé automatiquement ;
--   BR-035  les alertes médicales sont visibles dans tous les modules ;
--   BR-036  la fusion est réservée aux utilisateurs autorisés ;
--   BR-041  les doubles réservations sont interdites ;
--   BR-042  tous les changements d'état sont historisés ;
--   BR-044  les rendez-vous annulés et reportés restent conservés ;
--   BR-049  les diagnostics peuvent être multiples ;
--   BR-051  les demandes d'examens alimentent Laboratoire et Imagerie.

-- ==========================================
-- 1. DOSSIER ADMINISTRATIF ET MÉDICAL (BP13 §5, §6)
-- ==========================================
ALTER TABLE public.patients
  -- Administratif
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(80),
  ADD COLUMN IF NOT EXISTS profession VARCHAR(120),
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS country VARCHAR(120),
  ADD COLUMN IF NOT EXISTS phone_secondary VARCHAR(40),
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(40),
  ADD COLUMN IF NOT EXISTS passport_number VARCHAR(60),
  ADD COLUMN IF NOT EXISTS social_security_number VARCHAR(60),
  ADD COLUMN IF NOT EXISTS internal_identifier VARCHAR(60),

  -- Médical
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1) CHECK (height_cm IS NULL OR height_cm BETWEEN 20 AND 260),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2) CHECK (weight_kg IS NULL OR weight_kg BETWEEN 0.3 AND 400),
  ADD COLUMN IF NOT EXISTS intolerances TEXT,
  ADD COLUMN IF NOT EXISTS medical_history TEXT,
  ADD COLUMN IF NOT EXISTS surgical_history TEXT,
  ADD COLUMN IF NOT EXISTS current_treatments TEXT,
  ADD COLUMN IF NOT EXISTS vaccinations TEXT,
  ADD COLUMN IF NOT EXISTS disability VARCHAR(160),
  ADD COLUMN IF NOT EXISTS is_pregnant BOOLEAN,
  ADD COLUMN IF NOT EXISTS pregnancy_due_date DATE,
  ADD COLUMN IF NOT EXISTS general_observations TEXT,

  -- BP13 §13 : cycle de vie du dossier.
  ADD COLUMN IF NOT EXISTS patient_status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- BP13 §16 : dossier absorbé par une fusion.
  ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES public.patients(id),
  ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.patients
    ADD CONSTRAINT patients_status_known
    CHECK (patient_status IN ('active', 'inactive', 'deceased', 'merged', 'archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

/*
 * Un dossier fusionné n'est plus actif, et réciproquement.
 *
 * Sans cette cohérence, un dossier absorbé continuerait d'apparaître dans les
 * recherches, et l'on pourrait y rattacher une nouvelle consultation alors que
 * son contenu a été déplacé ailleurs.
 */
DO $$ BEGIN
  ALTER TABLE public.patients
    ADD CONSTRAINT patients_merge_consistent
    CHECK ((merged_into IS NULL) = (patient_status <> 'merged'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 2. CONTACTS D'URGENCE, RESPONSABLE LÉGAL, ASSURANCES (BP13 §7, §8, §9)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.patient_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  -- BP13 §7 et §8 : un contact d'urgence, ou le responsable légal d'un mineur.
  contact_type VARCHAR(20) NOT NULL DEFAULT 'emergency',
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  relationship VARCHAR(80),
  phone VARCHAR(40) NOT NULL,
  phone_secondary VARCHAR(40),
  email VARCHAR(255),
  address TEXT,
  -- Le responsable légal peut aussi être le payeur (BP13 §8).
  is_payer BOOLEAN NOT NULL DEFAULT FALSE,
  document_url TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT contact_type_known CHECK (contact_type IN ('emergency', 'legal_guardian'))
);

CREATE INDEX IF NOT EXISTS patient_contacts_idx ON public.patient_contacts (patient_id);

CREATE TABLE IF NOT EXISTS public.patient_insurances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  company VARCHAR(160) NOT NULL,
  policy_number VARCHAR(80),
  member_number VARCHAR(80),
  valid_from DATE,
  valid_until DATE,
  coverage_percent NUMERIC(5,2) CHECK (coverage_percent IS NULL OR coverage_percent BETWEEN 0 AND 100),
  ceiling_amount NUMERIC(14,2) CHECK (ceiling_amount IS NULL OR ceiling_amount >= 0),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT insurance_dates_ordered
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_from <= valid_until)
);

CREATE INDEX IF NOT EXISTS patient_insurances_idx ON public.patient_insurances (patient_id);

-- Une seule assurance principale : c'est elle qui sert au calcul de la prise
-- en charge, et deux candidates rendraient le montant indéterminé.
CREATE UNIQUE INDEX IF NOT EXISTS patient_insurances_single_primary
  ON public.patient_insurances (patient_id) WHERE is_primary AND deleted_at IS NULL;

-- ==========================================
-- 3. ALERTES MÉDICALES (BP13 §11, BR-035)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.patient_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  alert_type VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'warning',
  label VARCHAR(200) NOT NULL,
  details TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT alert_type_known
    CHECK (alert_type IN ('allergy', 'intolerance', 'chronic', 'contraindication',
                          'infectious', 'behaviour', 'other')),
  CONSTRAINT alert_severity_known CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS patient_alerts_idx
  ON public.patient_alerts (patient_id) WHERE is_active AND deleted_at IS NULL;

/*
 * BR-035 : les alertes sont visibles dans tous les modules.
 *
 * Une vue plutôt qu'une duplication : chaque module lit la même source, et une
 * allergie levée disparaît partout au même instant. Recopier l'alerte dans les
 * consultations et les hospitalisations aurait garanti l'inverse.
 */
CREATE OR REPLACE VIEW public.patient_active_alerts
WITH (security_invoker = true) AS
SELECT
  a.patient_id,
  a.establishment_id,
  count(*) AS alert_count,
  count(*) FILTER (WHERE a.severity = 'critical') AS critical_count,
  array_agg(a.label ORDER BY
    CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
    a.created_at) AS labels,
  bool_or(a.severity = 'critical') AS has_critical
FROM public.patient_alerts a
WHERE a.is_active AND a.deleted_at IS NULL
GROUP BY a.patient_id, a.establishment_id;

GRANT SELECT ON public.patient_active_alerts TO authenticated;

-- ==========================================
-- 4. DÉTECTION DES DOUBLONS ET FUSION (BP13 §15, §16 ; BR-031, BR-036)
-- ==========================================
/*
 * Doublons probables d'un patient.
 *
 * Trois signaux, du plus sûr au plus faible : une pièce d'identité identique,
 * un téléphone identique, ou l'homonymie à date de naissance égale. Le score
 * permet de classer sans jamais décider à la place de l'utilisateur — fusionner
 * deux dossiers distincts est bien plus grave que d'en laisser deux ouverts.
 */
CREATE OR REPLACE FUNCTION public.find_patient_duplicates(
  p_establishment UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_birth_date DATE,
  p_phone TEXT,
  p_national_id TEXT,
  p_exclude UUID DEFAULT NULL
)
RETURNS TABLE (
  patient_id UUID,
  business_reference VARCHAR,
  full_name TEXT,
  birth_date DATE,
  phone VARCHAR,
  score INT,
  reason TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.business_reference,
    p.first_name || ' ' || p.last_name,
    p.birth_date,
    p.phone,
    score.value,
    score.label
  FROM public.patients p
  CROSS JOIN LATERAL (
    SELECT
      CASE
        WHEN COALESCE(p_national_id, '') <> ''
         AND p.national_id = p_national_id THEN 100
        WHEN COALESCE(p_phone, '') <> ''
         AND p.phone = p_phone
         AND lower(p.last_name) = lower(p_last_name) THEN 90
        WHEN lower(p.first_name) = lower(p_first_name)
         AND lower(p.last_name) = lower(p_last_name)
         AND p.birth_date = p_birth_date THEN 80
        WHEN COALESCE(p_phone, '') <> '' AND p.phone = p_phone THEN 60
        WHEN lower(p.first_name) = lower(p_first_name)
         AND lower(p.last_name) = lower(p_last_name) THEN 40
        ELSE 0
      END AS value,
      CASE
        WHEN COALESCE(p_national_id, '') <> '' AND p.national_id = p_national_id
          THEN 'Même pièce d''identité'
        WHEN COALESCE(p_phone, '') <> '' AND p.phone = p_phone
         AND lower(p.last_name) = lower(p_last_name)
          THEN 'Même téléphone et même nom'
        WHEN lower(p.first_name) = lower(p_first_name)
         AND lower(p.last_name) = lower(p_last_name)
         AND p.birth_date = p_birth_date
          THEN 'Même identité et même date de naissance'
        WHEN COALESCE(p_phone, '') <> '' AND p.phone = p_phone
          THEN 'Même téléphone'
        ELSE 'Homonymie'
      END AS label
  ) AS score
  WHERE p.establishment_id = p_establishment
    AND p.deleted_at IS NULL
    AND p.patient_status <> 'merged'
    AND (p_exclude IS NULL OR p.id <> p_exclude)
    AND score.value > 0
  ORDER BY score.value DESC, p.created_at
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.find_patient_duplicates(UUID, TEXT, TEXT, DATE, TEXT, TEXT, UUID)
  TO authenticated;

/*
 * Fusion de deux dossiers (BP13 §16, BR-036).
 *
 * Tout ce qui est rattaché au dossier absorbé est reporté sur le dossier
 * conservé, puis le premier est marqué fusionné — jamais supprimé, BR-033
 * l'interdit. Le sens de la fusion n'est pas réversible : c'est pourquoi elle
 * est réservée au responsable d'établissement.
 */
CREATE OR REPLACE FUNCTION public.merge_patients(
  p_keep UUID,
  p_absorb UUID,
  p_user UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_establishment UUID;
  v_moved INT := 0;
  v_count INT;
BEGIN
  IF p_keep = p_absorb THEN
    RAISE EXCEPTION 'Un dossier ne peut pas être fusionné avec lui-même.';
  END IF;

  IF NOT public.is_super_admin() AND NOT public.is_establishment_admin() THEN
    RAISE EXCEPTION 'La fusion de dossiers est réservée au responsable de l''établissement.';
  END IF;

  SELECT establishment_id INTO v_establishment FROM public.patients WHERE id = p_keep;

  IF NOT EXISTS (
    SELECT 1 FROM public.patients
     WHERE id = p_absorb AND establishment_id = v_establishment
  ) THEN
    RAISE EXCEPTION 'Les deux dossiers doivent appartenir au même établissement.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.patients WHERE id = p_absorb AND patient_status = 'merged') THEN
    RAISE EXCEPTION 'Ce dossier a déjà été fusionné.';
  END IF;

  -- Report de tout ce qui référence le patient absorbé.
  UPDATE public.appointments SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.consultations SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.prescriptions SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.hospitalizations SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.lab_orders SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.imaging_orders SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.invoices SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.dispensations SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.therapeutic_plans SET patient_id = p_keep WHERE patient_id = p_absorb;
  GET DIAGNOSTICS v_count = ROW_COUNT; v_moved := v_moved + v_count;

  UPDATE public.patient_alerts SET patient_id = p_keep WHERE patient_id = p_absorb;
  UPDATE public.patient_contacts SET patient_id = p_keep WHERE patient_id = p_absorb;
  UPDATE public.patient_insurances
     SET patient_id = p_keep,
         -- Le dossier conservé garde son assurance principale.
         is_primary = FALSE
   WHERE patient_id = p_absorb;

  UPDATE public.patients
     SET patient_status = 'merged',
         merged_into = p_keep,
         merged_at = NOW(),
         is_active = FALSE,
         updated_by = p_user,
         updated_at = NOW()
   WHERE id = p_absorb;

  RETURN v_moved;
END;
$$;

REVOKE ALL ON FUNCTION public.merge_patients(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_patients(UUID, UUID, UUID) TO authenticated;

-- ==========================================
-- 5. RENDEZ-VOUS (BP14)
-- ==========================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(40) NOT NULL DEFAULT 'consultation',
  -- BP14 §5 : sur place, téléphone, en ligne, urgence, suivi.
  ADD COLUMN IF NOT EXISTS booking_channel VARCHAR(30) NOT NULL DEFAULT 'sur_place',
  -- BP14 §7 : routine, urgent, très urgent.
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normale',
  ADD COLUMN IF NOT EXISTS service VARCHAR(80),
  ADD COLUMN IF NOT EXISTS room VARCHAR(60),
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  -- BP14 §12 : un report conserve le lien vers le rendez-vous d'origine.
  ADD COLUMN IF NOT EXISTS rescheduled_from UUID REFERENCES public.appointments(id);

DO $$ BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_priority_known
    CHECK (priority IN ('basse', 'normale', 'urgente', 'tres_urgente'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_channel_known
    CHECK (booking_channel IN ('sur_place', 'telephone', 'en_ligne', 'urgence', 'suivi'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

/*
 * BR-041 : les doubles réservations sont interdites.
 *
 * Deux rendez-vous ne peuvent pas se chevaucher pour le même praticien. Le
 * contrôle porte sur l'intervalle réel — début et durée — et non sur l'égalité
 * des horaires : réserver de 9 h à 9 h 30 puis de 9 h 15 à 9 h 45 est
 * exactement le conflit que la règle veut éviter.
 *
 * Les rendez-vous annulés et reportés sont exclus : BR-044 les conserve dans
 * l'historique, mais ils ne bloquent plus le créneau.
 */
CREATE OR REPLACE FUNCTION public.enforce_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_conflict RECORD;
  v_duration INT := COALESCE(NEW.duration_minutes, 30);
BEGIN
  IF NEW.deleted_at IS NOT NULL
     OR NEW.status IN ('canceled', 'cancelled', 'rescheduled', 'no_show') THEN
    RETURN NEW;
  END IF;

  SELECT a.business_reference, a.appointment_date
    INTO v_conflict
    FROM public.appointments a
   WHERE a.doctor_id = NEW.doctor_id
     AND a.id <> NEW.id
     AND a.deleted_at IS NULL
     AND a.status NOT IN ('canceled', 'cancelled', 'rescheduled', 'no_show', 'completed')
     -- Chevauchement de deux intervalles : chacun commence avant la fin de
     -- l'autre.
     AND a.appointment_date < NEW.appointment_date + (v_duration || ' minutes')::INTERVAL
     AND NEW.appointment_date
         < a.appointment_date + (COALESCE(a.duration_minutes, 30) || ' minutes')::INTERVAL
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION
      'Le praticien a déjà le rendez-vous % à %. Choisissez un autre créneau.',
      v_conflict.business_reference,
      to_char(v_conflict.appointment_date, 'DD/MM/YYYY HH24:MI');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_appointment_slot ON public.appointments;
CREATE TRIGGER trig_appointment_slot
  BEFORE INSERT OR UPDATE OF appointment_date, duration_minutes, doctor_id, status
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_appointment_slot();

/*
 * BR-042 : tous les changements d'état sont historisés.
 *
 * L'historique est écrit par la base. Le confier à l'application aurait laissé
 * passer les transitions déclenchées ailleurs — un rendez-vous annulé par la
 * clôture d'un agenda, par exemple.
 */
CREATE TABLE IF NOT EXISTS public.appointment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  from_status VARCHAR(40),
  to_status VARCHAR(40) NOT NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performed_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS appointment_events_idx
  ON public.appointment_events (appointment_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.log_appointment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.appointment_events (
    establishment_id, appointment_id, from_status, to_status, reason, performed_by
  ) VALUES (
    NEW.establishment_id, NEW.id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    NEW.cancellation_reason,
    NEW.updated_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_appointment_events ON public.appointments;
CREATE TRIGGER trig_appointment_events
  AFTER INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_appointment_status();

/*
 * L'historique est en écriture seule.
 *
 * Un privilège refusé suffirait en théorie, mais il dépend de la façon dont les
 * droits ont été accordés — et un `GRANT` trop large, posé un jour pour
 * dépanner, rouvrirait silencieusement la porte. Le déclencheur, lui, refuse
 * quel que soit le rôle.
 */
CREATE OR REPLACE FUNCTION public.appointment_events_are_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'L''historique des rendez-vous est immuable : il retrace ce qui s''est produit.';
END;
$$;

DROP TRIGGER IF EXISTS trig_appointment_events_immutable ON public.appointment_events;
CREATE TRIGGER trig_appointment_events_immutable
  BEFORE UPDATE OR DELETE ON public.appointment_events
  FOR EACH ROW EXECUTE FUNCTION public.appointment_events_are_immutable();

-- ==========================================
-- 6. CONSULTATIONS (BP15)
-- ==========================================
ALTER TABLE public.consultations
  -- BP15 §5 : générale, spécialisée, urgence, suivi, contrôle, téléconsultation.
  ADD COLUMN IF NOT EXISTS consultation_type VARCHAR(40) NOT NULL DEFAULT 'generale',
  ADD COLUMN IF NOT EXISTS respiratory_rate INT
    CHECK (respiratory_rate IS NULL OR respiratory_rate BETWEEN 5 AND 80),
  ADD COLUMN IF NOT EXISTS oxygen_saturation INT
    CHECK (oxygen_saturation IS NULL OR oxygen_saturation BETWEEN 30 AND 100),
  ADD COLUMN IF NOT EXISTS pain_level INT CHECK (pain_level IS NULL OR pain_level BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS medical_history TEXT,
  -- BP15 §13 : orientation à l'issue de la consultation.
  ADD COLUMN IF NOT EXISTS outcome VARCHAR(40),
  ADD COLUMN IF NOT EXISTS referral_service VARCHAR(80),
  ADD COLUMN IF NOT EXISTS hospitalization_id UUID REFERENCES public.hospitalizations(id),
  ADD COLUMN IF NOT EXISTS next_visit_date DATE,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

DO $$ BEGIN
  ALTER TABLE public.consultations
    ADD CONSTRAINT consultations_outcome_known
    CHECK (outcome IS NULL OR outcome IN ('retour_domicile', 'orientation_specialiste',
                                          'hospitalisation', 'transfert', 'suivi', 'deces'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

/*
 * BR-049 : les diagnostics peuvent être multiples.
 *
 * Une colonne de texte ne permet ni de compter, ni de coder, ni de distinguer
 * le diagnostic principal des diagnostics associés — trois besoins du BP15 §8.
 */
CREATE TABLE IF NOT EXISTS public.consultation_diagnoses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  label VARCHAR(200) NOT NULL,
  icd10_code VARCHAR(20),
  diagnosis_type VARCHAR(20) NOT NULL DEFAULT 'principal',
  certainty VARCHAR(20) NOT NULL DEFAULT 'confirme',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  CONSTRAINT diagnosis_type_known CHECK (diagnosis_type IN ('principal', 'associe', 'differentiel')),
  CONSTRAINT diagnosis_certainty_known CHECK (certainty IN ('suspecte', 'probable', 'confirme'))
);

CREATE INDEX IF NOT EXISTS consultation_diagnoses_idx
  ON public.consultation_diagnoses (consultation_id);

-- Un seul diagnostic principal par consultation : deux rendraient le codage et
-- les statistiques ambigus.
CREATE UNIQUE INDEX IF NOT EXISTS consultation_single_principal
  ON public.consultation_diagnoses (consultation_id) WHERE diagnosis_type = 'principal';

/*
 * Certificats médicaux (BP15 §12).
 *
 * Le certificat engage son signataire : il est conservé comme une pièce, avec
 * son praticien, sa date et sa période de validité.
 */
CREATE TABLE IF NOT EXISTS public.medical_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  certificate_type VARCHAR(40) NOT NULL,
  issued_on DATE NOT NULL DEFAULT CURRENT_DATE,
  starts_on DATE,
  ends_on DATE,
  rest_days INT CHECK (rest_days IS NULL OR rest_days BETWEEN 0 AND 365),
  content TEXT NOT NULL,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT certificate_type_known
    CHECK (certificate_type IN ('arret_travail', 'aptitude', 'inaptitude', 'presence',
                                'sport', 'scolaire', 'grossesse', 'autre')),
  CONSTRAINT certificate_dates_ordered
    CHECK (starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on)
);

CREATE INDEX IF NOT EXISTS medical_certificates_idx
  ON public.medical_certificates (patient_id, issued_on DESC);

CREATE SEQUENCE IF NOT EXISTS public.seq_ref_medical_certificates AS BIGINT START 1;

DROP TRIGGER IF EXISTS trig_medical_certificates_ref ON public.medical_certificates;
CREATE TRIGGER trig_medical_certificates_ref BEFORE INSERT ON public.medical_certificates
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-CER-');

-- ==========================================
-- 7. HORODATAGE ET ISOLATION
-- ==========================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['patient_contacts', 'patient_insurances', 'patient_alerts',
                           'medical_certificates'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_updated BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['patient_contacts', 'patient_insurances', 'patient_alerts',
                           'medical_certificates', 'consultation_diagnoses',
                           'appointment_events'] LOOP
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
  public.patient_contacts, public.patient_insurances, public.patient_alerts,
  public.medical_certificates, public.consultation_diagnoses
  TO authenticated;

-- L'historique des rendez-vous est en lecture seule : il est écrit par la base.
GRANT SELECT ON public.appointment_events TO authenticated;

COMMENT ON TABLE public.patient_contacts IS 'Contacts d''urgence et responsables légaux (BP13 §7, §8).';
COMMENT ON TABLE public.patient_insurances IS 'Assurances du patient (BP13 §9).';
COMMENT ON TABLE public.patient_alerts IS 'Alertes médicales, visibles dans tous les modules (BP13 §11, BR-035).';
COMMENT ON TABLE public.appointment_events IS 'Historique des états d''un rendez-vous (BP14, BR-042).';
COMMENT ON TABLE public.consultation_diagnoses IS 'Diagnostics multiples d''une consultation (BP15 §8, BR-049).';
COMMENT ON TABLE public.medical_certificates IS 'Certificats médicaux (BP15 §12).';
