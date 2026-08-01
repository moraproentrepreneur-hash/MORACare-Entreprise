# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Paramétrage Métier & Référentiels

**Référence :** BP-028B

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le module de paramétrage métier et de gestion des référentiels de MORACare Enterprise.

Ce module permet aux administrateurs fonctionnels de configurer l'ensemble des paramètres métiers utilisés par les différents modules du système sans intervention technique.

Il centralise tous les référentiels, nomenclatures, listes de valeurs, règles métier et paramètres de fonctionnement afin de garantir une utilisation homogène, cohérente et évolutive de MORACare Enterprise.

---

# 2. Objectifs

Le module permet de :

- administrer les référentiels métiers ;
- uniformiser les données ;
- éviter les doublons ;
- gérer les nomenclatures ;
- configurer les paramètres fonctionnels ;
- adapter le système aux besoins de chaque établissement ;
- garantir la cohérence des données.

---

# 3. Périmètre

Le module couvre :

- Référentiels médicaux
- Référentiels administratifs
- Référentiels RH
- Référentiels financiers
- Référentiels logistiques
- Référentiels pharmacie
- Référentiels laboratoire
- Référentiels imagerie
- Paramètres métiers
- Nomenclatures
- Catégories
- Moteur de numérotation
- Paramètres de validation
- Paramètres de calcul
- Historique des modifications

---

# 4. Architecture des référentiels

Les référentiels sont centralisés.

Chaque module consomme les informations depuis une source unique.

Architecture :

Référentiel central

↓

Validation

↓

Modules métiers

↓

Synchronisation automatique

Cette architecture garantit la cohérence des informations dans tout le système.

---

# 5. Référentiels médicaux

Le système permet de gérer notamment :

- spécialités médicales ;
- sous-spécialités ;
- diagnostics ;
- actes médicaux ;
- actes chirurgicaux ;
- motifs de consultation ;
- allergies ;
- groupes sanguins ;
- vaccins ;
- constantes médicales ;
- unités cliniques.

---

# 6. Référentiels pharmaceutiques

Configuration de :

- médicaments ;
- formes pharmaceutiques ;
- dosages ;
- voies d'administration ;
- classes thérapeutiques ;
- familles ;
- laboratoires fabricants ;
- unités de conditionnement.

---

# 7. Référentiels laboratoire

Configuration de :

- analyses ;
- profils biologiques ;
- tubes ;
- échantillons ;
- automates ;
- unités ;
- valeurs de référence ;
- intervalles critiques.

---

# 8. Référentiels imagerie

Gestion des :

- examens ;
- modalités ;
- protocoles ;
- régions anatomiques ;
- produits de contraste ;
- comptes rendus types.

---

# 9. Référentiels administratifs

Configuration de :

- pays ;
- villes ;
- nationalités ;
- professions ;
- niveaux d'études ;
- types de pièces d'identité ;
- états civils ;
- langues ;
- catégories de patients.

---

# 10. Référentiels financiers

Configuration de :

- devises ;
- taxes ;
- TVA ;
- assurances ;
- mutuelles ;
- tiers payants ;
- centres de coûts ;
- centres de profits ;
- catégories budgétaires.

---

# 11. Référentiels RH

Gestion de :

- fonctions ;
- grades ;
- catégories professionnelles ;
- contrats ;
- diplômes ;
- formations ;
- compétences ;
- types de congés.

---

# 12. Référentiels logistiques

Gestion de :

- fournisseurs ;
- catégories d'articles ;
- unités de mesure ;
- familles de produits ;
- entrepôts ;
- emplacements ;
- moyens de transport.

---

# 13. Paramètres métier

Chaque module dispose de paramètres dédiés.

Exemples :

Consultation :

- durée par défaut ;
- délai de retard ;
- durée maximale.

Hospitalisation :

- capacité des chambres ;
- règles de transfert ;
- règles de sortie.

Pharmacie :

- seuil d'alerte ;
- FEFO obligatoire ;
- durée de réservation.

Finance :

- règles de facturation ;
- règles de remise ;
- règles de paiement.

RH :

- horaires ;
- heures supplémentaires ;
- règles de calcul.

Ces paramètres sont configurables sans développement.

---

# 14. Moteur de numérotation automatique

Toutes les références métier sont générées exclusivement par MORACare Enterprise.

Les utilisateurs, y compris les administrateurs, ne peuvent ni créer, ni modifier les références.

Exemples :

```
MORA-PAT-A000001
MORA-RDV-A000001
MORA-CNS-A000001
MORA-HOS-A000001
MORA-ORD-A000001
MORA-PRE-A000001
MORA-LAB-A000001
MORA-IMG-A000001
MORA-PHA-A000001
MORA-FAC-A000001
MORA-PAY-A000001
MORA-EMP-A000001
MORA-DOC-A000001
```

Le moteur garantit :

- unicité mondiale ;
- génération atomique ;
- absence de collision ;
- aucune réutilisation d'un numéro ;
- historique permanent ;
- génération en temps réel.

Les séquences sont indépendantes pour chaque type de document.

---

# 15. Paramètres de validation

Les administrateurs peuvent définir :

- validations automatiques ;
- validations manuelles ;
- double validation ;
- validation hiérarchique ;
- signatures obligatoires ;
- pièces justificatives obligatoires.

---

# 16. Paramètres de calcul

Le système permet de configurer :

- taxes ;
- remises ;
- arrondis ;
- calculs financiers ;
- calculs RH ;
- calculs statistiques.

Toutes les formules sont documentées et historisées.

---

# 17. Importation des référentiels

Les référentiels peuvent être importés via :

- Excel (.xlsx)
- CSV
- JSON
- XML

Chaque import est analysé avant intégration.

Le système détecte automatiquement :

- doublons ;
- incohérences ;
- données manquantes ;
- conflits.

---

# 18. Historique

Chaque modification conserve :

- ancienne valeur ;
- nouvelle valeur ;
- utilisateur ;
- date ;
- heure ;
- justification.

Les anciennes versions restent consultables.

---

# 19. Tableau de bord

Le module affiche notamment :

- nombre de référentiels ;
- éléments actifs ;
- éléments archivés ;
- modifications récentes ;
- imports réalisés ;
- anomalies détectées.

---

# 20. Permissions

Les principales permissions comprennent :

- créer un référentiel ;
- modifier un référentiel ;
- archiver un référentiel ;
- importer des données ;
- exporter des référentiels ;
- consulter l'historique.

Toutes les opérations sont journalisées.

---

# 21. Sécurité

Le système garantit :

- validation avant publication ;
- contrôle des accès ;
- historisation complète ;
- restauration d'une version précédente ;
- protection contre les suppressions accidentelles.

Les référentiels utilisés par les modules ne peuvent pas être supprimés physiquement.

---

# 22. Audit Trail

Chaque action enregistre :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- référentiel concerné ;
- opération ;
- ancienne valeur ;
- nouvelle valeur.

---

# 23. Workflow

Création du référentiel

↓

Validation

↓

Publication

↓

Utilisation par les modules

↓

Modification

↓

Nouvelle validation

↓

Historisation

---

# 24. Règles métier

BR-251 : Tous les référentiels sont centralisés.

BR-252 : Un référentiel ne peut avoir qu'une seule version active.

BR-253 : Les modules utilisent exclusivement les référentiels officiels.

BR-254 : Les références métier sont générées automatiquement par le moteur interne.

BR-255 : Aucune référence métier ne peut être modifiée par un utilisateur.

BR-256 : Les séquences de numérotation sont indépendantes selon le type de document.

BR-257 : Les imports sont validés avant publication.

BR-258 : Toute modification est historisée.

BR-259 : Les référentiels utilisés ne peuvent être supprimés physiquement.

BR-260 : Les restaurations conservent l'historique complet.

---

# 25. Dépendances

Ce module interagit avec :

- Tous les modules métiers de MORACare Enterprise
- BP-026A – Utilisateurs, Rôles & Contrôle d'Accès
- BP-026B – Sécurité, Audit, Conformité & Cybersécurité
- BP-028A – Administration Générale & Gouvernance du Système

---

# Conclusion

Le BP-028B constitue le référentiel métier central de MORACare Enterprise. Il garantit la cohérence des données, la standardisation des processus et la configuration homogène des règles de gestion pour l'ensemble des modules. Grâce à son moteur de numérotation automatique, à ses référentiels centralisés et à son historique complet des modifications, il assure une gouvernance fiable, évolutive et conforme aux exigences d'un ERP hospitalier de niveau Enterprise.