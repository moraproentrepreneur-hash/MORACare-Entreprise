# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Stock & Inventaire

**Référence :** BP-018

**Version :** 2.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Stock & Inventaire assure la gestion complète des stocks de l'établissement de santé.

Il centralise les mouvements de marchandises, les inventaires, les transferts internes, les emplacements physiques, les lots, les dates de péremption et la traçabilité des articles.

Il constitue le socle logistique utilisé par tous les modules de MORACare Enterprise.

---

# 2. Objectifs

Le module permet de :

- gérer plusieurs sites de stockage ;
- organiser les magasins ;
- gérer les emplacements physiques ;
- suivre les quantités en temps réel ;
- gérer les lots et les numéros de série ;
- appliquer les règles FEFO/FIFO ;
- gérer les inventaires ;
- assurer la traçabilité complète des mouvements ;
- alimenter les autres modules.

---

# 3. Sous-modules

Le module comprend :

- Sites de stockage
- Magasins
- Zones
- Allées
- Étagères
- Niveaux
- Bacs / Casiers
- Articles
- Lots
- Numéros de série
- Inventaires
- Mouvements
- Transferts
- Historique

---

# 4. Architecture des emplacements

La structure est entièrement configurable.

Hiérarchie :

Site de stockage

↓

Magasin

↓

Zone

↓

Allée

↓

Étagère

↓

Niveau

↓

Bac / Casier

Cette structure permet de gérer aussi bien une petite clinique qu'un grand hôpital multisite.

---

# 5. Sites de stockage

Un établissement peut posséder plusieurs sites de stockage.

Exemples :

- Dépôt Central
- Pharmacie Principale
- Pharmacie des Urgences
- Laboratoire
- Bloc opératoire
- Imagerie
- Cuisine
- Buanderie
- Maintenance

Chaque site possède :

- UUID
- Référence
- Nom
- Responsable
- Type
- Statut

---

# 6. Magasins

Chaque site peut contenir plusieurs magasins.

Exemples :

- Consommables
- Médicaments
- Réactifs
- Dispositifs médicaux
- Produits d'entretien

Les magasins sont entièrement configurables.

---

# 7. Emplacements physiques

Chaque magasin est organisé en :

- Zones
- Allées
- Étagères
- Niveaux
- Bacs

Exemple :

Dépôt Central

→ Zone A

→ Allée B

→ Étagère 03

→ Niveau 2

→ Bac C

Chaque article possède une localisation précise.

---

# 8. Articles

Le module stocke tous les types d'articles :

- médicaments ;
- consommables ;
- dispositifs médicaux ;
- réactifs ;
- fournitures administratives ;
- équipements ;
- pièces de rechange.

Chaque article comprend notamment :

- UUID
- Référence métier
- Désignation
- Catégorie
- Unité
- Stock actuel
- Stock minimum
- Stock maximum
- Emplacement principal

---

# 9. Gestion des lots

Les lots comprennent :

- numéro ;
- fournisseur ;
- date de fabrication ;
- date de péremption ;
- quantité ;
- emplacement.

Le système assure une traçabilité complète.

---

# 10. Numéros de série

Pour les équipements concernés :

- numéro de série ;
- fabricant ;
- garantie ;
- historique des mouvements.

---

# 11. Mouvements de stock

Le système gère :

Entrées

Sorties

Transferts

Ajustements

Retours

Corrections

Inventaires

Tous les mouvements sont historisés.

---

# 12. Réapprovisionnements internes

Les magasins peuvent s'approvisionner entre eux selon les règles définies.

Exemple :

Dépôt Central

↓

Pharmacie

↓

Patient

ou

Dépôt Central

↓

Laboratoire

↓

Consommation

Chaque transfert est entièrement traçable.

---

# 13. Inventaires

Le système permet :

- inventaire général ;
- inventaire tournant ;
- inventaire ciblé ;
- inventaire par emplacement.

Les écarts sont automatiquement calculés.

---

# 14. Règles de sortie

Le système peut appliquer :

- FEFO
- FIFO
- LIFO (option)

Le mode est configurable par catégorie d'article.

---

# 15. Alertes

Alertes automatiques :

- rupture de stock ;
- seuil minimum ;
- stock maximum ;
- péremption proche ;
- lot expiré ;
- emplacement saturé.

---

# 16. États

Le cycle de vie comprend :

Disponible

Réservé

En transfert

En contrôle

En quarantaine

Périmé

Retourné

Archivé

---

# 17. Workflow

1. Réception.
2. Contrôle qualité.
3. Affectation d'un emplacement.
4. Mise en stock.
5. Mouvements internes.
6. Consommation.
7. Inventaire.
8. Clôture.

---

# 18. Notifications

Le système peut notifier :

- rupture ;
- transfert demandé ;
- transfert validé ;
- stock faible ;
- inventaire planifié ;
- péremption proche.

Canaux :

- Notifications internes
- Email
- SMS
- WhatsApp (option)

---

# 19. Rapports

Le système produit notamment :

- valorisation des stocks ;
- mouvements ;
- inventaires ;
- ruptures ;
- péremptions ;
- consommation ;
- rotation des stocks ;
- occupation des magasins ;
- historique des mouvements.

---

# 20. Permissions

Les permissions comprennent notamment :

- créer un magasin ;
- créer un emplacement ;
- déplacer un article ;
- lancer un inventaire ;
- enregistrer une entrée ;
- enregistrer une sortie ;
- lancer un transfert ;
- consulter ;
- exporter ;
- imprimer.

Toutes les opérations sont journalisées.

---

# 21. Intégration

Le module communique avec :

- Achats & Approvisionnements
- Pharmacie
- Laboratoire
- Imagerie
- Hospitalisation
- Finance
- Rapports
- Paramètres
- Notifications

Tous les mouvements sont synchronisés automatiquement.

---

# 22. Sécurité

Le système garantit :

- isolation par établissement ;
- authentification obligatoire ;
- contrôle des permissions ;
- journalisation complète ;
- sauvegarde.

Aucune suppression physique n'est autorisée.

---

# 23. Règles métier

BR-076 : Chaque site de stockage possède un UUID.

BR-077 : Chaque magasin appartient à un site de stockage.

BR-078 : Chaque article possède un emplacement physique principal.

BR-079 : Les mouvements sont entièrement historisés.

BR-080 : Les transferts mettent automatiquement à jour les stocks des magasins concernés.

BR-081 : Les règles FEFO, FIFO ou LIFO sont configurables selon la catégorie d'article.

BR-082 : Les suppressions physiques sont interdites.

---

# 24. Dépendances

Ce document dépend de :

- BP-017 – Module Achats, Approvisionnements & Logistique Interne
- BP-008 – Nomenclature
- BP-006 – Rôles & Permissions

Ce module est utilisé par :

- BP-019 – Module Pharmacie
- BP-020 – Module Laboratoire
- BP-021 – Module Imagerie
- BP-022 – Module Finance
- BP-024 – Module Rapports
- BP-026 – Paramètres & Données de Référence

---

# Conclusion

Le module Stock & Inventaire constitue le référentiel logistique de MORACare Enterprise.

Grâce à une gestion hiérarchique des sites de stockage, des magasins et des emplacements physiques, il assure une traçabilité complète des articles, une maîtrise des mouvements logistiques et une intégration native avec les achats, la pharmacie, le laboratoire, l'imagerie et l'ensemble des autres modules de la plateforme.