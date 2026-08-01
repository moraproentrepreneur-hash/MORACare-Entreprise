# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Organigramme

**Référence :** BP-007

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit l'organisation hiérarchique de MORACare Enterprise.

Il précise les relations entre les différents niveaux de la plateforme et les responsabilités associées.

L'organigramme constitue la référence officielle pour la conception des modules, des menus, des permissions et des workflows.

---

# 2. Principe général

MORACare Enterprise est organisé selon une architecture hiérarchique.

Chaque niveau possède un périmètre clairement défini.

Un niveau supérieur peut administrer le niveau inférieur lorsque cela est prévu par les règles du Blueprint.

Aucun niveau inférieur ne peut administrer un niveau supérieur.

---

# 3. Niveau 1 : Éditeur

L'éditeur est MORA Shawiri.

Il est propriétaire de la plateforme MORACare Enterprise.

À ce niveau se trouve le Super Administrateur.

Responsabilités :

- gestion de la plateforme ;
- gestion des abonnements ;
- gestion des établissements ;
- gestion des demandes d'inscription ;
- gestion des licences ;
- supervision globale ;
- assistance ;
- statistiques globales ;
- configuration générale.

---

# 4. Niveau 2 : Établissement

Chaque établissement est indépendant.

Il possède :

- une identité ;
- un abonnement ;
- des paramètres ;
- des utilisateurs ;
- des modules activés ;
- ses propres données.

Les établissements ne communiquent jamais entre eux.

---

# 5. Niveau 3 : Administration d'établissement

Chaque établissement possède au moins un Administrateur.

L'Administrateur est responsable de :

- la configuration de l'établissement ;
- la création des utilisateurs ;
- l'attribution des rôles ;
- l'attribution des permissions ;
- la gestion des paramètres internes.

Il agit exclusivement dans son établissement.

---

# 6. Niveau 4 : Personnel

Le personnel regroupe l'ensemble des collaborateurs.

Exemples :

- médecins ;
- dentistes ;
- infirmiers ;
- pharmaciens ;
- biologistes ;
- manipulateurs radio ;
- secrétaires ;
- comptables ;
- caissiers ;
- responsables administratifs.

Chaque collaborateur dépend de son Administrateur d'établissement.

---

# 7. Niveau 5 : Patients

Le patient constitue le dernier niveau de l'organisation.

Il ne participe pas à l'administration du logiciel.

Il dispose uniquement d'un espace personnel sécurisé lui permettant de consulter les informations que l'établissement met à sa disposition.

---

# 8. Relations hiérarchiques

La hiérarchie officielle est la suivante :

MORA Shawiri

↓

Super Administrateur

↓

Établissement

↓

Administrateur

↓

Personnel

↓

Patient

Cette hiérarchie ne peut être modifiée.

---

# 9. Responsabilités

## Super Administrateur

Responsable de la plateforme.

## Administrateur

Responsable de son établissement.

## Personnel

Responsable de son activité métier.

## Patient

Responsable de ses informations personnelles autorisées.

---

# 10. Flux de création

Le cycle de création suit toujours cet ordre :

Visiteur

↓

Prospect

↓

Validation

↓

Création de l'établissement

↓

Création du Responsable

↓

Création des utilisateurs

↓

Création des patients

Cette séquence est obligatoire.

---

# 11. Flux d'administration

Le Super Administrateur :

- crée les établissements ;
- active les abonnements ;
- gère les licences.

L'Administrateur :

- crée les utilisateurs ;
- configure l'établissement ;
- attribue les permissions.

Le Personnel :

- exerce son activité quotidienne.

Le Patient :

- consulte son espace personnel.

---

# 12. Principes d'organisation

Toutes les fonctionnalités devront respecter les règles suivantes :

- un seul Super Administrateur de plateforme ;
- un établissement est autonome ;
- chaque utilisateur appartient à un établissement ;
- aucun utilisateur ne peut appartenir simultanément à plusieurs établissements ;
- les données sont isolées par établissement ;
- les responsabilités sont clairement séparées.

---

# 13. Évolutivité

L'organigramme est conçu pour permettre :

- l'ajout de nouveaux rôles ;
- l'ajout de nouveaux services ;
- l'ajout de nouveaux modules ;

sans modifier la hiérarchie principale.

---

# Conclusion

L'organigramme définit la structure officielle de MORACare Enterprise.

Tous les développements futurs devront respecter cette hiérarchie afin de garantir une organisation cohérente, sécurisée et évolutive.