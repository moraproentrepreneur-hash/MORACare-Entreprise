# MORACare Enterprise — Rapport de recette (phase de finition)

**Date :** 3 août 2026
**Périmètre :** les 9 points de la demande de finition, et rien d'autre.
**Statut du code :** aucune poussée GitHub, aucun déploiement. En attente de validation.

---

## 1. Verdict

Les 9 points demandés sont traités. Le projet compile, passe le linter, passe
les 61 tests, et les migrations s'appliquent sans erreur sur PostgreSQL 18.3.

| Contrôle | Commande | Résultat |
|---|---|---|
| Types TypeScript | `npx tsc --noEmit` | 0 erreur |
| Linter | `npm run lint` | 0 avertissement |
| Tests | `npm test` | 61 / 61 |
| Migrations | `npm run db:validate` | 9 / 9 appliquées |
| Base réelle | `npm run db:verify` | 20 / 20 vérifications |
| Build de production | `npx next build` | 31 routes + middleware |

La recette a mis au jour un défaut bloquant du middleware — les appels d'API des
utilisateurs connectés étaient redirigés, ce qui rendait la création de comptes
impossible. Il est corrigé et le cycle complet a été rejoué sur la base réelle
(§3.4).

Trois écarts subsistent, tous documentés au §4. Aucun n'est bloquant, mais deux
appellent une décision de votre part.

---

## 2. Ce qui a été fait, point par point

### Point 1 — Responsive complet des interfaces après connexion

- **Menu latéral** : au-dessous de 1024 px, il devient un tiroir. Il s'ouvre par
  le bouton du bandeau, se ferme au clic extérieur, à Échap, et à chaque
  changement de page. Sur grand écran, rien ne change.
- **Tableaux** : les 18 tableaux de l'application défilent horizontalement dans
  leur propre conteneur — la page, elle, ne défile jamais latéralement. Une
  largeur minimale a été posée pour qu'ils défilent au lieu de se tasser en
  colonnes illisibles.
- **Écrans à forte densité** (Gestion des Admins, Demandes, Prises de contact,
  Établissements) : sous 768/1024 px, le tableau est remplacé par une carte par
  ligne. Aucune donnée n'y est perdue et les actions restent atteignables sans
  défilement horizontal.
- **Fenêtres modales** : la fenêtre entière est désormais bornée à la hauteur de
  l'écran. Auparavant seul son contenu l'était, et l'en-tête plus les marges
  s'ajoutaient par-dessus : le bas des formulaires sortait de l'écran sur
  téléphone.
- **Formulaires** : les grilles à 2, 3 et 4 colonnes passent à une colonne sous
  640 px (21 fichiers).
- **Barres d'onglets** (Finance, RH, Paramètres) : défilement horizontal, onglets
  non compressés.
- **En-têtes de module** : titres réduits sur petit écran, groupes de boutons qui
  passent à la ligne au lieu de déborder.
- **Marges** : `p-6` uniforme remplacé par `p-4 sm:p-6` — environ 15 % de largeur
  utile regagnés sur un écran de 360 px.

### Point 2 — Mode sombre uniquement

- La bascule de thème du bandeau, avec ses icônes soleil et lune, est supprimée.
- `ThemeProvider` est supprimé, `next-themes` n'est plus utilisé.
- La classe `dark` est posée une fois pour toutes sur `<html>`.
- Vérification : aucune occurrence de `useTheme`, `setTheme`, `darkMode`,
  `next-themes`, `Moon` ni `Sun` ne subsiste dans `src/`.

### Point 3 — Notifications

L'icône ouvre un panneau réel, alimenté par cinq sources :

| Source | Contenu | Destinataire |
|---|---|---|
| Messages système | table `notifications` | chacun, ses propres messages |
| Demandes de démonstration | demandes « En attente » | Super Admin |
| Prises de contact | messages « En attente » | Super Admin |
| Abonnements | échéance ≤ 30 jours ou dépassée | Super Admin (tous) / établissement (le sien) |
| Licences | échéance ≤ 30 jours ou dépassée | Super Admin (tous) / établissement (la sienne) |

Choix de conception à connaître : la plupart de ces alertes sont des **états de
la base**, pas des messages qu'il faut penser à écrire. Elles sont donc
recalculées à chaque ouverture du panneau. Un événement passé inaperçu ne peut
pas rester invisible faute d'avoir été notifié au bon moment.

La pastille indique le nombre d'éléments à traiter. Un clic ouvre l'écran
concerné. « Tout marquer comme lu » n'agit que sur les messages système : une
échéance ne se « lit » pas, elle se traite.

### Point 4 — Trois nouveaux menus Super Admin

Ils apparaissent dans la barre latérale de la console `/admin`, invisible pour
tout autre rôle : le middleware serveur refuse `/admin/*` à quiconque n'est pas
Super Admin, avant tout rendu. Vérifié : un visiteur non connecté reçoit 307 sur
les trois routes ; un Super Admin connecté reçoit 200.

**Gestion des Admins** (`/admin/admins`)
- Tableau : référence, nom, établissement, identifiant, e-mail, téléphone, rôle,
  statut, actions.
- Recherche libre, filtres par rôle / établissement / statut, tri par nom,
  établissement, rôle et date.
- Actions : créer, modifier (rôle et établissement), activer, désactiver,
  réinitialiser le mot de passe, supprimer.
- Formulaire de création conforme à la demande : établissement, prénom, nom,
  e-mail, téléphone, identifiant, mot de passe, rôle. La création produit en une
  opération le compte Supabase Auth, le profil et les permissions du rôle.
- L'identifiant est proposé automatiquement à partir du nom si le champ est laissé
  vide.
- La suppression est refusée par le serveur si le compte a produit des données
  médicales ou comptables ; le message invite alors à désactiver. Un dossier signé
  par un praticien ne doit pas perdre son auteur.

**Gestion des Demandes** (`/admin/demandes`)
- Alimenté par le formulaire de démonstration de la Landing Page.
- Colonnes : référence, établissement, nom, téléphone, e-mail, type, date, statut.
- Statuts modifiables : En attente, En cours, Contacté, Accepté, Refusé, Clôturé.
- Le statut est le seul champ modifiable : le reste vient du visiteur et ne doit
  pas être réécrit après coup.

**Prises de contact** (`/admin/contacts`)
- Alimenté par le formulaire Contact / Support.
- Colonnes : référence, nom, e-mail, téléphone, sujet, message, date, statut.
- Mêmes six statuts. Le message complet s'ouvre en fenêtre, avec réponse directe
  par e-mail ou par WhatsApp vers le numéro laissé par le visiteur.

Les six statuts sont contraints en base (`CHECK`), pas seulement dans
l'interface.

### Point 5 — Pied de page

- Sept réseaux avec leur icône officielle tracée en SVG : Facebook, YouTube,
  WhatsApp, LinkedIn, Telegram, Instagram, TikTok.
- Coordonnées : **+269 430 63 06** (lien WhatsApp), **contact@morashawiri.com**
  (lien e-mail), **https://services.morashawiri.com**.
- Toutes ces valeurs vivent dans un seul fichier, `legal-content.ts` : une
  coordonnée qui change se corrige à un seul endroit.

### Point 6 — Liens du pied de page

- *Politique de confidentialité*, *Conditions générales* et *Mentions légales*
  ouvrent chacune une fenêtre modale au contenu rédigé. Aucune route nouvelle
  n'a été créée : la documentation n'en prévoit pas.
- *Support* et *Contact* ouvrent le formulaire de contact, avec un sujet
  prérempli différent selon le lien.
- À l'envoi : le message est enregistré et reçoit une référence `MORA-CTC-XXXXXX`,
  puis un message WhatsApp entièrement prérempli vers le +269 430 63 06 est
  proposé — voir l'écart §4.2.

### Point 7 — Abonnements

- La phrase « Formules définies par BP-009 §4. Aucun tarif n'est enregistré… »
  est supprimée. J'ai profité du passage pour retirer **toutes** les références
  documentaires internes visibles à l'écran (BP-022A/B/C, BP-023A/B/C, BP-026A,
  BR-118, BR-290, TD06, UG01 §11…) : ce sont des repères de développement, ils
  n'ont pas leur place dans le produit. Les commentaires du code, eux, les
  conservent.
- Les cartes sont raccourcies. **La liste des modules a disparu.** Tous les
  modules sont inclus dans toutes les formules ; leur activation relève des
  Paramètres de l'établissement. Une ligne « Tous les modules inclus » le dit.
- Les cartes n'affichent plus que le tarif, la période et les limites
  commerciales :

| Formule | Tarif | Durée | Utilisateurs | Enregistrements / module |
|---|---|---|---|---|
| Essai | 0 KMF | 3 jours | Illimités | Illimités |
| Gratuit | 0 KMF / mois | Permanente | 2 | 5 |
| Standard | 5 000 KMF / mois | Permanente | 5 | 50 |
| Business | 10 000 KMF / mois | Permanente | 10 | 100 |
| VIP | 15 000 KMF / mois | Permanente | Illimités | Illimités |

  « Gratuit » porte la mention *Validation obligatoire*. Les tarifs sont
  inchangés.
- Ces valeurs sont en base ; la carte les lit. Le repli hors ligne du navigateur
  a été aligné à l'identique.
- La console SaaS affiche désormais les mêmes tarifs et limites : elle doit
  montrer ce qui est réellement vendu.

### Point 8 — Aucun établissement sans administrateur

- La création d'un établissement est devenue une séquence en deux étapes,
  enchaînées automatiquement : « Étape 1 sur 2 — l'établissement », puis
  « Étape 2 sur 2 — son administrateur ». La seconde fenêtre s'ouvre seule dès
  que la première aboutit, l'établissement y est imposé et non resélectionnable.
- La liste des établissements porte une colonne **Administrateur**
  (*Rattaché* / *Manquant*). Tout établissement sans administrateur actif
  affiche un bouton « Créer l'administrateur ».
- Un bandeau d'alerte compte les établissements dans ce cas.
- Le même compte peut aussi être créé depuis *Gestion des Admins*.

Constat sur la base réelle : **l'établissement existant n'a aucun administrateur**
— il est signalé par le nouveau bandeau dès l'ouverture de l'écran.

### Point 9 — Recette

Voir §3.

---

## 3. Recette exécutée

### 3.1 Vérifications automatiques

```
npx tsc --noEmit          0 erreur
npm run lint              0 avertissement, 0 erreur
npm test                  61 tests, 4 fichiers, 100 % au vert
npm run db:validate       9 migrations, 35 tables, 53 politiques RLS,
                          0 table sans RLS, 0 table RLS sans politique
npm run db:verify         20 vérifications sur la base réelle, toutes concluantes
npx next build            31 routes, middleware 85,5 ko
```

Un test devait être mis à jour : il vérifiait que le nombre de modules croissait
d'une formule à l'autre, ce qui n'a plus de sens depuis que toutes les formules
les incluent tous. Il vérifie maintenant deux choses : que **chaque** formule
donne accès à **tous** les modules, et que la progression commerciale est
croissante en utilisateurs et en enregistrements.

### 3.2 Vérifications fonctionnelles sur serveur de production local

| Test | Attendu | Obtenu |
|---|---|---|
| `GET /api/health` | configuration complète | `configure: true` |
| `POST /api/contact-requests` | enregistrement + référence | `201`, `MORA-CTC-000001` |
| `POST /api/registration-requests` | enregistrement | `201` |
| `GET /` et `/login` anonyme | accessibles | `200` |
| `GET /dashboard` anonyme | refoulé | `307 → /login` |
| `GET /admin/admins` anonyme | refoulé | `307 → /login` |
| `GET /admin/demandes` anonyme | refoulé | `307 → /login` |
| `GET /admin/contacts` anonyme | refoulé | `307 → /login` |
| Connexion identifiant `rachade` | acceptée | `200` |
| Super Admin → `/admin/admins` | autorisé | `200` |
| Super Admin → `/admin/demandes` | autorisé | `200` |
| Super Admin → `/admin/contacts` | autorisé | `200` |
| Super Admin → `/dashboard` | refoulé (séparation des espaces) | `307 → /admin` |

Les deux enregistrements créés pour ce test ont été supprimés : les tables
`contact_requests` et `registration_requests` sont revenues à 0 ligne.

### 3.3 État de la base réelle (`oolaiauhhrfgncjpxucx`)

```
Tables                 35     Politiques RLS        53
Modules                16     Permissions           57
Formules                5     Liens formule↔module  75  (5 × 15, tous inclus)
Établissements          1     Profils                1  (Super Admin)
Demandes                0     Prises de contact      0
```

### 3.4 Défaut trouvé pendant la recette, et corrigé

La vérification des formulaires connectés a révélé un défaut sérieux du
middleware, invisible jusque-là : **toute requête vers `/api/*` émise par un
utilisateur déjà connecté était redirigée.**

`isPublicPath()`, qui couvre `/api/`, n'était consulté que dans la branche
« pas de session ». Une fois l'utilisateur authentifié, les règles de séparation
des espaces s'appliquaient aussi aux Route Handlers. `/api/users` n'étant pas
sous `/admin`, la règle « le Super Admin ne sort pas de son espace » le
redirigeait vers `/admin` — et son `POST` finissait en **405 Method Not
Allowed**. Le même mécanisme frappait le portail Patient.

Conséquence concrète : le Super Admin ne pouvait créer **aucun** compte
d'administrateur d'établissement. Les points 4 et 8 étaient inopérants en
conditions réelles, alors que toutes les vérifications précédentes — build,
types, tests, routes anonymes — passaient au vert. Seul l'appel authentifié le
révélait.

Correctif : le middleware sort désormais immédiatement pour `/api/*` après avoir
rafraîchi la session. Il décide de la *navigation* ; une API n'est pas une
navigation, et chaque handler relit lui-même le rôle de l'appelant en base pour
refuser par un code HTTP explicite.

Après correctif, cycle complet rejoué sur la base réelle :

| Étape | Résultat |
|---|---|
| Création d'un administrateur pour « Shawiri MED » | `201` — profil `MORA-USR-000012`, compte Auth créé |
| Connexion par l'identifiant `recette.administrateur` | `200` |
| Accès `/dashboard` et `/settings` par cet administrateur | `200` |
| Accès `/admin` par cet administrateur | `307 → /dashboard` |
| Désactivation puis réactivation | `200` / `200` |
| Changement de rôle puis retour | `200` / `200` |
| Réinitialisation du mot de passe | `200`, ancien mot de passe refusé `401` |
| Mot de passe de moins de 12 caractères | `400` |
| Suppression du compte | `200` — 0 profil, 0 compte Auth restant |
| Journal d'audit | 7 entrées écrites |

Le compte de test a été supprimé. La base est revenue à son état initial :
1 établissement, 1 profil, 0 demande, 0 prise de contact.

### 3.5 Contrôles de structure

```
Tableaux sans conteneur à défilement  : 0 / 21
Grilles fixes non responsives (après connexion) : 0
Restes de bascule de thème            : 0
Secrets versionnés                    : 0
```

### 3.6 Ce que je n'ai pas pu vérifier moi-même

Le responsive a été traité et contrôlé par lecture du code, par le build et par
un audit de structure, pas par un rendu visuel sur appareil réel : je n'ai pas de
navigateur ici. Les points de rupture retenus sont 640 px (`sm`), 768 px (`md`)
et 1024 px (`lg`). Un passage de votre part sur téléphone reste nécessaire pour
valider le rendu.

Le panneau de notifications a été vérifié par le build et par l'existence de ses
cinq sources en base ; son affichage n'a pas été observé dans un navigateur.

---

## 4. Écarts et décisions attendues

### 4.1 Les adresses des réseaux sociaux sont des hypothèses

Vous avez demandé sept icônes avec des liens actifs, sans fournir les adresses.
J'ai retenu, faute de mieux :

| Réseau | Adresse retenue |
|---|---|
| Facebook | `facebook.com/morashawiri` |
| YouTube | `youtube.com/@morashawiri` |
| WhatsApp | `wa.me/2694306306` — **certaine**, c'est votre numéro |
| LinkedIn | `linkedin.com/in/morashawiri` |
| Telegram | `t.me/morashawiri` |
| Instagram | `instagram.com/shawiridigital` |
| TikTok | `tiktok.com/@morashawiri` |

**Six sur sept sont à confirmer.** Elles se corrigent dans un seul fichier,
`src/components/landing/legal-content.ts`. Donnez-moi les vraies adresses et je
les remplace en une minute.

### 4.2 WhatsApp n'est pas ouvert automatiquement

Vous demandiez qu'à l'envoi du formulaire, un message WhatsApp prérempli parte
vers le +269 430 63 06. L'enregistrement en base est bien immédiat et
automatique. L'ouverture de WhatsApp, elle, est **proposée** par un bouton
« Envoyer sur WhatsApp », le message étant déjà entièrement rédigé.

Pourquoi : l'envoi se fait après un appel réseau, donc hors du geste de
l'utilisateur. Les navigateurs bloquent systématiquement une fenêtre ouverte dans
ces conditions ; le message ne partirait pas et personne ne saurait pourquoi. La
seule alternative techniquement fiable serait de quitter votre site pour
WhatsApp dès la validation — le visiteur perdrait la Landing Page sans l'avoir
demandé.

Trois options s'offrent à vous, dites-moi laquelle :
1. **Garder l'état actuel** — le message est enregistré, le bouton WhatsApp est
   prêt (recommandé).
2. **Rediriger automatiquement** vers WhatsApp après validation — le visiteur
   quitte le site.
3. **Envoyer réellement le message depuis le serveur** — cela suppose un compte
   WhatsApp Business API et un abonnement chez un fournisseur. C'est un
   développement à part entière, hors du périmètre de cette phase.

### 4.3 Notifications : pas de temps réel

Le panneau se recharge à son ouverture, pas en continu. Une notification arrivée
pendant que la page est ouverte n'apparaît qu'à la prochaine ouverture du
panneau. Le temps réel supposerait un abonnement Supabase Realtime : c'est
faisable, mais ce serait une fonctionnalité nouvelle, que vous n'avez pas
demandée.

---

## 5. Fichiers

**Créés (14)**

```
supabase/migrations/20260803000000_contact_and_plan_limits.sql
src/app/api/contact-requests/route.ts
src/app/admin/admins/page.tsx
src/app/admin/demandes/page.tsx
src/app/admin/contacts/page.tsx
src/components/admin/AdminAccountsPanel.tsx
src/components/admin/AdminAccountForm.tsx
src/components/admin/RegistrationRequestsPanel.tsx
src/components/admin/ContactRequestsPanel.tsx
src/components/admin/request-ui.tsx
src/components/dashboard/NotificationBell.tsx
src/components/landing/ContactModal.tsx
src/components/landing/LegalModal.tsx
src/components/landing/legal-content.ts
src/lib/roles.ts
src/services/notification.service.ts
src/services/platform-admin.service.ts
src/services/saas-requests.service.ts
```

**Supprimé (1)**

```
src/components/providers/ThemeProvider.tsx
```

**Modifiés :** 46 fichiers, dont les 12 modules métier, les 8 panneaux de
paramètres, les 4 composants de tableau de bord, la mise en page, le bandeau, la
barre latérale, la fenêtre modale, la navigation et 3 services.

**Migration ajoutée :** `20260803000000_contact_and_plan_limits.sql`, déjà
appliquée à la base réelle. Elle crée `contact_requests` avec sa séquence de
référence, ses politiques RLS et ses index ; contraint les six statuts sur les
deux tables de demandes ; ajoute `max_records_per_module` ; met à jour les
limites commerciales ; et rattache tous les modules à toutes les formules.

---

## 6. Aucun développement supplémentaire n'a été engagé

Conformément à votre consigne : rien n'a été poussé sur GitHub, rien n'a été
déployé, la documentation officielle n'a pas été modifiée, l'architecture n'a pas
été refondue, et aucune fonctionnalité hors des neuf points n'a été ajoutée.

J'attends votre validation.
