# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Modèle de données métier

**Référence :** BP-011

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit le modèle de données métier de MORACare Enterprise.

Il identifie les principales entités manipulées par le logiciel ainsi que leurs relations fonctionnelles.

Ce document est indépendant de toute technologie (PostgreSQL, Supabase, API, ORM, etc.).

---

# 2. Principes fondamentaux

Toutes les données de MORACare reposent sur les principes suivants :

- une donnée appartient à une seule entité ;
- une entité possède une identité unique ;
- chaque relation est explicitement définie ;
- les données sont historisées lorsque nécessaire ;
- les données sont isolées par établissement.

---

# 3. Les grandes familles de données

Le modèle est organisé en huit domaines.

## Administration

- Établissement
- Abonnement
- Licence
- Utilisateur
- Rôle
- Permission

---

## Patients

- Patient
- Dossier médical
- Contact d'urgence
- Assurance

---

## Activité médicale

- Rendez-vous
- Consultation
- Diagnostic
- Prescription
- Ordonnance
- Certificat médical

---

## Hospitalisation

- Admission
- Chambre
- Lit
- Hospitalisation
- Sortie

---

## Examens

- Analyse de laboratoire
- Résultat
- Imagerie médicale
- Compte rendu

---

## Pharmacie

- Médicament
- Stock
- Prescription
- Dispensation

---

## Finance

- Facture
- Paiement
- Remboursement
- Reçu

---

## Journalisation

- Journal des actions
- Notifications
- Historique

---

# 4. Entités principales

Les entités principales sont :

- Établissement
- Utilisateur
- Patient
- Rendez-vous
- Consultation
- Facture

Toutes les autres entités gravitent autour de celles-ci.

---

# 5. Relations métier

Les principales relations sont :

Un établissement possède plusieurs utilisateurs.

Un établissement possède plusieurs patients.

Un patient possède plusieurs rendez-vous.

Un rendez-vous peut donner lieu à une consultation.

Une consultation peut produire :

- une ordonnance ;
- une prescription ;
- une demande d'examen ;
- une facture.

Une hospitalisation appartient toujours à un patient.

Une facture peut recevoir plusieurs paiements.

---

# 6. Identité des données

Chaque entité possède :

- un UUID technique ;
- une référence métier selon BP-008.

Les UUID sont utilisés en interne.

Les références métier sont visibles par les utilisateurs.

---

# 7. Historisation

Les données suivantes sont historisées :

- consultations ;
- prescriptions ;
- paiements ;
- abonnements ;
- changements de statut ;
- connexions ;
- modifications sensibles.

L'historique est permanent.

---

# 8. Suppression

Les données métier ne sont jamais supprimées définitivement.

Le système utilise :

- désactivation ;
- archivage ;
- suppression logique (Soft Delete).

Les suppressions physiques restent exceptionnelles et réservées aux opérations techniques.

---

# 9. Isolation des données

Toutes les données sont liées à un établissement.

Aucune relation ne peut exister entre deux établissements différents.

Cette règle est obligatoire.

---

# 10. Références métier

Toutes les entités métiers utilisent la nomenclature officielle définie dans BP-008.

Exemples :

MORA-DPAT-A0001

MORA-RDV-A0001

MORA-CONS-A0001

MORA-FACP-A0001

---

# 11. Intégrité

Le système garantit :

- l'unicité des références ;
- la cohérence des relations ;
- l'intégrité des données ;
- la traçabilité des modifications.

---

# 12. Règles métier

BR-017 : Chaque entité possède un UUID.

BR-018 : Chaque entité métier possède une référence officielle.

BR-019 : Les données sont isolées par établissement.

BR-020 : Les suppressions sont logiques.

BR-021 : Les relations entre entités doivent respecter l'intégrité métier.

BR-022 : Les historiques ne sont jamais supprimés.

---

# 13. Dépendances

Ce document dépend de :

- BP-004 – Architecture fonctionnelle
- BP-005 – Utilisateurs
- BP-006 – Rôles et permissions
- BP-008 – Nomenclature
- BP-009 – Gestion des établissements
- BP-010 – Authentification

Les documents suivants devront respecter ce modèle :

- Architecture de la base PostgreSQL
- Schéma Supabase
- API REST
- Services métier
- Workflows
- Rapports

---

# Conclusion

Le modèle de données métier constitue la référence fonctionnelle de MORACare Enterprise.

Toutes les implémentations techniques devront être conformes à ce modèle afin de garantir une architecture cohérente, évolutive et indépendante des technologies utilisées.