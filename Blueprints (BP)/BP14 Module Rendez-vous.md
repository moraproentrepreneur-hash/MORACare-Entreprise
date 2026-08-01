# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Rendez-vous

**Référence :** BP-014

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Rendez-vous permet de gérer l'ensemble des rendez-vous médicaux de l'établissement.

Il assure la planification, la réservation, la confirmation, le suivi et l'historisation des rendez-vous tout en optimisant l'utilisation des ressources (médecins, salles, équipements).

Il constitue le point de départ du parcours de soins du patient.

---

# 2. Objectifs

Le module permet de :

- planifier des rendez-vous ;
- gérer les agendas des praticiens ;
- éviter les conflits de planning ;
- notifier les patients ;
- suivre la présence des patients ;
- préparer les consultations ;
- produire des statistiques d'activité.

---

# 3. Sous-modules

Le module comprend :

- Agenda
- Planification
- Réservation
- Confirmation
- File d'attente
- Gestion des absences
- Gestion des reports
- Gestion des annulations
- Historique
- Notifications

---

# 4. Données manipulées

Chaque rendez-vous comprend notamment :

- UUID
- Référence métier (MORA-RDV-XXXX)
- Patient
- Établissement
- Service
- Médecin ou praticien
- Date
- Heure de début
- Heure de fin
- Motif de consultation
- Priorité
- Statut
- Canal de réservation
- Observations

---

# 5. Modes de prise de rendez-vous

Le système permet de créer un rendez-vous :

- à l'accueil ;
- par téléphone ;
- via le Portail Patient ;
- via une application mobile (future évolution) ;
- par un professionnel de santé ;
- à la suite d'une consultation.

---

# 6. Gestion des agendas

Chaque praticien possède un agenda.

L'agenda prend en compte :

- horaires de travail ;
- jours de repos ;
- congés ;
- indisponibilités ;
- réunions ;
- capacité maximale quotidienne.

Le système interdit les doubles réservations.

---

# 7. Priorités

Un rendez-vous peut être :

- Normal
- Prioritaire
- Urgent
- Très urgent

Les rendez-vous urgents peuvent être insérés entre deux créneaux selon les règles de l'établissement.

---

# 8. États du rendez-vous

Le cycle de vie comprend les états suivants :

- Brouillon
- Planifié
- Confirmé
- Patient arrivé
- En attente
- En consultation
- Terminé
- Reporté
- Annulé
- Absent
- Archivé

Chaque changement est historisé.

---

# 9. Workflow

Création :

1. Sélection du patient.
2. Vérification de l'existence du dossier.
3. Choix du praticien.
4. Vérification des disponibilités.
5. Attribution du créneau.
6. Génération de la référence métier.
7. Journalisation.
8. Envoi des notifications.

Arrivée du patient :

- Enregistrement à l'accueil.
- Passage en salle d'attente.
- Appel par le praticien.
- Consultation.

Fin :

- Consultation terminée.
- Historisation automatique.

---

# 10. Gestion des conflits

Le système vérifie automatiquement :

- les chevauchements ;
- les indisponibilités ;
- les congés ;
- les salles occupées ;
- les ressources indisponibles.

En cas de conflit, la réservation est refusée.

---

# 11. Gestion des absences

Le système distingue :

- absence du patient ;
- absence du praticien ;
- absence justifiée ;
- absence non justifiée.

Les absences sont historisées.

---

# 12. Reports et annulations

Un rendez-vous peut être :

- reporté ;
- annulé.

Le motif est enregistré.

Le nouvel horaire conserve un lien avec le rendez-vous d'origine.

---

# 13. File d'attente

Le module gère :

- les patients présents ;
- leur ordre de passage ;
- les retards ;
- les appels.

Le personnel d'accueil peut modifier l'ordre selon les règles de priorité.

---

# 14. Notifications

Le système peut envoyer :

- confirmation de rendez-vous ;
- rappel automatique ;
- changement d'horaire ;
- annulation ;
- report ;
- arrivée du médecin (option) ;
- informations administratives.

Canaux :

- SMS
- E-mail
- WhatsApp
- Notifications internes

---

# 15. Rapports

Le module produit notamment :

- nombre de rendez-vous ;
- rendez-vous par médecin ;
- rendez-vous par service ;
- taux de présence ;
- taux d'absence ;
- taux d'annulation ;
- délais moyens ;
- occupation des agendas ;
- activité quotidienne, hebdomadaire et mensuelle.

---

# 16. Permissions

Les permissions permettent notamment :

- créer ;
- consulter ;
- modifier ;
- annuler ;
- reporter ;
- confirmer ;
- enregistrer l'arrivée ;
- exporter ;
- imprimer.

Toutes les opérations sont journalisées.

---

# 17. Intégration

Le module communique avec :

- Patients
- Consultations
- Hospitalisation
- Imagerie
- Laboratoire
- Finance
- Tableau de bord
- Notifications
- Portail Patient

Lorsqu'un patient se présente, le dossier médical est immédiatement disponible pour le praticien.

---

# 18. Sécurité

Le système garantit :

- l'isolation des établissements ;
- le contrôle des permissions ;
- la traçabilité des actions ;
- l'authentification obligatoire ;
- la confidentialité des données.

---

# 19. Règles métier

BR-038 : Chaque rendez-vous possède un UUID.

BR-039 : Chaque rendez-vous possède une référence métier conforme au BP-008.

BR-040 : Un rendez-vous ne peut être créé que pour un patient existant.

BR-041 : Les doubles réservations sont interdites.

BR-042 : Tous les changements d'état sont historisés.

BR-043 : Les notifications sont envoyées selon la configuration de l'établissement.

BR-044 : Les rendez-vous annulés et reportés restent conservés dans l'historique.

---

# 20. Dépendances

Ce document dépend de :

- BP-005 – Utilisateurs
- BP-006 – Rôles et permissions
- BP-008 – Nomenclature
- BP-010 – Authentification
- BP-011 – Modèle de données métier
- BP-012 – Architecture modulaire
- BP-013 – Module Patients

Ce module est utilisé par :

- BP-015 – Module Consultations
- BP-016 – Module Hospitalisation
- BP-020 – Module Laboratoire
- BP-021 – Module Imagerie
- BP-022 – Module Finance
- BP-024 – Module Rapports
- BP-025 – Portail Patient

---

# Conclusion

Le module Rendez-vous constitue le point d'entrée opérationnel du parcours de soins dans MORACare Enterprise.

Il garantit une planification fiable, une gestion optimisée des ressources, une réduction des conflits d'agenda et une intégration transparente avec l'ensemble des modules de la plateforme, assurant ainsi une prise en charge efficace et une meilleure expérience pour les patients comme pour le personnel médical.