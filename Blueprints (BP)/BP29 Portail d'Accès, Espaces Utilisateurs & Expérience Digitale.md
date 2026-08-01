# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Portail d'Accès, Espaces Utilisateurs & Expérience Digitale

**Référence :** BP-029

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le portail d'accès de MORACare Enterprise.

Le portail constitue l'unique point d'entrée de tous les utilisateurs de la plateforme. Il oriente automatiquement chaque utilisateur vers son espace de travail selon son profil et ses autorisations.

Le portail offre une expérience simple, sécurisée et adaptée aux besoins des responsables d'établissements, du personnel de santé et des patients.

---

# 2. Objectifs

Le module permet de :

- centraliser l'accès à la plateforme ;
- orienter automatiquement les utilisateurs ;
- sécuriser l'authentification ;
- offrir une expérience adaptée à chaque profil ;
- permettre aux patients de consulter leurs informations médicales autorisées ;
- faciliter les échanges entre les établissements et leurs patients.

---

# 3. Périmètre

Le portail couvre :

- Accueil
- Authentification
- Orientation des utilisateurs
- Portail Responsable
- Portail Personnel
- Portail Patient
- Tableau de bord
- Dossier médical personnel
- Rendez-vous
- Documents
- Facturation
- Paiements
- Notifications
- Sécurité
- Audit

---

# 4. Profils utilisateurs

Le portail propose uniquement trois profils.

## Responsable d'une clinique

Destiné aux propriétaires, directeurs ou administrateurs d'établissements.

Accès :

- administration
- tableaux de bord
- gestion des utilisateurs
- gestion des abonnements
- gestion de l'établissement

---

## Personnel d'une clinique

Destiné au personnel autorisé.

Exemples :

- médecin
- infirmier
- pharmacien
- biologiste
- radiologue
- secrétaire
- réceptionniste
- comptable
- RH
- direction

Les permissions sont déterminées par le module BP-026A.

---

## Patient d'une clinique

Destiné exclusivement aux patients enregistrés dans un établissement utilisant MORACare.

Le patient accède uniquement à son espace personnel.

---

# 5. Écran d'accueil

Lors de son arrivée sur le portail, l'utilisateur choisit l'un des trois profils :

- Responsable d'une clinique
- Personnel d'une clinique
- Patient d'une clinique

Ce choix permet de rediriger automatiquement l'utilisateur vers l'interface adaptée.

Aucun autre profil n'est proposé.

---

# 6. Authentification

Chaque utilisateur s'authentifie avec :

- identifiant ;
- mot de passe.

Selon la politique de l'établissement, une authentification multifacteur peut être activée pour les responsables et le personnel.

---

# 7. Création des comptes

## Responsable

Le compte est créé lors de la création de l'établissement ou par un administrateur autorisé.

---

## Personnel

Les comptes sont créés uniquement par un administrateur de l'établissement.

---

## Patient

Les patients ne disposent d'aucune inscription libre.

Le compte patient est créé exclusivement par un utilisateur autorisé de l'établissement.

Le système génère automatiquement :

- l'identifiant de connexion ;
- un mot de passe temporaire.

Les identifiants sont remis directement au patient par le responsable de la clinique ou le réceptionniste.

Lors de la première connexion, le patient doit obligatoirement modifier son mot de passe.

---

# 8. Tableau de bord Patient

Le tableau de bord présente notamment :

- prochains rendez-vous ;
- consultations récentes ;
- hospitalisations ;
- résultats disponibles ;
- ordonnances ;
- factures ;
- paiements ;
- documents récents ;
- notifications.

---

# 9. Dossier médical personnel

Le patient peut uniquement consulter les informations autorisées.

Exemples :

- historique médical ;
- consultations ;
- diagnostics validés ;
- traitements ;
- allergies ;
- vaccinations ;
- constantes ;
- documents médicaux.

Aucune modification n'est autorisée.

---

# 10. Rendez-vous

Le patient peut :

- consulter ses rendez-vous ;
- demander un rendez-vous ;
- confirmer un rendez-vous ;
- reporter un rendez-vous ;
- annuler un rendez-vous selon les règles de l'établissement ;
- consulter son historique.

---

# 11. Résultats médicaux

Le patient peut consulter :

- résultats de laboratoire ;
- rapports d'imagerie ;
- comptes rendus médicaux ;
- certificats.

Les documents sont disponibles uniquement après validation par les professionnels de santé.

---

# 12. Ordonnances

Le patient peut consulter :

- ordonnances ;
- prescriptions ;
- renouvellements autorisés.

Les documents sont téléchargeables au format PDF.

---

# 13. Facturation

Le patient peut consulter :

- devis ;
- factures ;
- reçus ;
- paiements ;
- reste à payer.

---

# 14. Paiements

Selon les services activés par l'établissement, le patient peut effectuer des paiements en ligne.

Les moyens de paiement disponibles dépendent des intégrations configurées.

---

# 15. Documents

Le patient peut télécharger :

- ordonnances ;
- certificats ;
- résultats ;
- comptes rendus ;
- factures ;
- reçus.

Tous les documents sont générés exclusivement au format PDF.

---

# 16. Notifications

Les notifications destinées aux patients utilisent exclusivement les coordonnées enregistrées dans leur dossier administratif.

Canaux officiels :

- Email
- WhatsApp

Les notifications peuvent concerner :

- création du compte ;
- remise des identifiants ;
- confirmation de rendez-vous ;
- rappel de rendez-vous ;
- disponibilité des résultats ;
- disponibilité d'une ordonnance ;
- émission d'une facture ;
- confirmation d'un paiement ;
- sortie d'hospitalisation ;
- communication administrative.

Les coordonnées utilisées sont celles enregistrées par l'établissement.

Le patient ne peut pas modifier lui-même son adresse email ni son numéro WhatsApp depuis le portail.

Toute modification doit être effectuée par un utilisateur autorisé de la clinique.

---

# 17. Préférences

Le patient peut personnaliser :

- langue (Français ou Anglais) ;
- changement de mot de passe ;
- préférences d'affichage.

---

# 18. Sécurité

Le portail garantit :

- connexion sécurisée ;
- chiffrement des échanges ;
- expiration des sessions ;
- journalisation des connexions ;
- protection contre les accès non autorisés.

---

# 19. Audit Trail

Le système enregistre notamment :

- connexions ;
- déconnexions ;
- téléchargements ;
- consultations de documents ;
- modifications des préférences ;
- changements de mot de passe.

---

# 20. Workflow

Choix du profil

↓

Authentification

↓

Vérification des permissions

↓

Redirection vers l'espace correspondant

↓

Consultation des informations autorisées

↓

Téléchargement éventuel des documents

↓

Déconnexion

---

# 21. Règles métier

BR-271 : Le portail propose uniquement trois profils : Responsable d'une clinique, Personnel d'une clinique et Patient d'une clinique.

BR-272 : Le choix du profil détermine automatiquement l'espace utilisateur accessible.

BR-273 : Les comptes des responsables et du personnel sont créés exclusivement par un administrateur autorisé.

BR-274 : Les patients ne disposent d'aucune fonctionnalité d'inscription libre.

BR-275 : Le compte patient est créé uniquement par un utilisateur autorisé de l'établissement.

BR-276 : Lors de la création du compte patient, le système génère automatiquement un identifiant unique et un mot de passe temporaire.

BR-277 : Les identifiants de connexion sont remis directement au patient par le responsable de la clinique ou le réceptionniste.

BR-278 : Lors de sa première connexion, le patient est obligé de modifier son mot de passe.

BR-279 : Les notifications destinées aux patients sont envoyées exclusivement à l'adresse email et au numéro WhatsApp enregistrés dans leur dossier administratif.

BR-280 : Le patient ne peut pas modifier lui-même ses coordonnées de contact.

BR-281 : Les documents médicaux ne deviennent accessibles qu'après validation par un professionnel de santé autorisé.

BR-282 : Tous les documents téléchargés sont générés exclusivement au format PDF.

BR-283 : Toutes les connexions et consultations du portail sont journalisées.

BR-284 : Les données accessibles dans le portail respectent strictement les permissions définies par le système et les règles de confidentialité de l'établissement.

---

# 22. Dépendances

Le module interagit avec :

- BP-001 à BP-016 – Gestion des patients, consultations, rendez-vous et hospitalisations
- BP-019 – Pharmacie
- BP-020 – Laboratoire
- BP-021 – Imagerie Médicale
- BP-022A – Finance & Facturation
- BP-022B – Encaissements & Caisses
- BP-025 – Gestion Documentaire, GED & Archivage
- BP-026A – Utilisateurs, Rôles & Contrôle d'Accès
- BP-026B – Sécurité, Audit, Conformité & Cybersécurité
- BP-027A – Notifications, Communications & Messagerie
- BP-027B – Interopérabilité, API & Intégrations
- BP-028A – Administration Générale & Gouvernance du Système

---

# Conclusion

Le BP-029 définit le portail d'accès unifié de MORACare Enterprise. Il constitue la porte d'entrée unique de la plateforme et oriente chaque utilisateur vers son espace dédié selon son profil : Responsable d'une clinique, Personnel d'une clinique ou Patient d'une clinique. Grâce à une authentification sécurisée, une gestion centralisée des comptes, des notifications par Email et WhatsApp, un accès contrôlé aux informations médicales et une traçabilité complète des actions, ce portail garantit une expérience utilisateur simple, fiable et conforme aux exigences d'un système d'information hospitalier de niveau Enterprise.