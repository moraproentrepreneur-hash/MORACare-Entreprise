-- MORACare Enterprise - Correction de la contrainte sur les coordonnées GPS
-- Version: 2.7.1
--
-- La contrainte posée par 20260806000000 n'interdisait rien.
--
--   CHECK (
--     (latitude IS NULL AND longitude IS NULL)
--     OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
--   )
--
-- Avec une latitude nulle et une longitude renseignée :
--   - la première branche vaut FALSE ;
--   - la seconde vaut NULL, car `NULL BETWEEN -90 AND 90` vaut NULL ;
--   - FALSE OR NULL vaut NULL.
--
-- Or une contrainte CHECK n'est violée que lorsqu'elle vaut FALSE : un résultat
-- NULL laisse passer la ligne. Une demi-coordonnée était donc acceptée, alors
-- qu'une longitude sans latitude ne désigne aucun point.
--
-- La nouvelle formulation compare deux prédicats IS NULL, qui valent toujours
-- TRUE ou FALSE : le résultat ne peut plus être indéterminé.

ALTER TABLE public.establishments
  DROP CONSTRAINT IF EXISTS establishments_coordinates_check;

-- Les lignes déjà enregistrées avec une seule coordonnée sont ramenées à
-- « aucune coordonnée » : une valeur isolée n'est pas exploitable, et la
-- conserver empêcherait la contrainte de s'appliquer.
UPDATE public.establishments
   SET latitude = NULL, longitude = NULL
 WHERE (latitude IS NULL) <> (longitude IS NULL);

ALTER TABLE public.establishments
  ADD CONSTRAINT establishments_coordinates_check
  CHECK (
    -- Les deux ensemble, ou aucune des deux.
    (latitude IS NULL) = (longitude IS NULL)
    AND (
      latitude IS NULL
      OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
  );

COMMENT ON CONSTRAINT establishments_coordinates_check ON public.establishments IS
  'Coordonnées facultatives, mais indissociables : les deux ou aucune.';
