-- MORACare Enterprise - Montant remis par le client (BP19 §10, BP22B)
-- Version: 3.9.0
--
-- Le reçu portait le montant encaissé, mais pas celui que le client avait
-- remis : impossible d'y vérifier la monnaie rendue. Le comptoir devait poser
-- la soustraction de tête, et le client la refaire sur un ticket qui ne la
-- mentionnait pas.
--
-- La colonne enregistre ce qui a été donné. L'encaissé et la monnaie s'en
-- déduisent, et n'ont donc pas à être saisis — ni stockés deux fois.

ALTER TABLE public.dispensations
  ADD COLUMN IF NOT EXISTS tendered_amount NUMERIC(14,2)
    CHECK (tendered_amount IS NULL OR tendered_amount >= 0);

COMMENT ON COLUMN public.dispensations.tendered_amount IS
  'Montant remis par le client. La monnaie rendue vaut tendered_amount - total_amount.';

/*
 * Le montant remis couvre au moins ce qui est encaissé.
 *
 * Encaisser davantage que ce qui a été donné n'a pas de sens : la caisse serait
 * en déficit d'un écart que rien n'expliquerait.
 */
DO $$ BEGIN
  ALTER TABLE public.dispensations
    ADD CONSTRAINT dispensations_tendered_covers_paid
    CHECK (tendered_amount IS NULL OR tendered_amount >= paid_amount);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

/*
 * On n'encaisse jamais plus que ce qui est dû.
 *
 * Au-delà du total, la différence est de la monnaie à rendre, pas une recette.
 * Sans ce contrôle, un montant donné saisi dans le champ « encaissé » gonflait
 * le chiffre d'affaires du jour.
 */
DO $$ BEGIN
  ALTER TABLE public.dispensations
    ADD CONSTRAINT dispensations_paid_not_over_total
    CHECK (paid_amount <= total_amount + 0.01);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
