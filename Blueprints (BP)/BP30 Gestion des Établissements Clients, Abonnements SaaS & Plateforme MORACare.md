# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Gestion des Établissements Clients, Abonnements SaaS & Plateforme MORACare

**Référence :** BP-030

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le fonctionnement de MORACare Enterprise en tant que plateforme SaaS (Software as a Service).

Il décrit la gestion des établissements clients, des abonnements, des licences, de la facturation SaaS, du support client ainsi que des règles garantissant l'isolation des données entre les différents établissements utilisant la plateforme.

Ce module est exclusivement destiné à la gestion de la plateforme MORACare par MORA Shawiri et ne concerne pas la gestion interne des établissements de santé.

---

# 2. Objectifs

Le module permet de :

- administrer les établissements clients ;
- gérer les abonnements ;
- gérer les licences ;
- suivre la facturation SaaS ;
- superviser les environnements des établissements ;
- assurer l'isolation des données ;
- gérer le support client.

---

# 3. Périmètre

Le module couvre :

- Gestion des établissements clients
- Création d'un nouvel établissement
- Activation
- Suspension
- Réactivation
- Abonnements
- Licences
- Plans tarifaires
- Facturation SaaS
- Paiements
- Renouvellements
- Tableau de bord SaaS
- Support client
- Audit

---

# 4. Gestion des établissements clients

Chaque établissement représente une organisation indépendante utilisant MORACare Enterprise.

Exemples :

- Hôpital
- Clinique
- Cabinet médical
- Centre de santé
- Centre d'imagerie
- Laboratoire
- Polyclinique

Lors de sa création, chaque établissement bénéficie automatiquement d'un environnement sécurisé qui lui est propre.

---

# 5. Informations de l'établissement

Les informations enregistrées comprennent notamment :

- Référence établissement
- Nom officiel
- Type d'établissement
- Responsable principal
- Adresse
- Ville
- Pays
- Téléphone
- Email
- Site Internet
- Logo
- Fuseau horaire
- Devise
- Langue principale

Ces informations sont utilisées dans toute la plateforme.

---

# 6. Isolation des données

Chaque établissement dispose de son propre environnement de travail.

Toutes les données sont isolées.

Cela comprend notamment :

- utilisateurs ;
- patients ;
- rendez-vous ;
- consultations ;
- hospitalisations ;
- pharmacie ;
- laboratoire ;
- imagerie ;
- finances ;
- ressources humaines ;
- documents ;
- tableaux de bord.

Aucun établissement ne peut accéder aux données d'un autre établissement.

---

# 7. Plans d'abonnement

La plateforme propose différents plans d'abonnement.

Chaque plan définit notamment :

- modules disponibles ;
- nombre maximal d'utilisateurs ;
- capacité de stockage ;
- fonctionnalités incluses ;
- niveau d'assistance ;
- fréquence des sauvegardes.

Les plans peuvent évoluer selon la stratégie commerciale de MORA Shawiri.

---

# 8. Gestion des licences

Chaque établissement possède une licence comprenant notamment :

- numéro de licence ;
- plan souscrit ;
- date d'activation ;
- date d'expiration ;
- état ;
- historique des renouvellements.

Une licence peut être :

- active ;
- suspendue ;
- expirée ;
- résiliée.

---

# 9. Activation

Lorsqu'un nouvel établissement est créé :

- son environnement est initialisé ;
- le compte du responsable est créé ;
- la licence est activée ;
- les modules autorisés sont installés ;
- les paramètres par défaut sont appliqués.

L'établissement peut immédiatement utiliser MORACare Enterprise.

---

# 10. Renouvellement

Avant l'expiration d'une licence, le système peut envoyer des rappels automatiques.

Après validation du paiement :

- la licence est prolongée ;
- les droits sont mis à jour ;
- l'historique est conservé.

---

# 11. Suspension

En cas de non-renouvellement ou de décision administrative :

- la licence peut être suspendue.

Pendant la suspension :

- les données sont conservées ;
- aucun document n'est supprimé ;
- l'accès peut être limité selon la politique définie.

---

# 12. Réactivation

Après régularisation :

- la licence est réactivée ;
- les utilisateurs retrouvent leurs accès ;
- toutes les données sont restaurées sans perte.

---

# 13. Facturation SaaS

La plateforme gère :

- devis ;
- abonnements ;
- factures ;
- paiements ;
- renouvellements.

Cette facturation concerne exclusivement la relation entre MORA Shawiri et les établissements clients.

Elle est totalement indépendante de la facturation médicale réalisée par les établissements.

---

# 14. Paiements

Les moyens de paiement disponibles dépendent des intégrations mises en place.

Exemples :

- Mobile Money ;
- Carte bancaire ;
- Virement bancaire.

Chaque paiement est historisé.

---

# 15. Tableau de bord SaaS

Le tableau de bord présente notamment :

- nombre d'établissements ;
- abonnements actifs ;
- abonnements expirés ;
- licences suspendues ;
- nouveaux clients ;
- revenus récurrents ;
- stockage consommé ;
- statistiques générales.

---

# 16. Support client

Le module permet de gérer :

- demandes d'assistance ;
- tickets ;
- incidents ;
- interventions ;
- historique des échanges ;
- suivi des résolutions.

Chaque demande est associée à un établissement.

---

# 17. Notifications

Le système peut notifier les responsables d'établissement concernant :

- activation de la licence ;
- renouvellement à venir ;
- expiration prochaine ;
- suspension ;
- réactivation ;
- nouvelles fonctionnalités ;
- opérations de maintenance planifiées.

Les notifications sont envoyées selon les coordonnées enregistrées par l'établissement.

---

# 18. Sécurité

Le module garantit :

- isolation complète des établissements ;
- contrôle des accès ;
- chiffrement des données ;
- journalisation des opérations ;
- protection des licences.

---

# 19. Audit Trail

Chaque opération conserve notamment :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- établissement concerné ;
- opération réalisée ;
- ancienne valeur ;
- nouvelle valeur.

---

# 20. Workflow

Création d'un établissement

↓

Configuration automatique

↓

Création du responsable

↓

Activation de la licence

↓

Configuration initiale

↓

Utilisation de MORACare

↓

Renouvellement ou suspension

↓

Réactivation si nécessaire

---

# 21. Règles métier

BR-285 : Chaque établissement constitue un environnement indépendant au sein de MORACare Enterprise.

BR-286 : Les données d'un établissement sont totalement isolées de celles des autres établissements.

BR-287 : La création d'un établissement initialise automatiquement son environnement de travail.

BR-288 : Chaque établissement dispose d'une licence propre.

BR-289 : Les fonctionnalités accessibles dépendent du plan d'abonnement souscrit.

BR-290 : La suspension d'une licence n'entraîne jamais la suppression des données de l'établissement.

BR-291 : La réactivation d'une licence restaure immédiatement les accès autorisés.

BR-292 : La facturation SaaS est indépendante de la facturation médicale des établissements.

BR-293 : Toutes les opérations relatives aux abonnements et aux licences sont historisées.

BR-294 : Les notifications relatives aux abonnements sont adressées aux responsables de l'établissement.

BR-295 : Seuls les administrateurs autorisés de MORA Shawiri peuvent administrer les établissements clients et leurs licences.

---

# 22. Dépendances

Ce module interagit avec :

- BP-022A – Finance & Facturation
- BP-026A – Utilisateurs, Rôles & Contrôle d'Accès
- BP-026B – Sécurité, Audit, Conformité & Cybersécurité
- BP-027A – Notifications, Communications & Messagerie
- BP-028A – Administration Générale & Gouvernance du Système
- BP-029 – Portail d'Accès, Espaces Utilisateurs & Expérience Digitale

---

# Conclusion

Le BP-030 définit la gestion de MORACare Enterprise en tant que plateforme SaaS. Il encadre l'administration des établissements clients, des abonnements, des licences et du support tout en garantissant une isolation stricte des données entre les organisations. Ce module permet à MORA Shawiri de superviser efficacement la plateforme, d'assurer la continuité de service et de gérer la relation avec ses clients dans un environnement sécurisé, évolutif et conforme aux exigences d'une solution Enterprise.