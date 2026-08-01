# RAPPORT DE PHASE 5 — Finalisation du socle SaaS MORACare

**Date :** 1er août 2026
**Statut :** développement arrêté, en attente de votre validation.
**Aucun push, aucune publication, aucun déploiement n'a été effectué.**

---

## 1. Synthèse

Cette phase déplace en base de données tout ce qui pilotait l'application depuis le code : le référentiel des modules, la matrice des permissions, les plans d'abonnement, les licences et l'activation par établissement. Le module Paramètres devient effectivement le poste de commande.

Trois contrôles font foi : `npx tsc --noEmit` (0 erreur), `npx next lint` (0 avertissement), `npm run build` (succès, 24 routes).

**Le projet n'est pas prêt pour une validation finale.** La raison est unique et connue : les cinq migrations SQL n'ont jamais été exécutées, faute d'outil PostgreSQL dans cet environnement. Le détail figure en section 6.

---

## 2. Fonctionnalités réalisées

### 2.1 Référentiel unique des modules (§2)

Une table `modules` devient la source de vérité unique. Elle pilote désormais les menus, les permissions, la composition des plans, l'activation et les gardes de routes — il n'existe plus aucune autre liste.

Les **16 modules** sont tracés sur la documentation, sans invention :

| Origine | Modules |
|---|---|
| BP12 §4 « Liste des modules » | `dashboard`, `user_management`, `settings` (regroupés sous « Administration »), `patients`, `appointments`, `consultations`, `hospitalizations`, `pharmacy`, `laboratory`, `imaging`, `finance`, `hr`, `reports`, `patient_portal` |
| BP-025, présent dans BP31 §5 et TD02 §4 mais absent de BP12 §4 | `ged` |
| BP-030 (espace plateforme) | `saas_platform` |

Chaque module porte sa référence Blueprint, son espace d'appartenance et un indicateur `is_core`. Les modules essentiels — tableau de bord, utilisateurs, paramètres, plateforme — ne peuvent pas être désactivés : les désactiver rendrait la plateforme inutilisable ou non auditable.

**Arbitrage à valider :** BP12 §4 a été retenu comme colonne vertébrale car c'est la seule section de la documentation littéralement intitulée « Liste des modules » et déclarée « officielle ». `ged` y a été ajouté parce qu'il dispose de son propre Blueprint et figure dans deux autres listes. Les divergences entre BP12 §4 (12 entrées), BP31 §5 (17 familles) et LP-001 (16 cartes) subsistent dans les documents ; je ne les ai pas modifiés.

### 2.2 Permissions dynamiques (§6)

**`src/lib/permissions.ts` a été supprimé.** Plus aucune permission n'existe dans le code.

La matrice vit dans la table `role_permissions` et est amorcée par un seed dont chaque ligne cite son User Guide. Le chargement passe par `AccessContext`, qui échoue **fermé** : une erreur réseau ou une base injoignable n'accorde aucun droit, jamais l'inverse.

Trois filtres cumulatifs déterminent l'accès à un module :

1. la matrice rôle × module (BP26A) ;
2. l'inclusion du module dans le plan souscrit (BP09 BR-006) ;
3. l'activation manuelle par l'établissement (BP28A §12, BP12 BR-027).

### 2.3 Abonnements (§3)

Les **cinq formules de BP09 §4** — Essai, Gratuit, Standard, Business, VIP — remplacent les offres « Starter / Business Pro / Enterprise » qui figuraient dans le code et **n'existent dans aucun document**.

Les cinq états de BP09 §6 sont implémentés : En attente, Actif, Suspendu, Expiré, Résilié. Création, renouvellement, suspension et changement de formule sont opérationnels.

L'historisation exigée par BR-009 est assurée **par trigger PostgreSQL**, pas par le code applicatif : aucun appel ne peut l'omettre, et la table `subscription_events` n'a aucune politique de suppression.

### 2.4 Licences (§4)

Chaque établissement dispose d'une licence unique (`UNIQUE` sur `establishment_id`, conformément à BR-008 et au principe « aucune licence ne peut être dupliquée »), avec numéro séquentiel, plan, dates, état, limites d'utilisateurs et de stockage, et historique propre.

BR-290 est respectée par construction : la suspension ne touche qu'au statut, jamais aux données.

### 2.5 Module Paramètres (§1)

Sept onglets, tous adossés à des données réelles :

| Onglet | Contenu |
|---|---|
| Établissement | Informations réelles, modifiables, avec journalisation |
| Abonnement & Licence | Formule, échéance, modules inclus, alerte d'expiration |
| Modules Applicatifs | Activation/désactivation avec effet immédiat |
| Rôles & Permissions | Matrice éditable, lue et écrite en base |
| Sécurité | Garanties réellement effectives, avec leur référence |
| Sauvegardes | État d'avancement honnête |
| Journal d'audit | Consultation du journal inaltérable |

### 2.6 Cascade de désactivation (§7)

Une désactivation retire le module du menu, du tableau de bord, des statistiques et rend son URL inaccessible. Cela fonctionne parce que **tout dérive de la même source** : `usePermissions` alimente le `Sidebar`, le `ModuleGuard` de chaque page et le calcul des indicateurs.

### 2.7 Landing Page (§9)

Les 12 sections de LP-001 §6 sont présentes, dans l'ordre, avec les titres et textes littéraux. Le contenu textuel est isolé dans `landing-content.ts` pour que la conformité soit vérifiable sans lire de JSX.

- **Charte LP-001 §5 appliquée** : fond blanc, fond alterné `#F5F7FA`, bleu `#003366`, vert `#00A859`, accent `#FFD700`.
- **Police Inter** chargée via `next/font` (auto-hébergée, aucun appel réseau externe).
- **Thème clair par défaut, bascule sombre** disponible.
- **Animations Framer Motion** discrètes, désactivées si le système demande une réduction des animations.
- **FAQ portée à 12 questions**, LP-001 en exigeant « entre 10 et 15 » et n'en fournissant que 8.
- **Le formulaire persiste enfin** : il crée une demande d'inscription exploitable par le Super Admin (BP05 §3.2). Il affichait auparavant un faux message de succès.

### 2.8 Page de connexion (§10)

Refonte complète en deux colonnes. Aucun identifiant n'est affiché ni suggéré. Le message d'erreur reste générique pour empêcher l'énumération des comptes.

---

## 3. Fichiers modifiés

**Migrations créées (2)**
`20260801000000_saas_referential.sql` — 10 tables, RLS, triggers d'historisation, index
`20260801010000_saas_referential_seed.sql` — 16 modules, 5 plans, matrice complète

**Supprimé (1)**
`src/lib/permissions.ts` — matrice codée en dur

**Créés (16)**
`services/access.service.ts`, `services/subscription.service.ts`, `services/audit.service.ts`
`context/AccessContext.tsx`, `components/providers/ThemeProvider.tsx`
`components/settings/` — `ModulesSettings`, `PermissionsMatrix`, `AuditLogPanel`, `EstablishmentSettings`, `SubscriptionPanel`, `SecurityPanel`, `SaasSubscriptions`
`components/landing/landing-content.ts`
`app/api/registration-requests/route.ts`, `app/admin/abonnements/page.tsx`, `app/(etablissement)/reports/page.tsx`

**Réécrits (10)**
`hooks/usePermissions.ts`, `lib/navigation.ts`, `components/landing/LandingPage.tsx`, `components/auth/LoginForm.tsx`, `components/modules/SettingsModule.tsx`, `components/dashboard/SuperAdminHub.tsx`, `components/dashboard/Sidebar.tsx`, `components/layouts/WorkspaceLayout.tsx`, `app/layout.tsx`, `types/database.ts`

---

## 4. Choix techniques

**`AccessContext` séparé de `DataContext`.** Les droits doivent être connus avant toute lecture métier, et un échec de chargement des droits ne doit pas être confondu avec un échec de chargement des données.

**Échec fermé.** L'absence de droits chargés n'accorde aucune permission. C'est volontairement strict : une panne ne doit jamais ouvrir l'application.

**Historisation par trigger, pas par code.** Les événements d'abonnement et de licence sont écrits par PostgreSQL. Un développeur ne peut pas oublier de journaliser.

**Colonnes générées pour les montants sensibles.** L'écart de caisse et le salaire net sont calculés par la base et ne transitent jamais depuis le navigateur.

**Le thème sombre reste imposé aux espaces authentifiés.** LP-001 §5 régit la vitrine, pas l'outil interne. La classe `dark` est appliquée par les layouts authentifiés, ce qui laisse le visiteur libre de son choix sur le site public sans altérer l'application.

---

## 5. Arbitrages

**Formules sur la Landing Page.** Vous demandiez « les cartes des abonnements prévues dans notre documentation officielle », alors que LP-001 §7 impose « Ne pas afficher de prix » et ne prévoit que trois profils d'utilisation. J'ai conservé les trois profils avec leurs textes littéraux **et** ajouté les cinq formules de BP09 §4, sans aucun tarif. Aucune offre n'est inventée, aucun prix n'est affiché.

**Composition des plans.** BP09 §4 ne détaille le contenu que de deux formules : Essai (« Découverte complète ») et VIP (« Toutes les fonctionnalités »). Pour Gratuit, Standard et Business, le document mentionne des limitations sans jamais dire lesquelles. **Je n'ai rien inventé** : leur composition est vide, et l'application traite un plan sans composition comme « non encore configuré » — aucune restriction n'est appliquée, et un avertissement s'affiche dans les Paramètres. Inventer des restrictions aurait été une décision commerciale, pas technique.

**Limites chiffrées.** Même raisonnement pour `max_users`, `max_patients` et `storage_mb` : BP09 §10 établit que les plans « peuvent définir des limites » sans en chiffrer aucune. Les colonnes existent et restent nulles, à renseigner par vous.

**Écrans honnêtement vides.** Le portail patient, les rapports et les sauvegardes affichent leur état d'avancement réel plutôt que des chiffres décoratifs. L'ancien onglet Sécurité affirmait « AES-256 / TLS 1.3 » et « sauvegarde automatique active » sans rien mesurer : ces affirmations ont été remplacées par la liste des garanties réellement effectives, chacune avec sa référence documentaire.

---

## 6. Risques restants

**Risque n°1 — les migrations n'ont jamais été exécutées.** Aucun outil PostgreSQL n'est disponible ici : ni `psql`, ni la CLI Supabase, ni Docker. Les **cinq** migrations ont été écrites et relues, jamais exécutées. Le TypeScript est validé par le compilateur ; le SQL ne l'est par rien.

La gravité a augmenté avec cette phase : les permissions dépendent désormais entièrement de la base. **Si le seed ne s'exécute pas correctement, aucun utilisateur n'obtiendra le moindre droit** — l'application se chargera en affichant un message d'erreur explicite, mais sera inutilisable. C'est le comportement voulu (échec fermé), et c'est aussi pourquoi l'exécution des migrations doit précéder tout le reste.

Points à surveiller au premier passage :
- l'ordre des cinq migrations (horodatage croissant) ;
- les blocs `DO $$ … EXECUTE format(…) $$` qui génèrent politiques et triggers ;
- la fonction `seed_role_permission`, qui lève une exception si un code de module est introuvable ;
- le trigger sur `auth.users`, Supabase restreignant parfois ce schéma selon le plan.

**Risque n°2 — types écrits à la main.** `src/types/database.ts` couvre 34 tables et n'a pas été généré. Un écart avec le schéma réel ne se verra qu'à l'exécution.

**Risque n°3 — aucun test.** TD08 reste à 0 %. Le middleware et `usePermissions` concentrent la logique d'accès : ce sont exactement les endroits où une régression passe inaperçue.

---

## 7. Reste à développer

**Modules absents** — Urgences, Bloc opératoire, Achats (BP17), Stock (BP18), Notifications (BP27A), Messagerie, Interopérabilité (BP27B). `ged` demeure un libellé ; `reports` et `patient_portal` ont une route et une garde, mais pas de contenu.

**Workflows (§12)** — La chaîne est amorcée, pas bouclée. Patient, rendez-vous, consultation, laboratoire, imagerie, hospitalisation et facturation partagent la base et convergent sur le dossier patient. En revanche : une consultation ne génère pas encore de prescription exploitable par la pharmacie, une prescription ne décrémente aucun stock, un résultat d'examen ne remonte pas au dossier, et rien ne déclenche automatiquement la facturation ni l'archivage. Les transitions d'état (« en attente » → « prélevé » → « validé ») n'ont pas d'écran de suivi.

**Transverses** — i18n FR/EN (BR-246 interdit le texte codé en dur ; il l'est toujours partout), PWA, accessibilité WCAG complète, tests TD08, alimentation systématique du journal d'audit (aujourd'hui limitée aux opérations d'administration), génération PDF archivée en GED.

**Gestion des utilisateurs (§5)** — La création, la suspension et le changement de statut fonctionnent. Manquent la réinitialisation de mot de passe, le changement de rôle et le transfert d'un utilisateur entre établissements.

---

## 8. Le projet est-il prêt pour validation finale ?

**Non — et un seul obstacle l'explique.**

Ce qui est prêt : l'architecture, la conformité documentaire, la sécurité de conception, la Landing Page, la page de connexion, la séparation des espaces, le référentiel unique, les abonnements et les licences. Les trois contrôles obligatoires passent.

Ce qui bloque : **aucune ligne de SQL n'a été exécutée**. Tant que les cinq migrations n'ont pas tourné sur un projet Supabase réel et que les types n'ont pas été régénérés, aucun parcours ne peut être validé de bout en bout, et le socle SaaS reste théorique.

**Ordre recommandé pour la suite :**

1. Appliquer les cinq migrations dans l'ordre sur un projet de test.
2. Régénérer `src/types/database.ts` avec `npx supabase gen types typescript`.
3. Créer le compte Super Admin par `npm run seed:superadmin`, avec un mot de passe neuf.
4. Créer un établissement, lui associer un abonnement, puis créer un compte par rôle.
5. Vérifier trois comportements : la séparation des espaces, la cascade de désactivation d'un module, et l'isolation entre deux établissements.
6. Ce n'est qu'après ces vérifications que la question du push pourra se poser.

**Rappel :** conformément à vos instructions, rien n'a été poussé, publié ni déployé. J'attends votre validation.
