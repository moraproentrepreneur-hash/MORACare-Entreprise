# MORACare Enterprise
## Documentation Technique

---

# Document

**Nom :** Architecture de la Base de Données

**Référence :** TD-002

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit l'architecture de la base de données de MORACare Enterprise.

Il décrit les principes de modélisation, les conventions de nommage, les relations entre les entités, les règles d'intégrité, les stratégies d'optimisation ainsi que les exigences de sécurité.

Toutes les structures de données du système devront respecter ce document.

---

# 2. Système de gestion de base de données

La base de données officielle de MORACare Enterprise est :

- PostgreSQL

Elle est administrée par Supabase.

Les fonctionnalités utilisées incluent :

- PostgreSQL 16+
- Row Level Security (RLS)
- Fonctions SQL
- Triggers
- Views
- Materialized Views
- Index
- JSONB
- Extensions PostgreSQL compatibles Supabase

---

# 3. Principes de conception

La base de données repose sur les principes suivants :

- normalisation des données ;
- intégrité référentielle ;
- évolutivité ;
- haute performance ;
- sécurité native ;
- traçabilité complète.

---

# 4. Architecture logique

La base est organisée autour de grands domaines fonctionnels :

- Administration
- Établissements
- Utilisateurs
- Patients
- Rendez-vous
- Consultations
- Hospitalisations
- Bloc opératoire
- Pharmacie
- Laboratoire
- Imagerie
- Finance
- RH
- Stock
- Achats
- GED
- Notifications
- Audit

Chaque domaine est composé de plusieurs tables spécialisées.

---

# 5. Identifiants

Chaque enregistrement possède :

- un UUID interne ;
- une référence métier.

Exemple :

UUID :

```
8d5c18d5-67bc-43e1...
```

Référence métier :

```
MORA-PAT-A000154
```

Le UUID est utilisé exclusivement par le système.

La référence métier est utilisée dans l'interface utilisateur.

---

# 6. Conventions de nommage

## Tables

- snake_case
- nom au pluriel

Exemples :

```
patients
consultations
appointments
employees
pharmacy_orders
```

---

## Colonnes

Toujours :

```
snake_case
```

Exemple :

```
created_at
updated_at
deleted_at
first_name
last_name
birth_date
```

---

## Clés primaires

Toujours :

```
id UUID PRIMARY KEY
```

---

## Clés étrangères

Toujours :

```
patient_id
doctor_id
consultation_id
invoice_id
```

---

# 7. Colonnes standards

Toutes les tables métier doivent contenir au minimum :

```
id

business_reference

created_at

updated_at

created_by

updated_by

deleted_at

establishment_id
```

Ces colonnes assurent la traçabilité et l'isolation des données.

---

# 8. Références métier

Les références métier sont générées automatiquement.

Elles sont :

- uniques ;
- séquentielles ;
- non modifiables ;
- permanentes.

La logique de génération est définie dans BP-028B.

---

# 9. Relations

Les relations utilisent :

- One to One
- One to Many
- Many to Many

Les tables de liaison sont utilisées lorsque nécessaire.

Exemple :

```
consultations

↓

consultation_diagnoses

↓

diagnoses
```

---

# 10. Intégrité référentielle

Toutes les relations utilisent des clés étrangères.

Les suppressions physiques sont interdites pour les données critiques.

La suppression logique est privilégiée.

---

# 11. Historisation

Toutes les données critiques conservent leur historique.

Les anciennes valeurs peuvent être consultées via :

- tables d'historique ;
- journal d'audit.

---

# 12. Soft Delete

La suppression logique est réalisée à l'aide de :

```
deleted_at
```

Un enregistrement supprimé reste présent dans la base.

---

# 13. Audit Trail

Toutes les opérations importantes sont historisées.

Pour chaque modification sont enregistrés :

- utilisateur ;
- date ;
- heure ;
- ancienne valeur ;
- nouvelle valeur ;
- adresse IP ;
- type d'opération.

---

# 14. Multi-établissements

Toutes les données métier sont liées à :

```
establishment_id
```

Cette colonne permet :

- l'isolation des données ;
- les politiques RLS ;
- la sécurité SaaS.

---

# 15. Row Level Security

Toutes les tables métier utilisent les politiques RLS.

Les utilisateurs ne peuvent accéder qu'aux données autorisées.

Les politiques sont appliquées directement dans PostgreSQL.

---

# 16. Indexation

Les index sont créés sur :

- UUID ;
- références métier ;
- clés étrangères ;
- dates ;
- recherches fréquentes ;
- colonnes de filtrage.

Les index inutilisés doivent être évités.

---

# 17. Performances

Les règles suivantes sont appliquées :

- limitation des jointures inutiles ;
- pagination ;
- optimisation SQL ;
- index adaptés ;
- vues matérialisées lorsque nécessaire.

---

# 18. Transactions

Toutes les opérations critiques utilisent des transactions PostgreSQL.

Exemples :

- création d'une facture ;
- paiement ;
- hospitalisation ;
- prescription ;
- mouvement de stock.

Les transactions garantissent l'intégrité des données.

---

# 19. Sauvegardes

Les sauvegardes doivent permettre :

- restauration complète ;
- restauration partielle ;
- reprise après incident.

Les sauvegardes sont automatisées.

---

# 20. Sécurité

Les données sensibles sont protégées par :

- chiffrement des communications (TLS) ;
- politiques RLS ;
- contrôle des accès ;
- authentification Supabase.

Les mots de passe ne sont jamais stockés en clair.

---

# 21. Stockage documentaire

Les fichiers ne sont jamais enregistrés directement dans PostgreSQL.

La base conserve uniquement :

- identifiant ;
- chemin ;
- métadonnées ;
- propriétaire ;
- permissions.

Les fichiers sont stockés dans Supabase Storage.

---

# 22. Évolutivité

Le modèle de données permet :

- l'ajout de nouvelles tables ;
- l'ajout de nouveaux modules ;
- l'ajout de nouveaux établissements ;
- l'ajout de nouveaux référentiels.

Sans remise en cause de l'architecture existante.

---

# 23. Contraintes techniques

Toutes les tables doivent respecter :

- UUID obligatoire ;
- establishment_id obligatoire (hors tables système) ;
- timestamps automatiques ;
- contraintes NOT NULL lorsque nécessaire ;
- clés étrangères ;
- contraintes d'unicité adaptées.

---

# 24. Dépendances

Ce document complète :

- TD-001 — Architecture Technique Générale

Il sert de base à :

- TD-003 — API REST & Intégrations
- TD-004 — Frontend React
- TD-005 — Backend & Supabase

---

# 25. Conclusion

L'architecture de la base de données de MORACare Enterprise est conçue pour garantir l'intégrité, la sécurité, les performances et l'évolutivité de la plateforme. L'utilisation de PostgreSQL et des fonctionnalités avancées de Supabase permet de répondre aux exigences d'un système d'information hospitalier moderne, multi-établissements et hautement sécurisé. Toutes les évolutions futures devront respecter les principes définis dans ce document afin d'assurer la cohérence technique de l'ensemble du projet.