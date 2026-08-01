# MORACare Enterprise
## Documentation Technique

---

# Document

**Nom :** Sécurité Technique, Cybersécurité & Protection des Données

**Référence :** TD-006

**Version :** 1.0

**Statut :** VALIDÉ

**Projet :** MORACare Enterprise

**Éditeur :** MORA Shawiri

---

# 1. Objet du document

Le présent document définit la politique de sécurité technique de MORACare Enterprise.

Il décrit :

- les principes de cybersécurité ;
- la protection des données ;
- l'authentification ;
- la gestion des accès ;
- le chiffrement ;
- les sauvegardes ;
- la reprise après incident ;
- la supervision ;
- les bonnes pratiques de développement sécurisé.

Toutes les équipes techniques devront respecter les exigences définies dans ce document.

---

# 2. Objectifs

Les objectifs principaux sont :

- garantir la confidentialité ;
- garantir l'intégrité ;
- garantir la disponibilité ;
- assurer la traçabilité ;
- limiter les risques d'intrusion ;
- protéger les données médicales ;
- assurer la continuité d'activité.

---

# 3. Principes fondamentaux

Toute l'architecture repose sur les principes suivants :

- Security by Design ;
- Privacy by Design ;
- Least Privilege ;
- Zero Trust ;
- Defense in Depth ;
- Secure by Default.

---

# 4. Authentification

L'authentification est assurée par Supabase Auth.

Fonctionnalités :

- connexion sécurisée ;
- gestion des sessions ;
- réinitialisation du mot de passe ;
- expiration automatique ;
- renouvellement sécurisé des jetons.

---

# 5. Gestion des mots de passe

Les mots de passe :

- ne sont jamais stockés en clair ;
- sont hachés par le fournisseur d'authentification ;
- respectent une politique de complexité configurable.

Le Backend n'accède jamais au mot de passe d'un utilisateur.

---

# 6. Authentification multifacteur (MFA)

L'architecture prévoit la prise en charge de la MFA.

Elle pourra être activée pour :

- les administrateurs ;
- les responsables d'établissement ;
- les utilisateurs sensibles.

---

# 7. Contrôle des accès

Les accès sont contrôlés selon :

- le rôle ;
- les permissions ;
- l'établissement ;
- les politiques RLS.

Le Frontend ne décide jamais des autorisations.

---

# 8. Isolation des établissements

Chaque établissement est totalement isolé.

Les utilisateurs d'un établissement ne peuvent jamais accéder aux données d'un autre établissement.

Cette isolation est assurée au niveau de la base PostgreSQL via les politiques RLS.

---

# 9. Chiffrement

Toutes les communications utilisent TLS.

Les données sensibles sont protégées conformément aux capacités offertes par Supabase et PostgreSQL.

Les secrets applicatifs ne transitent jamais dans le Frontend.

---

# 10. Variables d'environnement

Toutes les informations sensibles sont stockées dans des variables d'environnement.

Exemples :

- clés API ;
- identifiants SMTP ;
- secrets JWT ;
- paramètres des services externes.

Aucun secret ne doit être inscrit dans le dépôt Git.

---

# 11. Validation des entrées

Toutes les données reçues sont validées.

Les validations portent notamment sur :

- le type ;
- le format ;
- la longueur ;
- les contraintes métier ;
- les permissions.

---

# 12. Protection contre les attaques

Le système doit être protégé contre :

- SQL Injection ;
- Cross Site Scripting (XSS) ;
- Cross Site Request Forgery (CSRF) ;
- attaques par force brute ;
- élévation de privilèges ;
- accès non autorisés.

---

# 13. Journalisation

Toutes les opérations critiques sont historisées.

Exemples :

- connexions ;
- modifications ;
- suppressions logiques ;
- changements de rôles ;
- téléchargements de documents.

Les journaux sont horodatés et conservés selon la politique de rétention.

---

# 14. Audit Trail

L'Audit Trail permet de retrouver :

- l'utilisateur ;
- la date ;
- l'heure ;
- l'action ;
- l'ancienne valeur ;
- la nouvelle valeur ;
- l'adresse IP.

Les journaux d'audit sont immuables.

---

# 15. Sauvegardes

Les sauvegardes comprennent :

- base PostgreSQL ;
- fichiers stockés ;
- paramètres essentiels.

Les sauvegardes sont automatisées et testées régulièrement.

---

# 16. Plan de Continuité d'Activité (PCA)

Le PCA prévoit :

- la poursuite des services essentiels ;
- la surveillance des composants critiques ;
- les procédures d'escalade ;
- les responsabilités des intervenants.

---

# 17. Plan de Reprise d'Activité (PRA)

Le PRA définit :

- les procédures de restauration ;
- les priorités de reprise ;
- les contrôles après restauration ;
- les tests périodiques de reprise.

---

# 18. Supervision

Le système doit surveiller :

- disponibilité ;
- performances ;
- erreurs ;
- stockage ;
- charge ;
- temps de réponse.

Les anomalies critiques déclenchent des alertes.

---

# 19. Gestion des incidents

Chaque incident de sécurité doit être :

- détecté ;
- enregistré ;
- analysé ;
- corrigé ;
- documenté.

Un historique des incidents est conservé.

---

# 20. Sécurité du développement

Les développeurs doivent :

- utiliser TypeScript strict ;
- éviter le code dupliqué ;
- documenter les fonctions critiques ;
- effectuer des revues de code ;
- appliquer les principes du développement sécurisé.

---

# 21. Dépendances

Les dépendances logicielles doivent :

- être maintenues à jour ;
- provenir de sources fiables ;
- être régulièrement vérifiées.

Les bibliothèques obsolètes doivent être remplacées.

---

# 22. Sécurité des API

Toutes les API utilisent :

- HTTPS ;
- JWT ;
- contrôle des permissions ;
- validation stricte des données ;
- limitation des accès.

---

# 23. Sécurité du stockage

Les fichiers stockés dans Supabase Storage sont protégés par :

- des politiques d'accès ;
- des permissions ;
- une journalisation des téléchargements.

---

# 24. Gestion des sessions

Les sessions utilisateur :

- expirent automatiquement après une période d'inactivité configurable ;
- sont invalidées lors d'une déconnexion ;
- peuvent être révoquées par un administrateur.

---

# 25. Politique de mises à jour

Les mises à jour de sécurité doivent être appliquées dès qu'elles sont validées.

Les composants critiques font l'objet d'une veille régulière.

---

# 26. Tests de sécurité

Avant chaque mise en production, les contrôles suivants sont recommandés :

- analyse statique du code ;
- tests de vulnérabilité ;
- revue des permissions ;
- vérification des politiques RLS ;
- contrôle des journaux.

---

# 27. Documentation

Toutes les procédures de sécurité doivent être documentées.

Les changements importants sont tracés afin de faciliter les audits futurs.

---

# 28. Dépendances

Le présent document complète :

- TD-001 — Architecture Technique Générale
- TD-002 — Architecture de la Base de Données
- TD-003 — API REST, Intégrations & Interopérabilité
- TD-004 — Architecture Frontend React
- TD-005 — Architecture Backend & Supabase

Il prépare :

- TD-007 — Déploiement & Exploitation
- TD-008 — Tests, Qualité & Validation

---

# 29. Conclusion

Le TD-006 définit les exigences de sécurité technique de MORACare Enterprise. Il constitue le référentiel de cybersécurité du projet et garantit que chaque composant de la plateforme est conçu, développé, déployé et exploité selon des principes de sécurité robustes. Le respect de ces exigences est indispensable pour protéger les données médicales, assurer la continuité des services et maintenir la confiance des établissements utilisateurs.