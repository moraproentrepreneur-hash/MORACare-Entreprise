# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Authentification et gestion des sessions

**Référence :** BP-010

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit les règles officielles d'authentification, de gestion des sessions et de contrôle d'accès de MORACare Enterprise.

Toutes les connexions à la plateforme devront respecter les principes décrits dans ce document.

---

# 2. Objectifs

Le système d'authentification doit garantir :

- la sécurité des utilisateurs ;
- la confidentialité des données ;
- la traçabilité des connexions ;
- l'isolation des établissements ;
- une expérience utilisateur fluide.

---

# 3. Principes fondamentaux

Les règles suivantes sont obligatoires :

- toute connexion nécessite une authentification ;
- chaque session appartient à un seul utilisateur ;
- un utilisateur appartient à un seul établissement ;
- les permissions sont vérifiées à chaque requête ;
- les données sont filtrées selon l'établissement.

---

# 4. Méthode d'authentification

L'authentification est assurée par Supabase Auth.

Chaque utilisateur dispose :

- d'une adresse e-mail unique ;
- d'un mot de passe sécurisé.

L'adresse e-mail constitue l'identifiant principal de connexion.

---

# 5. Création des comptes

Les comptes ne peuvent être créés que :

- automatiquement lors de la création d'un établissement ;
- par l'Administrateur de l'établissement ;
- par le Super Administrateur dans les cas prévus.

Les inscriptions libres d'utilisateurs sont interdites.

---

# 6. Première connexion

Lors de la première connexion :

- l'utilisateur utilise le mot de passe temporaire reçu ;
- il est invité à définir un nouveau mot de passe ;
- le mot de passe temporaire devient immédiatement invalide.

Cette étape est obligatoire.

---

# 7. Gestion des mots de passe

Les mots de passe doivent :

- être chiffrés ;
- ne jamais être stockés en clair ;
- respecter les exigences minimales de sécurité définies par Supabase.

Le système doit permettre :

- la modification du mot de passe ;
- la réinitialisation sécurisée ;
- l'envoi d'un lien de récupération par e-mail.

---

# 8. Gestion des sessions

Une session est créée après authentification réussie.

Chaque session est liée :

- à un utilisateur ;
- à un établissement ;
- à un rôle.

Une session expirée nécessite une nouvelle authentification.

---

# 9. Contrôle des accès

À chaque requête, le système vérifie :

- l'identité de l'utilisateur ;
- son rôle ;
- ses permissions ;
- le statut de son établissement ;
- le statut de son abonnement.

Si l'une de ces vérifications échoue, l'accès est refusé.

---

# 10. Établissements suspendus

Lorsqu'un établissement est suspendu :

- toutes les nouvelles connexions sont refusées ;
- les sessions actives peuvent être interrompues ;
- les données restent conservées.

Le Super Administrateur conserve l'accès à des fins d'assistance.

---

# 11. Journalisation

Toutes les opérations suivantes sont enregistrées :

- connexion ;
- déconnexion ;
- échec de connexion ;
- changement de mot de passe ;
- réinitialisation du mot de passe ;
- fermeture de session.

Chaque événement est horodaté.

---

# 12. Déconnexion

L'utilisateur peut se déconnecter à tout moment.

La déconnexion détruit la session active.

Les jetons d'accès deviennent invalides selon les règles définies par Supabase.

---

# 13. Sécurité

Les principes suivants sont obligatoires :

- aucune donnée n'est renvoyée avant authentification ;
- aucune permission n'est accordée sans vérification ;
- aucun utilisateur ne peut accéder aux données d'un autre établissement ;
- toutes les communications utilisent HTTPS.

---

# 14. Règles métier

BR-010 : Toute connexion nécessite une authentification.

BR-011 : Chaque utilisateur appartient à un seul établissement.

BR-012 : Les inscriptions directes d'utilisateurs sont interdites.

BR-013 : Le mot de passe temporaire est remplacé lors de la première connexion.

BR-014 : Les permissions sont contrôlées à chaque requête.

BR-015 : Un établissement suspendu interdit les nouvelles connexions.

BR-016 : Toutes les connexions sont journalisées.

---

# 15. Dépendances

Ce document s'appuie sur :

- BP-004 – Architecture fonctionnelle
- BP-005 – Utilisateurs
- BP-006 – Rôles et permissions
- BP-009 – Gestion des établissements et des abonnements

Les documents suivants devront respecter ces règles :

- BP-011 – Architecture de la base de données
- BP-012 – Architecture des modules
- BP-013 – Workflows métier
- Tous les développements API

---

# Conclusion

L'authentification constitue la première barrière de sécurité de MORACare Enterprise.

Toutes les connexions, tous les accès et toutes les opérations sensibles devront respecter strictement les règles définies dans ce document afin de garantir la confidentialité, l'intégrité et la disponibilité des données.