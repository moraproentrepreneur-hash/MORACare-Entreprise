-- MORACare Enterprise - Horodatages non nuls
-- Version: 2.2.0
-- Référence : TD02 §7 (colonnes standards obligatoires)
--
-- `created_at` et `updated_at` étaient déclarés `DEFAULT NOW()` sans contrainte
-- `NOT NULL`. Le défaut couvre les insertions ordinaires, mais rien n'empêchait
-- d'y écrire NULL explicitement — et la génération de types en tirait, à juste
-- titre, un `string | null` que toute l'application devait ensuite traiter.
--
-- TD02 §7 range ces colonnes parmi les colonnes obligatoires : une ligne sans
-- date de création n'est pas traçable. La contrainte est donc posée.
--
-- `deleted_at` reste nullable : c'est précisément son absence qui signale une
-- ligne vivante (TD02 §12).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.column_name IN ('created_at', 'updated_at')
      AND c.is_nullable = 'YES'
  LOOP
    -- Aucune ligne ne devrait être concernée sur une base neuve ; on sécurise
    -- malgré tout avant de poser la contrainte.
    EXECUTE format(
      'UPDATE public.%I SET %I = NOW() WHERE %I IS NULL',
      r.table_name, r.column_name, r.column_name
    );

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I SET NOT NULL',
      r.table_name, r.column_name
    );
  END LOOP;
END $$;

-- Contrôle : plus aucun horodatage nullable parmi les colonnes standards.
DO $$
DECLARE
  v_remaining TEXT;
BEGIN
  SELECT string_agg(c.table_name || '.' || c.column_name, ', ')
  INTO v_remaining
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name IN ('created_at', 'updated_at')
    AND c.is_nullable = 'YES';

  IF v_remaining IS NOT NULL THEN
    RAISE EXCEPTION 'Horodatages encore nullables : %', v_remaining;
  END IF;
END $$;
