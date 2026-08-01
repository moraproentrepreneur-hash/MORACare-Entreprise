# Change-set documentaire — Officialisation Next.js & Référentiel unique des modules

**Objet :** préparer les deux mises à jour documentaires préalables à la Phase 3
**Décision actée :** la stack officielle de MORACare Enterprise est **Next.js**
**Statut :** propositions de rédaction. Aucun document normatif n'a été modifié.

---

# PARTIE 1 — Officialisation de Next.js

## 1.1 Portée réelle de la modification

Recherche exhaustive de `Vite`, `React Router`, `main.tsx`, `vite.config` sur les 61 documents :

| Dossier | Occurrences |
|---|---|
| `Blueprints (BP)` — 41 fichiers | **0** |
| `User Guides (UG)` — 12 fichiers | **0** |
| `Landing Page Officielle` | **0** |
| `Technical Documents (TD)` | **5** |

**Bonne nouvelle : seuls 2 fichiers sur 61 sont à modifier.** Les Blueprints, les User Guides et la Landing Page ne mentionnent aucune technologie frontend et restent valides tels quels.

Les 5 occurrences : `TD01` ligne 57 ; `TD04` lignes 47, 49, 119, 232.

---

## 1.2 TD01 — Architecture Technique Générale

### Modification unique — § 3 « Stack technique officielle », ligne 54-58

**Texte actuel :**
```markdown
## Frontend

- React
- Vite
- TypeScript
```

**Texte proposé :**
```markdown
## Frontend

- React
- Next.js (App Router)
- TypeScript
```

*Rien d'autre à modifier dans TD01.* Les sections Backend, Base de données et Hébergement restent exactes : Supabase, PostgreSQL et les modes d'hébergement listés sont tous compatibles avec Next.js.

---

## 1.3 TD04 — Architecture Frontend React

Quatre modifications.

### Modification 1 — § 2 « Technologies », lignes 44-52

**Texte actuel :**
```markdown
Le Frontend officiel repose exclusivement sur :

- React
- Vite
- TypeScript
- React Router
- Supabase JavaScript SDK

Aucun framework Frontend supplémentaire ne devra être utilisé sans validation de l'architecture.
```

**Texte proposé :**
```markdown
Le Frontend officiel repose exclusivement sur :

- React
- Next.js (App Router)
- TypeScript
- Supabase JavaScript SDK

Le routage est assuré nativement par le App Router de Next.js.

Aucun framework Frontend supplémentaire ne devra être utilisé sans validation de l'architecture.
```

### Modification 2 — § 5 « Structure du projet », lignes 102-122

Le point d'entrée `main.tsx` est une signature Vite qui n'existe pas sous Next.js. L'arborescence doit être réalignée sans perdre l'intention d'origine — une organisation par fonctionnalités, avec séparation stricte des services et des composants.

**Texte actuel :**
```text
src/

├── app/
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── lib/
├── pages/
├── routes/
├── services/
├── stores/
├── styles/
├── types/
├── utils/
└── main.tsx
```

**Texte proposé :**
```text
src/

├── app/          → routes et layouts (App Router)
├── assets/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── stores/
├── styles/
├── types/
└── utils/
```

**Justification des retraits :** sous App Router, `app/` porte nativement les routes et les layouts — les dossiers `pages/`, `routes/` et `layouts/` deviennent redondants et leur maintien créerait une ambiguïté. `main.tsx` n'a pas d'équivalent, le point d'entrée étant `app/layout.tsx`.

**Ce qui est délibérément conservé :** `features/`, `services/`, `hooks/`, `stores/` et `types/`. Ces dossiers portent des exigences d'architecture qui restent entièrement valables et que le code actuel ne respecte pas — notamment TD04 §13, « les composants ne doivent jamais appeler directement Supabase ». Ils sont au programme de l'étape 4 de la Phase 3.

### Modification 3 — § 9 « Routing », ligne 232

**Texte actuel :**
```markdown
Le routage utilise React Router.
```

**Texte proposé :**
```markdown
Le routage utilise le App Router de Next.js, basé sur l'arborescence du dossier `src/app/`.

Les routes privées sont protégées côté serveur par un middleware, conformément à TD06 §7 et BP06 §14.
```

**Point d'attention :** la liste des 9 routes qui suit (lignes 236-250) reste valable telle quelle. Elle est simplement réalisée par convention de dossiers plutôt que par déclaration. La mention du middleware est un **gain de conformité** : elle inscrit dans TD04 le contrôle d'accès côté serveur que TD06 §7 et BP06 §14 exigeaient déjà sans que TD04 n'en donne le moyen.

### Modification 4 — Titre du document

Le titre actuel, « Architecture Frontend React », reste exact et peut être conservé. S'il vous paraît utile de lever toute ambiguïté, « Architecture Frontend React / Next.js » convient.

---

## 1.4 Vérification après modification

```bash
# Doit ne retourner aucun résultat
grep -rn "Vite\|React Router\|main\.tsx" "Technical Documents (TD)/"
```

---

# PARTIE 2 — Référentiel unique des modules

## 2.1 Pourquoi les listes divergent

Les trois listes ne se contredisent pas par erreur : **elles répondent à trois questions différentes**. C'est la clé de l'arbitrage.

| Source | Nombre | Question à laquelle elle répond |
|---|---|---|
| **BP12 §4** | 12 | Quels modules l'utilisateur voit-il dans son menu ? |
| **BP31 §5** | 17 | Quelles familles de documentation structurent le projet ? |
| **LP-001 §6** | 16 | Que vend-on commercialement au prospect ? |
| **TD02 §4** | 18 | Quels domaines de données structurent la base ? |

Une seule de ces listes doit devenir **le référentiel technique** — celui qui pilote la table `modules`, les interrupteurs d'activation, les permissions et les plans d'abonnement. Les autres redeviennent des vues dérivées.

## 2.2 Tableau comparatif complet

| Module | BP12 | BP31 | LP-001 | TD02 | Blueprint dédié |
|---|:--:|:--:|:--:|:--:|---|
| Administration / Gouvernance | ✅ | ✅ | — | ✅ | BP28A |
| Établissements | ✅ | — | — | ✅ | BP28A / BP30 |
| Utilisateurs, Rôles, Permissions | ✅ | — | — | ✅ | BP26A |
| Patients | ✅ | ✅ | ✅ | ✅ | BP13 |
| Rendez-vous / Agenda | ✅ | *(implicite)* | ✅ | ✅ | BP14 |
| Consultations | ✅ | *(Activités médicales)* | ✅ | ✅ | BP15 |
| Hospitalisation | ✅ | ✅ | ✅ | ✅ | BP16 |
| **Urgences** | — | — | ✅ | — | **aucun** |
| **Bloc opératoire** | — | — | ✅ | ✅ | **aucun** |
| Pharmacie | ✅ | ✅ | ✅ | ✅ | BP19 |
| Laboratoire | ✅ | ✅ | ✅ | ✅ | BP20 |
| Imagerie | ✅ | ✅ | ✅ | ✅ | BP21 |
| **Achats & Logistique** | — | ✅ | — | ✅ | BP17 |
| **Stock & Inventaire** | — | ✅ | — | ✅ | BP18 |
| Finance / Facturation | ✅ | ✅ | ✅ | ✅ | BP22A-C |
| **Comptabilité** | *(dans Finance)* | *(dans Finance)* | ✅ *(séparé)* | *(dans Finance)* | BP22C |
| Ressources Humaines | ✅ | ✅ | ✅ | ✅ | BP23A-C |
| Rapports / BI / Statistiques | ✅ *(Rapports)* | ✅ *(BI)* | ✅ *(Statistiques)* | — | BP24A-B |
| **GED & Archivage** | — | ✅ | — | ✅ | BP25 |
| Sécurité & Audit | ✅ *(Journalisation)* | ✅ | — | ✅ | BP26B |
| **Notifications** | — | — | ✅ | ✅ | BP27A |
| **Messagerie** | — | — | ✅ | — | BP27A *(partiel)* |
| **Interopérabilité & API** | — | — | — | — | BP27B |
| Portail Patient | ✅ | ✅ | ✅ | — | BP29 |
| **Plateforme SaaS** | — | ✅ | — | — | BP30 |

## 2.3 Les deux anomalies à trancher

**Anomalie 1 — Quatre modules sont vendus sans être spécifiés.**
`Urgences`, `Bloc opératoire`, `Comptabilité` (comme module distinct) et `Messagerie` figurent sur la Landing Page, donc sont promis publiquement à des prospects, mais **aucun Blueprint ne les décrit**. `Bloc opératoire` apparaît bien comme domaine de données dans TD02 §4, sans spécification fonctionnelle. Il faut soit écrire les Blueprints manquants, soit les retirer de la Landing Page.

**Anomalie 2 — Quatre modules sont spécifiés sans être vendus.**
`Achats` (BP17), `Stock & Inventaire` (BP18), `GED` (BP25) et `Interopérabilité` (BP27B) disposent de Blueprints complets et détaillés mais n'apparaissent pas sur la Landing Page. C'est un manque à gagner commercial, alors que ce sont des arguments de vente forts auprès d'un hôpital.

## 2.4 Référentiel unique proposé — 21 modules

Principe retenu : **un module = un identifiant stable = un interrupteur d'activation = un Blueprint**. Les identifiants sont en `snake_case`, conformément à la convention de nommage de TD02 §6.

| # | Identifiant | Nom affiché | Blueprint | Espace |
|---|---|---|---|---|
| 1 | `administration` | Administration & Gouvernance | BP28A/B/C | Responsable |
| 2 | `utilisateurs` | Utilisateurs, Rôles & Permissions | BP26A | Responsable |
| 3 | `patients` | Gestion des Patients | BP13 | Personnel |
| 4 | `rendez_vous` | Rendez-vous & Agenda | BP14 | Personnel |
| 5 | `consultations` | Consultations & Prescriptions | BP15 | Personnel |
| 6 | `hospitalisation` | Hospitalisation & Lits | BP16 | Personnel |
| 7 | `urgences` | Urgences | ⚠️ à écrire | Personnel |
| 8 | `bloc_operatoire` | Bloc opératoire | ⚠️ à écrire | Personnel |
| 9 | `pharmacie` | Pharmacie | BP19 | Personnel |
| 10 | `laboratoire` | Laboratoire | BP20 | Personnel |
| 11 | `imagerie` | Imagerie Médicale | BP21 | Personnel |
| 12 | `achats` | Achats & Approvisionnements | BP17 | Personnel |
| 13 | `stock` | Stock & Inventaire | BP18 | Personnel |
| 14 | `finance` | Finance & Facturation | BP22A/B | Personnel |
| 15 | `comptabilite` | Trésorerie & Comptabilité | BP22C | Personnel |
| 16 | `rh` | Ressources Humaines | BP23A/B/C | Responsable |
| 17 | `rapports_bi` | Rapports, KPI & BI | BP24A/B | Responsable |
| 18 | `ged` | GED & Archivage | BP25 | Personnel |
| 19 | `notifications` | Notifications & Messagerie | BP27A | Transverse |
| 20 | `interoperabilite` | Interopérabilité & API | BP27B | Responsable |
| 21 | `portail_patient` | Portail Patient | BP29 | Patient |

**Hors référentiel, délibérément.** Trois éléments ne sont pas des modules activables et ne doivent pas figurer dans la table `modules` :
- **Sécurité & Audit (BP26B)** — transverse et **jamais désactivable**. Désactiver la journalisation serait une faille, pas une option. Répond d'ailleurs à la question laissée ouverte par BP28A §12 sur la notion de « module critique ».
- **Plateforme SaaS (BP30)** — appartient à l'espace Super Admin, qui n'est jamais soumis aux abonnements d'un établissement.
- **Établissements** — objet de gestion du Super Admin, pas module d'établissement.

## 2.5 Documents à mettre à jour pour la liste des modules

| Document | Section | Action |
|---|---|---|
| `BP12 Architecture modulaire.md` | §4 « Liste des modules » | Remplacer les 12 modules par les 21 du référentiel. **C'est ce document qui doit devenir la référence unique.** |
| `BP31 Référentiel Général…md` | §5 « Architecture fonctionnelle générale » | Remplacer les 17 familles par un renvoi explicite à BP12 §4, pour supprimer la source de divergence |
| `TD02 Architecture de la BDD.md` | §4 « Domaines fonctionnels » | Aligner les 18 domaines sur le référentiel, ou préciser qu'il s'agit de domaines de **données** et non de modules activables |
| `Landing Page Officielle.md` | §6 section 5 | Arbitrer les 4 modules vendus non spécifiés et les 4 spécifiés non vendus (§ 2.3) |
| `BP28A…md` | §12 | Définir « module critique » — la proposition §2.4 y répond |

---

# PARTIE 3 — Effet sur la Phase 3

Une fois ces mises à jour faites, la feuille de route du rapport d'audit s'applique **sans changement**, à trois précisions près :

1. **Étape 0 levée.** L'arbitrage de stack est acquis : Next.js. Aucune migration, aucune réorganisation préalable.
2. **Étape 7 débloquée.** Le module Paramètres pourra s'appuyer sur les 21 identifiants stables du référentiel, au lieu des trois listes concurrentes. La table `modules` et les interrupteurs d'activation en découleront directement.
3. **Le périmètre de l'étape 10 devient chiffrable.** Sur les 21 modules du référentiel, **12 disposent d'une amorce d'interface** dans le code actuel (dont `ged`, réduit à un libellé de 1,6 Ko) et **9 sont à créer intégralement** : `urgences`, `bloc_operatoire`, `achats`, `stock`, `comptabilite`, `rapports_bi`, `notifications`, `interoperabilite`, `portail_patient`. Parmi eux, 2 (`urgences`, `bloc_operatoire`) n'ont aucun Blueprint et ne sont donc pas spécifiés à ce jour.

La Phase 3 démarrera par l'étape 1 : réparer le build. Aucune de ces mises à jour documentaires n'en est un préalable — les étapes 1 à 6 (build, authentification, RLS, couche services, multi-tenant, permissions) sont indépendantes du référentiel des modules. **Seule l'étape 7 en dépend réellement.**
