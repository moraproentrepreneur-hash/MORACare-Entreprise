# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Hospitalisation

**Référence :** BP-016

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Hospitalisation permet de gérer l'ensemble du parcours d'un patient hospitalisé.

Il couvre l'admission, l'affectation des chambres et des lits, le suivi médical quotidien, les transferts internes, la sortie et l'historisation complète du séjour.

---

# 2. Objectifs

Le module permet de :

- enregistrer une hospitalisation ;
- gérer les admissions ;
- gérer les chambres et les lits ;
- suivre les soins quotidiens ;
- gérer les transferts ;
- préparer la sortie ;
- calculer la durée de séjour ;
- assurer une traçabilité complète.

---

# 3. Sous-modules

Le module comprend :

- Admissions
- Chambres
- Lits
- Affectations
- Séjours
- Soins infirmiers
- Visites médicales
- Transferts
- Sorties
- Historique

---

# 4. Données manipulées

Chaque hospitalisation comprend notamment :

- UUID
- Référence métier (MORA-HOSP-XXXX)
- Patient
- Établissement
- Service
- Médecin responsable
- Chambre
- Lit
- Date d'admission
- Heure d'admission
- Motif
- Statut
- Date de sortie
- Durée du séjour

---

# 5. Admission

Une admission peut être créée :

- après une consultation ;
- depuis les urgences ;
- après un transfert interne ;
- après un transfert externe ;
- sur décision administrative.

L'admission est automatiquement liée au dossier du patient.

---

# 6. Gestion des chambres

Chaque chambre possède :

- UUID
- Référence
- Nom ou numéro
- Service
- Type
- Nombre de lits
- Statut

Types possibles :

- Standard
- Individuelle
- Double
- Soins intensifs
- Réanimation
- Isolement
- Maternité
- Pédiatrie

Chaque établissement peut créer ses propres catégories.

---

# 7. Gestion des lits

Chaque lit possède :

- UUID
- Référence
- Chambre
- Statut
- Date de disponibilité

États possibles :

- Disponible
- Occupé
- Réservé
- En nettoyage
- Hors service

Le système interdit toute double affectation.

---

# 8. Soins quotidiens

Le personnel peut enregistrer :

- constantes vitales ;
- soins infirmiers ;
- administration des médicaments ;
- observations ;
- incidents ;
- alimentation ;
- évolution clinique.

Toutes les données sont historisées.

---

# 9. Visites médicales

Chaque visite peut comporter :

- observations ;
- évolution ;
- nouveau diagnostic ;
- modifications du traitement ;
- examens complémentaires ;
- décision médicale.

---

# 10. Transferts

Le patient peut être transféré :

- vers une autre chambre ;
- vers un autre lit ;
- vers un autre service ;
- vers un autre établissement.

Chaque transfert conserve l'historique complet.

---

# 11. Sortie

La sortie comprend notamment :

- date ;
- heure ;
- motif ;
- état du patient ;
- compte rendu de sortie ;
- recommandations ;
- prochain rendez-vous.

Le lit est automatiquement libéré.

---

# 12. États de l'hospitalisation

Le cycle de vie comprend :

- Pré-admission
- Admission validée
- Hospitalisé
- En transfert
- Sortie programmée
- Sorti
- Annulée
- Archivée

Tous les changements sont historisés.

---

# 13. Workflow

1. Admission.
2. Affectation d'une chambre.
3. Affectation d'un lit.
4. Suivi quotidien.
5. Visites médicales.
6. Examens complémentaires.
7. Soins.
8. Décision de sortie.
9. Libération du lit.
10. Archivage du séjour.

---

# 14. Notifications

Le système peut notifier :

- admission validée ;
- changement de chambre ;
- transfert ;
- sortie programmée ;
- sortie réalisée ;
- lit disponible.

Canaux :

- Notifications internes
- Email
- SMS
- WhatsApp (option)

---

# 15. Rapports

Le module produit notamment :

- nombre d'hospitalisations ;
- durée moyenne de séjour ;
- taux d'occupation des lits ;
- taux d'occupation des chambres ;
- admissions par service ;
- sorties ;
- transferts ;
- lits disponibles ;
- chambres disponibles.

---

# 16. Permissions

Les permissions comprennent notamment :

- créer une admission ;
- modifier une hospitalisation ;
- affecter un lit ;
- transférer un patient ;
- enregistrer des soins ;
- valider une sortie ;
- consulter ;
- imprimer ;
- exporter.

Toutes les opérations sont journalisées.

---

# 17. Intégration

Le module communique avec :

- Patients
- Rendez-vous
- Consultations
- Laboratoire
- Imagerie
- Pharmacie
- Achats & Approvisionnements
- Stock & Inventaire
- Finance
- Rapports
- Notifications

Pendant le séjour, les consommations de médicaments et de consommables peuvent alimenter automatiquement les modules **Pharmacie**, **Stock** et **Finance**.

---

# 18. Sécurité

Toutes les hospitalisations sont :

- protégées par authentification ;
- limitées aux utilisateurs autorisés ;
- isolées par établissement ;
- historisées ;
- sauvegardées.

Aucune hospitalisation ne peut être supprimée définitivement.

---

# 19. Règles métier

BR-055 : Une hospitalisation est toujours liée à un patient.

BR-056 : Chaque hospitalisation possède un UUID.

BR-057 : Chaque hospitalisation possède une référence métier officielle.

BR-058 : Un lit ne peut être occupé que par un seul patient à la fois.

BR-059 : Toute admission doit être affectée à un service.

BR-060 : Toute sortie libère automatiquement le lit.

BR-061 : Les transferts conservent l'historique complet.

BR-062 : Les soins quotidiens sont historisés.

BR-063 : Les consommations de médicaments et de consommables peuvent générer des mouvements de stock.

BR-064 : Les suppressions physiques sont interdites.

---

# 20. Dépendances

Ce document dépend de :

- BP-013 – Module Patients
- BP-014 – Module Rendez-vous
- BP-015 – Module Consultations
- BP-012 – Architecture modulaire
- BP-011 – Modèle de données métier
- BP-010 – Authentification
- BP-006 – Rôles et permissions

Ce module est utilisé par :

- BP-017 – Module Achats & Approvisionnements
- BP-018 – Module Stock & Inventaire
- BP-019 – Module Pharmacie
- BP-020 – Module Laboratoire
- BP-021 – Module Imagerie
- BP-022 – Module Finance
- BP-024 – Module Rapports
- BP-025 – Portail Patient

---

# Conclusion

Le module Hospitalisation gère l'ensemble du cycle de vie d'un séjour hospitalier, depuis l'admission jusqu'à la sortie.

Il assure la gestion des ressources (chambres et lits), la traçabilité des soins, le suivi médical quotidien et l'intégration avec les modules de pharmacie, de stock, d'approvisionnement et de finance, garantissant ainsi une prise en charge complète et une gestion optimale des capacités de l'établissement.