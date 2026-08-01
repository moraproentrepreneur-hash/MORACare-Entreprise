# RAPPORT DE PHASE 3 — Socle sécurité & données (étapes 1 à 6)

**Périmètre validé :** réparation du build, authentification Supabase, sécurisation RLS, couche services, multi-tenant, système de permissions.
**Hors périmètre, différé à votre demande :** module Paramètres pilote (étape 7), abonnements SaaS, référentiel unique des modules.
**Date :** 1er août 2026

---

## 1. Éléments analysés et corrigés

### 1.0 Documentation officialisée (préalable validé)

| Fichier | Section | Modification |
|---|---|---|
| `TD01` | §3 Stack technique | « Vite » → « Next.js (App Router) » |
| `TD04` | §2 Technologies | « Vite » + « React Router » → « Next.js (App Router) », routage natif mentionné |
| `TD04` | §5 Structure | Retrait de `pages/`, `routes/`, `layouts/`, `main.tsx` ; conservation de `features/`, `services/`, `hooks/`, `stores/` |
| `TD04` | §9 Routing | React Router → App Router + **middleware serveur** (gain de conformité vis-à-vis de TD06 §7 et BP06 §14) |

Vérification : `grep -rn "Vite\|React Router\|main\.tsx" "Technical Documents (TD)/"` → **aucun résultat**.

Les Blueprints, User Guides et la Landing Page n'ont pas été touchés : ils ne mentionnaient aucune technologie frontend. **Le référentiel des modules n'a été modifié nulle part**, conformément à votre consigne.

---

### 1.1 Étape 1 — Build réparé

- `src/app/page.tsx:26` : `loading` → `isLoading` (le nom réellement exposé par `AuthContext`).
- `src/app/page.tsx:117` : `<Header activeTab>` → `<Header title>`.
- Création de `src/lib/navigation.ts` : registre unique des entrées de menu, consommé par le `Sidebar` **et** par le titre du `Header`. La liste des libellés était auparavant dupliquée.

`npx tsc --noEmit` et `npm run build` passent tous les deux.

---

### 1.2 Étape 2 — Authentification réelle (P0-02, P0-03)

**Le mot de passe en clair a disparu du dépôt.** Il figurait dans cinq endroits, tous traités :

| Emplacement | Traitement |
|---|---|
| `src/context/AuthContext.tsx:36-38` | Comparaison en dur remplacée par `signInWithPassword` |
| `src/context/AuthContext.tsx:64` | Message divulguant les identifiants supprimé |
| `scripts/seed-superadmin.ts` | Réécrit : tout vient de variables d'environnement, rien n'est journalisé |
| `supabase/seed.sql` | Insertion directe dans `auth.users` supprimée (elle contournait Supabase Auth) |
| `README.md`, `INSTALLATION.md` | Identifiants retirés, procédure par script documentée |

Architecture mise en place :

- `src/lib/supabase/client.ts` — client navigateur typé
- `src/lib/supabase/server.ts` — client serveur (Server Components, Route Handlers)
- `src/lib/supabase/middleware.ts` + `middleware.ts` — rafraîchissement de session, **indispensable** au fonctionnement SSR
- `src/lib/supabase/admin.ts` — client `service_role`, protégé par `import 'server-only'` : une inclusion accidentelle côté client devient une erreur de compilation
- `src/services/auth.service.ts` — connexion, déconnexion, chargement du profil

Deux choix de sécurité à signaler :

1. **Message d'erreur unique** pour tout échec de connexion. Distinguer « compte inconnu » de « mot de passe incorrect » permettrait d'énumérer les comptes existants.
2. **Connexion par e-mail professionnel**, conformément à UG01 §3, UG02 §3 et UG03 §3. L'ancien champ « Identifiant ou Email » acceptait un nom d'utilisateur, ce que Supabase Auth ne gère pas nativement.

Un point d'ergonomie important : lorsque les variables d'environnement sont absentes ou factices, l'écran de connexion affiche désormais une bannière explicite. Sans cela, l'application aurait échoué en silence.

---

### 1.3 Étape 3 — Sécurisation de la base (P0-06 à P0-09)

Nouvelle migration `20260730120000_security_hardening.sql`.

| Écart | Correction |
|---|---|
| 13 tables RLS sans politique | Politique d'isolation `establishment_id` générée pour toutes les tables métier |
| `system_settings` sans RLS | RLS activé + politique |
| `is_super_admin()` vulnérable | `SET search_path = ''` ajouté, fonction passée en `sql`/`STABLE` |
| `RANDOM()` sur colonne `UNIQUE` | 13 séquences PostgreSQL, format `MORA-XXX-000001` |
| Références modifiables | Trigger `prevent_business_ref_update` : toute tentative lève une exception |
| Pas de trigger `updated_at` (TD05 §9) | `set_updated_at()` appliqué à 13 tables |
| Aucun index (TD02 §16) | 35 index sur clés étrangères, dates et colonnes de filtrage |
| Profil non créé à l'inscription | Trigger `handle_new_auth_user` sur `auth.users` |

Deux décisions structurantes :

- **Le journal d'audit est rendu inaltérable.** `audit_logs` reçoit des politiques `SELECT` et `INSERT`, mais **aucune** politique `UPDATE` ni `DELETE`. PostgreSQL refusera donc toute modification, y compris au Super Admin. C'est ce qu'exige BP26B.
- **L'écart de caisse et le salaire net sont des colonnes générées** (`GENERATED ALWAYS AS`). Ils ne peuvent pas être falsifiés depuis le client, puisqu'ils ne sont jamais transmis.

---

### 1.4 Étape 4 — Couche services et tables manquantes

**Migration `20260730130000_missing_business_tables.sql`** — 8 tables qui manquaient alors que des écrans complets les manipulaient : `invoice_items`, `quotes`, `quote_items`, `cash_registers`, `cash_movements`, `cash_closures`, `shift_schedules`, `payroll_slips`. Plus les colonnes absentes relevées en P2-01 (`profiles.department`, `employees.phone/email/diploma/full_name`, `invoices.insurance_coverage_amount`).

**11 services créés** dans `src/services/`, conformément à TD04 §13 :

`base.service` · `auth.service` · `patient.service` · `clinical.service` · `diagnostics.service` · `pharmacy.service` · `finance.service` · `hr.service` · `cash.service` · `profile.service` · `establishment.service`

`DataContext` a été entièrement réécrit : il ne connaît plus que les services, ne contient plus une seule ligne de `localStorage`, et remonte les erreurs au lieu de les avaler.

Un cas a exigé un traitement serveur : **la création de comptes utilisateurs**. Elle passe par la clé `service_role`, qui ne peut pas atteindre le navigateur. D'où le Route Handler `src/app/api/users/route.ts`, qui relit le rôle de l'appelant **en base** avant d'agir et force le nouveau compte dans l'établissement de l'appelant.

---

### 1.5 Étape 5 — Multi-tenant réel (P1-01, P1-07, P1-08)

- Les **10 occurrences de `establishment_id: 'est-001'`** ont disparu. L'établissement provient du profil de l'utilisateur connecté, et la clause `WITH CHECK` des politiques RLS rejette toute écriture hors périmètre.
- Les identifiants et références métier ne sont plus fabriqués côté client : ils viennent de PostgreSQL.
- **Nouveau composant `DoctorSelect`**, pendant de `PatientSelect`. Le médecin était saisi en texte libre avec `doctor_id: 'doc-001'` figé ; il est désormais sélectionné en base. Même correction pour l'employé dans les plannings et la paie. Cela satisfait l'exigence CLAUDE.md « Aucune saisie libre lorsqu'une relation existe déjà ».
- Toutes les données fictives ont été retirées : « Clinique de la Paix », la ligne `MORA-SA-000001 / rachade`, les établissements et le MRR fabriqués du `SuperAdminHub`.
- `PharmacyModule` n'était **même pas relié au contexte** — il gardait son stock dans un `useState` local. Il lit désormais la base.

---

### 1.6 Étape 6 — Permissions (P1-03)

`src/lib/permissions.ts` définit la matrice rôle × module × action pour les 10 rôles, chacun documenté par son guide utilisateur. `src/hooks/usePermissions.ts` fournit `can/canView/canCreate/canUpdate/canDelete` — le nom `usePermissions()` est celui qu'impose TD04 §12.

Le menu est maintenant **généré par les permissions** (BP06 §8), et non plus par un simple test `role === 'super_admin'`. Un second verrou empêche le rendu d'un module non autorisé.

**Un point mérite votre validation.** UG01 §1 énonce que « l'administrateur n'intervient pas dans les activités médicales quotidiennes des établissements ». J'ai appliqué cette règle littéralement : **le Super Admin n'a aucun accès aux modules de soins** (patients, consultations, laboratoire…). Il ne voit que la console SaaS et les paramètres. C'est un changement de comportement visible par rapport à la version précédente, où il voyait tout.

Enfin, un avertissement figure en tête de `permissions.ts` : cette matrice **ne protège rien à elle seule**. TD04 §23 exige que le frontend ne porte aucune logique d'autorisation. La sécurité réelle est appliquée par RLS et par les Route Handlers ; la matrice ne fait que masquer ce qui est inutile ou interdit dans l'interface.

---

## 2. Vérifications effectuées

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **passe** (0 erreur) |
| `npm run build` | **passe** — 3 routes générées, dont `/api/users` |
| `localStorage` dans `src/` | **0 occurrence** |
| Composants important Supabase directement | **0** (TD04 §13 respecté) |
| Chaîne `«mot de passe rédigé»` dans le dépôt | **0** hors rapport d'audit |
| `est-001`, `doc-001`, `Rachade`, « Clinique de la Paix » | **0** |
| Tables créées / avec RLS / couvertes par une politique | **24 / 24 / 24** |
| `Vite`, `React Router`, `main.tsx` dans les TD | **0** |

---

## 3. Risque principal : les migrations n'ont pas été exécutées

**Aucun outil PostgreSQL n'est disponible dans cet environnement** — ni `psql`, ni la CLI `supabase`, ni Docker. Les trois migrations ont donc été **écrites et relues, mais jamais exécutées**. Le code TypeScript est vérifié par le compilateur ; le SQL ne l'est par rien.

C'est le risque résiduel le plus important de cette phase. Points à surveiller au premier passage sur une base réelle :

1. Les blocs `DO $$ … EXECUTE format(…) $$` qui génèrent les politiques et les triggers.
2. Le trigger sur `auth.users` : Supabase restreint parfois les droits sur ce schéma selon le plan.
3. Les colonnes `GENERATED ALWAYS AS` (`variance_amount`, `net_salary`, `line_total`).
4. L'ordre d'application : `20260730000000` → `20260730120000` → `20260730130000`.

Dans le même esprit, `src/types/database.ts` a été **écrit à la main** faute de CLI. Il devra être régénéré par `npx supabase gen types typescript` dès qu'un projet réel existe ; la version générée fera alors foi.

Autre limite à connaître : je n'ai pas pu exécuter l'application contre une vraie base. Le parcours complet — connexion, création d'un patient, d'un rendez-vous, d'une facture — **reste à valider fonctionnellement**.

---

## 4. Éléments restant à développer

**Différés à votre demande :** référentiel unique des modules, module Paramètres pilote avec sa cascade complète (étape 7), abonnements SaaS.

**Non entamés, issus de la feuille de route :**

- Étape 8 — séparation réelle des espaces (Super Admin / Responsable / Personnel) et tableaux de bord par rôle (UG01 §4, UG02 §4, UG03 §4). Aujourd'hui, tous les rôles partagent le même `Sidebar` et le même conteneur, et **aucun tableau de bord n'existe**.
- Routage : l'application reste une route unique avec navigation par état. Les 9 routes de TD04 §9 ne sont pas créées. Tant qu'il n'y a pas d'URL, l'exigence « inaccessible par URL » reste sans objet.
- Étape 9 — Landing Page en charte claire LP-001 avec bascule sombre.
- Étape 10 — les 9 modules absents et le bouclage des interconnexions. Le journal d'audit a une table et des politiques, mais **rien ne l'alimente encore**.
- Étape 11 — i18n FR/EN (BR-246 interdit tout texte codé en dur : tous les libellés le sont encore), PWA, accessibilité, tests (TD08 — couverture toujours à 0 %).

---

## 5. Recommandations

1. **Appliquer les trois migrations sur un projet Supabase de test avant toute autre chose.** C'est le seul moyen de lever le risque de la section 3.
2. **Créer le compte Super Admin avec un mot de passe neuf.** Celui du dépôt doit être considéré comme compromis, indépendamment de son retrait du code.
3. **Valider la règle d'accès du Super Admin** (§1.6) : c'est le seul changement de cette phase qui modifie un comportement visible.
4. **Régénérer `src/types/database.ts`** dès que la base réelle existe.
5. Introduire les tests de TD08 avant d'élargir le périmètre fonctionnel : la couche services est désormais isolée, donc testable — c'est le bon moment.
