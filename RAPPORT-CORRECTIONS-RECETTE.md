# RAPPORT DE CORRECTIONS — Retours de recette

**Date :** 2 août 2026
**Statut :** corrections terminées. **Aucun push effectué**, conformément à votre consigne.

---

## Le point le plus important

Vos retours ont fait apparaître **un défaut de sécurité que personne n'avait vu**, et qui n'était pas dans votre liste.

En vérifiant les routes sur un serveur réel, j'ai constaté que `/dashboard`, `/patients`, `/admin` et `/settings` répondaient **HTTP 200 à un visiteur non authentifié**, au lieu de rediriger.

**Cause :** le fichier `middleware.ts` était à la racine du projet. Avec un dossier `src/`, Next.js l'attend à `src/middleware.ts`. Il n'a donc **jamais été exécuté** depuis sa création en Phase 4 — le build ne le mentionnait même pas.

**Portée réelle :** aucune donnée n'a été exposée. Les politiques RLS de PostgreSQL, elles, fonctionnaient : une page atteinte sans session n'aurait affiché aucune donnée. Mais le contrôle d'accès côté serveur exigé par BP06 §14 et TD06 §7 était inopérant, et la séparation des espaces reposait uniquement sur des gardes côté client — contournables.

**Après correction**, vérifié avec une vraie session :

| Route | Visiteur | Super Admin connecté |
|---|---|---|
| `/` | 200 | 200 |
| `/login` | 200 | 307 → son espace |
| `/dashboard` | 307 → `/login` | **307 → `/admin`** |
| `/patients` | 307 → `/login` | **307 → `/admin`** |
| `/consultations` | 307 → `/login` | **307 → `/admin`** |
| `/portail` | 307 → `/login` | **307 → `/admin`** |
| `/admin` | 307 → `/login` | 200 |

BP06 §10 bis — le Super Admin n'accède pas aux activités cliniques — est désormais appliqué au niveau du routage, pas seulement de l'interface.

---

## 1. Landing Page (point 1)

### Nouveau composant Hero (`HeroSection.tsx`)

- **Halos animés** en arrière-plan, dérive lente et continue.
- **Parallaxe au défilement** : le mockup remonte plus lentement que le texte.
- **Titre à dégradé animé** qui balaie du bleu au vert, avec soulignement qui se déploie à l'apparition.
- **Mockup vivant** : les données du tableau de bord changent toutes les 3,8 s sur trois vues (soins, examens, facturation), les barres se remplissent à chaque transition, un badge « En direct » pulse.
- **Vignette flottante** en léger mouvement vertical.
- **Grille de fond** en fondu radial, pour la profondeur.

### Primitives réutilisables (`motion-primitives.tsx`)

| Primitive | Effet |
|---|---|
| `ScrollProgress` | Barre de progression dégradée en haut de page |
| `TiltCard` | Inclinaison 3D suivant le curseur, avec ressort |
| `ShimmerButton` | Balayage lumineux au survol, léger soulèvement |
| `AuroraBackground` | Halos colorés animés |
| `CountUp` | Compteur animé à l'entrée dans le champ de vision |

### Micro-interactions ajoutées

- En-tête qui se densifie au défilement (fond, bordure, ombre).
- Soulignement des liens de navigation qui se déploie depuis la gauche.
- Chiffres clés : soulèvement au survol, icône qui grossit, pastille colorée.
- Cartes de modules : inclinaison 3D, halo qui apparaît, icône qui pivote.
- Cartes de profils : liseré dégradé qui se déploie en haut de carte.
- Flèches des CTA qui avancent au survol.

### Accessibilité

**Toutes ces animations se désactivent** si le système demande une réduction des animations — via `useReducedMotion` et une règle CSS globale. LP-001 §7 demande des « animations discrètes » : le confort prime sur l'effet.

**Contenus et charte inchangés** : les 12 sections, tous les textes LP-001 et la palette (`#003366`, `#00A859`, `#FFD700`, `#F5F7FA`) sont strictement identiques.

---

## 2. Cartes d'abonnement (point 2)

Les cinq cartes étaient déjà codées. **Elles ne s'affichaient pas parce que la base était injoignable depuis Vercel**, et le composant affichait alors un encart d'erreur.

Deux corrections :

**Repli documenté.** Si la base est inaccessible, les cartes affichent désormais les valeurs officielles issues du seed. Une page commerciale ne doit jamais montrer une erreur à la place de ses tarifs.

**Contenu complet sur chaque carte** — rien n'est masqué :

- nom et description ;
- **tarif** : 0, 0, 5 000, 10 000, 15 000 KMF ;
- période de facturation ;
- quotas : utilisateurs, patients, stockage ;
- support, fréquence de sauvegarde, durée de conservation ;
- avantages ;
- **modules inclus, nommés un par un** ;
- limitations ;
- bouton d'action propre à l'offre.

**Business est mise en évidence** : badge « Recommandé », bordure verte, anneau et ombre colorés. Ce n'est pas codé en dur — la colonne `is_featured` le pilote depuis la base.

---

## 3. Formulaire de démonstration (point 3)

**Le code était correct.** Diagnostic exécuté contre le projet Supabase réel :

```
✓ Insertion directe par un visiteur refusée (attendu)
✓ Insertion par le serveur (clé secrète) — MORA-DEM-000002
✓ Demande relue en base
```

Puis testé de bout en bout sur un serveur Next.js réel :

```
POST /api/registration-requests → HTTP 201 {"success":true}
POST (email invalide)           → HTTP 400
```

La demande `MORA-DEM-000003` a bien été créée en base avec le statut `pending`, puis supprimée après contrôle.

**Le dysfonctionnement venait donc de l'absence de `SUPABASE_SERVICE_ROLE_KEY` sur Vercel** : sans elle, la route serveur ne peut pas écrire. Voir point 5.

---

## 4. Connexion par identifiant ou email (point 4)

Nouvelle route `POST /api/auth/login`, testée sur serveur réel :

| Cas | Résultat |
|---|---|
| Identifiant `admin` | **HTTP 200** |
| Email `admin@morashawiri.com` | **HTTP 200** |
| Mauvais mot de passe | HTTP 401 |
| Identifiant inexistant | HTTP 401 — **message identique** |

### Pourquoi une route serveur

Supabase Auth n'authentifie que par e-mail. La résolution identifiant → adresse devait avoir lieu quelque part.

Je l'ai placée **côté serveur**, et c'est délibéré : une route publique traduisant un identifiant en e-mail permettrait d'énumérer les comptes et de récolter les adresses du personnel soignant. Le serveur résout, authentifie, et ne renvoie que le résultat — jamais l'adresse.

Les deux derniers cas du tableau renvoient exactement la même réponse : impossible de découvrir quels identifiants existent.

Le champ du formulaire devient « Identifiant ou email professionnel », avec un libellé rappelant que l'identifiant est fourni par l'établissement.

---

## 5. Message « Connexion à la base de données non configurée » (point 5)

**Ce message était exact** : la base n'était pas atteignable depuis Vercel.

La cause n'est pas dans le code. Les identifiants vivent dans `.env.local`, **volontairement exclu du dépôt** — une clé `service_role` versionnée sur un dépôt public donnerait un accès total aux données de santé. Vercel a donc reçu le code sans aucune variable.

**Je ne peux pas corriger cela depuis le code.** Le document [DEPLOIEMENT-VERCEL.md](DEPLOIEMENT-VERCEL.md) détaille la marche à suivre. L'essentiel :

1. Ajouter dans Vercel les trois variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` (valeurs dans votre `.env.local`), sur les trois environnements.
2. **Redéployer sans cache de build.** C'est indispensable : les variables `NEXT_PUBLIC_*` sont inlinées dans le bundle **au moment du build**. Les ajouter sans redéployer ne change rien.

---

## 6. Vérification générale (point 6)

### Défaut fonctionnel corrigé

`FinanceModule` construisait un message d'erreur qu'**aucun écran n'affichait**. En cas d'échec d'enregistrement d'une facture, d'ouverture ou de clôture de caisse, l'utilisateur ne voyait rien. Les trois formulaires affichent désormais l'erreur.

### Code mort

**46 déclarations inutilisées supprimées** dans 15 fichiers. `noUnusedLocals` et `noUnusedParameters` sont désormais actifs dans `tsconfig.json` : toute régression fera échouer le build.

### Contrôles

| Contrôle | Résultat |
|---|---|
| `npm run build` | **passe** — 27 routes + Middleware détecté |
| `tsc --noEmit` | **0 erreur** (code mort inclus) |
| `next lint` | **0 avertissement** |
| `npm test` | **60 / 60** |
| `db:verify` (schéma réel) | **18 contrôles concluants** |
| `db:diagnose-public` | **8 contrôles concluants** |
| Routes visiteur | **12 / 12 conformes** |
| Séparation des espaces | **vérifiée avec session réelle** |

### Responsive

Grilles adaptatives sur toutes les sections (`sm:`, `lg:`, `xl:`), cartes d'abonnement en 1 / 2 / 5 colonnes, menu mobile, colonne de marque masquée sous `lg` sur l'écran de connexion.

---

## 7. Fichiers modifiés

**Créés (5)**
`src/app/api/auth/login/route.ts` · `src/components/landing/HeroSection.tsx` · `src/components/landing/motion-primitives.tsx` · `scripts/diagnose-public.mjs` · `DEPLOIEMENT-VERCEL.md`

**Déplacé (1)**
`middleware.ts` → `src/middleware.ts` — **le correctif de sécurité**

**Modifiés (21)**
`LandingPage.tsx`, `landing-content.ts`, `PlanCards.tsx`, `LoginForm.tsx`, `auth.service.ts`, `FinanceModule.tsx`, `globals.css`, `tsconfig.json`, `package.json`, et 12 fichiers dont seuls des imports morts ont été retirés.

---

## 8. Ce qui reste ouvert

Inchangé depuis le rapport de Phase 6, et hors du périmètre de vos retours : les workflows métiers de bout en bout (prescription → pharmacie → stock → facturation → archivage), sept modules non développés (Urgences, Bloc opératoire, Achats, Stock, Notifications, Messagerie, Interopérabilité), l'internationalisation français/anglais, et les modèles PDF.

---

## 9. Recommandation

Les six points sont traités. Le correctif du middleware est, à mon sens, plus important que l'ensemble des retours : il rétablit une garantie de sécurité que la documentation exige et qui n'était pas effective.

**Avant une nouvelle recette**, il faut impérativement configurer les variables sur Vercel et redéployer sans cache. Sans cela, les points 2, 3 et 5 se reproduiront à l'identique — non pas à cause du code, mais faute de configuration.

**Aucun push n'a été effectué. J'attends votre validation.**
