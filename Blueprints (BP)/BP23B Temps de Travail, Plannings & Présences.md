# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Temps de Travail, Plannings & Présences

**Référence :** BP-023B

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit le module de gestion des temps de travail, des plannings, des gardes, des astreintes, des présences et des absences du personnel de MORACare Enterprise.

Ce module garantit une organisation optimale des ressources humaines tout en assurant la continuité des soins, la conformité avec la réglementation du travail et la disponibilité permanente des équipes médicales et administratives.

---

# 2. Objectifs

Le module permet de :

- planifier les horaires ;
- organiser les équipes ;
- gérer les gardes et astreintes ;
- suivre les présences ;
- gérer les congés ;
- gérer les absences ;
- suivre les heures supplémentaires ;
- assurer la continuité des services.

---

# 3. Périmètre

Le module couvre :

- Plannings
- Horaires
- Équipes
- Gardes
- Astreintes
- Pointage
- Présences
- Retards
- Absences
- Congés
- Heures supplémentaires
- Remplacements
- Disponibilités
- Validation hiérarchique
- Statistiques RH

---

# 4. Horaires de travail

Le système permet de créer plusieurs modèles d'horaires.

Exemples :

- Journée
- Demi-journée
- Nuit
- Rotation 12h
- Rotation 24h
- Temps partiel
- Horaires administratifs

Chaque modèle comprend :

- heure de début ;
- heure de fin ;
- pauses ;
- durée totale ;
- jours concernés.

---

# 5. Plannings

Les plannings peuvent être établis :

- quotidiennement ;
- hebdomadairement ;
- mensuellement ;
- annuellement.

Ils peuvent être générés :

- manuellement ;
- automatiquement ;
- à partir de modèles.

---

# 6. Affectation des équipes

Les équipes peuvent être organisées par :

- établissement ;
- département ;
- service ;
- unité ;
- spécialité.

Chaque planning indique :

- responsable ;
- personnel affecté ;
- horaires ;
- localisation.

---

# 7. Gardes

Le système gère :

- gardes de jour ;
- gardes de nuit ;
- gardes de week-end ;
- gardes de jours fériés.

Chaque garde précise :

- service ;
- responsable ;
- personnel concerné ;
- horaires ;
- observations.

---

# 8. Astreintes

Les astreintes permettent de désigner les professionnels disponibles en dehors des horaires habituels.

Le système gère :

- période d'astreinte ;
- spécialité ;
- délai d'intervention ;
- coordonnées.

---

# 9. Rotation des équipes

Le système prend en charge :

- rotations fixes ;
- rotations cycliques ;
- rotations automatiques ;
- alternance jour/nuit.

Les règles sont configurables.

---

# 10. Pointage

Le pointage peut être réalisé par :

- saisie manuelle ;
- badge RFID ;
- QR Code ;
- biométrie ;
- application mobile.

Chaque pointage enregistre :

- date ;
- heure ;
- utilisateur ;
- localisation (option).

---

# 11. Présences

Le système calcule automatiquement :

- présence ;
- absence ;
- retard ;
- départ anticipé ;
- heures travaillées.

---

# 12. Retards

Chaque retard est enregistré avec :

- durée ;
- motif ;
- justificatif (option).

Les statistiques sont historisées.

---

# 13. Absences

Le système gère notamment :

- absence justifiée ;
- absence injustifiée ;
- maladie ;
- accident ;
- maternité ;
- paternité ;
- formation ;
- mission ;
- suspension.

---

# 14. Congés

Le système gère :

- congés annuels ;
- congés maladie ;
- congés maternité ;
- congés paternité ;
- congés exceptionnels ;
- congés sans solde ;
- récupération.

Chaque demande suit un workflow de validation.

---

# 15. Heures supplémentaires

Le système calcule automatiquement :

- nombre d'heures ;
- majorations éventuelles ;
- récupération ;
- paiement (via BP-023C).

---

# 16. Remplacements

En cas d'absence, le système permet :

- de rechercher un remplaçant ;
- d'affecter automatiquement un personnel qualifié ;
- de notifier les responsables.

Toutes les modifications sont historisées.

---

# 17. Disponibilités

Chaque employé peut disposer d'un calendrier de disponibilité.

Le système prend en compte :

- jours travaillés ;
- indisponibilités ;
- congés validés ;
- formations ;
- missions.

---

# 18. Validation hiérarchique

Les validations peuvent concerner :

- congés ;
- absences ;
- heures supplémentaires ;
- changements de planning ;
- remplacements.

Chaque validation est tracée.

---

# 19. Calendrier RH

Le module propose un calendrier interactif affichant :

- plannings ;
- gardes ;
- astreintes ;
- congés ;
- absences ;
- jours fériés ;
- formations.

---

# 20. Notifications

Le système peut notifier :

- début de garde ;
- changement de planning ;
- demande de congé ;
- validation ;
- refus ;
- absence non justifiée ;
- retard important ;
- remplacement nécessaire.

Notifications possibles :

- internes ;
- email ;
- SMS ;
- WhatsApp (option).

---

# 21. Statistiques RH

Le système calcule notamment :

- taux de présence ;
- taux d'absentéisme ;
- heures travaillées ;
- heures supplémentaires ;
- nombre de gardes ;
- nombre d'astreintes ;
- congés consommés ;
- retards.

---

# 22. Permissions

Les principales permissions comprennent :

- créer un planning ;
- modifier un planning ;
- affecter un employé ;
- enregistrer une présence ;
- valider un congé ;
- approuver des heures supplémentaires ;
- gérer les gardes ;
- gérer les astreintes ;
- consulter les statistiques ;
- exporter les données.

Toutes les actions sont journalisées.

---

# 23. Sécurité

Le système garantit :

- contrôle d'accès par rôle ;
- protection des données RH ;
- verrouillage des plannings validés ;
- sauvegarde automatique ;
- traçabilité complète.

---

# 24. Audit Trail

Chaque action conserve :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- ancienne valeur ;
- nouvelle valeur ;
- justification.

Les suppressions physiques sont interdites.

---

# 25. Workflow

Création du planning

↓

Affectation du personnel

↓

Validation hiérarchique

↓

Publication

↓

Pointage

↓

Suivi des présences

↓

Gestion des absences

↓

Remplacements

↓

Calcul des heures

↓

Transmission au module BP-023C

---

# 26. Règles métier

BR-155 : Chaque employé possède un planning actif.

BR-156 : Un employé ne peut être affecté simultanément à deux services sur le même créneau horaire.

BR-157 : Toute garde est affectée à un service.

BR-158 : Toute astreinte possède une période de validité.

BR-159 : Les heures supplémentaires sont calculées automatiquement.

BR-160 : Les absences sont historisées.

BR-161 : Les congés nécessitent une validation selon le workflow défini.

BR-162 : Les remplacements sont historisés.

BR-163 : Les plannings validés ne peuvent être modifiés sans autorisation.

BR-164 : Les données de présence alimentent automatiquement le module de paie.

BR-165 : Les suppressions physiques sont interdites.

---

# 27. Dépendances

Ce module dépend de :

- BP-023A – Ressources Humaines & Dossiers du Personnel

Il alimente :

- BP-023C – Paie, Performance & Développement
- Consultations
- Hospitalisation
- Bloc opératoire
- Pharmacie
- Laboratoire
- Imagerie
- Rapports
- Business Intelligence
- Audit

---

# Conclusion

Le BP-023B assure la gestion complète du temps de travail du personnel de MORACare Enterprise. Il couvre la planification des équipes, les gardes, les astreintes, les présences, les absences, les congés, les remplacements et les heures supplémentaires. Grâce à son intégration avec les autres modules, il garantit une organisation optimale des ressources humaines, la continuité des soins et une préparation fiable des données destinées à la paie, aux statistiques et au pilotage des performances.