# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Trésorerie, Comptabilité & Pilotage Financier

**Référence :** BP-022C

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit les fonctionnalités de gestion de la trésorerie, de la comptabilité et du pilotage financier de MORACare Enterprise.

Il centralise l'ensemble des flux financiers issus des modules de facturation, des encaissements, des décaissements, des achats et des autres activités de l'établissement afin d'offrir une vision financière complète, fiable et en temps réel.

Ce module constitue le niveau décisionnel du système financier.

---

# 2. Objectifs

Le module permet de :

- piloter la trésorerie ;
- suivre les flux financiers ;
- gérer les budgets ;
- produire les états comptables ;
- préparer les écritures comptables ;
- assurer le rapprochement bancaire ;
- suivre les performances financières ;
- faciliter les audits internes et externes.

---

# 3. Périmètre

Le module couvre notamment :

- Trésorerie
- Comptabilité générale
- Journaux comptables
- Grand Livre
- Balance comptable
- Budgets
- Centres de coûts
- Centres de profits
- Rapprochements bancaires
- Clôtures financières
- Rapports
- Tableaux de bord
- KPI
- Exports comptables

---

# 4. Architecture financière

Les données proviennent automatiquement des modules :

- Facturation
- Encaissements
- Décaissements
- Achats
- Stock
- Pharmacie
- Laboratoire
- Imagerie
- Hospitalisation
- Administration

Toutes les écritures restent liées à leur document d'origine.

---

# 5. Comptes financiers

Le système permet de gérer plusieurs comptes.

Exemples :

- Banque principale
- Banque secondaire
- Compte Mobile Money
- Compte Holo
- Compte Mvola
- Compte Wakati
- Caisse principale
- Caisse pharmacie

Chaque compte comprend :

- UUID
- Référence
- Nom
- Type
- Banque
- Numéro
- Devise
- Solde actuel
- Statut

---

# 6. Trésorerie

Le tableau de trésorerie affiche notamment :

- Solde global
- Solde des banques
- Solde des caisses
- Solde Mobile Money
- Encaissements du jour
- Décaissements du jour
- Entrées prévues
- Sorties prévues
- Disponibilité financière

Actualisation en temps réel.

---

# 7. Budgets

Le système permet de créer plusieurs budgets.

Exemples :

- Budget annuel
- Budget mensuel
- Budget projet
- Budget service
- Budget investissement

Chaque budget comprend :

- période
- responsable
- montant prévu
- montant consommé
- reste disponible

---

# 8. Centres de coûts

Le système permet d'affecter chaque dépense à un centre de coût.

Exemples :

- Direction
- Consultation
- Urgences
- Pharmacie
- Laboratoire
- Imagerie
- Bloc opératoire
- Hospitalisation
- Maintenance
- Informatique
- Administration

---

# 9. Centres de profits

Les recettes peuvent être ventilées par centre de profit.

Exemples :

- Pharmacie
- Laboratoire
- Imagerie
- Hospitalisation
- Consultations
- Chirurgie
- Prestations externes

Cette ventilation facilite l'analyse de la rentabilité.

---

# 10. Journaux comptables

Le système produit automatiquement plusieurs journaux.

Exemples :

- Journal des ventes
- Journal des achats
- Journal de caisse
- Journal de banque
- Journal des opérations diverses

Chaque journal est consultable et exportable.

---

# 11. Grand Livre

Le Grand Livre centralise toutes les écritures comptables.

Chaque ligne comprend :

- date
- compte
- libellé
- débit
- crédit
- référence
- utilisateur

---

# 12. Balance comptable

Le système génère automatiquement :

- balance générale
- balance auxiliaire
- balance par période
- balance par service

---

# 13. Écritures comptables

Les écritures peuvent être :

- automatiques
- semi-automatiques
- manuelles (avec permission)

Chaque écriture possède :

- UUID
- Référence
- Date
- Journal
- Débit
- Crédit
- Justification

---

# 14. Rapprochement bancaire

Le module permet :

- l'import des relevés bancaires ;
- le rapprochement automatique ;
- le rapprochement manuel ;
- l'identification des écarts ;
- le suivi des opérations non rapprochées.

---

# 15. Clôture financière

Le système gère :

- clôture journalière ;
- clôture hebdomadaire ;
- clôture mensuelle ;
- clôture trimestrielle ;
- clôture annuelle.

Chaque clôture est historisée.

---

# 16. Prévisions financières

Le système calcule automatiquement :

- recettes attendues ;
- dépenses prévues ;
- trésorerie prévisionnelle ;
- besoins de financement.

---

# 17. Tableaux de bord

Le tableau de bord financier affiche notamment :

- chiffre d'affaires
- recettes par service
- dépenses par service
- résultat net
- marge
- trésorerie
- évolution mensuelle
- évolution annuelle

---

# 18. KPI

Le système calcule automatiquement :

- chiffre d'affaires
- panier moyen
- taux de recouvrement
- délai moyen de paiement
- taux d'impayés
- dépenses mensuelles
- bénéfice brut
- bénéfice net
- rentabilité par service
- rentabilité par médecin
- rentabilité par prestation

---

# 19. Rapports

Le système génère notamment :

- rapport journalier
- rapport hebdomadaire
- rapport mensuel
- rapport annuel
- rapport par service
- rapport par caisse
- rapport par utilisateur
- rapport par mode de paiement
- rapport par assurance
- rapport par convention

Les rapports sont filtrables.

---

# 20. Exports

Les données peuvent être exportées en :

- PDF
- Excel
- CSV

Les exports respectent les permissions utilisateur.

---

# 21. Archivage

Les exercices clôturés sont archivés.

Les archives restent consultables selon les droits d'accès.

---

# 22. Notifications

Le système peut notifier :

- dépassement de budget ;
- trésorerie insuffisante ;
- clôture non réalisée ;
- rapprochement en attente ;
- dépenses importantes ;
- baisse importante des recettes.

---

# 23. Permissions

Les principales permissions sont :

- consulter la trésorerie ;
- créer un budget ;
- modifier un budget ;
- consulter les journaux ;
- effectuer un rapprochement bancaire ;
- créer une écriture manuelle ;
- clôturer une période ;
- consulter les KPI ;
- exporter les rapports.

Toutes les actions sont journalisées.

---

# 24. Sécurité

Le système garantit :

- séparation des établissements ;
- intégrité des écritures ;
- verrouillage des périodes clôturées ;
- traçabilité complète ;
- sauvegarde automatique.

Les exercices clôturés ne peuvent être modifiés sans autorisation exceptionnelle.

---

# 25. Audit Trail

Toutes les opérations enregistrent :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- action réalisée ;
- ancienne valeur ;
- nouvelle valeur ;
- justification.

Aucune suppression physique n'est autorisée.

---

# 26. Workflow

Facturation

↓

Encaissements / Décaissements

↓

Trésorerie

↓

Écritures comptables

↓

Rapprochement bancaire

↓

Budgets

↓

Rapports

↓

Clôture

↓

Archivage

---

# 27. Règles métier

BR-133 : Toute écriture comptable possède une référence unique.

BR-134 : Toute écriture est rattachée à un journal comptable.

BR-135 : Les écritures automatiques proviennent des modules métiers.

BR-136 : Une période clôturée ne peut être modifiée sans autorisation.

BR-137 : Toute dépense peut être affectée à un centre de coût.

BR-138 : Toute recette peut être affectée à un centre de profit.

BR-139 : Les rapprochements bancaires sont historisés.

BR-140 : Les budgets sont suivis en temps réel.

BR-141 : Les KPI sont recalculés automatiquement.

BR-142 : Les exports respectent les permissions utilisateur.

BR-143 : Les suppressions physiques sont interdites.

---

# 28. Dépendances

Ce module dépend de :

- BP-017 – Achats & Approvisionnements
- BP-018 – Stock & Inventaire
- BP-019 – Pharmacie
- BP-020 – Laboratoire
- BP-021 – Imagerie Médicale
- BP-022A – Finance & Facturation
- BP-022B – Encaissements, Décaissements & Gestion des Caisses

Il alimente :

- Business Intelligence
- Rapports décisionnels
- Tableaux de bord exécutifs
- Audit
- Statistiques

---

# Conclusion

Le BP-022C constitue le niveau stratégique du système financier de MORACare Enterprise. Il transforme les opérations issues des modules métiers en informations financières fiables, permettant le pilotage de la trésorerie, le suivi budgétaire, la préparation comptable, le rapprochement bancaire et l'analyse de la performance de l'établissement. Associé aux BP-022A et BP-022B, il forme une solution financière hospitalière complète, évolutive et conforme aux meilleures pratiques des ERP de santé.