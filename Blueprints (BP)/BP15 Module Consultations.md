# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Consultations

**Référence :** BP-015

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Consultations permet de gérer l'ensemble des consultations médicales réalisées au sein de l'établissement.

Il centralise les observations cliniques, diagnostics, prescriptions, demandes d'examens, certificats médicaux, décisions d'hospitalisation et actes médicaux.

Il constitue le cœur clinique de MORACare Enterprise.

---

# 2. Objectifs

Le module permet de :

- enregistrer une consultation ;
- documenter les observations médicales ;
- établir un diagnostic ;
- prescrire un traitement ;
- générer une ordonnance ;
- demander des examens ;
- orienter vers un spécialiste ;
- décider d'une hospitalisation ;
- générer les documents médicaux ;
- assurer la traçabilité complète des soins.

---

# 3. Sous-modules

Le module comprend :

- Consultation
- Examen clinique
- Constantes vitales
- Diagnostic
- Prescription
- Ordonnance
- Certificat médical
- Demande de laboratoire
- Demande d'imagerie
- Orientation
- Hospitalisation
- Notes médicales
- Historique

---

# 4. Données manipulées

Chaque consultation comprend notamment :

- UUID
- Référence métier (MORA-CONS-XXXX)
- Patient
- Praticien
- Service
- Date
- Heure
- Type de consultation
- Motif
- Diagnostic
- Décisions médicales
- Statut

---

# 5. Types de consultation

Le système prend en charge notamment :

- Consultation générale
- Consultation spécialisée
- Consultation de suivi
- Consultation d'urgence
- Téléconsultation (évolution future)
- Contrôle post-opératoire

Chaque établissement peut ajouter ses propres types.

---

# 6. Constantes vitales

Le module permet d'enregistrer :

- Taille
- Poids
- Température
- Tension artérielle
- Fréquence cardiaque
- Saturation en oxygène
- Glycémie
- IMC (calcul automatique)
- Autres constantes selon la spécialité

Ces données sont historisées.

---

# 7. Examen clinique

Le praticien peut documenter :

- symptômes ;
- antécédents ;
- examen physique ;
- observations ;
- évolution ;
- conclusion clinique.

Le contenu est libre tout en pouvant s'appuyer sur des modèles.

---

# 8. Diagnostic

Le système permet :

- diagnostic principal ;
- diagnostics secondaires ;
- diagnostic provisoire ;
- diagnostic confirmé.

Le diagnostic peut être codifié (CIM-10 ou autre nomenclature selon la configuration).

---

# 9. Prescription médicale

Le praticien peut prescrire :

- médicaments ;
- examens biologiques ;
- examens d'imagerie ;
- soins infirmiers ;
- kinésithérapie ;
- interventions chirurgicales ;
- autres traitements.

Chaque prescription est historisée.

---

# 10. Ordonnances

Le système génère automatiquement une ordonnance contenant :

- identité du patient ;
- praticien ;
- médicaments ;
- posologie ;
- durée du traitement ;
- recommandations ;
- signature du praticien.

Les ordonnances sont numérotées selon la nomenclature officielle.

---

# 11. Demandes d'examens

Depuis la consultation, le praticien peut créer :

## Demande de laboratoire

- analyses demandées ;
- priorité ;
- observations.

## Demande d'imagerie

- radiographie ;
- échographie ;
- scanner ;
- IRM ;
- autres examens.

Ces demandes alimentent automatiquement les modules concernés.

---

# 12. Certificats médicaux

Le module permet de générer notamment :

- certificat médical ;
- arrêt de travail ;
- certificat d'aptitude ;
- certificat sportif ;
- autres modèles personnalisés.

Tous les certificats sont archivés.

---

# 13. Orientation et hospitalisation

À l'issue de la consultation, le praticien peut :

- programmer un nouveau rendez-vous ;
- orienter vers un spécialiste ;
- demander une hospitalisation ;
- transférer vers un autre établissement ;
- clôturer le dossier.

Les décisions sont historisées.

---

# 14. États de la consultation

Le cycle de vie comprend :

- Brouillon
- En cours
- Suspendue
- Terminée
- Validée
- Archivée

Chaque changement est enregistré.

---

# 15. Workflow

1. Ouverture du dossier patient.
2. Vérification des antécédents.
3. Saisie des constantes.
4. Examen clinique.
5. Diagnostic.
6. Prescription.
7. Génération des documents.
8. Demandes d'examens.
9. Décision médicale.
10. Clôture.
11. Journalisation.

---

# 16. Notifications

Le système peut notifier :

- disponibilité d'une ordonnance ;
- demande d'analyse envoyée ;
- demande d'imagerie créée ;
- certificat disponible ;
- prochain rendez-vous ;
- hospitalisation programmée.

Canaux :

- Email
- SMS
- WhatsApp
- Notifications internes

---

# 17. Rapports

Le module produit notamment :

- nombre de consultations ;
- consultations par médecin ;
- consultations par spécialité ;
- diagnostics les plus fréquents ;
- prescriptions réalisées ;
- examens demandés ;
- hospitalisations décidées ;
- certificats délivrés.

---

# 18. Permissions

Les permissions comprennent notamment :

- créer ;
- consulter ;
- modifier ;
- valider ;
- clôturer ;
- imprimer ;
- exporter ;
- annuler.

Toutes les actions sont journalisées.

---

# 19. Intégration

Le module communique avec :

- Patients
- Rendez-vous
- Hospitalisation
- Laboratoire
- Imagerie
- Pharmacie
- Finance
- Rapports
- Notifications
- Portail Patient

Une consultation peut déclencher automatiquement :

- une demande d'analyse ;
- une demande d'imagerie ;
- une ordonnance ;
- une hospitalisation ;
- une facture ;
- un prochain rendez-vous.

---

# 20. Sécurité

Toutes les consultations sont :

- protégées par authentification ;
- limitées aux utilisateurs autorisés ;
- isolées par établissement ;
- historisées ;
- sauvegardées.

Aucune consultation ne peut être supprimée définitivement.

---

# 21. Règles métier

BR-045 : Une consultation est toujours liée à un patient.

BR-046 : Une consultation possède un UUID unique.

BR-047 : Une consultation possède une référence métier officielle.

BR-048 : Les constantes vitales sont historisées.

BR-049 : Les diagnostics peuvent être multiples.

BR-050 : Les prescriptions sont générées depuis une consultation.

BR-051 : Les demandes d'examens alimentent automatiquement les modules Laboratoire et Imagerie.

BR-052 : Une consultation peut générer plusieurs documents médicaux.

BR-053 : Les suppressions physiques sont interdites.

BR-054 : Toutes les modifications sont journalisées.

---

# 22. Dépendances

Ce document dépend de :

- BP-005 – Utilisateurs
- BP-006 – Rôles et permissions
- BP-008 – Nomenclature
- BP-010 – Authentification
- BP-011 – Modèle de données métier
- BP-012 – Architecture modulaire
- BP-013 – Module Patients
- BP-014 – Module Rendez-vous

Ce module est utilisé par :

- BP-016 – Module Hospitalisation
- BP-019 – Module Pharmacie
- BP-020 – Module Laboratoire
- BP-021 – Module Imagerie
- BP-022 – Module Finance
- BP-024 – Module Rapports
- BP-025 – Portail Patient

---

# Conclusion

Le module Consultations constitue le cœur clinique de MORACare Enterprise.

Il centralise l'ensemble des décisions médicales, assure la traçabilité des actes de soins et orchestre les interactions avec les modules de laboratoire, d'imagerie, de pharmacie, d'hospitalisation et de facturation.

Toutes les décisions médicales prises dans l'établissement trouvent leur origine dans ce module, garantissant un parcours de soins cohérent, sécurisé et entièrement historisé.