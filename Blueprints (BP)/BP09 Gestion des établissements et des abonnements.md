# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Gestion des établissements et des abonnements

**Référence :** BP-009

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit les règles officielles de gestion des établissements, des abonnements et des licences dans MORACare Enterprise.

Il décrit le cycle de vie d'un établissement depuis sa création jusqu'à sa désactivation.

Toutes les fonctionnalités du logiciel devront respecter ces règles.

---

# 2. Principes fondamentaux

Les règles suivantes sont obligatoires :

- chaque établissement est indépendant ;
- chaque établissement possède un abonnement ;
- chaque abonnement détermine les fonctionnalités disponibles ;
- les données d'un établissement sont totalement isolées ;
- un établissement ne peut jamais accéder aux données d'un autre.

---

# 3. Création d'un établissement

La création d'un établissement peut intervenir selon trois scénarios.

## Plan Essai

Création automatique après validation du formulaire.

Aucune intervention du Super Administrateur n'est requise.

Durée :

3 jours.

---

## Plan Gratuit

Le formulaire génère une demande.

Le Super Administrateur analyse la demande.

En cas d'acceptation :

- création de l'établissement ;
- création du compte Administrateur ;
- activation du plan Gratuit.

---

## Plans payants

Le formulaire génère une demande.

Le paiement est vérifié.

Après validation du paiement :

- création automatique de l'établissement ;
- création du Responsable ;
- activation de l'abonnement.

---

# 4. Les plans disponibles

Le logiciel propose quatre offres.

## Essai

Durée :

3 jours.

Objectif :

Découverte complète de MORACare.

---

## Gratuit

Version permanente avec limitations.

Activation après validation du Super Administrateur.

---

## Standard

Version destinée aux petits établissements.

---

## Business

Version destinée aux établissements en croissance.

---

## VIP

Version complète.

Toutes les fonctionnalités disponibles.

---

# 5. Gestion des abonnements

Chaque abonnement possède :

- une date de début ;
- une date de fin (sauf Gratuit) ;
- un statut ;
- un historique ;
- une formule.

Les changements sont historisés.

---

# 6. États possibles

Un abonnement peut être :

- En attente
- Actif
- Suspendu
- Expiré
- Résilié

Les changements de statut sont journalisés.

---

# 7. Suspension

Lorsqu'un abonnement est suspendu :

- les nouvelles connexions sont refusées ;
- les données sont conservées ;
- aucune suppression n'est effectuée.

Le Super Administrateur peut lever la suspension.

---

# 8. Renouvellement

Le renouvellement prolonge la durée de l'abonnement.

Aucune donnée n'est supprimée.

Aucune configuration n'est perdue.

---

# 9. Modules

Les fonctionnalités accessibles dépendent de la formule choisie.

Les modules sont activés ou désactivés automatiquement.

Les utilisateurs ne voient que les modules autorisés.

---

# 10. Limites

Chaque formule peut définir des limites concernant :

- le nombre d'utilisateurs ;
- le nombre de patients ;
- le stockage ;
- les modules disponibles ;
- les fonctionnalités avancées.

Ces limites sont contrôlées automatiquement.

---

# 11. Licences

Chaque établissement possède une licence active.

La licence est liée à :

- l'abonnement ;
- l'établissement ;
- la formule.

Une licence ne peut appartenir qu'à un seul établissement.

---

# 12. Historique

Toutes les opérations suivantes sont historisées :

- création ;
- activation ;
- renouvellement ;
- suspension ;
- réactivation ;
- changement de formule ;
- résiliation.

Aucun historique ne peut être supprimé.

---

# 13. Règles métier

BR-001 : Un établissement ne peut exister sans formule associée.

BR-002 : Le plan Essai est créé automatiquement.

BR-003 : Le plan Gratuit nécessite une validation du Super Administrateur.

BR-004 : Les plans payants nécessitent une validation du paiement.

BR-005 : Les données restent conservées après suspension.

BR-006 : Les modules dépendent de la formule.

BR-007 : Les limites sont contrôlées automatiquement.

BR-008 : Une licence appartient à un seul établissement.

BR-009 : Tous les changements sont historisés.

---

# 14. Principes obligatoires

Les règles suivantes sont impératives :

- aucun établissement ne partage ses données ;
- aucun abonnement n'est modifié sans historique ;
- aucune licence ne peut être dupliquée ;
- aucune suppression définitive d'établissement n'est autorisée ;
- toutes les activations sont journalisées.

---

# Conclusion

La gestion des établissements et des abonnements constitue le cœur administratif de MORACare Enterprise.

Toutes les fonctionnalités de la plateforme devront respecter les règles définies dans ce document afin de garantir une administration cohérente, sécurisée et évolutive.