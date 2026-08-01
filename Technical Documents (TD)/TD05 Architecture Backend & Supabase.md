# MORACare Enterprise
## Documentation Technique

---

# Document

**Nom :** Architecture Backend & Supabase

**Référence :** TD-005

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit l'architecture Backend officielle de MORACare Enterprise.

Il décrit :

- l'organisation des services Backend ;
- l'utilisation de Supabase ;
- l'authentification ;
- les politiques de sécurité ;
- les fonctions serveur ;
- le stockage ;
- les traitements automatiques ;
- les notifications ;
- les bonnes pratiques de développement.

Toutes les implémentations Backend devront respecter ce document.

---

# 2. Architecture Backend

Le Backend repose entièrement sur Supabase.

Les principaux composants sont :

- Supabase Auth
- PostgreSQL
- Row Level Security (RLS)
- Edge Functions
- Storage
- Realtime
- Cron Jobs
- SQL Functions
- Triggers

Le Backend constitue l'unique source de vérité (Single Source of Truth).

---

# 3. Authentification

L'authentification est assurée par Supabase Auth.

Fonctionnalités :

- connexion sécurisée ;
- réinitialisation du mot de passe ;
- gestion des sessions ;
- renouvellement automatique des jetons ;
- déconnexion sécurisée.

Le Frontend ne manipule jamais directement les informations sensibles d'authentification.

---

# 4. Gestion des utilisateurs

Chaque utilisateur est identifié par un UUID unique.

Les informations d'authentification sont séparées des données métier.

Chaque utilisateur est associé à :

- un établissement ;
- un ou plusieurs rôles ;
- des permissions spécifiques.

---

# 5. Gestion des rôles

Les rôles sont définis dans la base de données.

Exemples :

- Administrateur plateforme
- Responsable d'établissement
- Médecin
- Infirmier
- Réceptionniste
- Pharmacien
- Biologiste
- Comptable
- Patient

Les rôles peuvent être enrichis par des permissions fines.

---

# 6. Row Level Security (RLS)

Toutes les tables métier utilisent les politiques RLS.

Les politiques garantissent que :

- un utilisateur ne voit que les données autorisées ;
- un établissement ne peut accéder aux données d'un autre établissement ;
- les opérations sont filtrées directement dans PostgreSQL.

La sécurité est appliquée côté serveur et ne dépend jamais du Frontend.

---

# 7. Edge Functions

Les traitements complexes sont réalisés via des Edge Functions.

Exemples :

- génération de documents PDF ;
- calculs financiers ;
- envoi de notifications ;
- synchronisations externes ;
- traitements batch.

Les Edge Functions sont écrites en TypeScript.

---

# 8. SQL Functions

Les fonctions SQL sont utilisées pour :

- les calculs complexes ;
- les traitements de masse ;
- les statistiques ;
- les validations métier.

Elles doivent être versionnées et documentées.

---

# 9. Triggers

Les triggers automatisent certaines opérations.

Exemples :

- génération des références métier ;
- mise à jour automatique de `updated_at` ;
- création des journaux d'audit ;
- synchronisation des données.

Les triggers ne doivent jamais contenir de logique métier complexe.

---

# 10. Storage

Supabase Storage est utilisé pour les fichiers.

Catégories de stockage :

- documents PDF ;
- pièces jointes ;
- images médicales ;
- signatures ;
- logos ;
- avatars.

Les accès aux fichiers sont contrôlés par des politiques de sécurité.

---

# 11. Organisation des buckets

Les fichiers sont répartis dans des buckets dédiés.

Exemples :

```
documents/

patients/

laboratory/

imaging/

signatures/

avatars/

logos/
```

Chaque bucket possède des règles d'accès spécifiques.

---

# 12. Realtime

Supabase Realtime est utilisé pour :

- notifications en temps réel ;
- mise à jour des tableaux de bord ;
- disponibilité des chambres ;
- files d'attente ;
- statut des rendez-vous.

Les abonnements doivent être limités aux données réellement nécessaires.

---

# 13. Notifications

Les notifications sont générées par le Backend.

Canaux supportés :

- interface utilisateur ;
- e-mail ;
- WhatsApp.

Chaque notification est journalisée.

---

# 14. Tâches planifiées

Les traitements automatiques utilisent des Cron Jobs.

Exemples :

- sauvegardes ;
- rappels de rendez-vous ;
- renouvellement des licences ;
- nettoyage des données temporaires ;
- génération de rapports périodiques.

---

# 15. Journalisation

Toutes les opérations importantes sont enregistrées.

Éléments conservés :

- utilisateur ;
- date ;
- heure ;
- adresse IP ;
- action ;
- résultat.

Les journaux sont conservés conformément à la politique de rétention.

---

# 16. Transactions

Toutes les opérations critiques sont exécutées dans des transactions PostgreSQL.

Exemples :

- paiement ;
- hospitalisation ;
- mouvement de stock ;
- prescription ;
- création de facture.

Une transaction est entièrement validée ou entièrement annulée.

---

# 17. Validation métier

Les validations sont réalisées côté serveur.

Exemples :

- contrôle des permissions ;
- cohérence des données ;
- disponibilité des ressources ;
- règles métier.

Le Frontend ne constitue jamais une garantie de sécurité.

---

# 18. Gestion des erreurs

Toutes les erreurs sont :

- capturées ;
- journalisées ;
- classifiées ;
- renvoyées avec un code HTTP approprié.

Les messages techniques détaillés ne sont jamais exposés aux utilisateurs.

---

# 19. Gestion des secrets

Les informations sensibles sont stockées dans les variables d'environnement sécurisées.

Exemples :

- clés API ;
- identifiants SMTP ;
- jetons d'intégration ;
- paramètres de services externes.

Aucun secret ne doit être intégré au code source.

---

# 20. Performances

Le Backend applique les principes suivants :

- limitation des requêtes ;
- optimisation SQL ;
- indexation ;
- pagination ;
- cache lorsque pertinent.

Les traitements lourds sont exécutés de manière asynchrone lorsque cela est possible.

---

# 21. Sauvegardes

Les sauvegardes comprennent :

- base PostgreSQL ;
- Storage ;
- configurations.

Des procédures de restauration sont définies pour garantir la continuité d'activité.

---

# 22. Supervision

Le Backend fournit des indicateurs permettant de surveiller :

- disponibilité ;
- temps de réponse ;
- erreurs ;
- consommation des ressources ;
- traitements en attente.

---

# 23. Sécurité

Le Backend applique notamment :

- authentification sécurisée ;
- RLS ;
- validation des entrées ;
- contrôle des permissions ;
- chiffrement TLS ;
- limitation des tentatives de connexion ;
- protection contre les injections.

---

# 24. Intégrations externes

Le Backend communique avec :

- plateformes de paiement ;
- services de messagerie ;
- services e-mail ;
- systèmes hospitaliers ;
- laboratoires ;
- plateformes DICOM ;
- services HL7/FHIR.

Toutes les intégrations sont réalisées via des connecteurs indépendants.

---

# 25. Dépendances

Le présent document complète :

- TD-001 — Architecture Technique Générale
- TD-002 — Architecture de la Base de Données
- TD-003 — API REST, Intégrations & Interopérabilité
- TD-004 — Architecture Frontend React

Il prépare :

- TD-006 — Sécurité Technique
- TD-007 — Déploiement & Exploitation
- TD-008 — Tests, Qualité & Validation

---

# 26. Conclusion

Le TD-005 définit l'architecture Backend officielle de MORACare Enterprise. Il établit les règles de développement des services serveur, de la gestion des données, de l'authentification, des traitements automatisés et des intégrations. En s'appuyant sur Supabase et PostgreSQL, cette architecture garantit une plateforme sécurisée, performante, évolutive et adaptée aux exigences d'un système d'information hospitalier Enterprise.