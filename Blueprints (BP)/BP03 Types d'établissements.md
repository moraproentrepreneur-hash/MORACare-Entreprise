# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Types d'établissements

**Référence :** BP-003

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Ce document définit les catégories d'établissements pouvant utiliser MORACare Enterprise.

Il précise les spécificités de chaque type d'établissement, les modules généralement utilisés et les principes de configuration de la plateforme.

Toutes les fonctionnalités développées devront permettre de prendre en charge ces établissements sans nécessiter une architecture différente.

---

# 2. Principe général

MORACare Enterprise est une plateforme unique.

Tous les établissements utilisent le même logiciel.

Les différences de fonctionnement sont obtenues grâce à :

- l'activation ou la désactivation des modules ;
- les rôles des utilisateurs ;
- les permissions ;
- les paramètres de configuration ;
- les abonnements.

Il n'existe donc qu'un seul produit MORACare Enterprise.

---

# 3. Cabinet médical

Le cabinet médical correspond à une structure composée d'un ou plusieurs médecins recevant des patients en consultation.

Fonctionnalités principales :

- gestion des patients ;
- agenda ;
- rendez-vous ;
- consultations ;
- prescriptions ;
- dossiers médicaux ;
- certificats médicaux ;
- facturation ;
- paiements ;
- statistiques.

Hospitalisation non requise.

---

# 4. Cabinet dentaire

Le cabinet dentaire possède des besoins proches du cabinet médical avec des éléments spécifiques.

Fonctionnalités principales :

- fiches dentaires ;
- odontogramme ;
- consultations dentaires ;
- traitements ;
- radiographies ;
- devis ;
- paiements ;
- rendez-vous.

---

# 5. Clinique

La clinique est un établissement regroupant plusieurs professionnels de santé.

Fonctionnalités principales :

- consultations ;
- hospitalisation ;
- laboratoire ;
- pharmacie ;
- imagerie ;
- caisse ;
- finance ;
- gestion du personnel ;
- tableaux de bord.

---

# 6. Polyclinique

La polyclinique rassemble plusieurs spécialités médicales.

Elle fonctionne selon les mêmes principes qu'une clinique tout en intégrant davantage de services spécialisés.

Les modules activés dépendent des activités réellement proposées.

---

# 7. Hôpital

L'hôpital représente la configuration la plus complète de MORACare.

Tous les modules peuvent être activés.

Exemples :

- urgences ;
- consultations ;
- hospitalisation ;
- blocs opératoires ;
- laboratoire ;
- pharmacie ;
- imagerie ;
- finance ;
- ressources humaines ;
- rapports décisionnels.

Les futurs modules devront être compatibles avec cette configuration.

---

# 8. Laboratoire d'analyses médicales

Un laboratoire peut utiliser MORACare indépendamment d'une clinique.

Modules principaux :

- patients ;
- prescriptions ;
- prélèvements ;
- analyses ;
- validation des résultats ;
- impression ;
- paiements.

---

# 9. Centre d'imagerie médicale

Modules principaux :

- patients ;
- examens ;
- résultats ;
- comptes rendus ;
- archivage ;
- facturation.

---

# 10. Centre de santé

Les centres de santé disposent généralement d'un nombre réduit de modules.

Configuration recommandée :

- accueil ;
- patients ;
- consultations ;
- vaccinations ;
- pharmacie ;
- caisse.

---

# 11. Centre spécialisé

Cette catégorie couvre notamment :

- cardiologie ;
- pédiatrie ;
- gynécologie ;
- ophtalmologie ;
- ORL ;
- dermatologie ;
- psychiatrie ;
- rééducation ;
- dialyse.

Chaque établissement active uniquement les modules nécessaires à son activité.

---

# 12. Établissements multi-sites

MORACare doit permettre la gestion d'organisations disposant de plusieurs établissements.

Chaque site possède :

- ses utilisateurs ;
- ses patients ;
- ses stocks ;
- ses finances.

L'organisation peut toutefois disposer de tableaux de bord consolidés selon les permissions accordées.

---

# 13. Évolutivité

La plateforme doit permettre l'ajout futur de nouveaux types d'établissements sans modifier l'architecture principale.

Les nouveaux besoins devront être couverts par :

- de nouveaux modules ;
- des paramètres ;
- des rôles ;
- des permissions.

La structure fondamentale du système ne devra jamais être remise en cause.

---

# 14. Principes de configuration

Chaque établissement possède :

- son identité ;
- son logo ;
- ses coordonnées ;
- ses paramètres ;
- sa devise ;
- sa langue ;
- ses utilisateurs ;
- ses modules activés ;
- son abonnement.

Les données d'un établissement sont totalement isolées des autres établissements.

---

# 15. Conclusion

MORACare Enterprise est conçu comme une plateforme universelle capable de répondre aux besoins d'établissements de santé de tailles et de spécialités différentes.

L'architecture repose sur un produit unique, configurable par modules, garantissant une expérience cohérente, évolutive et sécurisée quel que soit le type d'établissement.