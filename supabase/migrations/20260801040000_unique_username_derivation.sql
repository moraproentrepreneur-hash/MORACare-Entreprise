-- MORACare Enterprise - Dérivation d'identifiant sans collision
-- Version: 2.3.0
-- Référence : BP26A, BP30 §6 (isolation des établissements)
--
-- PROBLÈME CORRIGÉ
--
-- `handle_new_auth_user` dérivait l'identifiant de la partie locale de l'adresse
-- e-mail : `admin@clinique-a.km` produisait `admin`. Or `profiles.username`
-- porte une contrainte UNIQUE globale.
--
-- Conséquence en production : le deuxième établissement qui crée un compte
-- `admin@…`, `contact@…` ou `reception@…` déclenchait une violation d'unicité,
-- et la création du compte échouait — avec une erreur opaque remontée par
-- l'API d'authentification. Le cas est certain dès le deuxième client SaaS.
--
-- CORRECTION
--
-- L'identifiant souhaité est conservé s'il est libre ; sinon un suffixe
-- numérique est ajouté jusqu'à obtenir une valeur disponible.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role     public.user_role_type;
  v_base     TEXT;
  v_username TEXT;
  v_suffix   INT := 1;
BEGIN
  -- Rôle demandé dans les métadonnées, sinon 'patient' (moindre privilège).
  BEGIN
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'patient')::public.user_role_type;
  EXCEPTION WHEN invalid_text_representation THEN
    v_role := 'patient';
  END;

  -- Identifiant souhaité : métadonnée explicite, sinon partie locale de l'e-mail.
  v_base := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'username', '')), '');
  IF v_base IS NULL THEN
    v_base := split_part(NEW.email, '@', 1);
  END IF;

  -- Normalisation : minuscules, caractères sûrs uniquement.
  v_base := lower(regexp_replace(v_base, '[^a-zA-Z0-9._-]', '', 'g'));
  IF v_base = '' THEN
    v_base := 'utilisateur';
  END IF;

  -- Résolution des collisions. La contrainte UNIQUE reste l'arbitre final :
  -- cette boucle évite l'échec, elle ne remplace pas la garantie.
  v_username := v_base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (
    id, username, email, first_name, last_name, phone, role, establishment_id, is_active
  )
  VALUES (
    NEW.id,
    v_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone',
    v_role,
    NULLIF(NEW.raw_user_meta_data->>'establishment_id', '')::UUID,
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Le trigger reste inchangé ; seule la fonction est remplacée.
DROP TRIGGER IF EXISTS trig_on_auth_user_created ON auth.users;
CREATE TRIGGER trig_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
