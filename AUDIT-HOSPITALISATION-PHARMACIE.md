# Audit de conformité — Hospitalisation (BP16) et Pharmacie (BP19)

**Date :** 7 août 2026
**Objet :** points 5 et 6 de la phase de corrections.

---

## 1. Ce que j'ai livré dans cette phase

Les deux modules utilisent désormais les Paramètres de l'établissement, comme
vous le demandiez explicitement pour chacun d'eux.

### Hospitalisation

| Livré | Détail |
|---|---|
| Bulletin d'hospitalisation | PDF, référence métier, patient, praticien, chambre/lit, durée de séjour, motif |
| Lettre de sortie | PDF, proposé uniquement lorsque la sortie est enregistrée |
| Identité de l'émetteur | Logo, nom officiel, coordonnées, mentions légales, signature, cachet, couleurs, modèle — tout vient des Paramètres |
| États du séjour | Libellés en clair (Admis, En cours, Transféré, Sorti, Annulé) au lieu du code technique |
| Colonne Actions | Menu ⋮, conforme à la convention du reste du SaaS |

### Pharmacie

| Livré | Détail |
|---|---|
| État du stock | PDF : inventaire valorisé, produits sous le seuil, péremptions à surveiller |
| Alerte de péremption | Signalée sur la ligne : « Périmé » en rouge, « Périme dans N j » en ambre sous 30 jours |
| Seuil de réapprovisionnement | Signalé sur la ligne dès que le stock l'atteint |
| Identité de l'émetteur | Idem Hospitalisation |

---

## 2. Ce qui reste à construire

Je préfère être précis plutôt que d'annoncer une conformité que le code ne
tiendrait pas. Les deux blueprints décrivent des périmètres bien plus larges que
ce que les modules couvrent aujourd'hui.

### BP16 — Hospitalisation : 10 sous-modules attendus (§3)

| Sous-module | État | Ce qui manque |
|---|---|---|
| Admissions | **Présent** | — |
| Séjours | **Partiel** | Le séjour existe, mais sans suivi jour par jour |
| Historique | **Partiel** | Journal d'audit générique, pas d'historique de séjour dédié |
| Chambres (§6) | **Absent** | Table `rooms` : type, capacité, service, statut, tarif |
| Lits (§7) | **Absent** | Table `beds` : rattachement à une chambre, état (libre, occupé, en nettoyage, hors service) |
| Affectations | **Absent** | Le numéro de chambre et de lit sont aujourd'hui du texte libre, sans contrôle de disponibilité |
| Soins infirmiers (§8) | **Absent** | Table de soins quotidiens : constantes, actes, observations, horodatage, soignant |
| Visites médicales (§9) | **Absent** | Table de visites : praticien, date, observations, décisions |
| Transferts (§10) | **Absent** | Table de transferts : origine, destination, motif, traçabilité |
| Sorties (§11) | **Partiel** | La date et le compte rendu existent ; le circuit de sortie (autorisation, facturation, remise des documents) n'est pas outillé |

**Point d'attention** — §6 et §7 sont structurants : tant que chambres et lits ne
sont pas des entités, l'application ne peut ni empêcher deux admissions sur le
même lit, ni afficher un taux d'occupation, ni alimenter les rapports du §15.

### BP19 — Pharmacie : 15 sous-modules attendus (§3)

| Sous-module | État | Ce qui manque |
|---|---|---|
| Catalogue des médicaments (§5) | **Partiel** | Nom, DCI, catégorie, prix, stock et péremption existent. Manquent : forme galénique, dosage, voie d'administration, conditionnement, code ATC |
| Consommations (§18) | **Partiel** | Le stock décroît, mais aucun état de consommation par service ou par période |
| États (§19) | **Partiel** | L'état du stock est produit ; les autres états du §19 ne le sont pas |
| Péremptions (§15) | **Partiel** | Signalées à l'écran et dans l'état du stock ; pas de blocage à la délivrance |
| Pharmacies (§4) | **Absent** | Une seule pharmacie implicite, pas de pharmacie centrale ni de sous-pharmacies |
| Plans thérapeutiques (§6) | **Absent** | — |
| Prescriptions (§7) | **Partiel** | La table `prescriptions` existe et est alimentée par les consultations, mais elle n'est pas reliée à la pharmacie |
| Validation pharmaceutique (§8) | **Absent** | Aucun circuit de validation par le pharmacien |
| Préparation (§9) | **Absent** | — |
| Délivrance (§10) | **Absent** | Aucun mouvement de délivrance, aucun bon de dispensation nominatif |
| Dispensation hospitalière (§11) | **Absent** | — |
| Armoires de service (§12) | **Absent** | — |
| Réapprovisionnement (§13) | **Partiel** | Le seuil est signalé ; aucun bon de commande ni suivi de réception |
| Lots (§14) | **Absent** | Le stock est global, sans numéro de lot — or §14 et §16 en dépendent |
| Médicaments réglementés (§16) | **Absent** | Aucune traçabilité renforcée, aucun registre |
| Retours (§17) | **Absent** | — |

**Point d'attention** — §14 (lots) est le prérequis de §15 (péremptions par lot),
§16 (stupéfiants) et §17 (retours). Le construire en premier évitera de refaire
le stock deux fois.

---

## 3. Pourquoi je ne l'ai pas fait dans cette phase

Vous aviez séquencé la demande : les points 5 et 6 venaient « une fois les points
précédents terminés et vérifiés ». Les points 1 à 4 sont livrés, vérifiés et
poussés.

Le reste représente une vingtaine de sous-modules et une douzaine de tables
nouvelles. Le livrer dans la même passe aurait donné des écrans qui ressemblent
aux blueprints sans en tenir les règles — exactement ce que vous refusez depuis
le début, et à juste titre pour un logiciel qui touche à des données de santé et
à des médicaments réglementés.

---

## 4. Ordre que je recommande

**Hospitalisation**

1. Chambres et lits, avec leurs états — tout le reste s'y accroche
2. Affectation contrôlée : un lit occupé n'est plus proposé
3. Soins infirmiers et visites médicales
4. Transferts
5. Circuit de sortie complet, puis rapports et taux d'occupation

**Pharmacie**

1. Lots : entrées, quantités, péremption par lot
2. Délivrance nominative, adossée aux prescriptions existantes
3. Validation pharmaceutique
4. Réapprovisionnement : bons de commande et réception
5. Armoires de service et dispensation hospitalière
6. Médicaments réglementés et retours

Chacune de ces étapes est livrable et vérifiable seule. Dites-moi par laquelle
commencer.
