# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Ressources Humaines & Dossiers du Personnel

**Référence :** BP-023A

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Ressources Humaines (RH) constitue le référentiel officiel de l'ensemble du personnel de l'établissement.

Il centralise toutes les informations administratives, professionnelles, contractuelles et réglementaires des employés, afin d'assurer une gestion cohérente du capital humain et d'alimenter les autres modules de MORACare Enterprise.

Chaque membre du personnel possède un dossier unique, sécurisé et historisé tout au long de son parcours dans l'établissement.

---

# 2. Objectifs

Le module permet de :

- gérer les dossiers du personnel ;
- suivre les recrutements ;
- gérer les contrats ;
- organiser les affectations ;
- suivre les qualifications et certifications ;
- conserver les documents administratifs ;
- assurer la conformité réglementaire ;
- préparer les modules Planning, Paie et Évaluation.

---

# 3. Périmètre

Le module couvre notamment :

- Recrutement
- Employés
- Dossiers RH
- Fonctions
- Départements
- Services
- Contrats
- Qualifications
- Diplômes
- Certifications
- Documents administratifs
- Affectations
- Historique professionnel
- Évaluations administratives
- Discipline
- Récompenses
- Organigramme

---

# 4. Catégories de personnel

Le système permet de gérer différents profils.

Exemples :

- Médecins
- Chirurgiens
- Anesthésistes
- Infirmiers
- Sages-femmes
- Pharmaciens
- Biologistes
- Techniciens de laboratoire
- Manipulateurs en imagerie
- Kinésithérapeutes
- Psychologues
- Dentistes
- Ambulanciers
- Agents d'accueil
- Agents administratifs
- Comptables
- Informaticiens
- Agents de maintenance
- Agents d'entretien
- Agents de sécurité
- Direction

Ces catégories sont entièrement configurables.

---

# 5. Dossier du personnel

Chaque employé possède un dossier unique contenant notamment :

- UUID
- Référence métier
- Photo
- Nom
- Prénoms
- Sexe
- Date de naissance
- Lieu de naissance
- Nationalité
- Situation matrimoniale
- Adresse
- Téléphone
- Email
- Personne à contacter en cas d'urgence
- Coordonnées bancaires (option)
- Statut

---

# 6. Références métier

Chaque employé reçoit une référence unique.

Exemple :

MORA-EMP-A000001

Cette référence reste inchangée durant toute sa carrière.

---

# 7. Informations professionnelles

Chaque dossier contient :

- profession
- spécialité
- fonction
- grade
- matricule interne
- numéro d'ordre professionnel
- département
- service
- unité
- supérieur hiérarchique

---

# 8. Recrutement

Le système permet de gérer :

- candidature
- entretien
- sélection
- validation
- intégration

Chaque recrutement conserve son historique.

---

# 9. Contrats

Le système gère plusieurs types de contrats.

Exemples :

- CDI
- CDD
- Stage
- Vacation
- Consultant
- Prestataire
- Bénévole
- Temps partiel
- Temps plein

Chaque contrat comprend :

- numéro
- date de début
- date de fin
- période d'essai
- salaire de base (référence)
- statut
- observations

---

# 10. Affectations

Un employé peut être affecté à :

- un établissement
- un département
- un service
- une unité

Les changements d'affectation sont historisés.

---

# 11. Qualifications

Le système enregistre :

- diplômes
- certificats
- spécialisations
- formations universitaires
- compétences

Chaque qualification comprend :

- établissement
- année
- document justificatif

---

# 12. Certifications

Le système suit les certifications professionnelles.

Exemples :

- ACLS
- BLS
- ATLS
- Hygiène hospitalière
- Radioprotection
- Réanimation

Chaque certification possède :

- date d'obtention
- date d'expiration
- organisme certificateur

Le système peut notifier les expirations.

---

# 13. Documents administratifs

Le dossier RH peut contenir :

- Carte nationale
- Passeport
- Permis de conduire
- Diplômes
- Contrats
- Curriculum Vitae
- Casier judiciaire
- Certificat médical
- Attestation d'assurance
- Autorisations professionnelles
- Autres pièces

Les documents sont archivés électroniquement.

---

# 14. Historique professionnel

Toutes les évolutions sont conservées.

Exemples :

- promotion
- mutation
- changement de fonction
- changement de service
- renouvellement de contrat
- suspension
- reprise d'activité

Aucune donnée historique n'est supprimée.

---

# 15. Discipline

Le système permet de suivre :

- avertissements
- blâmes
- suspensions
- sanctions disciplinaires

Chaque sanction est documentée.

---

# 16. Récompenses

Le système conserve :

- distinctions
- primes exceptionnelles
- promotions
- félicitations
- médailles

---

# 17. Évaluations administratives

Le module permet d'enregistrer :

- évaluations annuelles
- appréciations
- objectifs administratifs
- recommandations

Les évaluations détaillées des performances sont gérées dans le BP-023C.

---

# 18. Organigramme

Le système génère automatiquement l'organigramme de l'établissement.

Relations possibles :

Direction

↓

Départements

↓

Services

↓

Unités

↓

Employés

---

# 19. Statuts du personnel

Exemples :

- Candidat
- Actif
- En période d'essai
- En formation
- Suspendu
- En disponibilité
- En congé
- Retraité
- Démissionnaire
- Fin de contrat
- Archivé

---

# 20. Notifications

Le système peut notifier :

- contrat arrivant à expiration ;
- certification expirée ;
- document manquant ;
- période d'essai terminée ;
- renouvellement de contrat ;
- anniversaire d'ancienneté.

---

# 21. Permissions

Les principales permissions comprennent :

- créer un employé ;
- modifier un dossier RH ;
- consulter un dossier ;
- gérer les contrats ;
- gérer les affectations ;
- ajouter des documents ;
- consulter les documents ;
- archiver un employé ;
- exporter les données.

Toutes les actions sont soumises à des rôles et journalisées.

---

# 22. Sécurité

Le système garantit :

- confidentialité des données RH ;
- contrôle d'accès par rôle ;
- chiffrement des documents sensibles ;
- traçabilité complète des consultations ;
- sauvegarde automatique.

Les informations personnelles ne sont accessibles qu'aux utilisateurs autorisés.

---

# 23. Audit Trail

Chaque modification enregistre :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- ancienne valeur ;
- nouvelle valeur ;
- justification.

Aucune suppression physique n'est autorisée.

---

# 24. Workflow

Publication du poste

↓

Réception des candidatures

↓

Sélection

↓

Entretien

↓

Validation

↓

Création du dossier RH

↓

Signature du contrat

↓

Affectation

↓

Suivi de carrière

↓

Archivage en fin de parcours

---

# 25. Règles métier

BR-144 : Chaque employé possède un UUID et une référence métier unique.

BR-145 : Un employé ne peut avoir qu'un seul dossier RH actif.

BR-146 : Les changements de fonction sont historisés.

BR-147 : Les changements de service sont historisés.

BR-148 : Chaque contrat possède une période de validité.

BR-149 : Les certifications peuvent comporter une date d'expiration.

BR-150 : Les documents administratifs sont archivés électroniquement.

BR-151 : Les sanctions disciplinaires sont historisées.

BR-152 : Les récompenses sont historisées.

BR-153 : Les suppressions physiques sont interdites.

BR-154 : Les anciens employés restent archivés pour préserver la traçabilité.

---

# 26. Dépendances

Ce module alimente :

- BP-023B – Temps de Travail, Plannings & Présences
- BP-023C – Paie, Performance & Développement
- Consultations
- Hospitalisation
- Bloc opératoire
- Pharmacie
- Laboratoire
- Imagerie
- Gestion des utilisateurs
- Authentification
- Rapports
- Audit

---

# Conclusion

Le BP-023A constitue le référentiel officiel des ressources humaines de MORACare Enterprise. Il centralise l'ensemble des informations administratives, professionnelles et réglementaires des employés, garantit une traçabilité complète de leur parcours et prépare les modules de planification, de paie, d'évaluation et de gestion des accès. Grâce à son architecture évolutive, il répond aux besoins des cabinets médicaux, des cliniques et des établissements hospitaliers multisites tout en assurant la sécurité et la conformité des données du personnel.