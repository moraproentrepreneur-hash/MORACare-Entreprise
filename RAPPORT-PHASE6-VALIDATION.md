# RAPPORT DE PHASE 6 — Validation SQL, tarification et tests

**Date :** 1er août 2026
**Statut :** développement arrêté.
**Aucun push, aucune publication, aucun déploiement n'a été effectué.**

---

## 1. Le point le plus important : ce que je n'ai pas pu faire

Votre section 1 demandait de brancher le projet sur Supabase et d'y exécuter les migrations. **Je n'ai pas pu le faire, et il est important que vous sachiez exactement pourquoi.**

J'ai vérifié l'environnement, pas supposé :

| Élément requis | État constaté |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mock-moracare.supabase.co` — valeur factice |
| `SUPABASE_SERVICE_ROLE_KEY` | `mock-service-key` — valeur factice |
| `psql` | absent |
| CLI `supabase` | absente |
| Docker | absent, aucun service installé |

Il n'existe **aucun projet Supabase réel** auquel me connecter, et aucun moteur PostgreSQL local. Ces éléments ne dépendent pas de moi : il vous faut créer le projet Supabase et me fournir ses identifiants, ou installer Docker.

**Conséquence directe :** la section 2 (validation fonctionnelle — créer le Super Admin, un établissement, des comptes, vérifier l'isolation en conditions réelles) reste également impossible en l'état.

---

## 2. Ce que j'ai fait à la place — et qui lève l'essentiel du risque

Plutôt que de m'arrêter là, j'ai installé **PGlite**, PostgreSQL compilé en WebAssembly qui s'exécute dans Node sans Docker ni serveur. Cela m'a permis de faire tourner du vrai PostgreSQL 18.3.

### 2.1 Les migrations s'exécutent réellement

```
Moteur : PostgreSQL 18.3 (PGlite 0.5.4)

  OK    20260730000000_init_moracare.sql
  OK    20260730120000_security_hardening.sql
  OK    20260730130000_missing_business_tables.sql
  OK    20260801000000_saas_referential.sql
  OK    20260801010000_saas_referential_seed.sql
  OK    20260801020000_plan_pricing_and_limits.sql

  Tables publiques       : 34
  Politiques RLS         : 52
  Tables sans RLS        : 0
  Tables RLS sans policy : 0
  Modules                : 16
  Plans d'abonnement     : 5
  Permissions            : 57
```

**Le risque n°1 de tous mes rapports depuis la Phase 3 est levé.** Le SQL n'est plus théorique : il s'applique, les triggers se déclenchent, les seeds se chargent, les politiques se créent. Rejouable par `npm run db:validate`.

### 2.2 Les types correspondent au schéma réel

Le second risque était que `src/types/database.ts`, écrit à la main, diverge du schéma. J'ai écrit un outil qui applique les migrations, introspecte le schéma obtenu et compare colonne par colonne avec les types déclarés.

Il a immédiatement détecté la dérive que je venais d'introduire avec les colonnes de tarification — preuve qu'il fonctionne. Après correction : **34 tables, cohérence complète**. Rejouable par `npm run db:check-types`.

Ce n'est pas l'équivalent de `supabase gen types`, mais cela couvre exactement ce que la régénération aurait corrigé.

### 2.3 Soixante tests qui valident la sécurité pour de vrai

Les tests s'exécutent contre les migrations réelles, avec `auth.uid()` simulé et le rôle `authenticated` — c'est-à-dire dans les conditions où PostgreSQL évalue effectivement les politiques RLS.

| Suite | Tests | Ce qui est prouvé |
|---|---|---|
| `multi-tenant.test.ts` | 6 | Un médecin ne voit que ses patients ; une écriture vers un autre établissement est **rejetée par la clause WITH CHECK** ; un compte sans établissement ne voit rien |
| `permissions.test.ts` | 27 | Le Super Admin n'a accès à **aucun** des 7 modules cliniques ; chaque rôle respecte son User Guide ; aucun droit d'écriture sans droit de lecture |
| `subscriptions.test.ts` | 16 | Les 5 formules, les tarifs, l'historisation automatique, l'unicité des licences, la progression croissante des formules |
| `integrity.test.ts` | 11 | Références séquentielles et non modifiables, `updated_at` automatique, **journal d'audit inaltérable**, écart de caisse et salaire net non falsifiables |

Cela répond partiellement à votre section 2 : l'isolation entre établissements et les permissions sont **vérifiées**, mais au niveau de la base, pas encore de bout en bout dans l'application.

---

## 3. Tarification officielle (§3) et configuration des formules (§5)

Les cinq tarifs que vous avez arrêtés sont enregistrés en base et vérifiés par test :

| Formule | Tarif | Facturation |
|---|---|---|
| Essai | 0 KMF | 3 jours |
| Gratuit | 0 KMF | mensuelle |
| Standard | 5 000 KMF | mensuelle |
| Business | 10 000 KMF | mensuelle |
| VIP | 15 000 KMF | mensuelle |

**Plus aucune formule n'est « non configurée ».** Chacune possède désormais : quotas d'utilisateurs et de patients, stockage, modules inclus, niveau de support, fréquence de sauvegarde, durée de conservation, libellé de bouton et avantages/limitations. Un contrôle d'intégrité SQL **fait échouer la migration** si une formule restait sans composition.

Tout est exploité automatiquement : `usePermissions` refuse un module absent du plan souscrit.

---

## 4. Cartes d'abonnement (§4)

`PlanCards.tsx` affiche pour chaque formule : nom, tarif, période de facturation, quotas, support, sauvegardes, conservation, avantages, **modules inclus nommément**, limitations et bouton adapté. Rien n'est masqué ni replié.

Le contenu vient intégralement de la base : modifier une offre ne demande aucun redéploiement.

---

## 5. Gestion des utilisateurs (§7) — complète

Route Handler `PATCH /api/users/[id]` couvrant les sept opérations demandées : création, modification, suspension, réactivation, changement de rôle, réinitialisation de mot de passe et transfert entre établissements.

Trois garde-fous appliqués **côté serveur** :
- un responsable n'agit que sur les comptes de son établissement (UG02 §5) ;
- il ne peut pas attribuer un rôle équivalent au sien (BP06 §11) ;
- seul MORA Shawiri transfère un utilisateur entre établissements (BR-295).

Le mot de passe n'est jamais journalisé.

---

## 6. Fichiers modifiés

**Créés (11)**
`supabase/migrations/20260801020000_plan_pricing_and_limits.sql`
`scripts/validate-migrations.mjs`, `scripts/check-types-against-schema.mjs`
`tests/helpers/database.ts`, `tests/multi-tenant.test.ts`, `tests/permissions.test.ts`, `tests/subscriptions.test.ts`, `tests/integrity.test.ts`
`vitest.config.mts`
`src/components/landing/PlanCards.tsx`, `src/components/settings/UserActionsMenu.tsx`
`src/app/api/users/[id]/route.ts`

**Modifiés (7)**
`src/types/database.ts`, `src/services/subscription.service.ts`, `src/services/profile.service.ts`, `src/context/DataContext.tsx`, `src/components/landing/LandingPage.tsx`, `src/components/landing/landing-content.ts`, `src/components/modules/UserManagementModule.tsx`, `package.json`

**Dépendances ajoutées :** `@electric-sql/pglite`, `vitest` (développement uniquement).

---

## 7. Arbitrages

**Les tarifs contredisent LP-001 §7.** Le document dit littéralement « Ne pas afficher de prix ». Vous avez arrêté des tarifs officiels et demandé qu'ils figurent sur les cartes. J'ai suivi votre instruction — vous êtes le propriétaire du produit — mais **je n'ai pas modifié LP-001**, conformément à votre interdiction de Phase 5. L'écart doit être régularisé : soit LP-001 §7 est amendé, soit les prix retirés. En l'état, le code et le document se contredisent.

**Les quotas ne sont pas documentés.** Vous avez fourni les prix, pas les limites. BP09 §10 dit qu'une formule « peut définir des limites » sans en chiffrer aucune. J'ai donc **proposé** une progression cohérente (2 → 10 → 30 → illimité utilisateurs ; 100 → 2 000 → 10 000 → illimité patients ; 1 → 5 → 20 → 100 Go). Ces valeurs sont une décision commerciale que je prends à votre place : **elles demandent votre validation explicite**. Elles sont modifiables en base sans redéploiement.

**Lecture publique des formules.** La Landing Page s'adresse à des visiteurs non authentifiés : j'ai ouvert la lecture de `subscription_plans`, `plan_modules` et `modules` au rôle `anon`. L'écriture reste réservée au Super Admin. Ce sont des informations commerciales publiques.

**PGlite n'est pas Supabase.** La validation couvre le schéma, les contraintes, les triggers et la logique RLS. Elle ne couvre pas l'intégration Supabase elle-même : Auth, Storage, Realtime et les particularités du schéma `auth` restent à vérifier sur le projet réel.

---

## 8. Ce qui n'a pas été traité

Je préfère être précis plutôt que de laisser croire que tout est fait.

**§1 et §2 — bloqués** par l'absence de projet Supabase (voir section 1).

**§8 — Workflows métiers : partiels.** La chaîne Patient → Rendez-vous → Consultation → Laboratoire/Imagerie → Hospitalisation → Facturation partage la base et converge sur le dossier patient. **Manquent** : la génération d'une prescription exploitable par la pharmacie, la décrémentation automatique du stock, la remontée des résultats au dossier, le déclenchement automatique de la facturation et l'archivage en GED.

**§9 — Modules restants : non développés.** Urgences, Bloc opératoire, Achats, Stock, Notifications, Messagerie, Interopérabilité restent absents. Rapports, GED et Portail Patient ont une route et une garde de permission, mais pas de contenu.

**§10 — Internationalisation : non faite.** Les libellés restent codés en dur. BR-246 l'interdit ; l'écart subsiste. C'est un chantier qui touche chaque composant de l'application.

**§11 — PDF : non fait.** `jspdf` est installé et `src/lib/utils.ts` amorce un en-tête, mais les trois modèles premium et l'archivage systématique en GED restent à construire.

Ces quatre points représentent, à eux seuls, un volume comparable à celui des phases 3 à 6 réunies. Les annoncer faits aurait été malhonnête.

---

## 9. Contrôles finaux (§13)

| Contrôle | Résultat |
|---|---|
| Build | **passe** — 25 routes |
| TypeScript | **passe** — 0 erreur |
| ESLint | **passe** — 0 avertissement |
| Tests | **60 passés / 60** |
| Migrations exécutées | **oui, sur PostgreSQL 18.3** (PGlite, pas Supabase) |
| Types vérifiés | **oui** — 34 tables cohérentes |
| Code mort | aucun fichier orphelin |
| Données fictives | aucune |
| Permissions codées en dur | aucune |
| Conformité Blueprints / TD / UG | conforme sur le périmètre traité |
| Conformité LP-001 | conforme **sauf §7** (voir arbitrages) |

Commande unique : `npm run verify`.

---

## 10. Le projet est-il prêt pour la validation finale avant push ?

**Le socle technique, oui. Le produit fonctionnel, non.**

Ce qui est solide et vérifié : le schéma s'exécute, les types correspondent, l'isolation multi-tenant tient au niveau de PostgreSQL, la matrice de permissions respecte les User Guides, les abonnements et licences s'historisent seuls, le journal d'audit est inaltérable. Ce n'est plus une affirmation : c'est couvert par 60 tests reproductibles.

Ce qui manque pour un produit complet : quatre chantiers majeurs (workflows, modules restants, i18n, PDF) et surtout **la validation sur un vrai projet Supabase**, qui reste le seul juge de l'intégration Auth, Storage et Realtime.

**Ma recommandation :** un push serait défendable *maintenant* si l'objectif est de sauvegarder un socle sain et testé. Il serait prématuré si l'objectif est de livrer un produit utilisable par un établissement.

**Pour débloquer la suite, il me faut de vous :**
1. un projet Supabase réel avec ses trois clés dans `.env.local` ;
2. votre validation des quotas proposés en section 7 ;
3. votre décision sur l'écart LP-001 §7 (amender le document, ou retirer les prix).

**Rien n'a été poussé, publié ni déployé. J'attends votre autorisation explicite.**
