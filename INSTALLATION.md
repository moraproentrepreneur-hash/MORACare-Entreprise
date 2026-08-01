# Guide d'Installation & Configuration Technique - MORACare

Ce document détaille la procédure de déploiement en production et de configuration de **MORACare**.

---

## 1. Exigences Système & Prérequis

* **Serveur Web / Cloud** : Vercel, VPS Linux (Ubuntu 22.04 LTS), Nginx / PM2, Supabase Cloud ou Supabase Self-Hosted.
* **Moteur d'exécution** : Node.js (v18+ ou v20+).
* **Base de Données** : PostgreSQL 16+ hébergé sur Supabase.

---

## 2. Configuration Supabase

1. Créez un projet Supabase sur [supabase.com](https://supabase.com).
2. Dans le SQL Editor de Supabase, exécutez **dans cet ordre** :
   - `supabase/migrations/20260730000000_init_moracare.sql` — schéma initial
   - `supabase/migrations/20260730120000_security_hardening.sql` — politiques RLS,
     séquences de références métier, triggers et index

   > La seconde migration est **obligatoire**. Sans elle, 13 tables ont RLS activé
   > sans aucune politique : PostgreSQL refuse alors tout accès et l'application
   > renvoie des listes vides sans message d'erreur.
3. Récupérez l'URL du projet et la clef `anon` dans **Project Settings > API**.

---

## 3. Configuration des Variables d'Environnement

Renseignez les variables dans `.env.local` ou dans votre gestionnaire de variables Vercel/VPS :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clef-anon-ici
SUPABASE_SERVICE_ROLE_KEY=votre-clef-service-role-ici
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NEXT_PUBLIC_APP_NAME=MORACare
```

---

## 4. Création du compte Super Admin

Le compte d'administration de la plateforme est créé par script, jamais par le
dépôt : aucun identifiant n'est stocké dans le code source.

```bash
SUPERADMIN_EMAIL="admin@votre-domaine.com" \
SUPERADMIN_PASSWORD="<mot de passe fort, 12 caractères minimum>" \
npm run seed:superadmin
```

Variables facultatives : `SUPERADMIN_USERNAME`, `SUPERADMIN_FIRST_NAME`,
`SUPERADMIN_LAST_NAME`.

> **Important.** Le mot de passe n'est ni affiché ni journalisé par le script.
> Conservez-le dans votre gestionnaire de secrets. Si vous avez déjà déployé une
> version antérieure de ce projet, le mot de passe qu'elle contenait doit être
> considéré comme compromis et changé.

---

## 5. Compilation & Production Build

Pour vérifier la validité du projet et générer le build de production :

```bash
npm run build
npm run start
```

---

## 6. Vérification post-déploiement

1. Accédez à l'URL publique de votre instance MORACare.
2. Vérifiez l'affichage de la **Landing Page Officielle (LP-001)**.
3. Vérifiez qu'aucune bannière « Connexion à la base de données non configurée »
   n'apparaît sur l'écran de connexion. Si elle s'affiche, les variables
   d'environnement ne sont pas correctement renseignées.
4. Connectez-vous avec l'adresse e-mail et le mot de passe fournis à l'étape 4.
5. Vérifiez que la base est complètement propre : aucun dossier patient factice,
   aucun établissement de démonstration.
