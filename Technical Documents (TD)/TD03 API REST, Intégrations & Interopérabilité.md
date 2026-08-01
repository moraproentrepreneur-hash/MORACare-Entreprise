# MORACare Enterprise
## Documentation Technique

---

# Document

**Nom :** API REST, Intégrations & Interopérabilité

**Référence :** TD-003

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit l'architecture des API de MORACare Enterprise.

Il décrit :

- les principes REST ;
- les conventions d'échange ;
- les endpoints ;
- l'authentification ;
- les réponses HTTP ;
- la gestion des erreurs ;
- les intégrations externes ;
- les standards médicaux.

Toutes les API du projet devront respecter ce document.

---

# 2. Architecture des API

Toutes les communications entre le Frontend, le Backend et les systèmes tiers utilisent des API REST sécurisées.

Architecture générale :

```
Client React

↓

API REST

↓

Services Métier

↓

Base PostgreSQL

↓

Supabase Storage
```

Les API constituent l'unique point d'accès aux données.

---

# 3. Versionnement

Toutes les API sont versionnées.

Exemple :

```
/api/v1/
```

Une nouvelle version ne doit jamais casser la compatibilité de la précédente.

Exemple :

```
/api/v1/patients

/api/v2/patients
```

---

# 4. Format des échanges

Toutes les requêtes utilisent :

```
JSON UTF-8
```

Exemple :

```json
{
  "first_name":"Ali",
  "last_name":"Mohamed"
}
```

Les réponses utilisent également JSON.

---

# 5. Structure des réponses

Toutes les réponses suivent une structure uniforme.

Succès :

```json
{
  "success": true,
  "data": {}
}
```

Erreur :

```json
{
  "success": false,
  "message": "...",
  "code": "..."
}
```

---

# 6. Méthodes HTTP

Les méthodes autorisées sont :

GET

POST

PUT

PATCH

DELETE (suppression logique uniquement)

---

# 7. Authentification

L'authentification repose sur :

Supabase Authentication

JWT

Refresh Token

Session sécurisée

Toutes les API privées nécessitent un utilisateur authentifié.

---

# 8. Autorisation

Les permissions sont contrôlées :

- par les rôles ;
- par les permissions métier ;
- par les politiques RLS.

Aucune autorisation n'est gérée uniquement côté Frontend.

---

# 9. Organisation des endpoints

Les endpoints sont organisés par domaine.

Exemples :

```
/api/v1/patients

/api/v1/appointments

/api/v1/consultations

/api/v1/prescriptions

/api/v1/pharmacy

/api/v1/laboratory

/api/v1/imaging

/api/v1/finance

/api/v1/hr
```

---

# 10. Pagination

Toutes les listes importantes utilisent la pagination.

Paramètres :

```
page

limit

sort

order
```

Exemple :

```
GET

/api/v1/patients?page=2&limit=20
```

---

# 11. Recherche

Les recherches utilisent :

```
search

filter

sort
```

Exemple :

```
GET

/api/v1/patients?search=Ali
```

---

# 12. Validation

Toutes les données reçues sont validées avant traitement.

Contrôles :

- types ;
- tailles ;
- formats ;
- contraintes métier ;
- permissions.

---

# 13. Gestion des erreurs

Les erreurs utilisent les codes HTTP standards.

200 OK

201 Created

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

500 Internal Server Error

---

# 14. Journalisation

Toutes les requêtes importantes sont enregistrées.

Informations :

- utilisateur ;
- endpoint ;
- date ;
- IP ;
- temps de réponse ;
- résultat.

---

# 15. API Patients

Principaux endpoints :

```
GET /patients

POST /patients

GET /patients/{id}

PUT /patients/{id}

PATCH /patients/{id}
```

---

# 16. API Rendez-vous

```
GET /appointments

POST /appointments

PATCH /appointments/{id}
```

---

# 17. API Consultations

```
GET

POST

PATCH

GET dossier
```

---

# 18. API Hospitalisation

Gestion complète :

- admissions ;
- chambres ;
- transferts ;
- sorties.

---

# 19. API Pharmacie

Gestion :

- médicaments ;
- stocks ;
- prescriptions ;
- délivrance.

---

# 20. API Laboratoire

Gestion :

- demandes ;
- analyses ;
- résultats.

---

# 21. API Imagerie

Gestion :

- examens ;
- comptes rendus ;
- fichiers DICOM.

---

# 22. API Finance

Gestion :

- factures ;
- paiements ;
- caisses ;
- comptabilité.

---

# 23. API RH

Gestion :

- employés ;
- contrats ;
- congés ;
- paie.

---

# 24. API Documents

Gestion :

- GED ;
- PDF ;
- signatures ;
- archivage.

---

# 25. Upload des fichiers

Les fichiers sont envoyés via Supabase Storage.

La base de données conserve uniquement :

- identifiant ;
- URL interne ;
- métadonnées.

---

# 26. Realtime

Les fonctionnalités suivantes utilisent Supabase Realtime :

- notifications ;
- tableau de bord ;
- files d'attente ;
- statut des rendez-vous ;
- disponibilité des chambres.

---

# 27. Webhooks

Le système peut notifier des applications externes lors d'événements.

Exemples :

- nouveau patient ;
- facture payée ;
- résultat validé ;
- création d'un utilisateur.

---

# 28. Standards médicaux

Interopérabilité supportée :

HL7

FHIR

DICOM

Les implémentations doivent respecter les versions officiellement supportées par les établissements partenaires.

---

# 29. Intégrations externes

La plateforme pourra communiquer avec :

- systèmes hospitaliers ;
- laboratoires ;
- logiciels comptables ;
- plateformes de paiement ;
- services SMS ;
- services Email ;
- WhatsApp Business.

Les connecteurs devront être modulaires afin de faciliter l'ajout de nouveaux partenaires.

---

# 30. Sécurité

Toutes les API utilisent :

HTTPS

JWT

TLS

RLS

Validation stricte

Protection contre :

- SQL Injection ;
- XSS ;
- CSRF ;
- attaques par force brute ;
- accès non autorisés.

---

# 31. Performances

Objectifs :

- temps de réponse optimisé ;
- limitation des appels inutiles ;
- pagination systématique ;
- compression des réponses ;
- cache lorsque pertinent.

---

# 32. Dépendances

Le présent document complète :

- TD-001 — Architecture Technique Générale
- TD-002 — Architecture de la Base de Données

Il prépare :

- TD-004 — Frontend React
- TD-005 — Backend & Supabase

---

# 33. Conclusion

Le TD-003 définit le contrat d'échange officiel de MORACare Enterprise. Il garantit une communication cohérente entre les différents composants de la plateforme ainsi qu'avec les systèmes externes grâce à une architecture REST moderne, sécurisée, versionnée et conforme aux standards internationaux d'interopérabilité médicale. Toute évolution des API devra respecter les conventions décrites dans ce document afin d'assurer la stabilité et la compatibilité de l'ensemble du système.