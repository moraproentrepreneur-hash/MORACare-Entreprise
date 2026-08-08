-- MORACare Enterprise - Facturation des abonnements SaaS (BP30, BP09)
-- Version: 3.4.0
--
-- Contexte
-- --------
-- Le contrat existait — formule, durée, échéance, changement de formule, mode
-- de paiement, prix calculé selon la durée — mais rien n'en portait la trace
-- financière. Aucune facture, aucun paiement, aucun encours : ni l'éditeur ni
-- l'établissement ne pouvaient dire ce qui avait été facturé, ni ce qui restait
-- dû.
--
-- Les tables `invoices` et `payments` existantes ne conviennent pas : elles
-- portent une colonne `patient_id` et relèvent de la facturation des soins
-- (BP22). Mélanger la facturation d'un patient et celle d'un abonnement SaaS
-- rendrait tout état financier faux des deux côtés.
--
-- Choix retenus
-- -------------
-- La facture fige le prix. Un tarif révisé, une remise modifiée ou un plan
-- renommé ne doivent pas réécrire une facture déjà émise : elle porte donc son
-- propre libellé, son prix unitaire et son total.
--
-- Le montant réglé est déduit des paiements, jamais saisi. Un encours corrigé
-- à la main sans paiement correspondant serait un solde que personne ne
-- pourrait justifier.

-- ==========================================
-- 1. TYPES
-- ==========================================
DO $$ BEGIN
  CREATE TYPE public.billing_state AS ENUM (
    'draft', 'issued', 'partially_paid', 'paid', 'overdue', 'canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 2. FACTURES D'ABONNEMENT
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

  -- Libellés figés à l'émission : une facture doit rester lisible même si le
  -- plan est renommé ou retiré du catalogue.
  plan_name VARCHAR(120) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  duration_months INT NOT NULL CHECK (duration_months BETWEEN 1 AND 12),

  base_monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_monthly_price >= 0),
  monthly_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_price >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'KMF',

  -- Tenu par déclencheur depuis les paiements.
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status public.billing_state NOT NULL DEFAULT 'issued',

  issued_on DATE NOT NULL DEFAULT CURRENT_DATE,
  due_on DATE,
  payment_method VARCHAR(60),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT invoice_period_ordered CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS subscription_invoices_establishment_idx
  ON public.subscription_invoices (establishment_id, issued_on DESC);
CREATE INDEX IF NOT EXISTS subscription_invoices_status_idx
  ON public.subscription_invoices (status);

-- Une période déjà facturée ne doit pas l'être deux fois : le renouvellement
-- automatique et une émission manuelle produiraient sinon un doublon.
CREATE UNIQUE INDEX IF NOT EXISTS subscription_invoices_unique_period
  ON public.subscription_invoices (subscription_id, period_start, period_end)
  WHERE deleted_at IS NULL AND subscription_id IS NOT NULL;

-- ==========================================
-- 3. PAIEMENTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_reference VARCHAR(50) UNIQUE NOT NULL,
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.subscription_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(60) NOT NULL,
  transaction_reference VARCHAR(120),
  paid_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS subscription_payments_invoice_idx
  ON public.subscription_payments (invoice_id, paid_on DESC);

/*
 * Report d'un paiement sur sa facture.
 *
 * Le montant réglé et le statut sont recalculés depuis la somme des paiements
 * vivants : l'annulation d'un paiement erroné remet donc la facture dans le
 * bon état, sans intervention.
 *
 * Un règlement supérieur au dû est refusé. Sur un abonnement, il traduit
 * presque toujours une saisie sur la mauvaise facture ; l'accepter
 * silencieusement créerait un avoir fantôme.
 */
CREATE OR REPLACE FUNCTION public.apply_subscription_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice_id UUID := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_invoice RECORD;
  v_paid NUMERIC(14,2);
BEGIN
  SELECT total_amount, status, due_on INTO v_invoice
    FROM public.subscription_invoices WHERE id = v_invoice_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable.';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.subscription_payments
   WHERE invoice_id = v_invoice_id AND deleted_at IS NULL;

  IF v_paid > v_invoice.total_amount THEN
    RAISE EXCEPTION
      'Le total des règlements (%) dépasse le montant de la facture (%).',
      v_paid, v_invoice.total_amount;
  END IF;

  UPDATE public.subscription_invoices
     SET paid_amount = v_paid,
         status = CASE
           WHEN status = 'canceled' THEN 'canceled'
           WHEN v_paid >= total_amount AND total_amount > 0 THEN 'paid'
           WHEN v_paid > 0 THEN 'partially_paid'
           WHEN due_on IS NOT NULL AND due_on < CURRENT_DATE THEN 'overdue'
           ELSE 'issued'
         END::public.billing_state,
         updated_at = NOW()
   WHERE id = v_invoice_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trig_subscription_payment ON public.subscription_payments;
CREATE TRIGGER trig_subscription_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_subscription_payment();

-- ==========================================
-- 4. ÉMISSION AUTOMATIQUE
-- ==========================================
/*
 * Émet la facture d'une période d'abonnement.
 *
 * Le prix est recalculé selon la règle du plan — tarif normal au premier mois,
 * remise fixe par mois au-delà — puis figé dans la facture. La fonction est
 * idempotente : rappelée sur une période déjà facturée, elle renvoie la
 * facture existante au lieu d'en créer une seconde.
 */
CREATE OR REPLACE FUNCTION public.issue_subscription_invoice(
  p_subscription_id UUID,
  p_user UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub RECORD;
  v_plan RECORD;
  v_months INT;
  v_monthly NUMERIC(12,2);
  v_discount NUMERIC(12,2);
  v_total NUMERIC(14,2);
  v_existing UUID;
  v_invoice UUID;
  v_currency VARCHAR(10);
BEGIN
  SELECT s.*, e.currency AS establishment_currency
    INTO v_sub
    FROM public.subscriptions s
    JOIN public.establishments e ON e.id = s.establishment_id
   WHERE s.id = p_subscription_id AND s.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Abonnement introuvable.';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_sub.plan_id;

  v_months := GREATEST(COALESCE(v_sub.duration_months, 1), 1);
  v_currency := COALESCE(v_sub.establishment_currency, 'KMF');

  SELECT id INTO v_existing
    FROM public.subscription_invoices
   WHERE subscription_id = p_subscription_id
     AND period_start = v_sub.start_date
     AND period_end = COALESCE(v_sub.end_date, v_sub.start_date)
     AND deleted_at IS NULL;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Règle tarifaire : à partir du seuil de durée, chaque mois bénéficie d'une
  -- remise fixe. En deçà, le tarif normal s'applique.
  IF v_months >= COALESCE(v_plan.discount_min_months, 2)
     AND COALESCE(v_plan.discount_per_month, 0) > 0 THEN
    v_monthly := GREATEST(0, COALESCE(v_plan.price_amount, 0) - v_plan.discount_per_month);
  ELSE
    v_monthly := COALESCE(v_plan.price_amount, 0);
  END IF;

  v_discount := (COALESCE(v_plan.price_amount, 0) - v_monthly) * v_months;
  v_total := v_monthly * v_months;

  INSERT INTO public.subscription_invoices (
    establishment_id, subscription_id, plan_name, period_start, period_end,
    duration_months, base_monthly_price, monthly_price, discount_amount,
    total_amount, currency, status, issued_on, due_on, created_by, updated_by
  ) VALUES (
    v_sub.establishment_id, p_subscription_id,
    COALESCE(v_plan.name, 'Formule'), v_sub.start_date,
    COALESCE(v_sub.end_date, v_sub.start_date),
    v_months, COALESCE(v_plan.price_amount, 0), v_monthly, v_discount,
    v_total, v_currency,
    -- Une formule gratuite est réglée d'office : laisser une facture à zéro en
    -- attente de règlement encombrerait les impayés sans raison.
    (CASE WHEN v_total = 0 THEN 'paid' ELSE 'issued' END)::public.billing_state,
    v_sub.start_date,
    -- BP09 : le règlement est attendu à l'ouverture de la période.
    v_sub.start_date + 30,
    p_user, p_user
  )
  RETURNING id INTO v_invoice;

  RETURN v_invoice;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_subscription_invoice(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_subscription_invoice(UUID, UUID) TO authenticated;

/*
 * Toute période souscrite est facturée.
 *
 * Le déclencheur couvre la souscription et le renouvellement : c'est le
 * changement de période qui fait naître la facture, quelle que soit la voie
 * d'écriture. L'échec est absorbé — ne pas pouvoir facturer ne doit pas
 * empêcher d'ouvrir un abonnement, et la facture reste émissible à la main.
 */
CREATE OR REPLACE FUNCTION public.invoice_subscription_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.end_date IS NULL OR NEW.status IN ('terminated', 'expired') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.start_date = NEW.start_date
     AND OLD.end_date IS NOT DISTINCT FROM NEW.end_date THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.issue_subscription_invoice(NEW.id, NEW.updated_by);
  EXCEPTION WHEN OTHERS THEN
    -- Absorbé, mais jamais silencieux : une facturation qui échoue sans laisser
    -- de trace se découvre des semaines plus tard, sur un état financier faux.
    RAISE WARNING 'Facturation de l''abonnement % impossible : %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_subscription_invoice ON public.subscriptions;
CREATE TRIGGER trig_subscription_invoice
  AFTER INSERT OR UPDATE OF start_date, end_date, plan_id ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.invoice_subscription_period();

/*
 * Passage en impayé.
 *
 * Une facture échue et non soldée devient « en retard ». Le calcul est fait à
 * la lecture plutôt que par un ordonnanceur : l'hébergement ne garantit pas
 * l'exécution d'une tâche planifiée, et une facture qui resterait « émise »
 * trois mois après son échéance fausserait tous les états.
 */
CREATE OR REPLACE FUNCTION public.refresh_overdue_invoices()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.subscription_invoices
     SET status = 'overdue', updated_at = NOW()
   WHERE deleted_at IS NULL
     AND status IN ('issued', 'partially_paid')
     AND due_on IS NOT NULL
     AND due_on < CURRENT_DATE
     AND paid_amount < total_amount;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_overdue_invoices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_overdue_invoices() TO authenticated;

-- ==========================================
-- 5. REPRISE DE L'EXISTANT
-- ==========================================
-- Les abonnements déjà souscrits reçoivent la facture de leur période en
-- cours : sans cela, l'écran financier s'ouvrirait vide sur une plateforme en
-- exploitation.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.subscriptions
     WHERE deleted_at IS NULL AND end_date IS NOT NULL AND status NOT IN ('terminated', 'expired')
  LOOP
    BEGIN
      PERFORM public.issue_subscription_invoice(r.id, NULL);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Reprise de facturation impossible pour l''abonnement % : %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ==========================================
-- 6. RÉFÉRENCES ET HORODATAGE
-- ==========================================
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_subscription_invoices AS BIGINT START 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_ref_subscription_payments AS BIGINT START 1;

DROP TRIGGER IF EXISTS trig_subscription_invoices_ref ON public.subscription_invoices;
CREATE TRIGGER trig_subscription_invoices_ref BEFORE INSERT ON public.subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-FSA-');

DROP TRIGGER IF EXISTS trig_subscription_payments_ref ON public.subscription_payments;
CREATE TRIGGER trig_subscription_payments_ref BEFORE INSERT ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.generate_module_ref('MORA-RSA-');

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['subscription_invoices', 'subscription_payments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trig_%s_updated ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trig_%s_updated BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- ==========================================
-- 7. HABILITATIONS (BP30)
-- ==========================================
/*
 * L'éditeur facture, l'établissement consulte.
 *
 * Le responsable voit les factures et les règlements de sa structure, sans
 * pouvoir les modifier : c'est MORA Shawiri qui encaisse, et une facture que
 * son destinataire pourrait marquer payée ne vaudrait rien.
 */
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['subscription_invoices', 'subscription_payments'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_super_admin', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL TO authenticated
        USING (public.is_super_admin())
        WITH CHECK (public.is_super_admin())
    $f$, t || '_super_admin', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_read_own', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT TO authenticated
        USING (
          public.is_establishment_admin()
          AND establishment_id = public.current_establishment_id()
        )
    $f$, t || '_read_own', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.subscription_invoices, public.subscription_payments TO authenticated;

COMMENT ON TABLE public.subscription_invoices IS
  'Factures d''abonnement SaaS (BP30). Le prix est figé à l''émission.';
COMMENT ON TABLE public.subscription_payments IS
  'Règlements des factures d''abonnement. Le montant réglé de la facture en est déduit.';
