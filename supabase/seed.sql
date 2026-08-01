-- MORACare Enterprise - Amorçage de la base
--
-- Ce fichier ne crée volontairement AUCUN compte.
--
-- La version précédente insérait directement dans auth.users un mot de passe
-- écrit en clair dans le dépôt. Deux problèmes :
--   1. CLAUDE.md § Authentification : « Les identifiants du Super Admin ne
--      doivent jamais être affichés publiquement. »
--   2. Écrire dans auth.users contourne Supabase Auth (hachage, confirmation
--      d'e-mail, métadonnées, identités) et produit des comptes incohérents.
--
-- Le compte Super Admin se crée désormais par l'API d'administration, via :
--
--   SUPERADMIN_EMAIL=...  SUPERADMIN_PASSWORD=...  npm run seed:superadmin
--
-- Le profil applicatif est créé automatiquement par le trigger
-- trig_on_auth_user_created (migration 20260730120000_security_hardening.sql).
--
-- Conformément à la règle projet, la base ne contient aucune donnée de
-- démonstration : zéro patient, zéro établissement, zéro dossier factice.

DO $$
BEGIN
  RAISE NOTICE 'seed.sql : aucun compte créé. Utilisez `npm run seed:superadmin`.';
END $$;
