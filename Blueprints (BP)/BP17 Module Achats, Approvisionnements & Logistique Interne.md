# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Achats, Approvisionnements & Logistique Interne

**Référence :** BP-017

**Version :** 2.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Achats, Approvisionnements & Logistique Interne permet de gérer l'ensemble du cycle logistique de l'établissement de santé.

Il couvre :

- les demandes d'achat ;
- les demandes d'approvisionnement ;
- les fournisseurs ;
- les appels d'offres ;
- les demandes de devis ;
- les bons de commande ;
- les réceptions ;
- les contrôles qualité ;
- les réapprovisionnements internes ;
- les transferts entre magasins ;
- les retours fournisseurs.

Le module constitue le point d'entrée de toute la chaîne d'approvisionnement de MORACare Enterprise.

---

# 2. Objectifs

Le module permet de :

- centraliser les achats ;
- optimiser les approvisionnements ;
- réduire les ruptures de stock ;
- assurer la traçabilité des commandes ;
- gérer les fournisseurs ;
- gérer les circuits de validation ;
- organiser la logistique interne ;
- alimenter automatiquement le module Stock.

---

# 3. Sous-modules

Le module comprend :

- Demandes d'achat
- Demandes d'approvisionnement
- Fournisseurs
- Appels d'offres
- Demandes de devis
- Comparaison des offres
- Bons de commande
- Réceptions
- Contrôle qualité
- Réapprovisionnements internes
- Transferts logistiques
- Retours fournisseurs
- Historique

---

# 4. Données manipulées

Chaque opération comprend notamment :

- UUID
- Référence métier
- Établissement
- Service demandeur
- Magasin source
- Magasin destinataire
- Fournisseur
- Articles
- Quantités
- Priorité
- Statut
- Dates
- Observations

---

# 5. Les fournisseurs

Le système permet de gérer :

- fabricants ;
- distributeurs ;
- grossistes ;
- prestataires de services ;
- fournisseurs locaux ;
- fournisseurs internationaux.

Chaque fournisseur possède :

- informations administratives ;
- contacts ;
- catégories de produits ;
- délais moyens de livraison ;
- conditions de paiement ;
- historique des commandes ;
- niveau de performance ;
- documents contractuels.

---

# 6. Demandes d'achat

Une demande peut être créée par :

- Dépôt Central ;
- Pharmacie ;
- Laboratoire ;
- Imagerie ;
- Bloc opératoire ;
- Hospitalisation ;
- Administration ;
- Maintenance ;
- Cuisine ;
- Buanderie ;
- tout autre service autorisé.

Chaque demande comprend :

- demandeur ;
- justification ;
- priorité ;
- liste des articles ;
- quantités ;
- date souhaitée.

---

# 7. Circuit de validation

Le workflow de validation est entièrement configurable.

Exemple :

Demandeur

↓

Chef de service

↓

Responsable Logistique

↓

Direction

↓

Service Achats

Chaque établissement peut définir son propre circuit.

---

# 8. Consultation des fournisseurs

Le système permet :

- demande de devis ;
- consultation directe ;
- appel d'offres ;
- fournisseur privilégié.

Plusieurs offres peuvent être enregistrées pour une même demande.

---

# 9. Comparaison des offres

Le système compare :

- prix ;
- délai ;
- qualité ;
- garantie ;
- conditions de paiement ;
- frais de transport ;
- historique du fournisseur.

Le choix final est historisé.

---

# 10. Bon de commande

Après validation, le système génère automatiquement un bon de commande comprenant :

- fournisseur ;
- références ;
- articles ;
- quantités ;
- prix ;
- taxes ;
- remises ;
- mode de livraison ;
- conditions de paiement.

Chaque bon possède une référence officielle.

---

# 11. Réception des marchandises

Les livraisons sont réceptionnées dans le magasin de réception défini par l'établissement.

Par défaut :

Dépôt Central

Lors de la réception, le système vérifie :

- quantités ;
- qualité ;
- conformité ;
- numéro de lot ;
- numéro de série (si applicable) ;
- date de fabrication ;
- date de péremption ;
- documents.

---

# 12. Contrôle qualité

Chaque réception peut être :

- Acceptée
- Acceptée avec réserve
- Refusée

Les motifs sont historisés.

---

# 13. Mise en stock

Après validation :

- création automatique des entrées de stock ;
- mise à jour des quantités ;
- mise à jour de la valorisation ;
- historisation complète.

Le module transmet automatiquement les informations au BP-018.

---

# 14. Réapprovisionnement interne

Le système gère les mouvements internes entre magasins.

Exemples :

- Dépôt Central → Pharmacie
- Dépôt Central → Laboratoire
- Dépôt Central → Bloc opératoire
- Dépôt Central → Imagerie
- Dépôt Central → Cuisine
- Dépôt Central → Buanderie

Chaque transfert comprend :

- magasin source ;
- magasin destinataire ;
- articles ;
- quantités ;
- utilisateur ;
- date ;
- observations.

---

# 15. Gestion des ruptures

Si le magasin source ne dispose pas du stock nécessaire :

Le système peut :

- proposer un autre magasin ;
- générer automatiquement une demande d'achat ;
- notifier les responsables.

Le comportement est configurable.

---

# 16. Livraisons directes

Par défaut :

Les fournisseurs livrent uniquement le Dépôt Central.

Toutefois, l'établissement peut autoriser :

- livraison directe à la Pharmacie ;
- livraison directe au Laboratoire ;
- livraison directe au Bloc opératoire ;
- livraison directe à tout autre magasin.

Ces règles sont configurables.

---

# 17. Retours fournisseurs

Le système permet :

- retour total ;
- retour partiel ;
- remplacement ;
- avoir fournisseur.

Les retours mettent automatiquement à jour les stocks.

---

# 18. États du processus

Le cycle de vie comprend :

- Brouillon
- En validation
- Validé
- Consultation fournisseurs
- Commandé
- Livré partiellement
- Livré
- Contrôlé
- Mis en stock
- Clôturé
- Annulé
- Archivé

---

# 19. Workflow

1. Expression du besoin.
2. Demande d'achat.
3. Validation.
4. Consultation fournisseurs.
5. Sélection.
6. Bon de commande.
7. Livraison.
8. Réception.
9. Contrôle qualité.
10. Mise en stock.
11. Réapprovisionnement interne.
12. Clôture.

---

# 20. Notifications

Le système peut notifier :

- nouvelle demande ;
- validation requise ;
- commande envoyée ;
- livraison attendue ;
- réception enregistrée ;
- contrôle qualité ;
- rupture de stock ;
- réapprovisionnement demandé.

Canaux :

- Notifications internes
- Email
- SMS
- WhatsApp (option)

---

# 21. Rapports

Le module produit notamment :

- achats par période ;
- achats par fournisseur ;
- achats par catégorie ;
- délais moyens ;
- commandes en attente ;
- commandes en retard ;
- performances fournisseurs ;
- réapprovisionnements internes ;
- mouvements logistiques.

---

# 22. Permissions

Les permissions comprennent notamment :

- créer une demande ;
- modifier ;
- valider ;
- approuver ;
- consulter ;
- générer un bon de commande ;
- enregistrer une réception ;
- réaliser un contrôle qualité ;
- lancer un réapprovisionnement ;
- enregistrer un retour ;
- exporter ;
- imprimer.

Toutes les opérations sont journalisées.

---

# 23. Intégration

Le module communique avec :

- Administration
- Stock & Inventaire
- Pharmacie
- Laboratoire
- Imagerie
- Hospitalisation
- Finance
- Rapports
- Notifications

Toutes les réceptions alimentent automatiquement le module Stock.

Tous les réapprovisionnements mettent automatiquement à jour les magasins concernés.

---

# 24. Sécurité

Le système garantit :

- isolation par établissement ;
- authentification obligatoire ;
- contrôle des permissions ;
- journalisation complète ;
- sauvegarde.

Aucune suppression physique n'est autorisée.

---

# 25. Règles métier

BR-065 : Toute demande possède un UUID.

BR-066 : Toute demande possède une référence métier officielle.

BR-067 : Les fournisseurs approvisionnent par défaut le Dépôt Central ou le magasin de réception défini par l'établissement.

BR-068 : Les réceptions doivent être contrôlées avant la mise en stock.

BR-069 : Toute réception validée crée automatiquement une entrée de stock.

BR-070 : Les magasins internes sont réapprovisionnés par transfert depuis un magasin autorisé.

BR-071 : Chaque réapprovisionnement génère automatiquement une sortie du magasin source et une entrée dans le magasin destinataire.

BR-072 : Si le magasin source est en rupture, le système peut générer une nouvelle demande d'achat selon les paramètres de l'établissement.

BR-073 : Les livraisons directes vers un magasin autre que le Dépôt Central sont autorisées uniquement si elles sont activées dans les paramètres.

BR-074 : Les retours fournisseurs mettent automatiquement à jour le stock.

BR-075 : Toutes les opérations sont historisées et journalisées.

---

# 26. Dépendances

Ce document dépend de :

- BP-006 – Rôles et permissions
- BP-008 – Nomenclature
- BP-010 – Authentification
- BP-011 – Modèle de données métier
- BP-012 – Architecture modulaire

Ce module est utilisé par :

- BP-018 – Module Stock & Inventaire
- BP-019 – Module Pharmacie
- BP-020 – Module Laboratoire
- BP-021 – Module Imagerie
- BP-022 – Module Finance
- BP-024 – Module Rapports
- BP-026 – Paramètres & Données de Référence

---

# Conclusion

Le module Achats, Approvisionnements & Logistique Interne constitue le socle logistique de MORACare Enterprise.

Il orchestre l'ensemble du cycle d'approvisionnement, depuis l'expression du besoin jusqu'à la mise à disposition des produits dans les différents magasins de l'établissement. Grâce à sa gestion configurable des circuits de validation, des fournisseurs, des réceptions, des contrôles qualité et des réapprovisionnements internes, il garantit une logistique sécurisée, traçable et évolutive, adaptée aussi bien aux petites cliniques qu'aux grands centres hospitaliers.