# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Patients

**Référence :** BP-013

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Patients constitue le référentiel principal de MORACare Enterprise.

Il permet d'identifier de manière unique chaque patient, de gérer son dossier administratif et médical, d'assurer le suivi de son parcours de soins et de servir de point d'entrée à tous les autres modules de la plateforme.

Aucun acte médical ne peut être réalisé sans un patient enregistré.

---

# 2. Objectifs

Le module doit permettre :

- l'enregistrement des patients ;
- la gestion du dossier administratif ;
- la gestion du dossier médical ;
- la recherche rapide des patients ;
- le suivi du parcours de soins ;
- la gestion des documents ;
- la gestion des assurances ;
- la gestion des contacts d'urgence ;
- l'historisation complète des informations.

---

# 3. Sous-modules

Le module comprend :

- Enregistrement
- Recherche
- Fiche patient
- Dossier médical
- Contacts d'urgence
- Responsable légal
- Assurance
- Documents
- Historique
- Archivage
- Fusion de dossiers
- Alertes médicales

---

# 4. Référence du patient

Chaque patient reçoit automatiquement :

UUID technique

Référence métier

Format :

MORA-DPAT-A0001

La référence est permanente.

Elle ne change jamais.

---

# 5. Informations administratives

Le dossier administratif comprend notamment :

- Nom
- Prénom
- Sexe
- Date de naissance
- Âge calculé automatiquement
- Nationalité
- Profession
- Situation matrimoniale
- Adresse
- Ville
- Pays
- Téléphone principal
- Téléphone secondaire
- Email
- Photo
- Langue préférée

Selon les besoins de l'établissement :

- Numéro national d'identité
- Passeport
- Numéro de sécurité sociale
- Identifiant interne

Ces champs peuvent être rendus obligatoires ou facultatifs selon la configuration.

---

# 6. Informations médicales

Le dossier médical comprend notamment :

- Groupe sanguin
- Taille
- Poids
- Allergies
- Intolérances
- Pathologies chroniques
- Antécédents médicaux
- Antécédents chirurgicaux
- Traitements en cours
- Vaccinations
- Handicap
- Grossesse (si applicable)
- Observations générales

---

# 7. Contacts d'urgence

Le patient peut posséder plusieurs contacts.

Chaque contact contient :

- Nom
- Prénom
- Lien de parenté
- Téléphone
- Adresse
- Email
- Commentaires

---

# 8. Responsable légal

Pour les patients mineurs ou protégés :

- Nom
- Prénom
- Téléphone
- Adresse
- Email
- Pièce justificative

Le responsable légal peut également être le payeur.

---

# 9. Assurance

Le système permet de gérer plusieurs assurances.

Informations :

- Compagnie
- Police
- Numéro d'assuré
- Date de validité
- Pourcentage de prise en charge
- Plafond
- Observations

---

# 10. Documents

Le dossier peut contenir :

- Carte d'identité
- Passeport
- Assurance
- Consentements
- Résultats
- Comptes rendus
- Ordonnances
- Images
- PDF
- Tout autre document

Les documents sont archivés.

---

# 11. Alertes médicales

Les alertes sont affichées immédiatement lors de l'ouverture du dossier.

Exemples :

- Allergie sévère
- Risque cardiaque
- Patient diabétique
- Anticoagulants
- Grossesse
- Infection contagieuse

Les alertes sont visibles dans tous les modules.

---

# 12. Historique médical

Le dossier regroupe automatiquement :

- Rendez-vous
- Consultations
- Hospitalisations
- Laboratoire
- Imagerie
- Ordonnances
- Prescriptions
- Factures
- Paiements
- Documents
- Notes

Aucune donnée historique n'est supprimée.

---

# 13. États du patient

Le patient peut être :

- Pré-enregistré
- Actif
- En attente
- En consultation
- Hospitalisé
- Sorti
- Inactif
- Décédé
- Archivé

Les changements d'état sont historisés.

---

# 14. Recherche

La recherche est possible par :

- Référence patient
- Nom
- Prénom
- Téléphone
- Email
- Date de naissance
- Assurance
- Numéro national
- UUID

Le moteur doit permettre une recherche instantanée.

---

# 15. Détection des doublons

Avant la création :

Le système recherche automatiquement :

- même nom
- même date de naissance
- même téléphone
- même email
- même numéro national

Le personnel peut :

- créer un nouveau dossier
- fusionner
- annuler

---

# 16. Fusion de dossiers

Seuls les utilisateurs autorisés peuvent fusionner plusieurs dossiers.

La fusion conserve :

- historique médical
- factures
- paiements
- examens
- prescriptions
- documents

Toutes les opérations sont journalisées.

---

# 17. Workflow

Création

1. Vérification des doublons
2. Création du dossier
3. Génération UUID
4. Génération référence métier
5. Création dossier médical
6. Journalisation

Modification

- mise à jour
- historisation

Archivage

- désactivation logique uniquement

---

# 18. Notifications

Le système peut envoyer :

- confirmation d'inscription
- rappel de rendez-vous
- disponibilité des résultats
- facture disponible
- paiement reçu
- messages administratifs

Canaux :

- Email
- SMS
- WhatsApp
- Notifications internes

---

# 19. Rapports

Le module fournit notamment :

- nombre total de patients
- nouveaux patients
- répartition par âge
- répartition par sexe
- patients actifs
- patients inactifs
- patients hospitalisés
- statistiques mensuelles
- évolution annuelle

---

# 20. Permissions

Les permissions comprennent notamment :

- créer
- consulter
- modifier
- supprimer logiquement
- fusionner
- exporter
- imprimer
- archiver
- restaurer

Toutes les opérations sont journalisées.

---

# 21. Intégration

Le module Patients est utilisé par :

- Rendez-vous
- Consultations
- Hospitalisation
- Laboratoire
- Imagerie
- Pharmacie
- Achats (uniquement pour les consommations liées aux soins)
- Stock (sorties de consommables)
- Facturation
- Paiements
- Rapports
- Tableau de bord
- Portail Patient

Il constitue le référentiel central de la plateforme.

---

# 22. Sécurité

Les données sont :

- isolées par établissement ;
- accessibles selon les rôles et permissions ;
- protégées par authentification ;
- journalisées ;
- sauvegardées.

Aucun utilisateur ne peut accéder aux dossiers d'un autre établissement.

---

# 23. Règles métier

BR-029 : Chaque patient possède un UUID unique.

BR-030 : Chaque patient possède une référence métier officielle.

BR-031 : Les doublons sont contrôlés avant toute création.

BR-032 : Le dossier médical est créé automatiquement.

BR-033 : Les suppressions physiques sont interdites.

BR-034 : Toutes les modifications sont historisées.

BR-035 : Les alertes médicales sont visibles dans tous les modules.

BR-036 : Les dossiers peuvent être fusionnés uniquement par des utilisateurs autorisés.

BR-037 : Toutes les données sont isolées par établissement.

---

# 24. Dépendances

Dépend de :

- BP-005 – Utilisateurs
- BP-006 – Rôles et permissions
- BP-008 – Nomenclature
- BP-009 – Gestion des établissements
- BP-010 – Authentification
- BP-011 – Modèle de données métier
- BP-012 – Architecture modulaire

Utilisé par :

- BP-014 – Module Rendez-vous
- BP-015 – Module Consultations
- BP-016 – Module Hospitalisation
- BP-017 – Module Achats & Approvisionnements
- BP-018 – Module Stock & Inventaire
- BP-019 – Module Pharmacie
- BP-020 – Module Laboratoire
- BP-021 – Module Imagerie
- BP-022 – Module Finance
- BP-023 – Module Ressources humaines
- BP-024 – Module Rapports
- BP-025 – Portail Patient

---

# Conclusion

Le module Patients est le cœur fonctionnel de MORACare Enterprise.

Il garantit une identification unique, une gestion centralisée des informations administratives et médicales, une traçabilité complète des interactions et une intégration native avec l'ensemble des modules de la plateforme.

Toutes les opérations médicales, administratives et financières reposent sur ce référentiel unique, garantissant la cohérence, la sécurité et l'évolutivité du système.