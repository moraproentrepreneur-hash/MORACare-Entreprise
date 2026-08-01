# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Encaissements, Décaissements & Gestion des Caisses

**Référence :** BP-022B

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le fonctionnement complet de la gestion des encaissements, des décaissements et des caisses de MORACare Enterprise.

Il garantit une parfaite traçabilité de tous les mouvements financiers de l'établissement, qu'ils soient liés à une facture ou indépendants.

Chaque mouvement financier est historisé, sécurisé et auditable.

---

# 2. Objectifs

Le module permet de :

- enregistrer tous les encaissements ;
- enregistrer tous les décaissements ;
- gérer plusieurs caisses ;
- suivre les soldes en temps réel ;
- sécuriser les mouvements financiers ;
- contrôler les écarts de caisse ;
- produire les journaux de caisse ;
- assurer une parfaite traçabilité.

---

# 3. Architecture des caisses

Un établissement peut disposer de plusieurs caisses.

Exemples :

- Caisse principale
- Caisse des consultations
- Caisse des urgences
- Caisse de la pharmacie
- Caisse du laboratoire
- Caisse de l'imagerie
- Caisse de l'hospitalisation
- Caisse administrative

Chaque caisse possède :

- UUID
- Référence métier
- Nom
- Description
- Devise
- Responsable
- Solde actuel
- Solde d'ouverture
- Statut
- Date de création

---

# 4. Références métier

Les mouvements utilisent des références lisibles.

Exemples :

MORA-ENC-A000001

MORA-DEC-A000001

MORA-CSH-A000001

MORA-RCU-A000001

Chaque référence est unique.

---

# 5. Modes de paiement

Les modes disponibles par défaut sont :

- Espèces
- Holo
- Mvola
- Wakati
- Chèque
- Virement bancaire
- Carte bancaire

L'administrateur peut ajouter de nouveaux modes.

Exemples :

- Mobile Money partenaire
- Paiement en ligne
- Portefeuille électronique

---

# 6. Encaissements

Le système gère tous les encaissements.

Chaque encaissement comprend notamment :

- UUID
- Référence
- Date
- Heure
- Caisse
- Patient ou payeur
- Montant
- Mode de paiement
- Utilisateur
- Statut
- Commentaire

---

# 7. Encaissements liés

Le système peut enregistrer les paiements provenant de :

- Consultation
- Hospitalisation
- Pharmacie
- Laboratoire
- Imagerie
- Bloc opératoire
- Chambre
- Lit
- Prestations diverses
- Facture globale

---

# 8. Encaissements divers

Le système permet d'enregistrer des recettes indépendantes de toute facture.

Exemples :

- Don
- Subvention
- Vente exceptionnelle
- Location de salle
- Formation
- Participation
- Dépôt de garantie
- Intérêt bancaire
- Produit exceptionnel
- Remboursement reçu
- Autre recette

Chaque encaissement divers doit préciser :

- catégorie
- origine
- justificatif
- commentaire

---

# 9. Paiements partiels

Une facture peut être réglée en plusieurs fois.

Exemple :

Facture :

120 000 KMF

Paiement 1 :

40 000

Paiement 2 :

30 000

Paiement 3 :

50 000

Le système calcule automatiquement le solde.

---

# 10. Paiements multiples

Une même facture peut être réglée avec plusieurs moyens de paiement.

Exemple :

40 000 Espèces

30 000 Holo

50 000 Mvola

Le système conserve le détail de chaque paiement.

---

# 11. Acomptes

Le système gère les acomptes.

Ils peuvent être :

- transformés en paiement
- remboursés
- reportés

---

# 12. Reçus

Chaque paiement génère automatiquement un reçu.

Le reçu comporte notamment :

- Référence
- Date
- Facture
- Patient
- Montant
- Solde
- Caisse
- Mode de paiement
- Caissier

---

# 13. Décaissements

Le système enregistre toutes les sorties d'argent.

Chaque décaissement comporte :

- UUID
- Référence
- Date
- Caisse
- Bénéficiaire
- Motif
- Montant
- Mode de paiement
- Utilisateur
- Justificatif

---

# 14. Décaissements liés

Exemples :

- Paiement fournisseur
- Achat
- Maintenance
- Prestataire
- Assurance
- Remboursement patient
- Salaire (option)

---

# 15. Décaissements divers

Le système gère également :

- Petite caisse
- Transport
- Carburant
- Réparation urgente
- Frais bancaires
- Frais administratifs
- Dépenses diverses
- Avances
- Dons
- Autres charges

Chaque mouvement exige un motif.

---

# 16. Ouverture de caisse

Avant toute opération :

Le caissier ouvre sa caisse.

Il indique :

- montant initial
- observations

L'ouverture est enregistrée.

---

# 17. Fermeture de caisse

En fin de journée :

Le système calcule automatiquement :

- total encaissé
- total décaissé
- solde théorique

Le caissier effectue ensuite le comptage physique.

---

# 18. Comptage physique

Le système permet de saisir :

- espèces
- chèques
- autres valeurs

Le total est comparé au solde théorique.

---

# 19. Écarts de caisse

Deux situations :

Excédent

Déficit

Chaque écart doit être :

- expliqué
- validé selon les permissions

L'historique est conservé.

---

# 20. Alimentation de caisse

Une caisse peut recevoir des fonds.

Exemples :

- alimentation initiale
- renfort de trésorerie

Le mouvement est historisé.

---

# 21. Retrait de caisse

Une caisse peut effectuer :

- dépôt bancaire
- retrait sécurisé
- transfert interne

Tous les retraits sont tracés.

---

# 22. Transfert entre caisses

Exemple :

Caisse principale

↓

Pharmacie

↓

Urgences

Chaque transfert génère :

- sortie
- entrée

Les deux mouvements sont liés.

---

# 23. Annulation

Un encaissement ou un décaissement ne peut jamais être supprimé.

Le système crée automatiquement une contrepassation.

Les historiques restent intacts.

---

# 24. Journal de caisse

Chaque caisse possède son journal.

Le journal contient :

- toutes les entrées
- toutes les sorties
- les soldes
- les utilisateurs
- les références

Aucune ligne n'est supprimée.

---

# 25. Livre de caisse

Le livre de caisse regroupe :

- ouvertures
- encaissements
- décaissements
- retraits
- alimentations
- transferts
- clôtures

Il constitue l'historique officiel.

---

# 26. Notifications

Le système peut notifier :

- ouverture oubliée
- caisse non fermée
- écart important
- retrait important
- paiement annulé
- transfert effectué

---

# 27. Permissions

Exemples :

- ouvrir une caisse
- fermer une caisse
- effectuer un encaissement
- effectuer un décaissement
- créer un paiement divers
- annuler un paiement
- alimenter une caisse
- retirer des fonds
- transférer entre caisses
- consulter le journal
- exporter

---

# 28. Sécurité

Le système interdit :

- suppression physique
- modification d'un mouvement validé
- changement du mode de paiement après validation
- modification du montant après validation

Toutes les actions sont historisées.

---

# 29. Audit Trail

Chaque mouvement conserve :

- utilisateur
- date
- heure
- adresse IP
- ancienne valeur
- nouvelle valeur
- justification

---

# 30. Workflow

Ouverture de caisse

↓

Encaissements

↓

Décaissements

↓

Transferts

↓

Retraits

↓

Comptage physique

↓

Écart éventuel

↓

Validation

↓

Fermeture

↓

Archivage

---

# 31. Règles métier

BR-119 : Toute opération financière appartient obligatoirement à une caisse.

BR-120 : Chaque encaissement possède une référence unique.

BR-121 : Chaque décaissement possède une référence unique.

BR-122 : Une facture peut recevoir plusieurs paiements.

BR-123 : Un paiement peut utiliser plusieurs modes de règlement.

BR-124 : Les encaissements divers sont indépendants de toute facture.

BR-125 : Les décaissements divers sont indépendants de tout fournisseur.

BR-126 : Toute ouverture de caisse précède les opérations de la journée.

BR-127 : Toute fermeture de caisse nécessite un comptage physique.

BR-128 : Tout écart de caisse doit être justifié.

BR-129 : Les transferts entre caisses génèrent automatiquement deux mouvements liés.

BR-130 : Les suppressions physiques sont interdites.

BR-131 : Toute annulation est réalisée par contrepassation.

BR-132 : Le journal de caisse est inaltérable.

---

# 32. Dépendances

Ce module dépend :

- BP-022A – Finance & Facturation

Il alimente :

- BP-022C – Trésorerie & Comptabilité
- Rapports
- Business Intelligence
- Audit

---

# Conclusion

Le BP-022B constitue le cœur opérationnel de la gestion financière quotidienne de MORACare Enterprise. Il assure une gestion complète des encaissements, décaissements, paiements multiples, paiements partiels, recettes et dépenses diverses, ainsi que de la gestion multi-caisses, avec un haut niveau de sécurité, de traçabilité et d'audit. Conçu selon les meilleures pratiques des ERP hospitaliers, il garantit une parfaite maîtrise des flux financiers et prépare automatiquement les données destinées à la trésorerie et à la comptabilité.