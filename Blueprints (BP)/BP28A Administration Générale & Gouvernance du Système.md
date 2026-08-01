# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Administration Générale & Gouvernance du Système

**Référence :** BP-028A

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le module d'administration générale et de gouvernance de MORACare Enterprise.

Ce module constitue le centre de pilotage de la plateforme. Il permet aux administrateurs de gérer les établissements, l'organisation interne, les paramètres institutionnels, les modules, les licences et les politiques générales sans modifier le code de l'application.

L'objectif est d'assurer une administration centralisée, sécurisée et évolutive de l'ensemble du système.

---

# 2. Objectifs

Le module permet de :

- administrer la plateforme ;
- gérer les établissements ;
- configurer les paramètres globaux ;
- définir l'organisation interne ;
- gérer les modules ;
- administrer les licences ;
- superviser la gouvernance du système ;
- garantir une configuration homogène.

---

# 3. Périmètre

Le module couvre :

- Administration générale
- Gouvernance
- Établissements
- Multi-sites
- Départements
- Services
- Organisation
- Paramètres institutionnels
- Langues
- Devise
- Calendrier
- Fuseau horaire
- Modules
- Licences
- Journaux d'administration
- Tableau de bord administratif

---

# 4. Gouvernance

Le module permet de définir la structure organisationnelle de l'établissement.

Exemples :

- Hôpital
- Clinique
- Centre médical
- Cabinet médical
- Centre d'imagerie
- Laboratoire
- Réseau hospitalier

Chaque établissement possède son propre environnement administratif.

---

# 5. Gestion des établissements

Chaque établissement comprend notamment :

- UUID
- Référence métier
- Nom officiel
- Nom commercial (option)
- Logo
- Adresse
- Ville
- Pays
- Téléphone
- Email
- Site web
- Numéro d'identification
- Statut

Les établissements peuvent être actifs, suspendus ou archivés.

---

# 6. Gestion Multi-sites

Le système permet de gérer plusieurs sites au sein d'une même organisation.

Exemples :

- Hôpital principal
- Annexe
- Centre de santé
- Cabinet satellite
- Centre spécialisé

Chaque site peut disposer :

- de ses utilisateurs ;
- de ses services ;
- de ses stocks ;
- de ses tableaux de bord ;
- de ses statistiques.

Les données restent gouvernées selon les règles d'accès définies dans le module IAM.

---

# 7. Organisation interne

Le système permet de configurer :

- Directions
- Départements
- Services
- Unités
- Pôles
- Centres de coûts
- Centres de profits

Cette organisation est utilisée automatiquement dans tous les modules.

---

# 8. Informations institutionnelles

Les paramètres institutionnels comprennent notamment :

- Nom officiel
- Logo
- Adresse
- Coordonnées
- Contacts d'urgence
- Site Internet
- Email principal
- Téléphone principal
- Informations légales

Ces informations sont automatiquement reprises dans les documents officiels.

---

# 9. Paramètres régionaux

Le système permet de définir :

- Pays
- Région
- Ville
- Devise principale
- Fuseau horaire
- Premier jour de la semaine
- Jours ouvrables
- Week-end
- Jours fériés

Ces paramètres sont utilisés automatiquement par tous les modules.

---

# 10. Langues

MORACare Enterprise prend officiellement en charge **deux langues uniquement** :

- Français
- Anglais

Le changement de langue peut être effectué par chaque utilisateur selon ses préférences ou imposé au niveau de l'établissement.

---

# 11. Gestion des traductions

Le moteur de traduction repose sur un catalogue centralisé de ressources.

Tous les éléments de l'application utilisent ce catalogue.

Cela comprend :

- menus ;
- boutons ;
- formulaires ;
- messages système ;
- messages d'erreur ;
- notifications ;
- emails ;
- tableaux de bord ;
- rapports ;
- documents PDF.

Le système garantit :

- traduction complète de l'interface ;
- aucune traduction partielle ;
- aucun mélange de français et d'anglais sur une même page ;
- cohérence terminologique sur l'ensemble de l'application.

Aucun texte fonctionnel ne doit être codé directement dans l'interface.

Toutes les traductions proviennent exclusivement du référentiel central.

---

# 12. Gestion des modules

Les administrateurs autorisés peuvent :

- activer un module ;
- désactiver un module ;
- consulter les dépendances ;
- vérifier l'état des modules.

Les modules critiques ne peuvent être désactivés sans validation renforcée.

---

# 13. Gestion des licences

Le système gère :

- licence active ;
- date d'activation ;
- date d'expiration ;
- nombre maximal d'utilisateurs ;
- modules autorisés ;
- historique des renouvellements.

Des alertes sont générées avant l'expiration des licences.

---

# 14. Tableau de bord administratif

Le tableau de bord présente notamment :

- établissements actifs ;
- utilisateurs actifs ;
- licences ;
- modules installés ;
- services configurés ;
- alertes administratives ;
- statistiques générales.

---

# 15. Notifications administratives

Le système peut notifier :

- expiration prochaine d'une licence ;
- nouveau module disponible ;
- erreur critique ;
- modification importante des paramètres ;
- problème de configuration ;
- indisponibilité d'un service.

---

# 16. Permissions

Les principales permissions comprennent :

- administrer le système ;
- créer un établissement ;
- modifier les paramètres généraux ;
- gérer les langues ;
- gérer les licences ;
- activer ou désactiver des modules ;
- consulter les journaux d'administration.

Toutes les opérations sont enregistrées.

---

# 17. Sécurité

Le système garantit :

- accès réservé aux administrateurs autorisés ;
- validation des paramètres critiques ;
- contrôle des modifications ;
- journalisation complète ;
- restauration de la configuration en cas d'erreur.

---

# 18. Audit Trail

Chaque modification enregistre :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- ancienne valeur ;
- nouvelle valeur ;
- justification.

Les journaux sont conservés conformément à la politique de sécurité.

---

# 19. Workflow

Connexion administrateur

↓

Contrôle des permissions

↓

Modification des paramètres

↓

Validation

↓

Application de la configuration

↓

Journalisation

↓

Notification (si nécessaire)

---

# 20. Règles métier

BR-241 : Seuls les administrateurs autorisés peuvent modifier les paramètres globaux.

BR-242 : Toute modification de configuration est historisée.

BR-243 : Chaque établissement possède sa propre configuration institutionnelle.

BR-244 : MORACare Enterprise prend officiellement en charge uniquement le Français et l'Anglais.

BR-245 : Aucun écran ne peut afficher un mélange de langues.

BR-246 : Tous les textes de l'application proviennent exclusivement du catalogue central de traduction.

BR-247 : Les notifications, emails et documents PDF sont générés dans la langue de l'utilisateur ou selon la langue définie pour l'établissement.

BR-248 : Les modules critiques ne peuvent être désactivés sans validation renforcée.

BR-249 : Toute modification de la gouvernance est immédiatement prise en compte par les modules concernés.

BR-250 : Les suppressions physiques des paramètres de gouvernance sont interdites.

---

# 21. Dépendances

Ce module interagit avec :

- BP-026A – Utilisateurs, Rôles & Contrôle d'Accès
- BP-026B – Sécurité, Audit, Conformité & Cybersécurité
- BP-027A – Notifications, Communications & Messagerie
- BP-027B – Interopérabilité, API & Intégrations
- Tous les modules fonctionnels de MORACare Enterprise

---

# Conclusion

Le BP-028A définit la gouvernance et l'administration générale de MORACare Enterprise. Il fournit un cadre centralisé pour administrer les établissements, les sites, les paramètres institutionnels, les modules et les licences, tout en garantissant une gestion bilingue fiable en Français et en Anglais. Grâce à son moteur de traduction centralisé, il assure une interface entièrement cohérente, sans traduction partielle ni mélange de langues, offrant une expérience utilisateur homogène et professionnelle à l'échelle de l'ensemble du système.