# Rapport — Hospitalisation, Pharmacie, Stock et Finances des abonnements

**Date :** 8 août 2026
**Références :** BP16 (Hospitalisation), BP17 (Achats), BP18 (Stock & Inventaire),
BP19 (Pharmacie), BP30 (Plateforme SaaS).

---

## 1. Ce qui est réellement terminé

### Listes déroulantes (point 1)

Le défaut était précis : la liste écoutait le défilement en phase de capture et
le traitait comme un mouvement de la page, sans distinguer celui qu'elle
produisait elle-même. Saisir sa barre de défilement la refermait donc.

La logique de fermeture est désormais dans un seul endroit —
`useAnchoredPanel` — utilisé par les trois panneaux ancrés du SaaS : liste
déroulante, menu d'actions, sélecteur de patient. Une liste ouverte ne se ferme
que sur un geste volontaire : choix d'une option, appui hors du champ, Échap, ou
disparition du champ hors de l'écran. La page qui défile déplace la liste avec
elle plutôt que de la faire disparaître.

`pointerdown` remplace `mousedown` : le tactile n'émet des événements souris
qu'en fin de geste, et un panneau ouvert sur téléphone ne se refermait pas au
premier contact hors de lui. La sélection est validée au relâchement, comme sur
un `<select>` natif — glisser depuis une option pour faire défiler ne
sélectionne donc rien.

Huit tests de comportement couvrent ces cas. Deux d'entre eux échouent sur le
code d'avant correction : la vérification a été faite.

### Centre de notifications (point 2)

La cause n'était pas dans les politiques RLS — un test le prouve : le Super
Admin lit bien les notifications archivées de tous les établissements.

Elle était dans la composition de la liste. Les échéances d'abonnement et de
licence étaient recalculées à chaque lecture et affichées comme des
notifications sans exister en base. Sans ligne, elles n'étaient ni marquables ni
archivables : le menu ⋮ se réduisait à « consulter », et le filtre « Archivées »
ne pouvait rien montrer puisque rien n'était archivable. Le défaut ne se voyait
que côté Super Admin, dont la liste est presque entièrement faite d'échéances,
là où celle d'un responsable est surtout faite d'événements réels.

Les échéances sont désormais émises et persistées par la base, aux paliers 30,
7 et 3 jours, le jour de l'échéance, puis à l'expiration — pour les abonnements
comme pour les licences. Chaque palier n'émet qu'une fois, et seulement dans sa
bande : une échéance à vingt jours déclenche le palier 30 et lui seul.

Les deux interfaces exécutent maintenant exactement la même requête et
disposent des mêmes actions. Seules les politiques RLS les distinguent.

### Hospitalisation (points 4 et 5)

Chambres et lits sont devenus de véritables ressources. L'admission ne propose
que des lits réellement libres, et la chambre est déduite du lit choisi — elle
ne peut donc pas diverger.

Ce qui est tenu par la base, et non par le formulaire :

| Règle | Mécanisme |
|---|---|
| BR-058 — un seul patient par lit | Index unique partiel sur les séjours en cours |
| BR-060 — la sortie libère le lit | Déclencheur sur le changement d'état du séjour |
| Lit et chambre du même établissement | Déclencheur d'intégrité |
| Capacité de la chambre respectée | Même déclencheur |
| Lit hors service ou en nettoyage refusé | Déclencheur d'affectation |
| Validation médicale avant sortie | Déclencheur lisant les Paramètres |
| Constantes vitales plausibles | Contraintes `CHECK` |

Le module compte quatre onglets, dans l'ordre où les données se construisent :
Séjours, Chambres, Lits, Occupation. Le dossier d'un séjour porte les soins
quotidiens, les visites médicales, les transferts et la sortie, chacun avec sa
référence métier et son historique.

Le taux d'occupation, la durée moyenne de séjour et la répartition par service
sont calculés à partir des lits réels.

### Pharmacie, stock et achats (point 6)

BP19 §5 est explicite : « Le stock est géré exclusivement par le module Stock &
Inventaire ». Le catalogue décrit donc les produits, et tout ce qui touche aux
quantités passe par le registre des mouvements.

**Le registre est la source de vérité.** Les quantités portées par les lots et
par les articles en sont dérivées et tenues par déclencheur. Le registre est en
écriture seule : modifier ou supprimer un mouvement est refusé par la base, et
une erreur se corrige par un mouvement inverse qui reste visible.

Livré : catalogue enrichi (DCI, forme, dosage, voie, conditionnement, code ATC,
conservation, médicaments réglementés), pharmacies multiples et armoires de
service, hiérarchie d'emplacements sur les sept niveaux du BP18 §4, fournisseurs,
lots avec péremption et rappel, entrées et sorties, ajustements, destructions,
retours, délivrance nominative adossée aux prescriptions, validation
pharmaceutique, inventaires avec écarts, alertes, valorisation et historique.

Règles tenues par la base :

| Règle | Mécanisme |
|---|---|
| BR-079 — mouvements historisés | Registre immuable en modification et suppression |
| BR-086 — la délivrance met à jour le stock | Déclencheur sur la ligne de délivrance |
| BR-087 — règle FEFO | Fonction `suggest_lots`, règle portée par l'article |
| Stock jamais négatif | Contrôle au report du mouvement |
| Lot périmé non délivré | Déclencheur lisant les Paramètres |
| Lot rappelé jamais délivré | Déclencheur, sans dérogation possible |
| Validation pharmaceutique | Déclencheur lisant les Paramètres |
| Écarts d'inventaire tracés | `close_stock_inventory` produit un mouvement par écart |

Permissions : le responsable d'établissement et le pharmacien gèrent le module ;
médecin, infirmier et réception consultent le stock sans pouvoir l'écrire. Les
onglets Délivrance, Inventaires et Organisation ne s'affichent pas pour eux.

### Finances des abonnements (point 3)

Le contrat existait ; sa trace financière, non. Deux tables ont été créées —
`subscription_invoices` et `subscription_payments` — distinctes des tables
`invoices` et `payments`, qui portent un `patient_id` et relèvent de la
facturation des soins.

La facture fige son prix à l'émission : un tarif révisé ne réécrit pas une
facture déjà envoyée. Le montant réglé est déduit des paiements, jamais saisi.
Un règlement supérieur au dû est refusé — sur un abonnement, il traduit presque
toujours une saisie sur la mauvaise facture.

Toute période souscrite est facturée automatiquement, à la souscription comme au
renouvellement, au tarif de la formule et avec la remise de durée. Les
abonnements déjà en cours ont reçu leur facture par reprise.

Côté Super Admin : console dédiée, totaux facturé / encaissé / reste dû / en
retard, recherche et filtres, émission, règlement, annulation, facture PDF.
Côté établissement : ses factures, ses règlements, son encours et le
téléchargement — sans écriture, BP30 BR-295 réservant l'administration des
abonnements à l'éditeur.

### Paramètres (point 7)

Un défaut de fond a été corrigé : la valeur par défaut de la colonne
`module_settings` était un objet vide. Les valeurs de départ n'avaient été
posées que sur les établissements existants au moment de leur migration — **tout
établissement créé ensuite démarrait sans aucun réglage**, listes vides et
valeurs codées en dur.

Chaque réglage a maintenant un effet vérifiable :

| Réglage | Effet |
|---|---|
| Seuil de réapprovisionnement | Alertes et état du stock (vue SQL) |
| Péremption signalée | Alertes et état du stock (vue SQL) |
| Blocage des périmés | Refus de délivrance (déclencheur) |
| Validation pharmaceutique | Refus de délivrance (déclencheur) |
| Règle de sortie par défaut | Appliquée aux nouveaux produits |
| Catégories, formes, voies | Listes du catalogue |
| Types de chambres | Création de chambre |
| Services d'admission | Chambres, admissions, transferts |
| Natures de soin | Saisie quotidienne |
| Motifs de sortie | Clôture du séjour |
| Tarif journalier | Proposé à la chambre, figé à l'admission |
| Durée surveillée | Signalement des séjours longs |
| Validation avant sortie | Refus d'enregistrer la sortie (déclencheur) |

Un réglage a été **retiré** : la liste libre des « états possibles d'un lit ».
BP16 §7 les fixe, et ils sont désormais un type énuméré de la base. Les laisser
saisir laissait croire à un choix qui n'existait pas.

### Documents (point 8)

Les documents des deux modules passent par le moteur existant : identité,
coordonnées, mentions légales, logo, signature, cachet, couleurs, QR Code et
modèle sélectionné proviennent des Paramètres de l'établissement, et les trois
modèles Premium restent respectés.

Ajoutés : bulletin d'hospitalisation enrichi (service, origine, tarif, coût du
séjour), lettre de sortie complète (motif, état du patient, recommandations,
prochain rendez-vous), bon de délivrance nominatif avec les lots servis, état du
stock valorisé, facture d'abonnement.

---

## 2. Contrôles

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | 0 erreur |
| ESLint | 0 avertissement |
| Tests automatisés | 216 tests, 10 suites |
| Migrations sur PGlite | 20 migrations, 59 tables, 82 politiques |
| Couverture des types | 61 / 61 tables et vues |
| `next build` | 35 routes |
| Recette schéma sur la base réelle | 17 contrôles au vert |
| Parcours fonctionnel sur la base réelle | 20 contrôles au vert |

Le parcours fonctionnel crée un jeu de données complet sur la base Supabase
réelle — chambre, lits, admission, patient, pharmacie, lots, mouvements,
délivrance, inventaire — vérifie chaque règle métier sur PostgreSQL et non sur
PGlite, puis supprime tout ce qu'il a créé.

Deux défauts ont été trouvés par ces contrôles et corrigés :

- une erreur de type dans la fonction d'émission de facture, masquée par un
  `EXCEPTION WHEN OTHERS` silencieux. Le gestionnaire journalise désormais un
  avertissement : une facturation qui échoue sans laisser de trace se découvre
  des semaines plus tard, sur un état financier faux ;
- le contrôle des types (`npm run db:check-types`) échouait depuis la migration
  d'identité de l'établissement. Trois harnais PGlite gardaient chacun leur copie
  de la simulation Supabase, et elles avaient divergé. Le fichier
  `supabase/testing/supabase-stub.sql` en est maintenant la source unique.

---

## 3. Ce qui n'est pas livré

Je préfère être exact plutôt que d'annoncer une conformité que le code ne
tiendrait pas.

### BP17 — Achats : partiel

Les tables `purchase_orders` et `purchase_order_lines` existent, avec leur cycle
de vie et leurs contraintes, mais **aucun écran ne les exploite encore**. Sont
donc absents : demandes d'achat, circuit de validation configurable, appels
d'offres, demandes de devis, comparaison des offres, contrôle qualité à la
réception, retours fournisseurs et livraisons directes.

Les entrées en stock se saisissent aujourd'hui directement, avec leur
fournisseur et leur référence de livraison. C'est fonctionnel et tracé, mais ce
n'est pas le circuit complet du BP17.

### BP19 — Pharmacie : deux sous-modules absents

- **Plans thérapeutiques (§6)** — les prescriptions existent et sont reliées à
  la pharmacie, mais elles ne sont pas regroupées en plan par patient.
- **Dispensation hospitalière (§11)** — la délivrance nominative fonctionne ; la
  distribution quotidienne par tournée aux patients hospitalisés n'est pas
  outillée. Le lien technique existe déjà : `dispensations.hospitalization_id`.

Les armoires de service (§12) sont modélisées et créables, avec leur pharmacie
de rattachement ; leur réapprovisionnement automatique reste à construire.

### BP18 — Stock : réapprovisionnements internes

Les transferts entre magasins (§12) ont leurs types de mouvement en base
(`transfer_in`, `transfer_out`) mais pas encore d'écran.

### Ce qui n'a pas été vérifié

Le rendu visuel des écrans sur appareil réel — téléphone, tablette — n'a pas été
contrôlé : je n'ai pas de navigateur. Les mises en page suivent les conventions
responsives du reste du SaaS (tableaux à défilement confiné, grilles qui
retombent en colonne, panneaux en position fixe mesurés à l'ouverture), et le
comportement tactile des listes déroulantes est couvert par des tests, mais cela
ne remplace pas un essai sur appareil.

---

## 4. Ordre recommandé pour la suite

1. **Réapprovisionnement interne** — transferts entre pharmacies et armoires de
   service. Les mouvements existent déjà ; il manque l'écran et le contrôle du
   magasin source.
2. **Circuit d'achat** — demandes, validation, bon de commande, réception avec
   contrôle qualité. Les tables sont posées ; c'est le workflow qui reste.
3. **Dispensation hospitalière** — tournées quotidiennes, adossées aux séjours.
4. **Plans thérapeutiques** — regroupement des prescriptions par patient.

Chacune de ces étapes est livrable et vérifiable seule.
