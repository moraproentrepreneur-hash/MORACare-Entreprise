# MORACare Enterprise
## Blueprint Officiel

---

# Document

**Nom :** Module Imagerie Médicale

**Référence :** BP-021

**Version :** 2.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le module Imagerie Médicale permet de gérer l'ensemble des activités du service d'imagerie.

Il couvre :

- les demandes d'examens ;
- la planification ;
- l'accueil du patient ;
- la réalisation des examens ;
- les comptes rendus ;
- la validation médicale ;
- la gestion des équipements ;
- les consommables ;
- la traçabilité complète des examens.

Le module est intégré au Dossier Médical Électronique, au module Stock & Inventaire et au module Agenda.

---

# 2. Objectifs

Le module permet de :

- gérer plusieurs services d'imagerie ;
- organiser les rendez-vous ;
- suivre les examens ;
- produire les comptes rendus ;
- assurer la traçabilité des actes ;
- gérer les équipements ;
- gérer les consommables ;
- améliorer le suivi des patients.

---

# 3. Sous-modules

Le module comprend :

- Services d'imagerie
- Catalogue des examens
- Demandes d'examens
- Planification
- Accueil patient
- Réalisation des examens
- Comptes rendus
- Validation médicale
- Équipements
- Consommables
- Historique

---

# 4. Services d'imagerie

Un établissement peut gérer plusieurs services.

Exemples :

- Radiologie conventionnelle
- Échographie
- Scanner
- IRM
- Mammographie
- Densitométrie osseuse
- Médecine nucléaire

Chaque service est associé à un magasin du module Stock lorsque des consommables sont utilisés.

---

# 5. Catalogue des examens

Chaque examen comprend :

- UUID
- Référence métier
- Nom
- Catégorie
- Description
- Durée moyenne
- Préparation du patient
- Compte rendu type
- Statut

Le catalogue est entièrement configurable.

---

# 6. Demandes d'examens

Une demande peut provenir :

- d'une consultation ;
- d'une hospitalisation ;
- des urgences ;
- d'un suivi médical.

Chaque demande comprend :

- patient ;
- médecin prescripteur ;
- examen demandé ;
- priorité ;
- motif clinique ;
- observations.

---

# 7. Planification

Le système permet :

- prise de rendez-vous ;
- gestion des urgences ;
- reprogrammation ;
- annulation ;
- liste d'attente.

La planification tient compte :

- des disponibilités ;
- des équipements ;
- des professionnels ;
- de la durée de l'examen.

---

# 8. Accueil du patient

Le système permet :

- confirmation de présence ;
- vérification de l'identité ;
- contrôle des documents ;
- vérification de la préparation ;
- enregistrement de l'arrivée.

---

# 9. Réalisation des examens

Chaque examen comprend notamment :

- manipulateur ;
- radiologue ;
- équipement utilisé ;
- heure de début ;
- heure de fin ;
- observations.

---

# 10. Comptes rendus

Après l'examen :

Le radiologue rédige un compte rendu comprenant :

- description ;
- conclusion ;
- recommandations.

Le compte rendu est intégré automatiquement au dossier médical.

---

# 11. Validation médicale

Le radiologue valide officiellement le compte rendu.

Chaque validation est historisée.

---

# 12. Équipements

Le module permet de gérer :

- appareils ;
- salles ;
- disponibilité ;
- maintenance ;
- indisponibilités.

Exemples :

- Scanner
- IRM
- Échographe
- Table de radiologie

---

# 13. Consommables

Le module utilise le BP-018 pour gérer :

- produits de contraste ;
- films (si utilisés) ;
- aiguilles ;
- cathéters ;
- accessoires.

Les consommations mettent automatiquement à jour le stock.

---

# 14. États

Le cycle de vie comprend :

- Prescrit
- Planifié
- Patient arrivé
- En cours
- Réalisé
- En rédaction
- Validé
- Diffusé
- Clôturé
- Archivé

---

# 15. Workflow

1. Prescription.
2. Planification.
3. Accueil.
4. Réalisation.
5. Rédaction du compte rendu.
6. Validation.
7. Diffusion.
8. Archivage.

---

# 16. Notifications

Le système peut notifier :

- nouveau rendez-vous ;
- modification de planning ;
- examen prêt ;
- validation requise ;
- résultat disponible ;
- panne d'équipement.

Canaux :

- Notifications internes
- Email
- SMS
- WhatsApp (option)

---

# 17. Rapports

Le module produit notamment :

- examens réalisés ;
- activité par appareil ;
- activité par radiologue ;
- délais d'attente ;
- statistiques par examen ;
- consommation des produits de contraste.

---

# 18. Permissions

Les permissions comprennent notamment :

- créer une demande ;
- planifier ;
- enregistrer un examen ;
- rédiger un compte rendu ;
- valider ;
- consulter ;
- exporter ;
- imprimer.

Toutes les opérations sont journalisées.

---

# 19. Intégration

Le module communique avec :

- Patients
- Consultations
- Hospitalisation
- Agenda & Rendez-vous
- Dossier Médical
- Stock & Inventaire
- Achats & Approvisionnements
- Finance
- Rapports
- Notifications

Les consommables sont gérés par le module Stock.

---

# 20. Sécurité

Le système garantit :

- isolation par établissement ;
- authentification obligatoire ;
- contrôle des permissions ;
- journalisation complète ;
- sauvegarde.

Aucune suppression physique n'est autorisée.

---

# 21. Règles métier

BR-102 : Chaque service d'imagerie est associé à un magasin lorsqu'il utilise des consommables.

BR-103 : Chaque demande d'examen est liée à un patient.

BR-104 : Chaque examen est lié à une demande.

BR-105 : Chaque compte rendu est validé par un professionnel autorisé.

BR-106 : Les consommables sont gérés par le module Stock.

BR-107 : Les rendez-vous tiennent compte des disponibilités des équipements et des professionnels.

BR-108 : Les suppressions physiques sont interdites.

---

# 22. Dépendances

Ce document dépend de :

- BP-013 – Module Patients
- BP-014 – Module Rendez-vous
- BP-015 – Module Consultations
- BP-016 – Module Hospitalisation
- BP-017 – Module Achats, Approvisionnements & Logistique Interne
- BP-018 – Module Stock & Inventaire

Ce module est utilisé par :

- BP-022 – Module Finance
- BP-024 – Module Rapports
- BP-025 – Portail Patient

---

# Conclusion

Le module Imagerie Médicale assure la gestion complète des examens d'imagerie, depuis la prescription jusqu'à la diffusion du compte rendu. Intégré aux modules Patients, Consultations, Hospitalisation, Agenda, Stock et Dossier Médical, il garantit une prise en charge fluide, une planification optimisée des équipements et des professionnels, ainsi qu'une traçabilité complète des actes réalisés.