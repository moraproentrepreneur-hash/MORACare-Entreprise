# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Utilisateurs, Rôles & Contrôle d'Accès

**Référence :** BP-026A

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le système de gestion des utilisateurs, des rôles, des profils, des permissions et du contrôle d'accès (Identity & Access Management - IAM) de MORACare Enterprise.

Ce module garantit que chaque utilisateur accède uniquement aux informations et aux fonctionnalités autorisées selon son rôle, ses responsabilités, son établissement et son niveau d'habilitation.

Il constitue le point central de la sécurité fonctionnelle de l'application.

---

# 2. Objectifs

Le module permet de :

- gérer les utilisateurs ;
- contrôler les accès ;
- attribuer les rôles ;
- administrer les permissions ;
- sécuriser les connexions ;
- appliquer le principe du moindre privilège ;
- assurer la traçabilité des accès.

---

# 3. Périmètre

Le module couvre :

- Comptes utilisateurs
- Authentification
- Profils
- Rôles
- Groupes
- Permissions
- Affectations
- Sessions
- Connexions
- Délégations
- Politiques d'accès
- Gestion multisite
- Journal des connexions

---

# 4. Comptes utilisateurs

Chaque utilisateur possède un compte unique comprenant notamment :

- UUID
- Référence métier
- Nom
- Prénoms
- Identifiant
- Adresse email
- Téléphone
- Photo (option)
- Statut
- Date de création
- Dernière connexion

Exemple de référence :

MORA-USR-A000001

---

# 5. Catégories d'utilisateurs

Le système prend en charge notamment :

- Super Administrateur
- Administrateur
- Direction Générale
- Direction Médicale
- Direction Financière
- Responsable RH
- Médecin
- Chirurgien
- Infirmier
- Sage-femme
- Pharmacien
- Biologiste
- Manipulateur Radio
- Réceptionniste
- Caissier
- Comptable
- Magasinier
- Technicien
- Auditeur
- Invité

Ces catégories sont configurables.

---

# 6. Statuts des comptes

Un compte peut être :

- En attente
- Actif
- Suspendu
- Désactivé
- Bloqué
- Archivé

---

# 7. Authentification

Le système prend en charge :

- identifiant + mot de passe ;
- adresse email + mot de passe ;
- authentification par numéro professionnel (option) ;
- authentification multifacteur (MFA) ;
- authentification via fournisseur d'identité externe (SSO, LDAP, OAuth selon configuration).

Les politiques d'authentification sont paramétrables.

---

# 8. Profils utilisateurs

Chaque utilisateur dispose d'un profil comprenant :

- établissement ;
- département ;
- service ;
- fonction ;
- langue ;
- fuseau horaire ;
- préférences d'interface ;
- signature électronique (si autorisée).

---

# 9. Gestion des rôles

Les rôles déterminent les responsabilités fonctionnelles.

Un utilisateur peut posséder :

- un rôle principal ;
- plusieurs rôles secondaires.

Exemples :

- Médecin + Chef de service
- Pharmacien + Responsable stock
- Comptable + Caissier

---

# 10. Permissions

Les permissions sont attribuées de manière granulaire.

Exemples :

- créer ;
- consulter ;
- modifier ;
- valider ;
- supprimer logiquement ;
- exporter ;
- imprimer ;
- signer ;
- approuver ;
- clôturer ;
- annuler.

Les permissions peuvent être définies par module, fonctionnalité ou action.

---

# 11. Contrôle d'accès

Les accès peuvent être limités selon :

- le rôle ;
- l'établissement ;
- le département ;
- le service ;
- l'unité ;
- le type de document ;
- le statut du dossier ;
- les horaires d'accès (option).

---

# 12. Gestion multisite

Dans une organisation multisite, les droits peuvent être :

- globaux ;
- limités à un établissement ;
- limités à plusieurs établissements.

Les données restent cloisonnées selon les règles de gouvernance définies.

---

# 13. Délégation des droits

Le système permet une délégation temporaire de certaines permissions.

Chaque délégation précise :

- délégant ;
- délégataire ;
- période de validité ;
- permissions concernées.

Toutes les délégations sont historisées.

---

# 14. Gestion des sessions

Le système enregistre :

- ouverture de session ;
- fermeture ;
- durée ;
- adresse IP ;
- navigateur ;
- appareil utilisé.

Les sessions inactives sont automatiquement fermées selon la politique de sécurité.

---

# 15. Réinitialisation des accès

Le module permet :

- changement volontaire du mot de passe ;
- réinitialisation par administrateur ;
- réinitialisation sécurisée par email ou SMS ;
- expiration automatique des mots de passe (si activée).

---

# 16. Journal des connexions

Chaque connexion enregistre :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- appareil ;
- localisation approximative (option) ;
- résultat (succès ou échec).

---

# 17. Notifications

Le système peut notifier :

- création d'un compte ;
- modification des droits ;
- connexion inhabituelle ;
- plusieurs tentatives de connexion échouées ;
- réinitialisation du mot de passe ;
- expiration des accès temporaires.

---

# 18. Permissions administratives

Les administrateurs autorisés peuvent :

- créer un utilisateur ;
- suspendre un compte ;
- attribuer un rôle ;
- modifier les permissions ;
- déléguer des droits ;
- réinitialiser un mot de passe ;
- consulter les journaux de connexion.

Toutes ces opérations sont tracées.

---

# 19. Sécurité

Le système garantit :

- chiffrement des mots de passe ;
- protection contre les attaques par force brute ;
- verrouillage automatique après plusieurs échecs de connexion ;
- expiration des sessions inactives ;
- principe du moindre privilège ;
- séparation des responsabilités (Segregation of Duties).

---

# 20. Audit Trail

Chaque opération conserve :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- ancienne valeur ;
- nouvelle valeur ;
- justification.

Aucune suppression physique des comptes n'est autorisée.

---

# 21. Workflow

Création du compte

↓

Attribution du rôle

↓

Configuration des permissions

↓

Activation

↓

Connexion

↓

Utilisation

↓

Modification des droits (si nécessaire)

↓

Suspension ou archivage

---

# 22. Règles métier

BR-204 : Chaque utilisateur possède un UUID et une référence métier uniques.

BR-205 : Un compte ne peut être attribué qu'à une seule personne.

BR-206 : Les permissions sont accordées selon les rôles et les habilitations.

BR-207 : Un utilisateur ne peut accéder qu'aux données autorisées.

BR-208 : Toute connexion est enregistrée.

BR-209 : Les comptes suspendus ne peuvent pas ouvrir de session.

BR-210 : Les délégations possèdent une date de début et de fin.

BR-211 : Les mots de passe sont stockés sous forme chiffrée (hachage sécurisé).

BR-212 : Les suppressions physiques des comptes sont interdites.

BR-213 : Toute modification des droits est historisée.

---

# 23. Dépendances

Ce module est transversal et interagit avec :

- Tous les modules de MORACare Enterprise
- BP-025 – Gestion Documentaire
- Audit
- Notifications
- Sécurité

---

# Conclusion

Le BP-026A établit le socle de gouvernance des identités et des accès de MORACare Enterprise. Il garantit une gestion centralisée des utilisateurs, des rôles et des permissions, tout en assurant la confidentialité des données, la traçabilité des accès et le respect du principe du moindre privilège. Ce module constitue une brique essentielle pour sécuriser l'ensemble du système d'information hospitalier.