/**
 * Référentiels métier partagés.
 *
 * CLAUDE.md § Interconnexion : « Aucune saisie libre lorsqu'une relation existe
 * déjà. » Un champ texte pour un service ou une catégorie produit autant de
 * valeurs que de saisies — « Cardiologie », « cardiologie », « Cardio » — et
 * rend tout regroupement statistique faux.
 *
 * Ces listes sont donc la référence unique. Elles ne sont pas en base parce
 * qu'elles ne sont pas propres à un établissement : ce sont des nomenclatures
 * du domaine, communes à tous. Ce qui relève d'un établissement — ses
 * spécialités, par exemple — se règle dans ses Paramètres.
 */

export interface ReferenceOption {
  value: string;
  label: string;
}

const asOptions = (labels: readonly string[]): ReferenceOption[] =>
  labels.map((label) => ({ value: label, label }));

/**
 * Services d'un établissement de santé (UG02 §8).
 *
 * Le guide en énumère sept ; les suivants couvrent les fonctions support, qui
 * emploient aussi du personnel.
 */
export const DEPARTMENTS: ReferenceOption[] = asOptions([
  'Médecine générale',
  'Urgences',
  'Maternité',
  'Pédiatrie',
  'Chirurgie',
  'Bloc opératoire',
  'Hospitalisation',
  'Laboratoire',
  'Imagerie médicale',
  'Pharmacie',
  'Consultations externes',
  'Soins infirmiers',
  'Accueil et admissions',
  'Comptabilité',
  'Ressources humaines',
  'Administration',
]);

/** Fonctions exercées, pour le dossier du personnel. */
export const JOB_TITLES: ReferenceOption[] = asOptions([
  'Médecin généraliste',
  'Médecin spécialiste',
  'Chirurgien',
  'Sage-femme',
  'Infirmier(ère)',
  'Aide-soignant(e)',
  'Pharmacien',
  'Préparateur en pharmacie',
  'Technicien de laboratoire',
  'Manipulateur en imagerie',
  'Réceptionniste',
  'Secrétaire médical(e)',
  'Comptable',
  'Gestionnaire RH',
  'Agent administratif',
  'Agent de maintenance',
]);

/** Catégories de médicaments (BP19 §5). */
export const MEDICATION_CATEGORIES: ReferenceOption[] = asOptions([
  'Antibiotique',
  'Antalgique',
  'Anti-inflammatoire',
  'Antipaludique',
  'Antipyrétique',
  'Antihypertenseur',
  'Antidiabétique',
  'Antiseptique',
  'Vaccin',
  'Vitamine et complément',
  'Solution injectable',
  'Perfusion',
  'Dispositif médical',
  'Consommable',
  'Autre',
]);

/** Formes galéniques (BP19 §5). */
export const MEDICATION_FORMS: ReferenceOption[] = asOptions([
  'Comprimé',
  'Gélule',
  'Sirop',
  'Suspension buvable',
  'Solution injectable',
  'Poudre pour injection',
  'Pommade',
  'Crème',
  'Collyre',
  'Suppositoire',
  'Perfusion',
  'Spray',
]);

/** Familles d'examens de laboratoire (BP20). */
export const LAB_EXAM_TYPES: ReferenceOption[] = asOptions([
  'Hématologie — Numération formule sanguine',
  'Hématologie — Groupe sanguin',
  'Biochimie — Glycémie',
  'Biochimie — Bilan lipidique',
  'Biochimie — Bilan rénal',
  'Biochimie — Bilan hépatique',
  'Parasitologie — Goutte épaisse (paludisme)',
  'Parasitologie — Examen parasitologique des selles',
  'Bactériologie — Examen cytobactériologique des urines',
  'Bactériologie — Coproculture',
  'Sérologie — VIH',
  'Sérologie — Hépatites',
  'Sérologie — Widal',
  'Immunologie — Test de grossesse',
  'Autre analyse',
]);

/** Régions anatomiques explorées en imagerie (BP21). */
export const ANATOMICAL_REGIONS: ReferenceOption[] = asOptions([
  'Crâne',
  'Rachis cervical',
  'Rachis dorsal',
  'Rachis lombaire',
  'Thorax',
  'Abdomen',
  'Bassin',
  'Membre supérieur — épaule',
  'Membre supérieur — coude',
  'Membre supérieur — poignet et main',
  'Membre inférieur — hanche',
  'Membre inférieur — genou',
  'Membre inférieur — cheville et pied',
  'Pelvis et appareil génital',
  'Sein',
  'Cœur et vaisseaux',
]);

/** Motifs de consultation les plus fréquents. « Autre motif » reste ouvert. */
export const CONSULTATION_REASONS: ReferenceOption[] = asOptions([
  'Fièvre',
  'Douleur abdominale',
  'Céphalées',
  'Toux et troubles respiratoires',
  'Troubles digestifs',
  'Douleurs articulaires',
  'Plaie ou traumatisme',
  'Suivi de grossesse',
  'Suivi de maladie chronique',
  'Contrôle post-opératoire',
  'Vaccination',
  'Bilan de santé',
  'Consultation prénatale',
  'Consultation pédiatrique',
  'Autre motif',
]);
