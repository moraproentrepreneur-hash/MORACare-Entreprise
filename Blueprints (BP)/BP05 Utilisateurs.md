# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Utilisateurs

**Référence :** BP-005

**Version :** 2.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit tous les acteurs de l'écosystème MORACare Enterprise.

Il décrit leur rôle dans le système, leur cycle de vie et leurs interactions avec la plateforme.

Tous les modules du Blueprint devront respecter cette classification.

---

# 2. Principe général

Dans MORACare Enterprise, une personne ne devient pas automatiquement un utilisateur.

Une personne évolue progressivement dans l'écosystème selon un parcours précis.

Le logiciel distingue clairement :

- les visiteurs ;
- les demandeurs (prospects) ;
- les utilisateurs de la plateforme.

Cette séparation permet d'assurer un meilleur suivi commercial, une meilleure sécurité et une meilleure gestion des abonnements.

---

# 3. Les catégories d'acteurs

MORACare Enterprise distingue six catégories principales.

## 3.1 Visiteur

Le visiteur est une personne qui consulte le site internet de MORACare.

Il peut :

- découvrir les fonctionnalités ;
- consulter les tarifs ;
- consulter les plans d'abonnement ;
- demander des informations ;
- remplir un formulaire d'inscription.

Le visiteur ne possède aucun compte.

Il n'a accès à aucune donnée interne.

---

## 3.2 Demandeur (Prospect)

Le demandeur est un visiteur ayant soumis le formulaire d'inscription.

Une demande est automatiquement créée dans le module **Demandes d'inscription** du Super Administrateur.

Le demandeur n'a pas encore accès au logiciel.

Les informations enregistrées comprennent notamment :

- nom ;
- prénom ;
- téléphone ;
- e-mail ;
- pays ;
- ville ;
- nom de l'établissement ;
- type d'établissement ;
- formule choisie ;
- observations éventuelles.

Le demandeur constitue un prospect commercial.

---

## 3.3 Super Administration (MORA Shawiri)

Le Super Administrateur représente l'éditeur officiel de MORACare Enterprise.

Il possède un accès global à la plateforme d'administration.

Ses principales responsabilités sont :

- gérer les demandes d'inscription ;
- gérer les prospects ;
- créer les établissements ;
- gérer les abonnements ;
- activer les licences ;
- suspendre ou réactiver un établissement ;
- consulter les statistiques globales ;
- gérer les paramètres généraux ;
- assurer le support.

Le Super Administrateur n'intervient jamais dans les activités médicales quotidiennes d'un établissement.

---

## 3.4 Administrateur d'établissement

L'Administrateur d'établissement est créé automatiquement lors de l'activation d'un établissement.

Il reçoit ses identifiants générés par MORACare.

Ses responsabilités comprennent notamment :

- gérer les utilisateurs ;
- attribuer les rôles ;
- attribuer les permissions ;
- configurer l'établissement ;
- gérer les paramètres ;
- consulter les tableaux de bord ;
- superviser les activités.

Son accès est strictement limité à son établissement.

---

## 3.5 Personnel

Le personnel regroupe tous les collaborateurs de l'établissement.

Exemples :

- médecins ;
- dentistes ;
- infirmiers ;
- sages-femmes ;
- pharmaciens ;
- biologistes ;
- manipulateurs radio ;
- secrétaires ;
- agents d'accueil ;
- caissiers ;
- comptables ;
- responsables administratifs.

Chaque collaborateur dispose d'un rôle précis.

Les menus visibles dépendent exclusivement des permissions attribuées.

---

## 3.6 Patient

Le patient possède un espace personnel sécurisé.

Selon les fonctionnalités activées par l'établissement, il peut notamment :

- consulter ses rendez-vous ;
- consulter ses ordonnances ;
- consulter ses résultats ;
- télécharger certains documents ;
- consulter ses paiements ;
- mettre à jour certaines informations personnelles autorisées.

Le patient ne peut jamais accéder aux informations d'un autre patient.

---

# 4. Cycle de vie d'un établissement

Le parcours standard est le suivant.

Visiteur

↓

Soumission du formulaire

↓

Création d'une demande

↓

Analyse par le Super Administrateur

↓

Validation

↓

Paiement (selon la formule)

↓

Création automatique de l'établissement

↓

Création automatique du Responsable

↓

Envoi des identifiants

↓

Première connexion

↓

Utilisation de MORACare

---

# 5. Cas particulier : Plan Essai

Le plan Essai suit un fonctionnement spécifique.

Après validation du formulaire :

- l'établissement est créé automatiquement ;
- un compte Administrateur est généré automatiquement ;
- les identifiants sont transmis immédiatement ;
- le plan Essai est activé pour une durée de 3 jours.

Le Super Administrateur peut consulter cet établissement mais aucune validation manuelle n'est nécessaire.

---

# 6. Cas particulier : Plan Gratuit

Pour le plan Gratuit :

- le formulaire est enregistré ;
- une demande est créée ;
- le Super Administrateur analyse la demande ;
- il décide de l'accepter ou de la refuser.

En cas d'acceptation :

- l'établissement est créé ;
- le plan Gratuit est activé.

En cas de refus :

la demande est clôturée.

---

# 7. Cas des plans payants

Les plans Standard, Business et VIP suivent le même principe.

Le visiteur remplit le formulaire.

Une demande est créée.

Le Super Administrateur reçoit la demande.

Le paiement est attendu.

Après confirmation du paiement :

- création automatique de l'établissement ;
- création du Responsable ;
- activation de l'abonnement ;
- génération des identifiants ;
- envoi des informations de connexion.

---

# 8. Les demandes d'inscription

Toutes les demandes sont centralisées dans un module dédié.

Chaque demande possède un statut.

Les statuts possibles sont :

- Nouvelle demande
- En cours d'analyse
- Paiement attendu
- Paiement reçu
- Établissement créé
- Refusée
- Annulée

Chaque changement de statut est enregistré dans l'historique.

---

# 9. Création des utilisateurs

Les utilisateurs ne sont jamais créés directement dans la base de données.

Ils sont créés uniquement :

- lors de la création automatique d'un établissement ;
- par l'Administrateur de l'établissement ;
- par le Super Administrateur dans les cas exceptionnels.

Toutes les créations sont journalisées.

---

# 10. Suppression des utilisateurs

Les comptes utilisateurs ne sont jamais supprimés définitivement.

Ils peuvent être :

- désactivés ;
- archivés ;
- réactivés.

Cette règle garantit la traçabilité des actions.

---

# 11. Principes de sécurité

Tous les utilisateurs doivent respecter les principes suivants :

- authentification obligatoire ;
- mot de passe sécurisé ;
- permissions basées sur les rôles ;
- journalisation des connexions ;
- journalisation des actions importantes ;
- accès limité à l'établissement concerné.

---

# 12. Principes fondamentaux

Les règles suivantes sont obligatoires :

- un visiteur n'est pas un utilisateur ;
- un prospect n'est pas un utilisateur ;
- aucun établissement n'est créé sans workflow défini ;
- tous les utilisateurs appartiennent à un établissement ;
- toutes les actions sont traçables ;
- tous les comptes sont sécurisés ;
- toutes les demandes sont historisées.

---

# Conclusion

La gestion des acteurs constitue le point d'entrée de MORACare Enterprise.

En distinguant clairement les visiteurs, les prospects et les utilisateurs, la plateforme garantit une gestion commerciale efficace, une administration maîtrisée et une sécurité optimale dès la création d'un établissement.