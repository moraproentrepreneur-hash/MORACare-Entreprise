import {
  Users,
  Stethoscope,
  BedDouble,
  Siren,
  Scissors,
  Pill,
  FlaskConical,
  Binary,
  Receipt,
  Calculator,
  BarChart3,
  UserCheck,
  HeartPulse,
  Calendar,
  Bell,
  MessagesSquare,
  type LucideIcon,
} from 'lucide-react';

/**
 * Contenu textuel de la Landing Page, transcrit de LP-001.
 *
 * Isolé du composant pour que la conformité au document soit vérifiable d'un
 * coup d'œil, sans lire de JSX. Aucun texte n'est inventé : chaque bloc porte
 * la référence de la section de LP-001 dont il provient.
 */

/** LP-001 §6 — Section 2 : Les chiffres clés (6 items) */
export const KEY_FIGURES: readonly string[] = [
  'Gestion centralisée',
  'Modules intégrés',
  'Multi-utilisateurs',
  'Multi-établissements',
  'Sauvegardes automatiques',
  'Sécurité avancée',
];

/** LP-001 §6 — Section 3 : Le problème */
export const PROBLEM_TOOLS: readonly string[] = [
  'Papier',
  'Excel',
  'WhatsApp',
  'Logiciels séparés',
  'Dossiers physiques',
];

export const PROBLEM_CONSEQUENCES: readonly string[] = [
  'Temps perdu',
  'Informations incomplètes',
  'Erreurs',
  'Double saisie',
  'Retards',
  'Manque de visibilité',
];

/** LP-001 §6 — Section 4 : La solution (14 satellites, dans l'ordre) */
export const SOLUTION_SATELLITES: readonly string[] = [
  'Patients',
  'Consultations',
  'Hospitalisation',
  'Urgences',
  'Pharmacie',
  'Laboratoire',
  'Imagerie',
  'Facturation',
  'Comptabilité',
  'Rapports',
  'Portail Patient',
  'Utilisateurs',
  'Agenda',
  'Notifications',
];

/** LP-001 §6 — Section 5 : Les modules (16 cartes, dans l'ordre) */
export interface ModuleCard {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const MODULE_CARDS: readonly ModuleCard[] = [
  { icon: Users, title: 'Gestion Patients', description: 'Dossier médical partagé et historique clinique complet.' },
  { icon: Stethoscope, title: 'Consultations', description: 'Motifs, constantes, diagnostics et prescriptions.' },
  { icon: BedDouble, title: 'Hospitalisation', description: 'Admissions, chambres, lits et préparation des sorties.' },
  { icon: Siren, title: 'Urgences', description: 'Prise en charge rapide et orientation des patients.' },
  { icon: Scissors, title: 'Bloc opératoire', description: 'Programmation et suivi des interventions.' },
  { icon: Pill, title: 'Pharmacie', description: 'Médicaments, stock, dispensation et inventaire.' },
  { icon: FlaskConical, title: 'Laboratoire', description: 'Demandes, analyses et résultats biologiques.' },
  { icon: Binary, title: 'Imagerie', description: 'Examens, comptes rendus et archivage.' },
  { icon: Receipt, title: 'Facturation', description: 'Devis, factures, paiements et encaissements.' },
  { icon: Calculator, title: 'Comptabilité', description: 'Trésorerie, caisses et pilotage financier.' },
  { icon: BarChart3, title: 'Statistiques', description: 'Indicateurs d’activité et tableaux de bord.' },
  { icon: UserCheck, title: 'RH', description: 'Personnel, plannings, présences et paie.' },
  { icon: HeartPulse, title: 'Portail Patient', description: 'Espace personnel sécurisé pour vos patients.' },
  { icon: Calendar, title: 'Agenda', description: 'Planification et confirmation des rendez-vous.' },
  { icon: Bell, title: 'Notifications', description: 'Rappels et alertes automatiques.' },
  { icon: MessagesSquare, title: 'Messagerie', description: 'Communication interne entre les équipes.' },
];

/** LP-001 §6 — Section 6 : Pourquoi MORACare Enterprise ? (12 avantages) */
export const ADVANTAGES: readonly string[] = [
  'Une seule base de données',
  'Accès sécurisé',
  'Interface moderne',
  'Cloud',
  'Temps réel',
  'Haute disponibilité',
  'Architecture évolutive',
  'Rapports automatiques',
  'Permissions avancées',
  'Journal d’audit',
  'Sauvegardes',
  'Conçu pour les établissements africains',
];

/** LP-001 §6 — Section 7 : profils d'utilisation (textes littéraux) */
export interface UsageProfile {
  title: string;
  description: string;
}

export const USAGE_PROFILES: readonly UsageProfile[] = [
  {
    title: 'Cabinet médical',
    description: 'Gestion rapide des consultations, des rendez-vous et de la facturation.',
  },
  {
    title: 'Clinique',
    description:
      'Gestion complète des patients, de la pharmacie, du laboratoire et des hospitalisations.',
  },
  {
    title: 'Hôpital',
    description:
      "Pilotage d'un établissement complexe avec l'ensemble des modules, des services et des utilisateurs.",
  },
];

/** LP-001 §6 — Section 8 : Comment démarrer ? (5 étapes) */
export const STARTING_STEPS: readonly string[] = [
  'Réserver une démonstration',
  'Analyse de vos besoins',
  'Configuration de votre établissement',
  'Formation des équipes',
  'Mise en production',
];

/** LP-001 §6 — Section 9 : Sécurité (8 éléments) */
export const SECURITY_POINTS: readonly string[] = [
  'Chiffrement',
  'HTTPS',
  'Sauvegardes',
  'Gestion des rôles',
  'Journalisation',
  'Audit',
  'Protection des données',
  'Architecture sécurisée',
];

/**
 * LP-001 §6 — Section 10 : FAQ.
 *
 * Le document fournit 8 questions et en exige « entre 10 et 15 ». Les quatre
 * dernières complètent le minimum requis ; leurs réponses s'appuient sur les
 * Blueprints cités.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'Peut-on migrer nos données ?',
    answer:
      'Oui. Vos données existantes sont analysées puis reprises lors de la phase de configuration de votre établissement, avant la mise en production.',
  },
  {
    question: 'Fonctionne-t-il sur mobile ?',
    answer:
      "MORACare est responsive : ordinateur, portable, tablette et smartphone. Aucune fonctionnalité n'est limitée à un seul type d'écran.",
  },
  {
    question: 'Est-il multi-sites ?',
    answer:
      'Oui. Un même groupe peut gérer plusieurs sites — hôpital principal, annexes, centres de santé — chacun avec ses utilisateurs, ses services et ses statistiques.',
  },
  {
    question: 'Peut-on travailler hors ligne ?',
    answer:
      "Non. MORACare fonctionne en ligne : le fonctionnement normal suppose une connexion au serveur, ce qui garantit que tous les utilisateurs voient les mêmes données au même moment.",
  },
  {
    question: 'Comment sont protégées les données ?',
    answer:
      "Chaque établissement est totalement isolé au niveau de la base de données. Les accès sont contrôlés par rôle, chiffrés en transit, et toutes les opérations sensibles sont journalisées.",
  },
  {
    question: 'Comment se déroule la formation ?',
    answer:
      'La formation des équipes constitue la quatrième étape du déploiement. Elle est adaptée à chaque métier : médecins, infirmiers, réception, pharmacie, laboratoire, comptabilité.',
  },
  {
    question: 'Quels sont les délais de déploiement ?',
    answer:
      "Ils dépendent de la taille de l'établissement et du volume de données à reprendre. Le parcours comporte cinq étapes, de la démonstration à la mise en production.",
  },
  {
    question: 'Existe-t-il un support technique ?',
    answer:
      'Oui. MORA Shawiri assure le support : demandes d’assistance, incidents, interventions et suivi des résolutions, avec un historique complet des échanges.',
  },
  {
    question: 'Qui peut accéder au dossier d’un patient ?',
    answer:
      "Uniquement les utilisateurs de votre établissement disposant de la permission correspondante. Chaque rôle possède son propre périmètre, et aucun établissement ne peut consulter les données d'un autre.",
  },
  {
    question: 'Peut-on activer seulement certains modules ?',
    answer:
      'Oui. Les modules sont activés ou désactivés selon les besoins de votre structure. Un module désactivé devient totalement invisible pour vos utilisateurs.',
  },
  {
    question: 'Les documents sont-ils générés automatiquement ?',
    answer:
      'Oui. Ordonnances, certificats, comptes rendus et factures sont produits au format PDF et archivés dans la gestion documentaire, avec une référence unique.',
  },
  {
    question: 'MORACare est-il adapté aux établissements africains ?',
    answer:
      "C'est sa raison d'être. MORACare est conçu par MORA Shawiri pour les réalités des structures de santé africaines, avec une interface en français et en anglais.",
  },
];

/** LP-001 §6 — Section 12 : Footer, liens utiles (7 entrées, dans l'ordre) */
export const FOOTER_LINKS: readonly string[] = [
  'Fonctionnalités',
  'Documentation',
  'Support',
  'Contact',
  'Politique de confidentialité',
  'Conditions générales',
  'Mentions légales',
];

/** LP-001 §2 — Public cible (9 cibles) */
export const TARGET_AUDIENCE: readonly string[] = [
  'Cabinets médicaux',
  'Cliniques privées',
  'Centres médicaux',
  'Hôpitaux',
  'Laboratoires',
  "Centres d'imagerie",
  'ONG médicales',
  'Ministères de la Santé',
  'Structures de santé publiques',
];
