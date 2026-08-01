# RAPPORT DE PHASE 4 — Espaces, routage et tableaux de bord

**Périmètre traité :** séparation complète des quatre espaces, routage réel, layouts TD04 §10, tableaux de bord par rôle.
**Toujours différé :** référentiel unique des modules, module Paramètres pilote, abonnements SaaS.
**Date :** 1er août 2026

---

## 1. Règle officialisée — BP06 §10 bis

Votre décision sur le Super Administrateur a été inscrite dans la documentation, qui fait foi.

`BP06 Rôles et permissions.md` reçoit une nouvelle section **§10 bis — Séparation du Super Administrateur et des activités cliniques**, portant la règle **BR-SA-001** : le Super Admin n'a aucun accès aux modules Patients, Rendez-vous, Consultations, Hospitalisation, Pharmacie, Laboratoire et Imagerie.

La section précise que la séparation est appliquée à trois niveaux — interface, routage, base de données — et rattache la règle au principe déjà énoncé par UG-001 §1. C'est la seule modification documentaire de cette phase ; **le référentiel des modules n'a été touché nulle part**.

---

## 2. Routage réel — 22 routes

L'application était une route unique avec navigation par état. Elle compte désormais 22 routes réellement construites.

### Structure retenue

```
/                          Landing publique (LP-001)
/login                     Connexion

/admin                     Tableau de bord Super Admin
/admin/etablissements      Établissements clients
/admin/parametres          Paramètres globaux

/dashboard                 Tableau de bord (contenu selon le rôle)
/patients                  Liste des dossiers
/patients/[id]             Dossier Médical Partagé
/appointments  /consultations  /hospitalizations
/pharmacy      /laboratory     /imaging
/finance       /hr              /ged
/users         /settings

/portail                   Espace Patient
```

**Les chemins de l'espace Établissement reprennent exactement ceux de TD04 §9** (`dashboard`, `patients`, `patients/:id`, `consultations`, `appointments`, `finance`, `settings`). C'est possible grâce au groupe de routes Next.js `(etablissement)`, dont le nom n'apparaît pas dans l'URL : la séparation est structurelle sans polluer les chemins documentés.

Une précision utile pour la suite : TD04 §9 introduit sa liste par « **Exemple :** ». Elle n'est donc pas fermée, et les routes `/admin/*` et `/portail` ne la contredisent pas.

### Conséquence directe

Trois exigences jusque-là sans objet deviennent effectives : les pages sont partageables par lien, le retour arrière du navigateur fonctionne, et l'exigence « inaccessible par URL » de CLAUDE.md a enfin un sens — il existe des URL à interdire.

---

## 3. Séparation des espaces — appliquée côté serveur

`src/lib/supabase/middleware.ts` ne se contente plus de rafraîchir la session : il arbitre l'accès aux espaces **avant tout rendu**, conformément à BP06 §14 et TD06 §7.

| Situation | Comportement |
|---|---|
| Non authentifié sur route privée | Redirection vers `/login` |
| Authentifié sur `/login` | Redirection vers l'espace du rôle |
| Rôle non Super Admin sur `/admin/*` | Redirection vers son espace |
| **Super Admin hors `/admin/*`** | **Redirection vers `/admin`** |
| Patient hors `/portail` | Redirection vers `/portail` |
| Non-patient sur `/portail` | Redirection vers son espace |
| Compte sans profil actif | Retour à `/login` |

La quatrième ligne est l'application concrète de BR-SA-001 : le Super Admin ne peut pas atteindre un écran clinique, même en tapant l'URL à la main.

La landing page reste accessible à tous, y compris connecté : c'est une vitrine publique.

### Les cinq layouts de TD04 §10

| Layout exigé | Implémentation |
|---|---|
| `PublicLayout` | `src/app/page.tsx` — landing, aucune donnée métier |
| `AuthLayout` | `src/app/login/page.tsx` |
| `DashboardLayout` | `src/app/(etablissement)/layout.tsx` |
| `AdminLayout` | `src/app/admin/layout.tsx` |
| `PortalLayout` | `src/app/portail/layout.tsx` |

Les trois espaces authentifiés partagent une ossature (`WorkspaceLayout`) mais **jamais leur navigation** : chacun lui passe son propre registre. Le `Sidebar` ne connaît plus aucun espace en particulier ; il reçoit ses entrées en propriété. C'est ce qui rend vraie l'exigence CLAUDE.md : « Son interface est totalement différente des autres. »

Le portail patient a délibérément une ossature distincte — pas de barre latérale de modules, pas de bandeau de supervision : un patient n'est pas un utilisateur interne.

---

## 4. Tableaux de bord — un par rôle

Aucun tableau de bord n'existait. Il y en a maintenant neuf, et **chaque indicateur est repris littéralement du guide utilisateur du rôle**.

| Rôle | Source | Indicateurs |
|---|---|---|
| Super Admin | UG01 §4 | établissements, abonnements actifs, abonnements expirés, suspendus, essais, disponibilité |
| Responsable | UG02 §4 | patients, consultations du jour, rendez-vous, hospitalisations, personnel, factures, recettes du jour, alertes |
| Médecin | UG03 §4 | consultations du jour, RDV à venir, patients hospitalisés, patients en attente, résultats disponibles |
| Infirmier | UG04 §4 | patients assignés, hospitalisations en cours, consultations du jour, alertes médicales |
| Réceptionniste | UG05 §4 | RDV du jour, patients en attente, admissions, patients enregistrés, RDV annulés |
| Pharmacien | UG06 §4 | articles, ruptures, sous seuil de réapprovisionnement, proches péremption |
| Laboratoire | UG07 §4 | examens en attente, analyses en cours, examens urgents, résultats validés |
| Imagerie | UG08 §4 | examens programmés, réalisés, comptes rendus à rédiger |
| Comptable | UG09 §4 | recettes du jour, factures impayées, factures émises, situation de caisse |

Tous les chiffres sont **calculés à partir des données réelles** chargées par la couche services. Aucun n'est simulé.

Une exception assumée : le **portail patient affiche ses compteurs à zéro**, avec un encart qui l'explique. Le patient doit accéder à ses seules données via des politiques RLS qui lui sont propres, et celles-ci n'existent pas encore. Afficher des chiffres provenant d'une autre source aurait été mensonger.

---

## 5. Dossier Médical Partagé — `/patients/[id]`

La route exigée par TD04 §9 a été implémentée comme un vrai dossier, conformément à UG03 §6. Elle réunit autour d'un même patient : identité, groupe sanguin, allergies et antécédents mis en évidence, puis consultations, rendez-vous, hospitalisations, analyses biologiques, imagerie et facturation.

C'est la première matérialisation visible de l'interconnexion exigée par CLAUDE.md : les modules ne sont plus des silos, ils convergent vers le dossier.

Au passage, la modale « Voir Dossier » du module Patients a été supprimée : elle dupliquait cette page en moins complet.

---

## 6. Vérifications

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **passe** (0 erreur) |
| `npm run build` | **passe** — 22 routes |
| `npx next lint` | **passe** — 0 avertissement, 0 erreur |
| `Vite` / `React Router` dans les TD | **0** |
| Référentiel des modules modifié | **non** — conforme à votre consigne |

---

## 7. Ce qui reste

**Toujours différé à votre arbitrage :** référentiel unique des modules, module Paramètres pilote et sa cascade complète, abonnements et licences SaaS.

**Reste à développer :**

- Les 9 modules absents : Urgences, Bloc opératoire, Achats (BP17), Stock (BP18), Rapports et BI (BP24A/B), Notifications (BP27A), Messagerie, Interopérabilité (BP27B). `GEDModule` demeure un libellé de 1,6 Ko.
- Le contenu réel du portail patient (UG10 §5 à §12) et les politiques RLS qui lui sont nécessaires.
- Le journal d'audit : la table et ses politiques existent, **rien ne l'alimente encore**.
- Les workflows d'état non implémentés : une demande de laboratoire ne passe jamais de « en attente » à « prélevée » puis « validée », faute d'écrans de suivi.
- Landing Page en charte claire LP-001 avec bascule sombre.
- i18n FR/EN (BR-246 interdit le texte codé en dur — il l'est toujours partout), PWA, accessibilité WCAG, tests TD08.

**Risque inchangé depuis la Phase 3 :** les trois migrations SQL n'ont toujours pas été exécutées, et `src/types/database.ts` reste écrit à la main. C'est le préalable que vous avez prévu pour la prochaine étape.

---

## 8. Recommandations

1. **Exécuter les migrations et régénérer les types**, comme prévu. Tant que ce n'est pas fait, aucun parcours ne peut être validé de bout en bout.
2. **Tester la séparation des espaces avec un compte par rôle** dès que la base est en ligne. Le middleware est la pièce la plus sensible de cette phase : il décide de toute la navigation.
3. **Arbitrer le référentiel des modules** : il bloque désormais trois chantiers à lui seul — le module Paramètres, les abonnements, et le périmètre exact des modules restants.
4. Envisager les tests TD08 sur le middleware en priorité : sa logique de redirection est exactement le genre de code où une régression passe inaperçue.
