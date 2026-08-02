# RAPPORT FINAL — Connexion Supabase, validation et publication GitHub

**Date :** 1er août 2026
**Statut :** terminé. Code poussé sur GitHub, aucun déploiement effectué.

---

## 1. Migrations exécutées

Les migrations ont été appliquées sur le projet Supabase réel `oolaiauhhrfgncjpxucx` (« MORACare Enterprise »), via l'API de management. La base était **entièrement vide** avant l'opération : aucune table, aucun compte — vérifié avant toute écriture.

| # | Migration | Contenu |
|---|---|---|
| 1 | `20260730000000_init_moracare.sql` | Schéma initial, 16 tables |
| 2 | `20260730120000_security_hardening.sql` | Politiques RLS, séquences, triggers, index |
| 3 | `20260730130000_missing_business_tables.sql` | 8 tables métier manquantes |
| 4 | `20260801000000_saas_referential.sql` | Référentiel, abonnements, licences, permissions |
| 5 | `20260801010000_saas_referential_seed.sql` | 16 modules, 5 formules, 57 permissions |
| 6 | `20260801020000_plan_pricing_and_limits.sql` | Tarifs officiels KMF, configuration des formules |
| 7 | `20260801030000_not_null_timestamps.sql` | **Correction** — horodatages non nuls |
| 8 | `20260801040000_unique_username_derivation.sql` | **Correction** — collision d'identifiants |

Un registre `migrations.schema_migrations` trace les versions appliquées, hors du schéma `public` pour ne pas être exposé par l'API.

**État final de la base :** 34 tables, 52 politiques RLS, 16 modules, 5 formules, 57 permissions, 1 profil (le Super Admin), 0 établissement, 0 patient. Aucune donnée fictive.

---

## 2. Corrections réalisées

Trois défauts ont été découverts **parce que le code s'est exécuté sur une vraie base**. Aucun n'aurait été visible autrement.

### 2.1 Registre de migrations exposé par l'API

La table de suivi créée dans `public` héritait de l'activation automatique de RLS par Supabase, sans politique — donc inaccessible, mais visible dans le schéma exposé par PostgREST. Déplacée dans un schéma `migrations` dédié, sans aucun privilège pour `anon` ni `authenticated`.

### 2.2 Horodatages nullables

`created_at` et `updated_at` étaient `DEFAULT NOW()` sans `NOT NULL`. La génération de types en tirait, à raison, un `string | null` qui produisait **21 erreurs TypeScript**. TD02 §7 range ces colonnes parmi les colonnes obligatoires : la contrainte a été posée sur les 60 colonnes concernées, et les 21 erreurs ont disparu.

### 2.3 Collision d'identifiants — le défaut le plus sérieux

Le trigger de création de profil dérivait l'identifiant de la partie locale de l'adresse e-mail : `admin@clinique-a.km` produisait `admin`. Or `profiles.username` porte une contrainte `UNIQUE` **globale**.

Conséquence en production : **le deuxième établissement qui aurait créé un compte `admin@…`, `contact@…` ou `reception@…` aurait échoué**, avec une erreur opaque remontée par l'API d'authentification. Sur une plateforme multi-établissements, le cas était certain dès le deuxième client.

La fonction résout désormais les collisions en suffixant l'identifiant jusqu'à obtenir une valeur libre.

---

## 3. Validation de la connexion Supabase

- Projet joignable, token de management valide.
- 8 migrations appliquées sans erreur.
- **18 contrôles de schéma concluants** (`npm run db:verify`) : aucune table sans RLS, aucune table RLS sans politique, toutes les fonctions `SECURITY DEFINER` avec `search_path` figé, journal d'audit sans politique `UPDATE` ni `DELETE`.
- Types TypeScript **régénérés depuis le schéma réel** (`database.generated.ts`, 2 817 lignes) — `tsc` passe sans erreur.

---

## 4. Validation de l'authentification

Testée avec de vrais appels Supabase Auth, pas simulée :

- Compte Super Admin créé (`admin@morashawiri.com`), mot de passe fort généré.
- **Connexion réelle réussie**, jeton JWT obtenu.
- Profil applicatif **créé automatiquement par le trigger**, rôle `super_admin` attribué, aucun rattachement à un établissement.
- 8 comptes supplémentaires créés (1 Responsable + 7 Personnels : médecin, infirmier, réception, pharmacien, laboratoire, comptable, médecin d'un second établissement), chacun connecté avec succès.

Le mot de passe du Super Admin est dans `.superadmin-credentials.local`, **exclu du dépôt**. Il n'est affiché nulle part, conformément à CLAUDE.md § Authentification.

---

## 5. Validation des permissions

Vérifiée avec les jetons réels de chaque rôle, donc avec RLS effectivement appliquée par PostgreSQL :

- Le médecin crée des consultations, consulte la pharmacie sans la modifier, n'accède pas à la gestion des utilisateurs.
- Le comptable accède à la finance, pas aux consultations.
- **Le Super Admin n'a aucun accès aux 7 modules cliniques** (BP06 §10 bis, UG01 §1) — vérifié module par module.
- Un médecin n'accède pas au journal d'audit ; le Responsable si.
- Le journal d'audit **refuse la modification et la suppression**, y compris au Responsable : 0 ligne affectée dans les deux cas.

---

## 6. Validation du multi-tenant

Le point le plus critique, testé avec deux établissements distincts :

| Vérification | Résultat |
|---|---|
| Le médecin A ne voit que les patients de A | 1 patient, le bon |
| Le médecin B ne voit que les patients de B | 1 patient, le bon |
| Écriture de A vers l'établissement B | **refusée par la clause `WITH CHECK`** |
| Un utilisateur ne voit que son établissement | 1 seul établissement visible |

L'isolation exigée par TD06 §8, BP09 §2 et BP30 BR-286 est donc effective au niveau de PostgreSQL, indépendamment de l'interface.

**Abonnements et licences** : abonnement `MORA-ABO-000001` créé sur la formule Business à 10 000 KMF, historisation automatique par trigger vérifiée à la création puis au changement de statut ; licence `MORA-LIC-000001` créée, et le duplicata correctement refusé (BR-008).

**Modules** : référentiel de 16 modules lisible, 4 modules essentiels marqués non désactivables, désactivation enregistrée et visible, composition du plan Business à 14 modules.

Les données de test ont été supprimées après validation : la base ne contient que le Super Admin et le référentiel.

---

## 7. Contrôles qualité

| Contrôle | Résultat |
|---|---|
| `npm run build` | **passe** — 26 routes |
| `tsc --noEmit` | **passe** — 0 erreur |
| `next lint` | **passe** — 0 avertissement |
| `npm test` | **60 tests passés / 60** |
| Migrations sur base réelle | **8 appliquées, 0 échec** |
| Types régénérés | **oui**, depuis le schéma réel |
| Validation fonctionnelle | **31 vérifications concluantes** |

---

## 8. Publication GitHub

| | |
|---|---|
| **Dépôt** | `moraproentrepreneur-hash/MORACare-Entreprise` |
| **Branche** | `main` |
| **Commit SHA** | `044c60d6d3ece9a05cb8954867125571e37d6bbd` |
| **SHA court** | `044c60d` |
| **Fichiers** | 197 |
| **Distant = local** | confirmé |

### Aucun secret versionné

Le contrôle a porté sur l'index git lui-même, pas sur le système de fichiers :

- `sb_secret_` — absent
- `sbp_…` (jeton Supabase) — absent
- `sb_publishable_` — absent
- Référence du projet `oolaiauhhrfgncjpxucx` — absente
- `.env.local` et `.superadmin-credentials.local` — **non suivis**, confirmés ignorés
- Le jeton GitHub **n'a pas été enregistré** dans `.git/config` : utilisé une seule fois, il ne subsiste pas sur le disque

`.gitignore` a été renforcé : `.env.*` (sauf `.env.example`), `*.local`, `*.pem`, `*.key`, `.supabase/`, `coverage/`.

L'ancien mot de passe compromis, qui figurait encore en clair dans les rapports d'audit des phases 1 et 3, a été **rédigé** avant le commit.

---

## 9. Points de sécurité à traiter de votre côté

**Le jeton Supabase `sbp_…` doit être révoqué.** Il a transité par notre conversation et donne le contrôle de **l'ensemble de votre compte Supabase** — vos deux projets, pas seulement celui-ci. À révoquer sur https://supabase.com/dashboard/account/tokens

**Le jeton GitHub `github_pat_…` doit également être révoqué** maintenant que le push est fait : https://github.com/settings/personal-access-tokens

**Le mot de passe du Super Admin** se trouve dans `.superadmin-credentials.local` à la racine du projet. Récupérez-le, changez-le à la première connexion, puis supprimez le fichier.

---

## 10. Le dépôt est-il prêt pour Vercel ?

**Oui, techniquement.** Le build passe, aucun secret n'est versionné, `.env.example` documente les variables attendues. Il suffira de renseigner dans Vercel :

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**Aucun déploiement n'a été effectué**, conformément à votre consigne.

Une réserve, que je dois signaler plutôt que la taire : le socle est solide et vérifié, mais le produit reste **incomplet fonctionnellement**. Restent à développer, comme indiqué au rapport de Phase 6 : les workflows métiers complets (prescription vers pharmacie, décrémentation de stock, facturation automatique, archivage), sept modules absents (Urgences, Bloc opératoire, Achats, Stock, Notifications, Messagerie, Interopérabilité), l'internationalisation français/anglais, et les modèles PDF.

Un déploiement Vercel sur ce commit donnerait une plateforme **sûre et fonctionnelle sur son périmètre**, mais pas encore utilisable en production par un établissement de santé.

---

**Aucune autre action n'a été réalisée après le push.**
