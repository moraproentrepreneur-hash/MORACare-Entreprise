# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Gestion Documentaire, GED & Archivage

**Référence :** BP-025

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le système de Gestion Électronique des Documents (GED) et d'archivage de MORACare Enterprise.

Ce module centralise l'ensemble des documents produits ou importés dans le système, garantit leur conservation, leur traçabilité, leur sécurité et leur disponibilité pendant toute leur durée de vie conformément aux politiques de l'établissement et aux exigences réglementaires.

Il constitue le référentiel documentaire officiel de MORACare Enterprise.

---

# 2. Objectifs

Le module permet de :

- centraliser tous les documents ;
- supprimer les archives papier lorsque la réglementation le permet ;
- assurer la traçabilité documentaire ;
- faciliter les recherches ;
- sécuriser les documents sensibles ;
- gérer les versions ;
- organiser les archives ;
- respecter les durées légales de conservation.

---

# 3. Périmètre

Le module couvre :

- Gestion électronique des documents (GED)
- Archivage numérique
- Classement documentaire
- Numérisation
- Importation
- Indexation
- Versionnement
- Signature électronique
- Historique des documents
- Conservation
- Recherche documentaire
- Corbeille logique
- Restauration
- Destruction réglementaire

---

# 4. Documents pris en charge

Le système peut gérer notamment :

## Documents médicaux

- dossiers médicaux
- comptes rendus
- prescriptions
- ordonnances
- résultats biologiques
- comptes rendus d'imagerie
- comptes rendus opératoires
- certificats médicaux

## Documents administratifs

- cartes d'identité
- passeports
- contrats
- formulaires
- autorisations
- consentements
- pièces justificatives

## Documents RH

- contrats
- diplômes
- certificats
- évaluations
- formations
- sanctions
- promotions

## Documents financiers

- devis
- factures
- reçus
- pièces comptables
- relevés bancaires
- budgets

## Documents logistiques

- bons de commande
- bons de réception
- inventaires
- mouvements de stock

---

# 5. Références documentaires

Chaque document possède :

- UUID
- Référence métier
- Type
- Catégorie
- Date de création
- Auteur
- Propriétaire
- Version

Exemple :

MORA-DOC-A000001

---

# 6. Catégories documentaires

Les catégories sont configurables.

Exemples :

- Médical
- Administratif
- RH
- Comptabilité
- Finance
- Pharmacie
- Laboratoire
- Imagerie
- Hospitalisation
- Qualité
- Juridique

---

# 7. Formats supportés

Le système accepte notamment :

- PDF
- DOCX
- XLSX
- CSV
- TXT
- JPG
- PNG
- TIFF
- DICOM
- ZIP

Les extensions autorisées sont paramétrables.

---

# 8. Numérisation

Le module permet :

- la numérisation directe ;
- l'import de scanners ;
- l'import depuis un appareil mobile ;
- l'import multiple.

Les fichiers sont automatiquement indexés.

---

# 9. Classement documentaire

Chaque document peut être classé par :

- patient ;
- employé ;
- fournisseur ;
- service ;
- département ;
- dossier médical ;
- facture ;
- projet ;
- catégorie.

Un même document peut être lié à plusieurs entités lorsque cela est autorisé.

---

# 10. Métadonnées

Chaque document peut comporter :

- titre ;
- description ;
- mots-clés ;
- catégorie ;
- auteur ;
- date ;
- statut ;
- confidentialité ;
- version.

Ces métadonnées facilitent les recherches.

---

# 11. Versionnement

Chaque modification crée une nouvelle version.

Le système conserve :

- version initiale ;
- versions intermédiaires ;
- version courante.

Les anciennes versions restent consultables selon les permissions.

---

# 12. Recherche documentaire

Le moteur de recherche permet une recherche par :

- référence ;
- titre ;
- contenu indexé ;
- patient ;
- employé ;
- auteur ;
- catégorie ;
- période ;
- mots-clés.

Les filtres peuvent être combinés.

---

# 13. Signature électronique

Les documents peuvent être signés électroniquement par :

- médecin ;
- pharmacien ;
- biologiste ;
- direction ;
- administration.

Les signatures sont historisées.

---

# 14. Conservation

Le système applique automatiquement les politiques de conservation.

Exemples :

- documents permanents ;
- conservation 5 ans ;
- conservation 10 ans ;
- conservation 20 ans ;
- conservation illimitée.

Les règles sont configurables.

---

# 15. Archivage

Les documents peuvent être :

- actifs ;
- archivés ;
- gelés (litige ou enquête) ;
- restaurés.

L'archivage ne modifie jamais le contenu du document.

---

# 16. Corbeille logique

Les suppressions sont uniquement logiques.

Le document est déplacé dans une corbeille sécurisée avec :

- utilisateur ;
- date ;
- motif.

La restauration est possible selon les droits accordés.

---

# 17. Destruction réglementaire

À l'expiration de la durée de conservation, le système peut :

- proposer la destruction ;
- demander une validation ;
- générer un procès-verbal de destruction.

Aucune destruction n'est réalisée sans autorisation.

---

# 18. Historique

Chaque document conserve :

- création ;
- consultations ;
- téléchargements ;
- impressions ;
- modifications ;
- signatures ;
- archivages ;
- restaurations.

---

# 19. Notifications

Le système peut notifier :

- document ajouté ;
- document expirant ;
- document manquant ;
- signature requise ;
- archivage effectué ;
- restauration réalisée.

---

# 20. Permissions

Les principales permissions comprennent :

- créer un document ;
- importer ;
- télécharger ;
- consulter ;
- modifier les métadonnées ;
- signer ;
- archiver ;
- restaurer ;
- supprimer logiquement ;
- valider une destruction.

Toutes les permissions sont gérées par rôle.

---

# 21. Sécurité

Le système garantit :

- chiffrement des documents sensibles ;
- contrôle d'accès par rôle ;
- journalisation complète ;
- protection contre les suppressions accidentelles ;
- sauvegardes automatiques ;
- contrôle d'intégrité des fichiers.

---

# 22. Audit Trail

Chaque opération enregistre :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- type d'action ;
- document concerné.

Aucun historique ne peut être supprimé.

---

# 23. Workflow

Création ou import

↓

Indexation

↓

Classement

↓

Validation

↓

Consultation

↓

Versionnement

↓

Archivage

↓

Conservation

↓

Destruction réglementaire (si autorisée)

---

# 24. Règles métier

BR-194 : Chaque document possède un UUID et une référence métier unique.

BR-195 : Tous les documents sont indexés avant leur validation.

BR-196 : Les anciennes versions sont conservées.

BR-197 : Les suppressions physiques sont interdites.

BR-198 : Les politiques de conservation sont paramétrables.

BR-199 : Toute consultation est journalisée.

BR-200 : Les documents archivés restent consultables selon les droits.

BR-201 : Les signatures électroniques sont historisées.

BR-202 : La destruction documentaire nécessite une validation autorisée.

BR-203 : Les documents liés à un audit ou à une procédure judiciaire ne peuvent pas être détruits tant qu'ils sont placés sous gel documentaire.

---

# 25. Dépendances

Ce module est transversal et interagit avec :

- Tous les modules cliniques
- BP-022A à BP-022C – Finance
- BP-023A à BP-023C – Ressources Humaines
- BP-024A – Rapports
- BP-024B – Business Intelligence
- Gestion des utilisateurs
- Audit
- Sécurité

---

# Conclusion

Le BP-025 fait de MORACare Enterprise un système entièrement dématérialisé grâce à une Gestion Électronique des Documents (GED) robuste, sécurisée et conforme aux exigences réglementaires. En centralisant l'ensemble des documents médicaux, administratifs, financiers et RH, il garantit leur disponibilité, leur intégrité, leur traçabilité et leur conservation tout au long de leur cycle de vie, tout en offrant des capacités avancées de recherche, de versionnement, de signature électronique et d'archivage.