# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Nomenclature et conventions de nommage

**Référence :** BP-008

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit les conventions officielles de nommage utilisées dans l'ensemble de MORACare Enterprise.

Ces conventions s'appliquent à tous les documents métiers, modules, développements, bases de données, API, journaux, rapports et futures évolutions.

Aucune exception ne devra être introduite sans mise à jour du Blueprint.

---

# 2. Principes généraux

Toutes les références métiers doivent être :

- uniques ;
- lisibles ;
- évolutives ;
- indépendantes de la base de données ;
- utilisables par les utilisateurs et les développeurs.

Les identifiants techniques de la base de données (UUID) ne remplacent jamais les références métiers.

Chaque enregistrement métier possède obligatoirement une référence officielle.

---

# 3. Format officiel

Tous les documents métiers utilisent le format suivant :

MORA-[TYPE]-[SÉRIE][NUMÉRO]

Exemple :

MORA-FACP-A0001

où :

- MORA = préfixe officiel du logiciel
- TYPE = type de document
- SÉRIE = série alphabétique
- NUMÉRO = compteur numérique

---

# 4. Numérotation

La série évolue ainsi :

A0001 → A9999

puis

B0001 → B9999

puis

C0001 → C9999

...

Lorsque toutes les lettres simples sont utilisées :

AA0001

AB0001

AC0001

...

La numérotation est continue.

Les numéros supprimés ne sont jamais réutilisés.

---

# 5. Types de documents

Les principaux types sont :

DPAT → Dossier Patient

RDV → Rendez-vous

CONS → Consultation

HOSP → Hospitalisation

ORD → Ordonnance

PRES → Prescription

LAB → Analyse de laboratoire

IMG → Imagerie médicale

FACP → Facture Patient

PAIE → Paiement

RECU → Reçu

DEV → Devis

REQ → Demande d'inscription

ABON → Abonnement

LIC → Licence

REMB → Remboursement

AVO → Avoir

Chaque nouveau document devra recevoir un code unique.

---

# 6. Exemples

MORA-DPAT-A0001

MORA-RDV-A0001

MORA-CONS-A0001

MORA-LAB-A0001

MORA-ORD-A0001

MORA-FACP-A0001

MORA-PAIE-A0001

---

# 7. Identifiants techniques

La base de données utilise exclusivement des UUID.

Les UUID servent :

- aux relations entre tables ;
- aux API ;
- à la sécurité ;
- aux synchronisations.

Les références métiers servent :

- aux utilisateurs ;
- aux recherches ;
- aux impressions ;
- aux PDF ;
- aux exports ;
- aux échanges avec les clients.

Les UUID ne sont jamais affichés à l'utilisateur.

---

# 8. Conventions des documents du Blueprint

Les documents utilisent :

BP-001

BP-002

BP-003

...

---

# 9. Conventions des règles métier

Les règles métier utilisent :

BR-001

BR-002

BR-003

...

---

# 10. Conventions des workflows

Les workflows utilisent :

WF-001

WF-002

WF-003

...

---

# 11. Conventions de sécurité

Les règles de sécurité utilisent :

SEC-001

SEC-002

SEC-003

...

---

# 12. Conventions de base de données

Les documents de conception utilisent :

DB-001

DB-002

DB-003

...

---

# 13. Conventions des API

Les interfaces utilisent :

API-001

API-002

API-003

...

---

# 14. Conventions des interfaces

Les écrans utilisent :

UI-001

UI-002

UI-003

...

---

# 15. Journalisation

Les journaux utilisent :

LOG-000001

LOG-000002

...

Chaque journal possède un identifiant unique.

---

# 16. Rapports

Les rapports utilisent :

REP-001

REP-002

REP-003

...

---

# 17. Notifications

Les notifications utilisent :

NOTIF-000001

NOTIF-000002

...

---

# 18. Principes obligatoires

Les règles suivantes sont obligatoires :

- chaque document métier possède une référence unique ;
- chaque référence est permanente ;
- aucune référence supprimée n'est réutilisée ;
- les UUID restent invisibles pour les utilisateurs ;
- toutes les impressions utilisent la référence métier ;
- les conventions doivent être identiques dans tous les modules.

---

# Conclusion

La présente nomenclature constitue la convention officielle de MORACare Enterprise.

Tous les modules actuels et futurs devront respecter ces règles afin de garantir une identification homogène, une traçabilité complète et une cohérence durable de l'ensemble du système.