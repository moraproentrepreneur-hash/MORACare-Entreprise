# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Rôles et permissions

**Référence :** BP-006

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit l'organisation des rôles et des permissions de MORACare Enterprise.

Il établit les règles de sécurité permettant de contrôler les accès à la plateforme.

Tous les menus, toutes les actions, toutes les données et tous les modules devront respecter ces règles.

---

# 2. Principes fondamentaux

La sécurité de MORACare repose sur les principes suivants :

- chaque utilisateur possède un rôle ;
- chaque rôle possède des permissions ;
- les permissions contrôlent les actions autorisées ;
- aucun accès n'est accordé par défaut ;
- toute action est vérifiée avant son exécution.

---

# 3. Les niveaux de sécurité

La plateforme distingue quatre niveaux.

## Niveau 1

Super Administration

## Niveau 2

Administration d'établissement

## Niveau 3

Personnel

## Niveau 4

Patient

Chaque niveau possède son propre périmètre.

---

# 4. Le rôle

Un rôle représente une fonction exercée dans un établissement.

Exemples :

- Administrateur
- Médecin
- Dentiste
- Infirmier
- Pharmacien
- Biologiste
- Secrétaire
- Caissier
- Comptable
- Directeur
- Patient

Un utilisateur possède un seul rôle principal.

---

# 5. Les permissions

Les permissions représentent les actions autorisées.

Une permission ne dépend jamais du nom du rôle.

Elle dépend uniquement des droits accordés.

Cela permet de créer de nouveaux rôles sans modifier le logiciel.

---

# 6. Types de permissions

Chaque permission appartient à l'une des catégories suivantes.

## Consultation

Voir les données.

## Création

Créer de nouvelles données.

## Modification

Modifier les données existantes.

## Suppression

Supprimer ou archiver.

## Validation

Valider certaines opérations.

## Export

Exporter des documents.

## Impression

Imprimer.

## Administration

Configurer le module.

---

# 7. Permissions par module

Chaque module possède son propre ensemble de permissions.

Exemple :

Patients

- Voir
- Créer
- Modifier
- Archiver
- Exporter
- Imprimer

Même principe pour :

- Consultations
- Hospitalisation
- Pharmacie
- Laboratoire
- Imagerie
- Finance
- RH
- Paramètres
- Rapports

---

# 8. Menus dynamiques

Les menus sont générés automatiquement.

Un utilisateur ne voit jamais :

- un module auquel il n'a pas accès ;
- un bouton interdit ;
- une page interdite ;
- une action interdite.

Les menus reflètent exclusivement les permissions.

---

# 9. Isolation des établissements

Les permissions ne permettent jamais d'accéder aux données d'un autre établissement.

Même un Administrateur possède uniquement des droits sur son établissement.

Le Super Administrateur constitue la seule exception.

---

# 10. Permissions spéciales

Certaines permissions sont réservées.

Exemples :

Créer un établissement.

Créer un abonnement.

Modifier un abonnement.

Suspendre un établissement.

Créer une licence.

Supprimer une licence.

Ces permissions sont exclusivement réservées au Super Administrateur.

---

# 10 bis. Séparation du Super Administrateur et des activités cliniques

Le Super Administrateur (MORA Shawiri) administre **exclusivement la plateforme SaaS**.

Il n'intervient **jamais** dans les activités cliniques quotidiennes des établissements.

**BR-SA-001** — Le Super Administrateur ne dispose d'aucun accès aux modules de soins, notamment :

- Patients ;
- Rendez-vous ;
- Consultations ;
- Hospitalisation ;
- Pharmacie ;
- Laboratoire ;
- Imagerie.

Son périmètre se limite à :

- la gestion des établissements clients ;
- les abonnements et les licences ;
- les utilisateurs globaux ;
- les paramètres globaux de la plateforme ;
- la supervision, les journaux et les sauvegardes.

Cette séparation est appliquée à trois niveaux :

- l'interface, qui n'affiche jamais les modules de soins au Super Administrateur ;
- le routage, qui interdit l'accès aux espaces cliniques ;
- la base de données, dont les politiques de sécurité constituent le contrôle final.

Cette règle prolonge et rend normatif le principe énoncé dans UG-001 §1 :
« L'administrateur n'intervient pas dans les activités médicales quotidiennes des établissements. »

---

# 11. Délégation

L'Administrateur d'établissement peut :

- créer des utilisateurs ;
- attribuer des rôles ;
- attribuer des permissions.

Il ne peut jamais créer un rôle supérieur au sien.

---

# 12. Héritage

Les permissions ne sont jamais héritées automatiquement.

Chaque rôle possède sa propre configuration.

Cette règle évite les privilèges involontaires.

---

# 13. Journalisation

Toutes les actions sensibles sont enregistrées.

Exemples :

- connexion ;
- déconnexion ;
- création ;
- modification ;
- suppression ;
- validation ;
- changement de rôle ;
- changement de permission.

Le journal ne peut pas être modifié.

---

# 14. Sécurité

Toute tentative d'accès non autorisé est refusée.

Aucune donnée ne doit être renvoyée au navigateur avant la vérification des permissions.

Les contrôles sont réalisés côté serveur.

---

# 15. Évolutivité

Le système doit permettre :

- d'ajouter de nouveaux rôles ;
- d'ajouter de nouvelles permissions ;
- d'ajouter de nouveaux modules ;

sans modifier l'architecture de sécurité.

---

# 16. Principes obligatoires

Les règles suivantes sont impératives.

- Aucun accès sans authentification.
- Aucune permission implicite.
- Tous les menus sont dynamiques.
- Toutes les actions sont contrôlées.
- Toutes les actions importantes sont journalisées.
- Les données sont isolées par établissement.
- Les permissions sont indépendantes des rôles.

---

# Conclusion

Le système de rôles et de permissions constitue le socle de sécurité de MORACare Enterprise.

Toutes les fonctionnalités du logiciel devront respecter strictement les principes définis dans ce document.

Aucune exception ne devra être introduite sans modification préalable du Blueprint.