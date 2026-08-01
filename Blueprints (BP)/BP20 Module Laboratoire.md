# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Laboratoire

**Référence :** BP-020

**Version :** 2.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Laboratoire permet de gérer l'ensemble des activités du laboratoire médical.

Il couvre :

- les demandes d'analyses ;
- les prélèvements ;
- la gestion des échantillons ;
- les examens biologiques ;
- les validations techniques ;
- les validations biologiques ;
- les résultats ;
- les comptes rendus ;
- les consommables de laboratoire ;
- la traçabilité complète des analyses.

Le module est intégré au Dossier Médical Électronique et au module Stock & Inventaire.

---

# 2. Objectifs

Le module permet de :

- gérer plusieurs laboratoires ;
- organiser les prélèvements ;
- assurer la traçabilité des échantillons ;
- gérer les examens biologiques ;
- enregistrer les résultats ;
- produire les comptes rendus ;
- gérer les consommables du laboratoire ;
- assurer le suivi qualité.

---

# 3. Sous-modules

Le module comprend :

- Laboratoires
- Catalogues des analyses
- Demandes d'analyses
- Prélèvements
- Échantillons
- Examens
- Résultats
- Validation technique
- Validation biologique
- Comptes rendus
- Consommables
- Historique

---

# 4. Laboratoires

Un établissement peut gérer plusieurs laboratoires.

Exemples :

- Laboratoire Central
- Hématologie
- Biochimie
- Immunologie
- Microbiologie
- Parasitologie
- Virologie
- Anatomopathologie

Chaque laboratoire est associé à un magasin du module Stock.

---

# 5. Catalogue des analyses

Chaque analyse comprend :

- UUID
- Référence métier
- Nom
- Catégorie
- Description
- Type d'échantillon
- Délai moyen
- Valeurs de référence
- Unité de mesure
- Statut

Le catalogue est entièrement configurable.

---

# 6. Demandes d'analyses

Une demande peut provenir :

- d'une consultation ;
- d'une hospitalisation ;
- des urgences ;
- d'un examen de santé.

Chaque demande comprend :

- patient ;
- prescripteur ;
- analyses demandées ;
- priorité ;
- observations.

---

# 7. Prélèvements

Le système permet de gérer :

- sang ;
- urine ;
- selles ;
- salive ;
- liquide biologique ;
- biopsie ;
- autres prélèvements.

Chaque prélèvement est horodaté.

---

# 8. Gestion des échantillons

Chaque échantillon possède :

- UUID ;
- code-barres ;
- type ;
- date de prélèvement ;
- heure ;
- préleveur ;
- laboratoire destinataire ;
- statut.

Chaque échantillon est entièrement traçable.

---

# 9. Examens

Les examens sont réalisés selon les protocoles du laboratoire.

Chaque examen comprend :

- technicien ;
- appareil utilisé (optionnel) ;
- observations ;
- résultats.

---

# 10. Résultats

Chaque résultat comprend notamment :

- valeur ;
- unité ;
- valeurs de référence ;
- commentaire ;
- statut.

Les résultats peuvent être :

- normaux ;
- anormaux ;
- critiques.

---

# 11. Validation

Deux niveaux de validation sont possibles :

Validation technique

↓

Validation biologique

Chaque validation est historisée.

---

# 12. Comptes rendus

Après validation :

Le système génère automatiquement un compte rendu.

Le compte rendu peut être :

- imprimé ;
- téléchargé ;
- transmis au dossier médical ;
- partagé avec le patient selon les droits.

---

# 13. Consommables

Le laboratoire utilise le module Stock pour gérer :

- réactifs ;
- tubes ;
- kits ;
- consommables ;
- équipements.

Les consommations mettent automatiquement à jour le stock.

---

# 14. Contrôle qualité

Le système permet d'enregistrer :

- contrôles internes ;
- contrôles externes ;
- non-conformités ;
- actions correctives.

---

# 15. États

Le cycle de vie comprend :

- Prescrit
- Prélevé
- Reçu
- En analyse
- En validation
- Validé
- Diffusé
- Clôturé
- Archivé

---

# 16. Workflow

1. Prescription.
2. Prélèvement.
3. Identification de l'échantillon.
4. Réception.
5. Analyse.
6. Validation technique.
7. Validation biologique.
8. Génération du compte rendu.
9. Intégration au dossier médical.

---

# 17. Notifications

Le système peut notifier :

- nouvelle demande ;
- prélèvement attendu ;
- résultat disponible ;
- résultat critique ;
- validation requise ;
- consommable en rupture.

Canaux :

- Notifications internes
- Email
- SMS
- WhatsApp (option)

---

# 18. Rapports

Le module produit notamment :

- analyses réalisées ;
- délais de traitement ;
- activité par laboratoire ;
- activité par technicien ;
- résultats critiques ;
- consommation des réactifs ;
- statistiques par période.

---

# 19. Permissions

Les permissions comprennent notamment :

- créer une analyse ;
- enregistrer un prélèvement ;
- saisir un résultat ;
- valider un résultat ;
- consulter ;
- imprimer ;
- exporter.

Toutes les opérations sont journalisées.

---

# 20. Intégration

Le module communique avec :

- Patients
- Consultations
- Hospitalisation
- Dossier Médical
- Stock & Inventaire
- Achats & Approvisionnements
- Finance
- Rapports
- Notifications

Les consommables sont gérés par le module Stock.

---

# 21. Sécurité

Le système garantit :

- isolation par établissement ;
- authentification obligatoire ;
- contrôle des permissions ;
- journalisation complète ;
- sauvegarde.

Aucune suppression physique n'est autorisée.

---

# 22. Règles métier

BR-094 : Chaque laboratoire est associé à un magasin du module Stock.

BR-095 : Chaque demande d'analyse est liée à un patient.

BR-096 : Chaque prélèvement génère un échantillon unique.

BR-097 : Chaque échantillon possède un identifiant unique.

BR-098 : Les résultats critiques peuvent générer une alerte immédiate.

BR-099 : Les validations techniques et biologiques sont historisées.

BR-100 : Les consommables du laboratoire sont gérés par le module Stock.

BR-101 : Les suppressions physiques sont interdites.

---

# 23. Dépendances

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

Le module Laboratoire assure la gestion complète du cycle des analyses médicales, depuis la prescription jusqu'à la diffusion des résultats. Son intégration native avec le Dossier Médical Électronique, les modules Stock, Achats et Hospitalisation garantit une traçabilité totale des échantillons, des examens et des consommables, tout en répondant aux exigences de qualité et de sécurité d'un laboratoire moderne.