# MORACare Enterprise
## Documentation Technique

---

# Document

**Nom :** Architecture Frontend React

**Référence :** TD-004

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit l'architecture Frontend officielle de MORACare Enterprise.

Il décrit :

- l'organisation du projet React ;
- les conventions de développement ;
- les composants ;
- le routage ;
- la gestion des états ;
- les formulaires ;
- la navigation ;
- les performances ;
- l'accessibilité.

Toutes les interfaces utilisateur devront respecter cette architecture.

---

# 2. Technologies

Le Frontend officiel repose exclusivement sur :

- React
- Next.js (App Router)
- TypeScript
- Supabase JavaScript SDK

Le routage est assuré nativement par le App Router de Next.js.

Aucun framework Frontend supplémentaire ne devra être utilisé sans validation de l'architecture.

---

# 3. Objectifs

L'application doit être :

- rapide ;
- modulaire ;
- maintenable ;
- responsive ;
- sécurisée ;
- accessible ;
- évolutive.

---

# 4. Architecture générale

Le Frontend est organisé selon une architecture par fonctionnalités (Feature-Based Architecture).

Chaque domaine métier possède son propre espace.

Exemple :

```
Patients

Consultations

Hospitalisations

Pharmacie

Laboratoire

Finance

RH
```

Chaque domaine est indépendant.

---

# 5. Structure du projet

Structure recommandée :

```text
src/

├── app/          → routes et layouts (App Router)
├── assets/
├── components/
├── features/
├── hooks/
├── lib/
├── services/
├── stores/
├── styles/
├── types/
└── utils/
```

Cette structure est obligatoire pour assurer la cohérence du projet.

---

# 6. Organisation des Features

Chaque module métier est isolé.

Exemple :

```text
features/

patients/

appointments/

consultations/

pharmacy/

laboratory/

finance/
```

Chaque dossier contient :

- composants ;
- hooks ;
- services ;
- types ;
- pages.

---

# 7. Composants

Les composants doivent être :

- réutilisables ;
- indépendants ;
- testables.

Ils sont classés selon trois niveaux :

## UI Components

Boutons

Cartes

Badges

Icônes

Inputs

---

## Business Components

PatientCard

AppointmentForm

InvoiceTable

PrescriptionViewer

---

## Layout Components

Sidebar

Header

Footer

Dashboard

Navigation

---

# 8. Pages

Chaque page représente une fonctionnalité métier.

Exemple :

```
Patient List

Patient Details

Create Consultation

Invoice

Dashboard
```

Les pages ne doivent contenir que la logique d'assemblage.

---

# 9. Routing

Le routage utilise le App Router de Next.js, basé sur l'arborescence du dossier `src/app/`.

Les routes privées sont protégées côté serveur par un middleware, conformément à TD06 §7 et BP06 §14.

Exemple :

```
/

login

dashboard

patients

patients/:id

consultations

appointments

finance

settings
```

Toutes les routes privées nécessitent une authentification.

---

# 10. Layouts

Les layouts sont mutualisés.

Exemple :

PublicLayout

DashboardLayout

AuthLayout

PortalLayout

AdminLayout

Chaque layout définit :

- navigation ;
- menus ;
- notifications ;
- pied de page.

---

# 11. Gestion des états

Les états sont répartis selon leur portée.

État local :

- formulaires ;
- fenêtres ;
- filtres.

État partagé :

- utilisateur connecté ;
- établissement actif ;
- langue ;
- thème ;
- permissions.

Les données métier proviennent directement de Supabase.

---

# 12. Hooks

Tous les hooks personnalisés commencent par :

```
use...
```

Exemple :

```
usePatient()

useAppointment()

usePermissions()

useCurrentUser()

useNotifications()
```

Les hooks encapsulent la logique métier réutilisable.

---

# 13. Services

Les appels API sont centralisés.

Exemple :

```text
services/

patient.service.ts

appointment.service.ts

finance.service.ts
```

Les composants ne doivent jamais appeler directement Supabase.

---

# 14. Types

Toutes les interfaces TypeScript sont centralisées.

Exemple :

```
Patient

Appointment

Invoice

Employee

Prescription
```

Le typage strict est obligatoire.

---

# 15. Gestion des formulaires

Tous les formulaires doivent :

- valider les données ;
- afficher les erreurs ;
- empêcher les doublons ;
- gérer les états de chargement.

Les validations sont réalisées côté client et côté serveur.

---

# 16. Gestion des erreurs

Les erreurs doivent être :

- interceptées ;
- journalisées ;
- affichées de manière compréhensible.

Aucune erreur technique ne doit être exposée à l'utilisateur.

---

# 17. Notifications

Les notifications comprennent :

- succès ;
- information ;
- avertissement ;
- erreur.

Elles sont affichées de manière uniforme dans toute l'application.

---

# 18. Responsive Design

L'application est compatible avec :

Desktop

Laptop

Tablette

Smartphone

Les interfaces utilisent des grilles adaptatives.

---

# 19. Accessibilité

Le Frontend respecte les principes WCAG.

Les interfaces doivent permettre :

- navigation clavier ;
- contrastes suffisants ;
- libellés explicites ;
- compatibilité avec les lecteurs d'écran.

---

# 20. Internationalisation

Deux langues officielles :

- Français
- Anglais

Toutes les chaînes de caractères proviennent d'un catalogue centralisé.

Aucun texte métier n'est codé directement dans les composants.

---

# 21. Thème graphique

Le thème est centralisé.

Il définit :

- couleurs ;
- typographie ;
- espacements ;
- icônes ;
- composants graphiques.

Tous les écrans utilisent le même Design System.

---

# 22. Performances

Les optimisations comprennent :

- Lazy Loading des pages ;
- Code Splitting ;
- chargement différé des modules ;
- mémorisation lorsque pertinente ;
- optimisation des rendus.

---

# 23. Sécurité Frontend

Le Frontend :

- ne stocke jamais de données sensibles en clair ;
- ne contient aucune logique d'autorisation ;
- valide les entrées utilisateur ;
- protège les formulaires contre les soumissions multiples.

Toutes les autorisations sont vérifiées côté Backend.

---

# 24. Progressive Web App

Le Frontend est développé comme une Progressive Web App.

Fonctionnalités :

- installation ;
- icône d'application ;
- écran de lancement ;
- comportement proche d'une application native.

---

# 25. Journalisation

Les erreurs critiques peuvent être remontées au système de journalisation.

Les informations utilisateur sensibles ne sont jamais enregistrées dans les journaux Frontend.

---

# 26. Dépendances

Le présent document complète :

- TD-001 — Architecture Technique Générale
- TD-002 — Architecture de la Base de Données
- TD-003 — API REST, Intégrations & Interopérabilité

Il prépare :

- TD-005 — Backend & Supabase

---

# 27. Conclusion

Le TD-004 définit l'architecture Frontend officielle de MORACare Enterprise. Il garantit une organisation homogène du code, une interface utilisateur cohérente, des composants réutilisables et une expérience utilisateur de qualité. Le respect de ces conventions permettra d'assurer la maintenabilité, l'évolutivité et les performances de l'application tout au long de son cycle de vie.