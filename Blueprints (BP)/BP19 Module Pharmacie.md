# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Pharmacie

**Référence :** BP-019

**Version :** 2.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Pharmacie permet de gérer l'ensemble des activités pharmaceutiques de l'établissement.

Il couvre :

- la gestion des pharmacies ;
- le catalogue des médicaments ;
- les prescriptions médicales ;
- les validations pharmaceutiques ;
- les préparations ;
- les délivrances ;
- les dispensations hospitalières ;
- les armoires pharmaceutiques des services ;
- les lots ;
- les péremptions ;
- les rappels de lots ;
- les retours ;
- les consommations ;
- les réapprovisionnements depuis le Dépôt Central.

Le module s'appuie sur le BP-018 pour la gestion des stocks.

---

# 2. Objectifs

Le module permet de :

- gérer plusieurs pharmacies ;
- sécuriser le circuit du médicament ;
- assurer la traçabilité des prescriptions ;
- contrôler les délivrances ;
- gérer les médicaments réglementés ;
- suivre les consommations ;
- réduire les erreurs médicamenteuses ;
- alimenter le dossier médical du patient.

---

# 3. Sous-modules

Le module comprend :

- Pharmacies
- Catalogue des médicaments
- Plans thérapeutiques
- Prescriptions
- Validation pharmaceutique
- Préparations
- Délivrances
- Dispensation hospitalière
- Armoires de services
- Lots
- Péremptions
- Rappels de lots
- Retours
- Consommations
- Historique

---

# 4. Pharmacies

Un établissement peut gérer plusieurs pharmacies.

Exemples :

- Pharmacie Centrale
- Pharmacie des Urgences
- Pharmacie Hospitalisation
- Pharmacie Bloc opératoire
- Pharmacie Oncologie

Chaque pharmacie est associée à un magasin du module Stock & Inventaire.

---

# 5. Catalogue des médicaments

Chaque médicament comprend notamment :

- UUID
- Référence métier
- Dénomination commerciale
- DCI
- Catégorie thérapeutique
- Forme pharmaceutique
- Dosage
- Voie d'administration
- Unité
- Prix
- Conditions de conservation
- Statut

Le stock est géré exclusivement par le module Stock & Inventaire.

---

# 6. Plans thérapeutiques

Le plan thérapeutique regroupe l'ensemble des traitements prescrits à un patient.

Il peut contenir :

- médicaments ;
- perfusions ;
- injections ;
- traitements ponctuels ;
- traitements continus ;
- durée ;
- fréquence ;
- horaires d'administration.

Chaque plan est lié au dossier médical du patient.

---

# 7. Prescriptions

Les prescriptions proviennent :

- des consultations ;
- des hospitalisations ;
- des urgences.

Chaque prescription comprend :

- médicament ;
- dosage ;
- fréquence ;
- durée ;
- quantité ;
- observations.

Elle est automatiquement rattachée au plan thérapeutique.

---

# 8. Validation pharmaceutique

Le pharmacien peut :

- valider ;
- demander une modification ;
- refuser avec justification ;
- contacter le prescripteur.

Toutes les validations sont historisées.

---

# 9. Préparation

Après validation :

Le système génère automatiquement la liste de préparation.

La préparation indique notamment :

- médicament ;
- lot conseillé ;
- quantité ;
- emplacement de stockage ;
- pharmacie concernée.

Le système privilégie automatiquement le lot selon la règle FEFO.

---

# 10. Délivrance

Le système gère :

- délivrance totale ;
- délivrance partielle ;
- délivrance différée.

Chaque délivrance :

- diminue automatiquement le stock ;
- est historisée ;
- est liée au patient ;
- est liée à la prescription.

---

# 11. Dispensation hospitalière

Pour les patients hospitalisés :

Le traitement peut être distribué :

- quotidiennement ;
- par tournée ;
- nominativement.

Chaque administration est enregistrée dans le dossier médical.

---

# 12. Armoires pharmaceutiques des services

Les services peuvent disposer d'armoires pharmaceutiques.

Exemples :

- Urgences
- Réanimation
- Bloc opératoire
- Maternité
- Pédiatrie

Ces armoires sont considérées comme des magasins secondaires gérés par le module Stock.

Leur réapprovisionnement est effectué par la pharmacie.

---

# 13. Réapprovisionnement

Le circuit normal est :

Fournisseur

↓

Dépôt Central

↓

Pharmacie

↓

Armoire du service

↓

Patient

Les livraisons directes à la pharmacie restent configurables.

---

# 14. Lots

Chaque lot comprend :

- numéro ;
- fournisseur ;
- fabrication ;
- péremption ;
- quantité ;
- emplacement.

Le système applique automatiquement la règle FEFO.

---

# 15. Péremptions

Le système surveille automatiquement :

- produits proches de la péremption ;
- produits expirés ;
- rappels de lots.

Des alertes sont générées automatiquement.

---

# 16. Médicaments réglementés

Le module permet de gérer :

- stupéfiants ;
- psychotropes ;
- médicaments soumis à autorisation.

Le niveau de traçabilité est renforcé.

---

# 17. Retours

Le système gère :

- retour patient ;
- retour service ;
- retour pharmacie ;
- destruction ;
- rappel fabricant.

Chaque retour met automatiquement à jour le stock.

---

# 18. Consommations

Le système permet d'analyser :

- consommation par patient ;
- consommation par service ;
- consommation par médecin ;
- consommation par pharmacie ;
- consommation par période.

---

# 19. États

Le cycle de vie comprend :

- Prescrit
- Validé
- En préparation
- Préparé
- Délivré
- Partiellement délivré
- Administré
- Retourné
- Clôturé
- Archivé

---

# 20. Workflow

1. Prescription.
2. Validation pharmaceutique.
3. Préparation.
4. Sélection automatique du lot.
5. Délivrance.
6. Administration (hospitalisation).
7. Historisation.
8. Mise à jour automatique du stock.

---

# 21. Notifications

Le système peut notifier :

- nouvelle prescription ;
- validation requise ;
- médicament indisponible ;
- rupture de stock ;
- péremption proche ;
- rappel fabricant ;
- réapprovisionnement demandé.

Canaux :

- Notifications internes
- Email
- SMS
- WhatsApp (option)

---

# 22. Rapports

Le module produit notamment :

- médicaments délivrés ;
- médicaments les plus prescrits ;
- consommation par service ;
- consommation par patient ;
- consommation par pharmacie ;
- ruptures ;
- péremptions ;
- médicaments réglementés ;
- valorisation du stock pharmaceutique.

---

# 23. Permissions

Les permissions comprennent notamment :

- créer un médicament ;
- modifier ;
- valider une prescription ;
- préparer une délivrance ;
- délivrer ;
- gérer les armoires ;
- enregistrer un retour ;
- consulter ;
- exporter ;
- imprimer.

Toutes les opérations sont journalisées.

---

# 24. Intégration

Le module communique avec :

- Patients
- Consultations
- Hospitalisation
- Stock & Inventaire
- Achats & Approvisionnements
- Finance
- Rapports
- Notifications

Toutes les délivrances mettent automatiquement à jour les stocks et le dossier médical.

---

# 25. Sécurité

Le système garantit :

- isolation par établissement ;
- authentification obligatoire ;
- contrôle des permissions ;
- journalisation complète ;
- sauvegarde.

Aucune suppression physique n'est autorisée.

---

# 26. Règles métier

BR-083 : Chaque pharmacie est associée à un magasin du module Stock.

BR-084 : Toute prescription est liée à un plan thérapeutique.

BR-085 : Toute délivrance est liée à une prescription.

BR-086 : Toute délivrance met automatiquement à jour le stock.

BR-087 : Les médicaments sont sélectionnés selon la règle FEFO lorsque celle-ci est applicable.

BR-088 : Les armoires des services sont considérées comme des magasins secondaires.

BR-089 : Les réapprovisionnements des armoires sont réalisés par les pharmacies.

BR-090 : Les pharmacies sont réapprovisionnées par le Dépôt Central selon les règles définies dans le BP-017.

BR-091 : Les médicaments réglementés disposent d'une traçabilité renforcée.

BR-092 : Les retours mettent automatiquement à jour les stocks.

BR-093 : Les suppressions physiques sont interdites.

---

# 27. Dépendances

Ce document dépend de :

- BP-013 – Module Patients
- BP-015 – Module Consultations
- BP-016 – Module Hospitalisation
- BP-017 – Module Achats, Approvisionnements & Logistique Interne
- BP-018 – Module Stock & Inventaire

Ce module est utilisé par :

- BP-022 – Module Finance
- BP-024 – Module Rapports
- BP-025 – Portail Patient

---

# Conclusion

Le module Pharmacie assure la gestion complète du circuit du médicament au sein de MORACare Enterprise.

Intégré aux modules Achats, Stock, Consultations, Hospitalisation et Dossier Médical, il garantit une prise en charge sécurisée des traitements, une traçabilité complète des médicaments, une gestion optimisée des pharmacies et des armoires de services, ainsi qu'une maîtrise des approvisionnements et des consommations pharmaceutiques. Son architecture multi-pharmacies et son intégration native avec la chaîne logistique permettent de répondre aux besoins aussi bien d'une clinique que d'un grand centre hospitalier multisite.