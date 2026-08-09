# Rapport — Documents de la plateforme, vente, achats et logistique

**Date :** 9 août 2026
**Références :** BP17 (Achats), BP18 (Stock & Inventaire), BP19 (Pharmacie),
BP28C (Génération documentaire), BP30 (Plateforme SaaS).

---

## 1. Configuration documentaire du Super Admin (point 1)

Le moteur documentaire n'acceptait qu'un établissement comme émetteur. La
plateforme dispose désormais de sa propre identité, dans une table dédiée
`platform_identity`, avec son écran de réglage : **Paramètres globaux >
Documents de la plateforme**.

Elle porte les mêmes éléments que celle d'un établissement — identité, raison
sociale, logo, coordonnées, mentions légales, signature, cachet, couleurs,
modèle documentaire par défaut et modèle par type de document — et les trois
modèles Premium y sont disponibles.

**La séparation des deux niveaux est tenue par les politiques RLS**, pas par
l'écran : seul le Super Admin écrit dans `platform_identity`. Un établissement
peut la **lire**, et c'est nécessaire : la facture d'abonnement qu'il télécharge
depuis son espace est émise par MORA Shawiri et doit porter son en-tête. Une
facture à l'en-tête du client laisserait croire qu'il s'est facturé lui-même.

Les visuels de l'éditeur vivent dans un compartiment de stockage distinct
(`platform-assets`) : celui des établissements cloisonne par dossier
d'établissement, et l'éditeur n'en a aucun.

Un aperçu sur facture d'exemple permet de juger le modèle avant de l'enregistrer.

---

## 2. Erreur de téléchargement des factures (point 2)

**Cause réelle.** `useDocument` exigeait le profil d'un établissement. Le Super
Admin n'appartenant à aucun, `profile` valait `null` et la génération était
refusée avec « Aucun établissement n'est rattaché à votre compte ». Ce n'était
pas un défaut d'affichage : aucun document ne pouvait être produit depuis la
console de l'éditeur.

**Correction.** Le moteur ne demande plus « d'où vient ce document » mais
« qui l'émet » : un type `DocumentIssuer` décrit ce dont un document a besoin,
et il est satisfait aussi bien par un établissement que par la plateforme. Les
deux consoles — éditeur et établissement — passent explicitement l'identité de
la plateforme, puisque c'est elle qui facture.

La facture PDF porte désormais : référence, client facturé avec ses
coordonnées et identifiants, formule, période, durée, prix mensuel normal,
prix appliqué, remise, montant total, montant réglé, reste dû, date d'émission,
échéance, statut, historique des règlements, et l'identité complète de
l'émetteur. **Aperçu** et **téléchargement** sont tous deux disponibles ; le nom
du fichier reprend la référence métier (`MORA-FSA-000001-facture-d-abonnement.pdf`).

La composition est écrite une seule fois, dans
`src/lib/documents/subscription-invoice.ts` : deux compositions concurrentes
auraient fini par présenter les mêmes montants différemment de part et d'autre.

---

## 3. Vente de médicaments (point 3)

**Choix structurant.** Vendre au comptoir et délivrer sur ordonnance sont le
même geste au regard du stock : on sort une quantité d'un lot, pour quelqu'un,
et l'on trace. Créer une table de ventes séparée aurait dupliqué tout le circuit
— contrôle du lot, blocage des périmés, refus des lots rappelés, mouvement de
stock — avec la certitude que les deux copies divergeraient. Sur des
médicaments, une règle appliquée d'un côté et pas de l'autre est un défaut
grave.

La vente est donc une délivrance dont le **canal** indique qu'elle est réglée
sur place, et elle hérite de toutes les garanties déjà en place.

Livré : sélection du patient ou d'un client de passage, recherche parmi les seuls
produits en stock, sélection automatique des lots selon la règle de sortie du
produit (FEFO par défaut), affichage du lot servi, plusieurs lignes, calcul du
total, encaissement partiel possible, enregistrement, décrémentation du stock,
mouvement tracé, reçu PDF, et **facture patient** créée dans `invoices` +
`invoice_items` — c'est ce qui relie la pharmacie au module Finance.

**Le stock disponible est vérifié deux fois** : à l'ajout de la ligne pour
prévenir l'opérateur, et à l'enregistrement par la base, qui tranche. Vendre
plus que le stock est impossible.

Permissions : la vente n'est offerte qu'aux rôles disposant du droit de gestion
de la pharmacie — pharmacien et responsable d'établissement. Les autres ne
voient pas l'onglet et ne peuvent rien écrire.

---

## 4. Fonctionnalités non livrées au précédent rapport (point 4)

### BP17 — chaîne d'achat complète

| Étape | État |
|---|---|
| Demandes d'achat, service demandeur, justification, priorité | **Livré** |
| Circuit de validation, décision tracée avec auteur et motif | **Livré** |
| Consultation des fournisseurs : devis, consultation directe, appel d'offres | **Livré** |
| Comparaison des offres : prix, délai, garantie, transport, conditions, qualité | **Livré** |
| Choix historisé, une seule offre retenue par demande | **Livré** |
| Bon de commande, total recalculé depuis les lignes | **Livré** |
| Réception : quantités, lot, péremption, numéro de série, bon de livraison | **Livré** |
| Contrôle qualité : acceptée, avec réserve, refusée — motif historisé | **Livré** |
| Mise en stock après contrôle (BR-068, BR-069) | **Livré** |
| Retours fournisseurs : total, partiel, remplacement, avoir (BR-074) | **Livré** |

### BP19 — plans thérapeutiques et dispensation hospitalière

| Fonctionnalité | État |
|---|---|
| Plans thérapeutiques : médicaments, perfusions, injections, ponctuels, continus | **Livré** |
| Posologie, voie, fréquence, horaires d'administration, durée, consignes | **Livré** |
| Rattachement des prescriptions au plan (BR-084) | **Livré** |
| Cycle de vie du plan : actif, suspendu, terminé, annulé | **Livré** |
| Tournées quotidiennes par service et par moment | **Livré** |
| Composition automatique depuis les plans actifs des patients hospitalisés | **Livré** |
| Administration nominative constatée : administré, refusé, reporté | **Livré** |
| Consignation au dossier du patient (BP19 §11) | **Livré** |

### BP18 §12 — réapprovisionnements internes

Transferts entre magasins et vers les armoires de service, avec report du lot :
un lot jumeau est créé chez le destinataire, aux mêmes numéro, péremption et
fournisseur. Sans cela, la traçabilité s'arrêterait à la porte du magasin.

BR-071 est tenue par la base : la sortie du magasin source et l'entrée chez le
destinataire sont créées dans la même transaction.

---

## 5. Règles tenues par la base, et non par l'écran

C'est le point qui distingue une application exploitable d'une démonstration.

| Règle | Mécanisme |
|---|---|
| BR-068 — réception contrôlée avant mise en stock | La fonction refuse une réception non contrôlée |
| BR-069 — réception acceptée crée l'entrée de stock | Mouvement créé par la base, lot compris |
| Réception refusée jamais mise en stock | Refus explicite |
| Double mise en stock impossible | Horodatage `stocked_at` |
| Pas plus reçu que commandé | Contrainte `CHECK` |
| BR-071 — transfert : sortie et entrée liées | Une seule transaction |
| BR-074 — retour décrémente le stock | Mouvement créé à l'expédition, pas à la saisie |
| BR-085 — délivrance nominative liée à une prescription | Déclencheur, sauf canal « vente » |
| Vente sans acquéreur refusée | Déclencheur |
| Vente supérieure au stock refusée | Contrôle du registre |
| Une seule offre retenue par demande | Index unique partiel |
| Un fournisseur consulté une seule fois par demande | Index unique |
| Une seule tournée par service, date et moment | Index unique |
| Administration consignée au dossier | Déclencheur |
| Un magasin ne se réapprovisionne pas auprès de lui-même | Contrainte `CHECK` |
| Une seule identité de plateforme | Index unique |
| Identité de plateforme non modifiable par un établissement | Politique RLS |

---

## 6. Documents produits (point 5)

Tous en français, sans texte de remplacement, et habillés par la configuration
documentaire de l'émetteur — logo, couleurs, en-tête et pied composés,
signature, cachet, QR Code, modèle sélectionné.

Nouveaux : reçu de vente, plan thérapeutique, feuille de tournée, bon de
commande, bon de réception, bon de retour fournisseur, bon de transfert interne,
facture d'abonnement enrichie.

Existants et conservés : bulletin d'hospitalisation, lettre de sortie, bon de
délivrance, état du stock, dossier patient, ordonnance, compte rendu de
consultation, résultat de laboratoire, rapport d'imagerie, facture, reçu, devis.

---

## 7. Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | 0 erreur |
| ESLint | 0 avertissement |
| Tests automatisés | **253 tests**, 11 suites |
| Migrations sur PGlite | 23 migrations, 76 tables, 98 politiques RLS |
| Couverture des types | **76 / 76** tables et vues |
| `next build` | 36 routes |
| Recette de schéma sur la base réelle | 17 contrôles au vert |
| Parcours fonctionnel des nouveaux flux | **27 contrôles au vert** |

Le parcours fonctionnel s'exécute sur la base Supabase réelle, sous PostgreSQL
et non sous PGlite : demande d'achat, offres, commande, réception, contrôle
qualité, mise en stock, vente, plan thérapeutique, tournée, administration,
transfert interne, retour fournisseur — puis suppression de toutes les données
créées. L'état final de la base a été vérifié : aucun résidu.

Un test existant a été adapté, et c'est délibéré : `tests/pharmacy.test.ts`
créait des délivrances nominatives sans prescription. BR-085 l'interdit, et la
base le refuse désormais. Le test crée donc l'ordonnance qui justifie chaque
délivrance — la règle n'a pas été assouplie pour faire passer le test.

---

## 8. À vérifier par vos soins après déploiement

Je n'ai pas de navigateur : le rendu et les interactions n'ont pas pu être
constatés sur appareil réel. Ce qui suit demande votre recette :

**Sur ordinateur**
1. Super Admin > Paramètres globaux > Documents de la plateforme : renseigner
   l'identité, téléverser logo, signature et cachet, choisir un modèle, utiliser
   « Aperçu sur une facture d'exemple », enregistrer.
2. Super Admin > Finances des abonnements : « Aperçu de la facture » puis
   « Télécharger la facture » — vérifier l'en-tête MORA Shawiri, le bloc client,
   les montants et le nom du fichier.
3. Espace établissement > Paramètres > Abonnement & Licence : télécharger sa
   propre facture et vérifier qu'elle porte bien l'en-tête de l'éditeur.
4. Pharmacie > Ventes : vendre plusieurs lignes, vérifier le lot proposé, le
   total, l'encaissement, la décrémentation du stock et le reçu.
5. Pharmacie > Achats & logistique : parcourir demande → offres → commande →
   réception → contrôle → mise en stock, puis un transfert et un retour.
6. Pharmacie > Plans & tournées : créer un plan, préparer une tournée, marquer
   une administration, vérifier qu'elle apparaît au dossier du patient.

**Sur téléphone et tablette**
7. Ouverture et défilement des listes déroulantes dans les formulaires longs
   (vente, achat, plan thérapeutique) — le comportement tactile est couvert par
   des tests automatisés mais n'a pas été essayé sur appareil.
8. Lisibilité des tableaux à défilement horizontal dans les nouveaux écrans.
9. Téléversement d'un logo depuis la galerie du téléphone.

**Permissions**
10. Se connecter avec un rôle infirmier ou médecin et vérifier que les onglets
    Ventes, Délivrance, Plans & tournées, Achats, Inventaires et Organisation
    n'apparaissent pas, et que le stock reste consultable.

---

## 9. Ce qui reste hors périmètre

Rien des points 1 à 8 de votre demande n'a été laissé de côté. Les éléments
suivants relèvent d'autres blueprints et n'ont pas été abordés :

- appels d'offres avec dépouillement formel et procès-verbal (BP17 §8 admet
  l'appel d'offres comme nature de consultation, ce qui est livré ; la procédure
  formalisée de dépouillement n'est pas décrite par le blueprint) ;
- circuits de validation à plusieurs niveaux configurables par établissement
  (BP17 §7 les dit configurables ; la décision est tracée avec son auteur, mais
  le paramétrage du parcours n'est pas outillé) ;
- numéros de série suivis individuellement après la réception (BP18 §10) : le
  numéro est relevé et conservé sur la ligne de réception, mais il ne fait pas
  l'objet d'un suivi unitaire par équipement.
