# MORACare Enterprise
## Documentation Technique

---

# Document

**Nom :** Architecture Technique Générale

**Référence :** TD-001

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit l'architecture technique générale de MORACare Enterprise.

Il constitue la référence technique principale du projet et décrit les choix technologiques, les principes d'architecture, les conventions de développement et les interactions entre les différents composants du système.

Tous les développements devront respecter les règles définies dans ce document.

---

# 2. Vision technique

MORACare Enterprise est conçu comme une plateforme SaaS moderne, modulaire et évolutive.

L'objectif est de fournir un système :

- fiable ;
- performant ;
- sécurisé ;
- maintenable ;
- extensible ;
- responsive ;
- facilement déployable.

L'architecture est pensée pour supporter plusieurs établissements de santé tout en garantissant l'isolation complète de leurs données.

---

# 3. Stack technique officielle

La version 1 de MORACare Enterprise repose exclusivement sur les technologies suivantes.

## Frontend

- React
- Next.js (App Router)
- TypeScript

---

## Backend

- Supabase

Utilisation des services suivants :

- Authentication
- PostgreSQL
- Storage
- Realtime
- Edge Functions
- Row Level Security

---

## Base de données

- PostgreSQL

---

## Hébergement

Compatible avec :

- Supabase Cloud
- VPS
- Serveur dédié
- Cloud privé

---

# 4. Architecture générale

L'application est organisée selon une architecture en couches.

```text
Utilisateur

↓

Interface React

↓

Services Métier

↓

API Supabase

↓

Base PostgreSQL

↓

Stockage
```

Chaque couche possède une responsabilité clairement définie.

---

# 5. Principes d'architecture

L'architecture repose sur les principes suivants :

- séparation des responsabilités ;
- modularité ;
- réutilisation des composants ;
- faible couplage ;
- forte cohésion ;
- évolutivité ;
- sécurité par conception.

---

# 6. Architecture modulaire

Chaque module métier est indépendant.

Exemples :

- Patients
- Consultations
- Hospitalisation
- Pharmacie
- Laboratoire
- Imagerie
- Finance
- RH
- GED

Les modules communiquent uniquement par des interfaces clairement définies.

---

# 7. Architecture SaaS

La plateforme est conçue pour héberger plusieurs établissements.

Chaque établissement dispose :

- de ses utilisateurs ;
- de ses patients ;
- de ses paramètres ;
- de ses documents ;
- de ses données.

L'isolation est garantie par les mécanismes de sécurité de la plateforme.

---

# 8. Online First

MORACare Enterprise adopte une approche **Online First**.

Le fonctionnement normal suppose une connexion au serveur.

Les fonctionnalités critiques dépendent de la disponibilité de la plateforme.

Des mécanismes de reprise pourront être ajoutés dans des versions futures pour certains scénarios spécifiques.

---

# 9. Progressive Web App

L'application est développée sous forme de Progressive Web App (PWA).

Elle peut être utilisée :

- sur ordinateur ;
- sur tablette ;
- sur smartphone.

Selon les capacités du navigateur, elle peut être installée comme une application.

---

# 10. Responsive Design

Toutes les interfaces doivent être compatibles avec :

- Desktop
- Laptop
- Tablette
- Smartphone

Aucune fonctionnalité ne doit être limitée à un seul type d'écran.

---

# 11. Gestion des états

Le système privilégie :

- état local lorsque cela est suffisant ;
- services partagés pour les données communes ;
- synchronisation avec Supabase.

La logique métier ne doit jamais être directement intégrée aux composants d'affichage.

---

# 12. Gestion des fichiers

Tous les fichiers sont stockés dans Supabase Storage.

Exemples :

- documents PDF ;
- résultats ;
- images ;
- logos ;
- signatures ;
- pièces jointes.

Les accès sont contrôlés par les permissions applicatives.

---

# 13. Génération des documents

Tous les documents officiels sont générés exclusivement au format PDF.

Les fichiers sont automatiquement archivés dans la GED.

---

# 14. Journalisation

Toutes les opérations importantes doivent être enregistrées.

Exemples :

- connexions ;
- modifications ;
- suppressions logiques ;
- téléchargements ;
- changements de permissions.

---

# 15. Sécurité

Les principes suivants sont obligatoires :

- authentification sécurisée ;
- contrôle des accès ;
- chiffrement des communications ;
- validation des entrées ;
- journalisation ;
- protection contre les injections ;
- protection contre les attaques courantes.

---

# 16. Internationalisation

Deux langues officielles sont supportées :

- Français
- Anglais

Toutes les traductions utilisent un catalogue centralisé.

Aucun texte fonctionnel ne doit être codé directement dans les composants.

---

# 17. Performances

Les objectifs techniques sont :

- temps de chargement réduit ;
- faible consommation mémoire ;
- optimisation des requêtes ;
- limitation des appels réseau ;
- mise en cache lorsque cela est pertinent.

---

# 18. Convention de développement

Les règles suivantes sont obligatoires :

- TypeScript strict.
- Aucun code dupliqué.
- Composants réutilisables.
- Fonctions courtes.
- Responsabilités clairement séparées.
- Documentation du code lorsque nécessaire.

---

# 19. Gestion des erreurs

Les erreurs doivent :

- être interceptées ;
- être journalisées ;
- afficher un message compréhensible à l'utilisateur ;
- ne jamais exposer d'informations sensibles.

---

# 20. Dépendances

Le présent document constitue la base technique de :

- TD-002 — Architecture de la Base de Données
- TD-003 — API REST & Intégrations
- TD-004 — Frontend React
- TD-005 — Backend & Supabase
- TD-006 — Sécurité Technique
- TD-007 — Déploiement & Exploitation
- TD-008 — Tests, Qualité & Validation

---

# 21. Conclusion

Le TD-001 définit les fondations techniques de MORACare Enterprise. Il formalise les choix technologiques, les principes d'architecture et les conventions de développement qui guideront l'ensemble du projet. Tous les développements futurs devront respecter ce document afin de garantir une plateforme cohérente, sécurisée, performante et évolutive.