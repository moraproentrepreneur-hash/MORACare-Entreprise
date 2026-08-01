# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Finance & Facturation – Fondations Financières

**Référence :** BP-022A

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Finance & Facturation constitue le cœur financier de MORACare Enterprise.

Il centralise l'ensemble des opérations économiques générées par les activités médicales, paramédicales, administratives et logistiques de l'établissement.

Il permet notamment de gérer :

- les tarifs des prestations ;
- les devis ;
- la facturation ;
- les assurances ;
- les mutuelles ;
- les conventions ;
- les tiers payants ;
- les remises ;
- les exonérations ;
- les taxes ;
- les statuts financiers ;
- les références métier.

Les mouvements d'encaissement, de décaissement, la gestion des caisses, la trésorerie et la comptabilité sont détaillés dans les BP-022B et BP-022C.

---

# 2. Objectifs

Le module poursuit les objectifs suivants :

- centraliser toute la facturation ;
- uniformiser les règles tarifaires ;
- automatiser la génération des factures ;
- gérer les différents types de prise en charge ;
- réduire les erreurs de facturation ;
- assurer une traçabilité complète ;
- alimenter automatiquement la comptabilité ;
- produire des documents conformes.

---

# 3. Périmètre

Le module couvre notamment :

- Paramètres financiers
- Tarification
- Devis
- Facturation
- Assurances
- Mutuelles
- Tiers payants
- Conventions
- Remises
- Exonérations
- Taxes
- Documents financiers
- Historique
- Audit

---

# 4. Architecture financière

Toutes les prestations générées dans MORACare peuvent produire des opérations financières.

Les principaux modules concernés sont :

- Consultations
- Hospitalisation
- Pharmacie
- Laboratoire
- Imagerie
- Bloc opératoire
- Urgences
- Soins infirmiers
- Prestations diverses

Chaque module peut générer automatiquement une ligne de facturation.

---

# 5. Paramètres financiers

Les paramètres permettent notamment de définir :

- devise principale ;
- nombre de décimales ;
- format monétaire ;
- taux de TVA ;
- taxes locales ;
- remises maximales autorisées ;
- types de remise ;
- types d'exonération ;
- conditions de paiement ;
- validité des devis.

Tous les paramètres sont propres à chaque établissement.

---

# 6. Grilles tarifaires

Le système permet de créer plusieurs grilles tarifaires.

Exemples :

- Tarif standard
- Tarif entreprise
- Tarif assurance
- Tarif mutuelle
- Tarif personnel
- Tarif social
- Tarif urgence

Chaque grille peut comporter des prix différents pour une même prestation.

---

# 7. Prestations facturables

Le système peut facturer notamment :

- consultation ;
- hospitalisation ;
- chambre ;
- lit ;
- médicaments ;
- consommables ;
- analyses biologiques ;
- examens d'imagerie ;
- actes médicaux ;
- actes infirmiers ;
- interventions chirurgicales ;
- prestations administratives ;
- prestations diverses.

Chaque prestation possède :

- une référence ;
- un libellé ;
- une catégorie ;
- un tarif ;
- un statut.

---

# 8. Devis

Le système permet de générer des devis avant facturation.

Chaque devis comprend notamment :

- UUID
- Référence métier
- Patient
- Date
- Date de validité
- Prestations
- Quantités
- Prix unitaires
- Remises
- Taxes
- Total
- Observations

Le devis peut être :

- brouillon ;
- validé ;
- refusé ;
- expiré ;
- transformé en facture.

---

# 9. Facturation

Une facture peut être générée :

- automatiquement ;
- semi-automatiquement ;
- manuellement.

Elle peut regrouper plusieurs prestations provenant de différents modules.

Chaque facture comprend notamment :

- UUID
- Référence métier
- Patient
- Date
- Prestations
- Quantités
- Prix unitaires
- Taxes
- Remises
- Exonérations
- Total HT
- Total taxes
- Total TTC
- Solde restant
- Statut

Une facture peut être :

- individuelle ;
- groupée ;
- consolidée.

---

# 10. Documents financiers

Le système génère automatiquement :

- devis ;
- factures ;
- factures proforma ;
- notes de crédit ;
- avoirs ;
- reçus de paiement (BP-022B).

Tous les documents disposent :

- d'un UUID ;
- d'une référence métier ;
- d'une date ;
- d'un historique.

---

# 11. Références métier

Tous les documents financiers utilisent une référence lisible.

Exemples :

- MORA-DEV-A000001
- MORA-FAC-A000001
- MORA-AVR-A000001
- MORA-RCU-A000001

Les références sont uniques par établissement.

Les UUID restent utilisés uniquement par le système.

---

# 12. Assurances

Le système permet de gérer plusieurs compagnies d'assurance.

Chaque assurance comprend notamment :

- nom ;
- code ;
- contacts ;
- contrats ;
- taux de couverture ;
- plafond annuel ;
- plafond par prestation ;
- délai de remboursement.

---

# 13. Mutuelles

Le système permet de gérer plusieurs mutuelles.

Chaque mutuelle possède ses propres :

- conventions ;
- plafonds ;
- taux ;
- exclusions ;
- règles de facturation.

---

# 14. Tiers payants

Le système permet de gérer :

- organismes publics ;
- entreprises ;
- ONG ;
- associations ;
- collectivités.

Chaque organisme peut être associé à une convention.

---

# 15. Conventions

Les conventions permettent de définir :

- les prestations couvertes ;
- les exclusions ;
- les plafonds ;
- les pourcentages de prise en charge ;
- les délais de règlement ;
- les règles particulières.

Une convention possède une date de début et une date de fin.

---

# 16. Remises

Le système permet :

- remise fixe ;
- remise en pourcentage ;
- remise commerciale ;
- remise exceptionnelle.

Les remises peuvent être limitées selon les permissions utilisateur.

---

# 17. Exonérations

Le système permet de gérer :

- exonération totale ;
- exonération partielle ;
- exonération institutionnelle ;
- exonération sociale ;
- exonération exceptionnelle.

Chaque exonération doit être justifiée.

---

# 18. Taxes

Le système permet de configurer :

- TVA ;
- taxes locales ;
- taxes spécifiques.

Les taxes sont calculées automatiquement.

---

# 19. États

Les documents financiers peuvent avoir les états suivants :

- Brouillon
- En attente
- Validé
- Émis
- Partiellement payé
- Totalement payé
- Annulé
- Clôturé
- Archivé

---

# 20. Workflow

1. Création du devis (optionnel).
2. Validation.
3. Transformation en facture.
4. Vérification des prises en charge.
5. Calcul des remises.
6. Calcul des taxes.
7. Émission de la facture.
8. Transmission au module Encaissements (BP-022B).

---

# 21. Notifications

Le système peut notifier :

- devis créé ;
- devis expiré ;
- facture émise ;
- facture annulée ;
- prise en charge validée ;
- convention expirée.

Canaux :

- Notifications internes
- Email
- SMS
- WhatsApp (option)

---

# 22. Permissions

Les permissions comprennent notamment :

- gérer les tarifs ;
- créer un devis ;
- modifier un devis ;
- supprimer un brouillon ;
- émettre une facture ;
- annuler une facture ;
- appliquer une remise ;
- accorder une exonération ;
- gérer les assurances ;
- gérer les conventions ;
- consulter ;
- imprimer ;
- exporter.

Toutes les opérations sont journalisées.

---

# 23. Intégration

Le module communique avec :

- Patients
- Rendez-vous
- Consultations
- Hospitalisation
- Pharmacie
- Laboratoire
- Imagerie Médicale
- Bloc opératoire
- Soins infirmiers
- Achats & Approvisionnements
- Stock & Inventaire
- Encaissements & Caisses (BP-022B)
- Trésorerie & Comptabilité (BP-022C)
- Rapports & Business Intelligence
- Notifications

---

# 24. Sécurité

Le système garantit :

- isolation des données par établissement ;
- authentification obligatoire ;
- contrôle des permissions ;
- journalisation complète ;
- sauvegarde automatique.

Aucune suppression physique n'est autorisée.

Les annulations sont réalisées par contrepassation afin de préserver l'historique.

---

# 25. Règles métier

BR-109 : Toute prestation facturable possède un tarif actif.

BR-110 : Toute facture possède un UUID et une référence métier unique.

BR-111 : Une facture peut regrouper plusieurs prestations provenant de modules différents.

BR-112 : Une facture peut être générée automatiquement ou manuellement.

BR-113 : Toute remise supérieure au seuil autorisé nécessite une validation.

BR-114 : Toute exonération doit être justifiée.

BR-115 : Une convention définit les règles de prise en charge d'un organisme.

BR-116 : Une facture ne peut être modifiée après le premier encaissement.

BR-117 : Les annulations sont réalisées par contrepassation.

BR-118 : Les suppressions physiques sont interdites.

---

# 26. Dépendances

Ce document dépend de :

- BP-013 – Module Patients
- BP-015 – Module Consultations
- BP-016 – Module Hospitalisation
- BP-017 – Module Achats, Approvisionnements & Logistique Interne
- BP-018 – Module Stock & Inventaire
- BP-019 – Module Pharmacie
- BP-020 – Module Laboratoire
- BP-021 – Module Imagerie Médicale

Ce document est complété par :

- BP-022B – Encaissements, Décaissements & Gestion des Caisses
- BP-022C – Trésorerie, Comptabilité & Pilotage Financier

---

# Conclusion

Le BP-022A définit les fondations financières de MORACare Enterprise. Il normalise la tarification, les devis, la facturation, les assurances, les conventions, les remises, les exonérations et les documents financiers. Associé aux BP-022B et BP-022C, il constitue un ERP financier hospitalier complet, capable de répondre aux besoins des cabinets médicaux, cliniques, centres de santé et établissements hospitaliers multisites tout en garantissant une traçabilité complète et une architecture évolutive.