# MORACare - Solution Médicale SaaS Internationale

![MORACare Banner](https://raw.githubusercontent.com/morashawiri/MORACare/main/public/banner.png)

> **Éditeur Officiel** : MORA Shawiri  
> **Nom Commercial du Produit** : MORACare  
> **Contacts** : +269 430 63 06 | contact@morashawiri.com | [www.services.morashawiri.com](https://www.services.morashawiri.com)

---

## 📋 Présentation du Projet

**MORACare** est un système d'information hospitalier et de gestion médicale complet, modulaire, sécurisé et multi-établissements conçu pour répondre aux normes internationales de santé.

### Modules Intégrés

- 🏢 **Super Admin SaaS** : Gouvernance, abonnements et gestion multi-établissements.
- 👥 **Dossiers Patients (DMP)** : Historique clinique, constantes vitale et antécédents.
- 📅 **Agenda & Rendez-vous** : Plannings et synchronisations des créneaux.
- 🩺 **Consultations & Diagnostique** : Codification CIM-10 et ordonnances électroniques PDF.
- 🛏️ **Hospitalisation & Urgences** : Gestion des lits, admissions et suivis.
- 💊 **Pharmacie & Stocks** : Catalogue produits, traçabilité et péremptions.
- 🧪 **Laboratoire** : Prescriptions d'analyses et paillasse biologique.
- 🩻 **Imagerie Médicale** : Radiologie, échographie, DICOM et comptes-rendus.
- 💳 **Finance & Facturation** : Multi-caisses, factures, encaissements et reçus PDF.
- 👔 **Ressources Humaines** : Gardes, plannings, présences et paie.
- 📁 **GED & Coffre-Fort Documentaire** : Archivage chiffré et sécurisé.
- 🛡️ **Sécurité & Audit** : Row Level Security (RLS) et traçabilité inaltérable.

---

## 🔐 Compte Super Admin initial

La base de données est initialisée dans un état **100 % propre** : aucune donnée
factice, 0 patient, 0 consultation, 0 établissement.

Le compte Super Admin unique est créé **par script**, à partir de variables
d'environnement. Aucun identifiant n'est stocké dans ce dépôt.

```bash
SUPERADMIN_EMAIL="admin@votre-domaine.com" \
SUPERADMIN_PASSWORD="<mot de passe fort>" \
npm run seed:superadmin
```

> CLAUDE.md § Authentification : « Les identifiants du Super Admin ne doivent
> jamais être affichés publiquement. Ils servent uniquement à l'initialisation
> de la base de données. »

Voir [INSTALLATION.md](INSTALLATION.md) pour la procédure complète.

---

## 🛠️ Stack Technique Officielle

* **Frontend** : Next.js 14 (App Router), React 18, TypeScript strict, TailwindCSS, Shadcn UI, Framer Motion, Lucide Icons, Recharts.
* **Backend & Base de données** : Supabase (PostgreSQL 16+, Row Level Security, Auth, Storage).
* **Génération Documentaire** : jsPDF & Canvas.
* **PWA & Accessibility** : Ready PWA, Dark Mode Ready, WCAG Compliant.

---

## 🚀 Guide d'Installation & Démarrage rapide

### Prerequisites
- Node.js >= 18.0.0
- npm / yarn / pnpm

### 1. Clonage du dépôt & Dépendances
```bash
git clone https://github.com/morashawiri/MORACare.git
cd MORACare
npm install
```

### 2. Configuration des Variables d'Environnement
Copiez le fichier `.env.example` en `.env.local` :
```bash
cp .env.example .env.local
```

### 3. Application des Migrations Supabase / PostgreSQL
Exécutez les migrations **dans cet ordre** dans votre instance PostgreSQL / Supabase :
```sql
-- 1. Schéma global
supabase/migrations/20260730000000_init_moracare.sql

-- 2. Durcissement de sécurité : politiques RLS, séquences, triggers, index
--    OBLIGATOIRE — sans elle, 13 tables sont inaccessibles (RLS sans politique)
supabase/migrations/20260730120000_security_hardening.sql
```

Le compte Super Admin se crée ensuite avec `npm run seed:superadmin` (voir plus haut).

### 4. Lancement du Serveur de Développement
```bash
npm run dev
```
Rendez-vous sur `http://localhost:3000` pour accéder à la Landing Page et à l'application.

---

## 📞 Support & Réseaux Sociaux MORA Shawiri

- **Téléphone** : +269 430 63 06
- **Email** : contact@morashawiri.com
- **Site Web** : [www.services.morashawiri.com](https://www.services.morashawiri.com)
- **WhatsApp** : [https://wa.me/2694306306](https://wa.me/2694306306)
- **LinkedIn** : [https://www.linkedin.com/in/morashawiri](https://www.linkedin.com/in/morashawiri)
- **Facebook** : [https://www.facebook.com/morashawiri](https://www.facebook.com/morashawiri)
- **YouTube** : [https://www.youtube.com/@morashawiri](https://www.youtube.com/@morashawiri)

---
*© 2026 MORACare. Tous droits réservés par MORA Shawiri.*
