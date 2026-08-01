# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Architecture fonctionnelle

**Référence :** BP-004

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document décrit l'organisation fonctionnelle générale de MORACare Enterprise.

Il définit les grands espaces de la plateforme, leurs responsabilités, leurs interactions et les principes de fonctionnement qui serviront de base à tous les développements.

Aucun module ne devra être développé en contradiction avec cette architecture.

---

# 2. Principe général

MORACare Enterprise est une plateforme SaaS multi-établissements.

La plateforme est composée d'un noyau central administré par MORA Shawiri et de plusieurs espaces indépendants appartenant aux établissements de santé.

Chaque établissement possède son propre environnement sécurisé.

Les données sont totalement isolées entre les établissements.

---

# 3. Les espaces de la plateforme

L'architecture repose sur quatre espaces distincts.

## 3.1 Super Administration (MORA Shawiri)

Cet espace est exclusivement réservé à l'éditeur du logiciel.

Il permet de :

- gérer les abonnements ;
- gérer les établissements ;
- gérer les licences ;
- gérer les prospects ;
- superviser la plateforme ;
- consulter les statistiques globales ;
- administrer les paramètres généraux ;
- gérer les mises à jour ;
- gérer les plans tarifaires ;
- gérer les tickets d'assistance.

Le Super Administrateur n'intervient jamais dans les activités médicales d'un établissement.

---

## 3.2 Espace Établissement

Chaque établissement dispose d'un espace totalement indépendant.

Cet espace regroupe :

- les utilisateurs ;
- les patients ;
- les consultations ;
- les rendez-vous ;
- la pharmacie ;
- le laboratoire ;
- l'imagerie ;
- l'hospitalisation ;
- la facturation ;
- la finance ;
- les rapports ;
- les paramètres.

Toutes les données sont propres à l'établissement.

---

## 3.3 Espace Personnel

Le personnel accède uniquement aux modules autorisés selon son rôle.

Exemples :

- médecin ;
- dentiste ;
- infirmier ;
- secrétaire ;
- pharmacien ;
- biologiste ;
- radiologue ;
- comptable ;
- caissier ;
- administrateur interne.

Les menus visibles sont déterminés par les permissions attribuées.

---

## 3.4 Portail Patient

Le patient dispose d'un espace personnel lui permettant notamment de :

- consulter son profil ;
- consulter ses rendez-vous ;
- consulter ses ordonnances ;
- consulter ses résultats ;
- télécharger ses documents ;
- suivre ses paiements ;
- mettre à jour certaines informations personnelles.

Le patient ne peut jamais accéder aux données d'un autre patient.

---

# 4. Architecture modulaire

Chaque fonctionnalité de MORACare est organisée sous forme de module indépendant.

Les modules communiquent entre eux via les données de la plateforme.

Aucun module ne doit dupliquer des informations déjà disponibles dans un autre module.

---

# 5. Communication entre les modules

Les modules échangent automatiquement les informations nécessaires.

Exemples :

- un patient créé devient immédiatement disponible pour tous les modules autorisés ;
- une consultation peut générer une ordonnance ;
- une ordonnance peut alimenter la pharmacie ;
- un examen peut générer une demande au laboratoire ;
- une hospitalisation peut générer une facturation.

Les échanges sont réalisés automatiquement sans double saisie.

---

# 6. Gestion des accès

Chaque utilisateur appartient à un établissement.

Chaque utilisateur possède :

- un rôle ;
- un ensemble de permissions ;
- un niveau d'accès.

Les permissions déterminent :

- les menus visibles ;
- les actions autorisées ;
- les données accessibles.

---

# 7. Isolation des données

Les données sont cloisonnées à plusieurs niveaux :

- plateforme ;
- établissement ;
- utilisateur.

Un établissement ne peut jamais consulter les données d'un autre établissement.

Cette règle constitue un principe fondamental de MORACare Enterprise.

---

# 8. Activation des modules

Les modules disponibles dépendent :

- du type d'établissement ;
- de l'abonnement ;
- des paramètres ;
- des permissions.

Un module désactivé est totalement invisible pour les utilisateurs.

---

# 9. Flux général

Le fonctionnement global de la plateforme suit le cycle suivant :

Prospect

↓

Création de l'établissement

↓

Choix de l'abonnement

↓

Activation des modules

↓

Création de l'administrateur

↓

Création des utilisateurs

↓

Configuration initiale

↓

Utilisation quotidienne

↓

Rapports

↓

Renouvellement de l'abonnement

---

# 10. Extensibilité

L'architecture est conçue pour permettre l'ajout de nouveaux modules sans modifier les fondations de la plateforme.

Chaque nouveau module devra :

- respecter les règles de sécurité ;
- respecter les permissions ;
- utiliser les services communs ;
- s'intégrer aux autres modules sans duplication des données.

---

# 11. Règles fondamentales

Toutes les fonctionnalités développées devront respecter les règles suivantes :

- une seule source de vérité pour chaque donnée ;
- aucune duplication d'information ;
- architecture modulaire ;
- séparation stricte des responsabilités ;
- isolation complète des établissements ;
- menus pilotés par les permissions ;
- communication automatique entre les modules ;
- évolutivité permanente.

---

# Conclusion

L'architecture fonctionnelle constitue le socle de MORACare Enterprise.

Tous les documents du Blueprint devront être compatibles avec cette architecture.

Aucune évolution ne devra remettre en cause les principes définis dans ce document.