# RAPPORT D'AUDIT DE CONFORMITÉ — MORACare Enterprise

**Phases 1 & 2** (Audit complet + Rapport de conformité), conformément à `CLAUDE.md` § Méthode de travail
**Date :** 30 juillet 2026
**Auteur :** Lead Software Architect / Technical Reviewer
**Statut du code :** aucune modification effectuée. Ce document est un livrable d'analyse.

---

## 1. Périmètre analysé

### 1.1 Documentation normative — 61 fichiers, lus intégralement

| Dossier | Fichiers | Couverture |
|---|---|---|
| `Blueprints (BP)` | 41 (BP01 → BP31, dont 22A/B/C, 23A/B/C, 24A/B, 26A/B, 27A/B, 28A/B/C) | intégrale |
| `Landing Page Officielle` | 1 (LP-001 v1.0, statut VALIDÉ) | intégrale, transcrite mot à mot |
| `Technical Documents (TD)` | 8 (TD01 → TD08) | intégrale |
| `User Guides (UG)` | 12 (UG01 → UG12) | intégrale |

### 1.2 Code source — 28 fichiers, lus intégralement

`src/app/` (3), `src/components/` (18), `src/context/` (2), `src/lib/` (2), `src/types/` (1), plus `supabase/migrations/20260730000000_init_moracare.sql`, `supabase/seed.sql`, `scripts/seed-superadmin.ts`, `package.json`, `tsconfig.json`, `tailwind.config.js`, `next.config.js`, `.env.local`, `.gitignore`.

### 1.3 Ce qui n'a pas pu être analysé

- **Aucune exécution réelle contre une base Supabase** : `.env.local` ne contient que des valeurs factices (`https://mock-moracare.supabase.co`, `mock-service-key`). La migration n'a donc jamais été appliquée ni testée.
- **Aucun historique Git** : le dossier n'est pas un dépôt Git. Impossible d'analyser l'évolution ou d'attribuer les régressions.
- **Aucun test** : le projet ne contient aucun fichier de test et aucune dépendance de test.

---

## 2. Synthèse exécutive

> **Verdict : le dépôt est une maquette de démonstration, pas une application. Il ne compile pas, ne se connecte à aucune base de données, et son authentification est un mot de passe écrit en clair dans le code envoyé au navigateur. Il n'est ni déployable, ni utilisable, ni conforme.**

Quatre constats structurants, tous vérifiés par commande reproductible (§ 8) :

**1. Le projet ne compile pas.** `npx tsc --noEmit` remonte deux erreurs dans `src/app/page.tsx`. `next build` échoue donc en l'état. C'est le point de départ obligatoire de toute reprise.

**2. L'application ne parle jamais à Supabase.** `src/lib/supabase.ts` est le seul fichier qui importe le SDK, et **aucun fichier ne l'importe**. Il n'existe dans tout `src/` aucun `.from()`, aucun `.insert()`, aucun `.select()`. Le socle technique exigé par TD01 §3 et TD05 est présent dans le `package.json` et absent du produit.

**3. Les données de santé sont stockées dans le navigateur.** `src/context/DataContext.tsx` persiste patients, consultations, prescriptions, hospitalisations et factures dans `localStorage`. Conséquences directes : les données sont propres à un poste et à un navigateur, deux utilisateurs ne voient jamais les mêmes données, rien n'est sauvegardé, et l'isolation entre établissements — garantie contractuellement au client par BP09 et UG02 §21 — n'existe pas.

**4. La sécurité est déclarative, pas effective.** L'écran de connexion affiche « Protégé par Supabase Auth & Row Level Security » (`LoginForm.tsx:118`) et le module Paramètres affiche « RLS ACTIF (Isolement par establishment_id) » (`SettingsModule.tsx:276`). Ces deux affirmations sont fausses : l'authentification est une comparaison de chaînes en dur côté client, et 13 tables ont RLS activé sans aucune politique.

### Conformité estimée par domaine

| Domaine | Conformité | Commentaire |
|---|---|---|
| Landing Page — structure | **~90 %** | Les 12 sections de LP-001 §6 sont présentes, dans l'ordre, avec les titres littéraux |
| Landing Page — charte | ~30 % | Thème sombre au lieu du fond blanc imposé ; police Inter non chargée |
| Modèle de données (SQL) | ~35 % | 16 tables sur ~40 nécessaires ; divergences avec les types TypeScript |
| Authentification | **~5 %** | Mot de passe en dur, aucune session serveur, aucun MFA |
| Sécurité / RLS | **~10 %** | 2 tables couvertes sur 15 ; fonction `SECURITY DEFINER` non sécurisée |
| Multi-tenant | **0 %** | `establishment_id` codé en dur à `'est-001'` dans 10 fichiers |
| Permissions / rôles | **~2 %** | 3 tests `role === 'super_admin'` ; aucune matrice, aucun menu par permission |
| Routage | **0 %** | Une seule route ; TD04 §9 en impose 9 |
| Modules métier | ~25 % | Interfaces plausibles, aucune persistance réelle, workflows absents |
| i18n (FR/EN) | **0 %** | Tous les libellés en dur, alors que BR-246 l'interdit explicitement |
| Tests (TD08) | **0 %** | Aucun test, aucun outil |
| PWA / accessibilité | **0 %** | Non implémentés |

---

## 3. Écarts classés par priorité

### P0 — Bloquants : le produit ne fonctionne pas, ou la sécurité est compromise

**P0-01 — Le build échoue (2 erreurs TypeScript)**
`src/app/page.tsx:26` déstructure `loading`, alors que `AuthContext` expose `isLoading`.
`src/app/page.tsx:117` passe la prop `activeTab` à `<Header>`, qui déclare `title` (`Header.tsx:7-9`).
*Effet :* `next build` échoue ; aucun déploiement n'est possible. Par ailleurs, même corrigé, l'écran de chargement ne s'afficherait jamais, `loading` valant toujours `undefined`.

**P0-02 — Identifiants Super Admin en dur dans le bundle client**
`src/context/AuthContext.tsx:36-38` compare l'identifiant à `'«identifiant rédigé»'` et le mot de passe à `'«mot de passe rédigé»'`. Ce fichier porte la directive `'use client'` : les deux chaînes sont livrées en clair dans le JavaScript téléchargé par **tout visiteur**, connecté ou non.
*Effet :* n'importe qui peut lire le mot de passe administrateur de la plateforme dans les outils de développement du navigateur.

**P0-03 — Les identifiants sont en plus affichés à l'écran**
`src/context/AuthContext.tsx:64` renvoie le message : « *Pour le premier accès Super Admin, utilisez : «identifiants rédigés»* », que `LoginForm.tsx:62` affiche à toute personne se trompant de mot de passe.
*Effet :* violation directe et littérale de `CLAUDE.md` § Authentification — « Les identifiants du Super Admin ne doivent jamais être affichés publiquement ». Le même mot de passe est également journalisé en clair par `scripts/seed-superadmin.ts:61`.

**P0-04 — Aucune intégration Supabase**
Deux recherches exhaustives sur `src/` le confirment sans ambiguïté : aucun fichier n'importe `@/lib/supabase` (zéro résultat), et la recherche de tout appel au SDK (`.from(`, `.insert(`, `.select(`, `supabase.`) ne remonte **qu'une seule occurrence, qui est un faux positif** — le `.co` de l'URL factice `https://mock-moracare.supabase.co` en ligne 3 du fichier de configuration lui-même.
*Effet :* le client Supabase est créé et n'est jamais utilisé. Aucune donnée n'est lue ni écrite en base. Toutes les fonctionnalités affichées sont des façades.

**P0-05 — Données de santé persistées en `localStorage`**
`src/context/DataContext.tsx` (15 clés `moracare_*`) et `src/context/AuthContext.tsx:22` (session).
*Effet :* données non partagées, non sauvegardées, non chiffrées, non isolées, et lisibles par tout script s'exécutant sur la page. Incompatible avec TD06 § Protection des données et avec la nature médicale des données.

**P0-06 — 13 tables ont RLS activé sans aucune politique**
Dans `supabase/migrations/20260730000000_init_moracare.sql` : 15 instructions `ENABLE ROW LEVEL SECURITY` pour seulement 3 `CREATE POLICY`, couvrant 2 tables (`profiles`, `patients`).
Tables activées **sans aucune politique** : `establishments`, `appointments`, `consultations`, `prescriptions`, `hospitalizations`, `pharmacy_items`, `lab_orders`, `imaging_orders`, `invoices`, `payments`, `employees`, `audit_logs`, `notifications`.
*Effet :* PostgreSQL refuse par défaut tout accès à une table dont RLS est actif et qui n'a aucune politique. Le jour où l'application sera branchée, ces 13 tables renverront systématiquement **zéro ligne, sans message d'erreur**. C'est le piège le plus coûteux du projet : la panne sera silencieuse et se manifestera comme « les données ne s'affichent pas ».

**P0-07 — `system_settings` sans RLS**
La table est créée (ligne 335) mais ne figure pas dans le bloc d'activation RLS. Sur les 16 tables créées, c'est la seule dans ce cas.
*Effet :* incohérence de sécurité ; table potentiellement lisible et modifiable en travers des établissements.

**P0-08 — `is_super_admin()` en `SECURITY DEFINER` sans `search_path` figé**
Migration ligne 365-373. Une fonction `SECURITY DEFINER` s'exécute avec les droits de son propriétaire ; sans `SET search_path = ''`, elle est vulnérable à un détournement par un schéma malveillant placé en tête de chemin.
*Effet :* escalade de privilèges possible. C'est un durcissement standard et explicitement recommandé par Supabase.

**P0-09 — Références métier générées par `RANDOM()` sur une colonne `UNIQUE`**
`generate_business_ref()` (ligne 383-408) tire un nombre aléatoire à 6 chiffres et l'écrit dans `business_reference`, déclarée `UNIQUE NOT NULL` sur chaque table.
*Effet double :*
1. **Fonctionnel :** TD02 §8 exige des références « uniques ; **séquentielles** ; non modifiables ; permanentes ». Une valeur aléatoire n'est pas séquentielle.
2. **Technique :** sur 900 000 valeurs possibles, les collisions apparaissent statistiquement dès quelques centaines d'enregistrements (paradoxe des anniversaires) et provoqueront des échecs d'insertion en production, sans reprise possible puisque le trigger ne retente pas.

### P1 — Conformité fonctionnelle majeure

**P1-01 — Le multi-tenant n'existe pas**
`establishment_id: 'est-001'` est écrit en dur dans **10 fichiers** : les 9 modules métier plus `SuperAdminHub.tsx`.
*Effet :* tous les enregistrements appartiennent au même établissement fictif. L'isolation promise par BP09, TD02 §14 et UG02 §21 (« *Puis-je consulter les données d'une autre clinique ? Non.* ») n'est pas implémentée.

**P1-02 — Le module Paramètres ne pilote rien**
`CLAUDE.md` en fait le poste de commande de l'application. Or `SettingsModule.tsx:49-60` déclare son **propre** `useState` local `activeModules` et **n'importe jamais `useData`** (vérifié). Le `Sidebar`, lui, lit `activeModules` depuis `DataContext` (`Sidebar.tsx:31`).
*Effet :* les interrupteurs de la page Paramètres ne produisent **aucun effet visible**. Ils modifient un état local détruit au changement d'onglet. La cascade exigée est donc réalisée à un tiers seulement :

| Effet exigé (`CLAUDE.md`) | État réel |
|---|---|
| Disparition du menu | Partiel — le code existe (`Sidebar.tsx:53-63`) mais est piloté par un état que Paramètres ne touche pas |
| Disparition du tableau de bord | **Absent** |
| Inaccessible par URL | **Sans objet** — il n'existe aucune URL (voir P1-04) |
| Permissions suspendues | **Absent** — il n'existe aucun système de permissions |
| Statistiques associées masquées | **Absent** |

À noter : un troisième jeu d'interrupteurs de modules existe dans `SuperAdminHub.tsx:248`, également déconnecté. Trois sources de vérité concurrentes pour la même notion.

**P1-03 — Aucun système de permissions**
Recherche exhaustive : 3 occurrences de `role === 'super_admin'` dans tout le code (`page.tsx:34`, `page.tsx:109`, `Header.tsx:60`, plus `Sidebar.tsx:33`). Aucune matrice rôle × module × action, aucun `usePermissions()` (pourtant nommé par TD04 §12), aucun contrôle serveur.
*Effet :* les 10 rôles déclarés dans `src/types/index.ts:3-13` n'ont **aucune différence de comportement**. Un infirmier, un comptable et un médecin voient exactement la même application. BP06 §8 (« *un utilisateur ne voit jamais un module auquel il n'a pas accès* ») et BP26A ne sont pas implémentés.
L'onglet « Rôles & Permissions » (`SettingsModule.tsx:229-242`) affiche 8 cartes portant l'étiquette « Droits configurés » sans qu'aucun droit n'existe.

**P1-04 — Aucun routage**
L'application entière est une route unique, `src/app/page.tsx`, avec navigation par `useState<string>('activeTab')`.
*Effet :* TD04 §9 impose 9 routes (`/`, `login`, `dashboard`, `patients`, `patients/:id`, `consultations`, `appointments`, `finance`, `settings`) et TD04 §10 impose 5 layouts (`PublicLayout`, `DashboardLayout`, `AuthLayout`, `PortalLayout`, `AdminLayout`). Aucun n'existe. Aucune page n'est partageable par lien, aucun retour arrière navigateur ne fonctionne, et l'exigence « inaccessible par URL » est vide de sens. Par ailleurs, `CLAUDE.md` exige des espaces « totalement indépendants » (Super Admin / Responsable / Personnel) : ils partagent ici le même `Sidebar`, le même `Header` et le même conteneur.

**P1-05 — Les établissements créés par le Super Admin sont fictifs**
`SuperAdminHub.tsx:32` initialise la liste des établissements dans un `useState` local pré-rempli.
*Effet :* la création d'un établissement client — cœur du métier SaaS selon BP30 et UG01 §5-6 — est perdue au rafraîchissement et invisible du reste de l'application.

**P1-06 — Le formulaire de démonstration ne persiste rien**
`LandingPage.tsx:57-65` : `handleDemoSubmit` affiche un message de succès puis réinitialise le formulaire. Aucun envoi, aucun enregistrement.
*Effet :* le message affiché à l'utilisateur — « *Demande enregistrée avec succès ! Un conseiller va vous contacter sous 24h* » (ligne 647-648) — est faux. BP05 §3.2 exige la création d'une demande dans le module « Demandes d'inscription » du Super Admin ; UG01 §5 exige que ce dernier puisse la traiter. La chaîne de conversion commerciale, seul objectif de la Landing Page selon LP-001 §3, est rompue.

**P1-07 — Saisie libre là où une relation existe**
Le composant `PatientSelect` est correctement utilisé dans 6 modules — c'est un point positif. En revanche le médecin est saisi librement : `doctor_name: form.doctor_name` avec `doctor_id: 'doc-001'` figé (ex. `AppointmentsModule.tsx:43-44`, valeur par défaut `'Dr. Rachade SuperAdmin'` ligne 57). Même schéma dans les autres modules.
*Effet :* violation de `CLAUDE.md` § Interconnexion — « Aucune saisie libre lorsqu'une relation existe déjà ». Le lien vers `profiles` n'est jamais réel.

**P1-08 — Données fictives codées en dur dans l'interface de production**
`SettingsModule.tsx:38-46` pré-remplit « Clinique de la Paix », son adresse, son téléphone et son email. `SettingsModule.tsx:215-221` affiche une ligne utilisateur `MORA-SA-000001 / rachade` en dur dans le tableau des comptes.
*Effet :* un établissement client verrait les coordonnées d'un autre établissement dans ses propres paramètres.

### P2 — Écarts de modèle de données

**P2-01 — Divergences entre `src/types/index.ts` et la migration SQL**

| Type TypeScript | Champ | État en base |
|---|---|---|
| `UserProfile` | `department` | **absent** de la table `profiles` |
| `Employee` | `full_name`, `phone`, `email`, `diploma` | **absents** ; la table porte `profile_id` |
| `Invoice` | `items` (lignes de facture) | **aucune colonne, aucune table de lignes** |
| `Invoice` | `insurance_coverage_amount` | **absent** |
| `Appointment`, `Consultation`, etc. | `patient_name`, `doctor_name` | dénormalisés en TypeScript, absents en base (à résoudre par jointure) |

*Effet :* le jour du branchement, ces écritures échoueront ou perdront des données. Le cas le plus grave est celui des lignes de facture : le module Finance les collecte dans l'interface et **elles n'ont aucun endroit où être stockées**.

**P2-02 — Tables absentes malgré des types et des écrans existants**
`FinancialQuote` (devis), `CashRegister`, `CashMovement`, `CashClosure`, `ShiftSchedule`, `PayrollSlip` sont définis dans `src/types/index.ts` et pilotent des écrans complets dans `FinanceModule.tsx` (22,5 Ko) et `HRModule.tsx` (21 Ko) — **sans aucune table correspondante**. S'y ajoutent : lignes de facture, documents GED, abonnements, licences, modules, demandes d'inscription, services/départements, rôles et permissions.
*Bilan :* 16 tables existent pour un besoin estimé à une quarantaine au minimum.

**P2-03 — Colonnes standards TD02 §7 non systématiques**
TD02 §7 impose 8 colonnes sur *toutes* les tables métier (`id`, `business_reference`, `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `establishment_id`). `notifications` et `system_settings` ne les portent pas. `payments` n'a ni `created_by` ni `updated_by`.

**P2-04 — Soft delete déclaré mais jamais utilisé**
La colonne `deleted_at` existe presque partout, conformément à TD02 §12, mais **aucune requête ne la filtre** et aucun `updated_at` n'est maintenu par trigger — alors que TD05 §9 exige explicitement un trigger de mise à jour de `updated_at`. Seul le trigger de référence métier existe.

**P2-05 — Aucun index créé**
TD02 §16 impose des index sur les clés étrangères, les références métier, les dates et les colonnes de filtrage. La migration n'en crée **aucun**, hors ceux induits par les contraintes `PRIMARY KEY` et `UNIQUE`.

### P3 — Modules et exigences transverses absents

**P3-01 — Modules absents**
Face aux 16 modules annoncés par la Landing Page (LP-001 §6 section 5) et aux 18 domaines de TD02 §4 :
Urgences · Bloc opératoire · Achats & Approvisionnements (BP17) · Stock & Inventaire (BP18) · Rapports & Impressions (BP24A) · Tableaux de bord & BI (BP24B) · Portail Patient (BP29) · Notifications (BP27A) · Messagerie · Interopérabilité & API (BP27B) — **tous absents**.
`GEDModule.tsx` est un fichier de 1,6 Ko, soit un simple libellé.
*Point d'attention commercial :* la Landing Page promet publiquement ces 16 modules à des prospects. L'écart entre la promesse et le produit est important.

**P3-02 — Internationalisation absente**
BP28A BR-244 impose exactement deux langues (français, anglais) ; **BR-246 énonce que « aucun texte fonctionnel ne doit être codé directement dans l'interface »** ; TD04 §20 le répète.
*État :* la totalité des libellés est écrite en dur dans les composants. Aucun catalogue, aucune librairie i18n installée.

**P3-03 — Exigences techniques transverses non implémentées**
PWA (TD01 §9, TD04 §24) · accessibilité WCAG (TD04 §19) · lazy loading et code splitting (TD04 §22) · génération PDF systématique archivée en GED (TD01 §13 — `jspdf` est installé et `src/lib/utils.ts` amorce un en-tête, mais rien n'est archivé) · journal d'audit alimenté (la table `audit_logs` existe, **aucun code ne l'écrit**) · Realtime, Storage et Edge Functions (TD05) — aucun.

**P3-04 — Aucun test**
TD08 impose une stratégie de tests complète. Le projet ne contient aucun test et aucune dépendance de test (`package.json`). Couverture : 0 %.

**P3-05 — Architecture en couches non respectée**
TD04 §13 est explicite : « **Les composants ne doivent jamais appeler directement Supabase.** » TD01 §11 : « La logique métier ne doit jamais être directement intégrée aux composants d'affichage. »
*État :* il n'existe ni dossier `services/`, ni `hooks/`, ni `features/`. Toute la logique métier (calculs financiers, génération de références, règles de gestion) est écrite dans les composants de rendu. `FinanceModule.tsx` et `HRModule.tsx` dépassent 20 Ko chacun.

---

## 4. Conformité par domaine et par espace

### 4.1 Landing Page — le point le plus conforme du projet

**La structure est fidèle.** Les 12 sections de LP-001 §6 sont présentes, dans l'ordre, avec les titres littéraux :

| § | Section | Titre attendu | État |
|---|---|---|---|
| 1 | Hero | « Pilotez votre établissement de santé avec une seule plateforme. » | conforme (`LandingPage.tsx:194`) |
| 2 | Chiffres clés | 6 items | conforme |
| 3 | Problème | « Votre établissement mérite mieux que des outils dispersés. » | conforme (ligne 305) |
| 4 | Solution | « Une seule plateforme pour tout gérer. » | conforme (ligne 364) |
| 5 | Modules | 16 cartes | conforme |
| 6 | Pourquoi | 12 avantages | conforme |
| 7 | Profils | 3 cartes, sans prix | conforme |
| 8 | Démarrage | 5 étapes | conforme |
| 9 | Sécurité | 8 éléments | conforme |
| 10 | FAQ | 10 à 15 questions | conforme — 12 questions |
| 11 | CTA final | « Prêt à transformer la gestion de votre établissement ? » | conforme (ligne 576) |
| 12 | Footer | logo, présentation, liens, réseaux | conforme |

**Trois écarts seulement :**
1. **Charte graphique inversée.** LP-001 §5 impose fond blanc `#FFFFFF` et fond alterné gris clair `#F5F7FA`. La page est rendue en sombre (`slate-950`). *Bonne nouvelle :* `src/app/globals.css:6-36` définit **déjà** un thème clair complet avec les couleurs exactes de LP-001 (`--primary: #003366`, `--secondary: #00A859`, `--accent: #FFD700`). Ce thème est simplement neutralisé par `layout.tsx:22` qui force `className="dark"` sur `<html>` et par `body` qui code en dur `bg-slate-950`. La correction est donc bien moins coûteuse qu'il n'y paraît.
2. **Police Inter non chargée.** LP-001 §5 l'impose pour les titres et le texte. Aucun `next/font`, aucun `@import` : le navigateur applique la police système.
3. **Formulaire non persisté** (voir P1-06).

Non vérifiable en analyse statique : le seuil « Lighthouse > 95 » (LP-001 §8), seule métrique chiffrée de toute la documentation.

### 4.2 Les quatre espaces exigés

`CLAUDE.md` exige des espaces « totalement indépendants ».

| Espace | Exigence | État |
|---|---|---|
| Landing Page | visiteurs uniquement, aucune fonctionnalité interne | **conforme** |
| Super Admin | interface « totalement différente », jamais partagée | **non conforme** — `SuperAdminHub` est un onglet parmi d'autres, dans le même `Sidebar` et le même `Header` que les établissements |
| Responsable d'établissement | tableau de bord, statistiques, utilisateurs, paramètres propres | **absent** — aucun espace distinct, aucun tableau de bord |
| Personnel | menus générés dynamiquement selon les permissions | **absent** — menu identique pour les 10 rôles |

Aucun tableau de bord n'existe d'ailleurs pour aucun rôle, alors que UG01 §4, UG02 §4 et UG03 §4 en décrivent le contenu précis. L'onglet par défaut après connexion est la liste des patients (`page.tsx:37`).

### 4.3 Interconnexion des modules

La chaîne exigée par `CLAUDE.md` — Consultation → Patient → Prescription → Laboratoire → Imagerie → Hospitalisation → Facturation → Archivage — est **partiellement amorcée et jamais bouclée**. Le patient est correctement sélectionné depuis la base via `PatientSelect`, mais :
- une consultation ne génère pas de prescription exploitable par la Pharmacie ;
- une prescription ne décrémente aucun stock ;
- une demande d'examen ne remonte aucun résultat au dossier ;
- rien ne déclenche de facturation ;
- rien n'est archivé en GED.

Chaque module écrit dans son propre tableau `localStorage`, sans lecture croisée.

---

## 5. Dossier de décision — Vite/React Router contre Next.js

**Cette décision conditionne toutes les corrections suivantes et doit être prise en premier.**

### 5.1 Ce que dit la documentation

TD01 §3 : « La version 1 de MORACare Enterprise repose **exclusivement** sur les technologies suivantes. Frontend : React, **Vite**, TypeScript. »

TD04 §2 : « Le Frontend officiel repose **exclusivement** sur : React, **Vite**, TypeScript, **React Router**, Supabase JavaScript SDK. **Aucun framework Frontend supplémentaire ne devra être utilisé sans validation de l'architecture.** »

TD04 §5 impose une arborescence `src/` de 13 dossiers avec un point d'entrée `main.tsx` — signature Vite. TD04 §9 impose 9 routes ; TD04 §10, cinq layouts.

**Next.js n'est mentionné dans aucun des 8 Technical Documents.** Aucune occurrence de « App Router », « SSR », « Server Components » ou « Vercel ».

### 5.2 Ce que dit le code

`package.json` déclare `next: 14.2.15`, les scripts `next dev` / `next build`, et `src/app/` suit la convention App Router. Aucune trace de Vite ni de React Router.

### 5.3 L'ambiguïté

`CLAUDE.md` pose que « les Blueprints, Landing Page, Technical Documents et User Guides constituent la seule source de vérité » et que « si une différence existe entre le code et la documentation, c'est toujours la documentation qui fait foi ». Appliquée à la lettre, cette règle tranche en faveur de Vite.

Mais le même `CLAUDE.md` demande, en section Qualité, de respecter les « bonnes pratiques Next.js » — ce qui suppose Next.js. `CLAUDE.md` n'est toutefois pas lui-même l'un des quatre documents de référence qu'il désigne.

**Cette contradiction est interne à vos documents et ne peut être levée que par vous.**

### 5.4 Les deux options

| | **Option A — Migrer vers Vite + React Router** | **Option B — Conserver Next.js** |
|---|---|---|
| Conformité TD01/TD04 | totale | écart permanent |
| Code conservé | tous les composants React, les types, la migration SQL, Tailwind | la totalité |
| À réécrire | bootstrap (`main.tsx`), routage, arborescence 13 dossiers, remplacement de `next/*` | rien immédiatement |
| Protection des routes | garde côté client uniquement (React Router) | middleware serveur, plus robuste |
| Rendu de la Landing | client (SEO à compenser) | SSR natif, favorable au « Lighthouse > 95 » de LP-001 §8 |
| Effort estimé | 2 à 4 jours | nul |
| Condition | — | **amender TD01 §3 et TD04 §2**, sans quoi l'écart sera re-signalé à chaque audit |

### 5.5 Recommandation

**Option B — conserver Next.js, et amender les TD en conséquence.**

Trois raisons. D'abord, aucune exigence fonctionnelle du corpus n'est réalisable avec Vite et impossible avec Next.js : le débat est purement technologique, pas fonctionnel. Ensuite, Next.js sert *mieux* deux exigences documentées que Vite : la protection des routes par middleware serveur, ce que TD06 §7 et BP06 §14 réclament (« contrôle serveur »), et le rendu serveur de la Landing Page, qui sert directement le seuil Lighthouse > 95 de LP-001 §8. Enfin, l'Option A consommerait 2 à 4 jours à réorganiser des fichiers alors que les problèmes P0 — build cassé, mot de passe en clair, absence de base de données — sont d'un tout autre ordre de gravité.

**Si vous retenez l'Option B, la contrepartie est non négociable :** TD01 §3 et TD04 §2 doivent être modifiés pour inscrire Next.js, et l'arborescence de TD04 §5 adaptée. Sans cela, le projet reste durablement en défaut vis-à-vis de sa propre documentation.

**Si vous retenez l'Option A**, elle doit être exécutée **avant** toute correction P0-04 et P0-05, pour ne pas écrire deux fois la couche d'accès aux données.

---

## 6. Risques

| # | Risque | Gravité | Détail |
|---|---|---|---|
| R1 | **Exposition du compte administrateur** | Critique | Le mot de passe est lisible dans le bundle et affiché à l'écran. Il doit être considéré comme compromis et changé, pas seulement retiré du code. |
| R2 | **Données de santé non protégées** | Critique | Stockage navigateur, sans chiffrement ni contrôle d'accès, pour des données médicales nominatives. |
| R3 | **Panne silencieuse au branchement de Supabase** | Élevé | Les 13 tables sans politique RLS renverront zéro ligne sans erreur. Le diagnostic sera long si l'équipe n'est pas prévenue. |
| R4 | **Promesse commerciale non tenue** | Élevé | La Landing Page annonce 16 modules et un formulaire fonctionnel à de vrais prospects ; l'un et l'autre sont absents. |
| R5 | **Isolation inter-établissements inexistante** | Élevé | Garantie explicitement au client (UG02 §21, BP09) et non implémentée. Enjeu contractuel autant que technique. |
| R6 | **Collisions de références métier** | Moyen | `RANDOM()` sur colonne `UNIQUE` : échecs d'insertion en production, dès quelques centaines d'enregistrements. |
| R7 | **Dette d'architecture croissante** | Moyen | Sans couche `services/`, chaque module ajouté aggrave le couplage. À traiter avant d'élargir le périmètre fonctionnel. |
| R8 | **Décision de stack différée** | Moyen | Tout code écrit avant l'arbitrage risque d'être réécrit. |

---

## 7. Feuille de route Phase 3

Ordre validé : **socle sécurité et données d'abord**. Rien de neuf tant que le socle n'est pas sain.

### Étape 0 — Préalable bloquant
Arbitrer la stack (§ 5). Si Next.js est retenu, amender TD01 §3 et TD04 §2 dans la foulée.

### Étape 1 — Rendre le projet compilable
Corriger les deux erreurs de `src/app/page.tsx` (P0-01). Critère de sortie : `npx tsc --noEmit` et `next build` passent.

### Étape 2 — Fermer la faille d'authentification
Retirer les identifiants en dur et le message qui les divulgue (P0-02, P0-03), brancher Supabase Auth réel, faire porter la session par le serveur. **Changer le mot de passe** : il est compromis. Retirer également son affichage de `scripts/seed-superadmin.ts`.

### Étape 3 — Sécuriser la base
Écrire les politiques RLS des 13 tables découvertes (P0-06), activer RLS sur `system_settings` (P0-07), ajouter `SET search_path = ''` à `is_super_admin()` (P0-08), remplacer `RANDOM()` par des séquences PostgreSQL conformes à TD02 §8 (P0-09). Ajouter le trigger `updated_at` exigé par TD05 §9 et les index de TD02 §16.

### Étape 4 — Introduire la couche d'accès aux données
Créer `src/services/` conformément à TD04 §13, y déplacer tous les accès Supabase, et retirer `localStorage` de `DataContext` (P0-04, P0-05). Aligner au passage les types sur le schéma (P2-01) et créer les tables manquantes des écrans déjà construits — lignes de facture, caisses, plannings, paie (P2-02).

### Étape 5 — Multi-tenant réel
Supprimer les 10 occurrences de `'est-001'` (P1-01), rattacher chaque écriture à l'établissement de l'utilisateur connecté, et vérifier l'isolation par un test croisé entre deux établissements.

### Étape 6 — Permissions et menus dynamiques
Matrice rôle × module × action, hook `usePermissions()` (TD04 §12), génération du menu par permission, et contrôle **côté serveur** (BP06 §14) — le frontend ne doit porter aucune logique d'autorisation (TD04 §23).

### Étape 7 — Le module Paramètres devient réellement pilote
Source unique de vérité pour l'activation des modules, en remplacement des trois états concurrents actuels, avec la cascade complète : menu, tableau de bord, blocage d'URL, suspension des permissions, masquage des statistiques (P1-02).
*Point à clarifier avec vous :* la documentation ne définit ni la liste officielle des identifiants de modules (BP12 §4 en donne 12, BP31 §5 en donne 17, LP-001 en annonce 16 — les trois listes divergent), ni ce qu'est un « module critique » (BP28A §12), ni le sort des données d'un module désactivé, ni les dépendances bloquantes entre modules (peut-on désactiver Stock quand Pharmacie en dépend ?).

### Étape 8 — Séparation des espaces et tableaux de bord
Espaces Super Admin / Responsable / Personnel réellement distincts avec leurs layouts (TD04 §10), et les tableaux de bord décrits par UG01 §4, UG02 §4 et UG03 §4.

### Étape 9 — Landing Page conforme
Thème clair LP-001 par défaut avec bascule sombre, selon votre arbitrage. Le thème clair existe déjà dans `globals.css` : il s'agit surtout de retirer le `dark` forcé de `layout.tsx:22` et de remplacer les classes `slate-*` codées en dur par les jetons de design. Charger Inter, et brancher le formulaire de démonstration sur une vraie table de demandes d'inscription (P1-06).

### Étape 10 — Élargissement
Modules absents (P3-01) en commençant par ceux que la chaîne métier réclame, puis bouclage des interconnexions, journal d'audit alimenté, PDF archivés en GED.

### Étape 11 — Exigences transverses
i18n FR/EN avec externalisation de tous les libellés (BR-246), PWA, accessibilité WCAG, puis la stratégie de tests de TD08.

---

## 8. Vérification — commandes reproductibles

Tous les constats P0 et P1 de ce rapport ont été établis par les commandes ci-dessous, rejouées le 30 juillet 2026.

```bash
# P0-01 — Le build échoue (2 erreurs dans page.tsx)
npx tsc --noEmit

# P0-04 — Aucun appel Supabase dans tout le code applicatif
#   Résultat : UNE seule occurrence, et c'est un faux positif — le ".co" de
#   l'URL factice ligne 3 de src/lib/supabase.ts. Zéro appel réel.
grep -rnE "\.from\(|\.insert\(|\.select\(|supabase\." src/

# P0-05 — Persistance localStorage
#   Résultat : src/context/AuthContext.tsx et src/context/DataContext.tsx
grep -rln "localStorage" src/

# P0-06 / P0-07 — 15 tables avec RLS, 3 policies couvrant 2 tables, 16 tables créées
grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/20260730000000_init_moracare.sql   # 15
grep -c "CREATE POLICY"             supabase/migrations/20260730000000_init_moracare.sql   # 3
grep -c "CREATE TABLE"              supabase/migrations/20260730000000_init_moracare.sql   # 16

# P1-01 — Multi-tenant factice : 10 occurrences dans 10 fichiers
grep -rn "est-001" src/

# P1-02 — SettingsModule n'importe pas useData : aucun résultat
grep -n "useData" src/components/modules/SettingsModule.tsx

# P1-03 — Permissions : seules des comparaisons à 'super_admin'
grep -rn "role === " src/
```

---

## 9. Conclusion

Le projet dispose de **fondations réelles et réutilisables** : une Landing Page structurellement fidèle à LP-001, un schéma SQL correctement conçu dans ses conventions (UUID, `business_reference`, `establishment_id`, soft delete, colonnes d'audit — le tout conforme à TD02 §5-7), des types TypeScript exploitables, un thème clair conforme déjà écrit, et des interfaces de modules qui traduisent une bonne compréhension du métier.

Ce qui manque n'est pas la façade, c'est **tout ce qui se trouve derrière** : la persistance, l'authentification, l'isolation, les permissions, le routage et les workflows. Selon le critère posé par `CLAUDE.md` — une fonctionnalité n'est terminée que si les données sont enregistrées, les validations présentes, les permissions effectives, les workflows complets et les relations fonctionnelles — **aucune fonctionnalité du projet n'est aujourd'hui terminée**.

**Deux décisions vous appartiennent avant que la Phase 3 puisse démarrer :**
1. **L'arbitrage de la stack** (§ 5), qui conditionne tout le reste.
2. **La clarification du référentiel des modules** (§ 7, étape 7) : trois listes divergentes coexistent dans vos propres documents.

**Une action est à mener sans attendre, indépendamment de tout développement :** le mot de passe Super Admin figurant dans le code doit être considéré comme compromis et changé.
