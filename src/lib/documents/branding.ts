import type { EstablishmentProfile } from '@/services/establishment.service';

/**
 * Identité documentaire d'un établissement.
 *
 * L'en-tête et le pied de page ne sont plus saisis : ils sont composés à partir
 * de l'identité, des coordonnées et des informations légales. Recopier à la
 * main des données déjà enregistrées garantissait qu'elles finiraient par
 * diverger — une adresse changée dans les Coordonnées serait restée périmée sur
 * les factures.
 *
 * Ce module ne dépend ni de React ni de jsPDF : il est utilisable pour
 * l'aperçu à l'écran comme pour la génération du document.
 */

export type TemplateId = 'premium_classic' | 'premium_medical' | 'premium_executive';

export const TEMPLATE_IDS: readonly TemplateId[] = [
  'premium_classic',
  'premium_medical',
  'premium_executive',
];

/** Les trois modèles de BP28C §8, avec leur description littérale. */
export const TEMPLATES: Record<
  TemplateId,
  { name: string; style: string; description: string; features: string[]; audience: string }
> = {
  premium_classic: {
    name: 'Premium Classic',
    style: 'Style institutionnel',
    description:
      'Bandeau supérieur, tableaux sobres et pied de page administratif. La présentation la plus neutre des trois.',
    features: [
      'Bandeau supérieur',
      'Logo et couleurs officielles',
      'Tableaux sobres',
      'Signature',
      'Pied de page administratif',
    ],
    audience: 'Adapté aux établissements publics.',
  },
  premium_medical: {
    name: 'Premium Medical',
    style: 'Style moderne',
    description:
      'Mise en page médicale : informations patient mises en évidence, sections colorées et QR Code de vérification.',
    features: [
      'Mise en page médicale',
      'Sections colorées',
      'QR Code de vérification',
      'Informations patient mises en évidence',
      'Tableaux optimisés',
    ],
    audience: 'Adapté aux cliniques et centres médicaux.',
  },
  premium_executive: {
    name: 'Premium Executive',
    style: 'Style haut de gamme',
    description:
      'Présentation soignée, signature numérique, cachet et mentions légales complètes.',
    features: [
      'Présentation Premium',
      'Typographie professionnelle',
      'Tableaux élégants',
      'Signature numérique',
      'QR Code',
      'Cachet numérique',
      'Mentions légales complètes',
    ],
    audience: 'Adapté aux établissements privés et groupes hospitaliers.',
  },
};

export const asTemplateId = (value: string | null | undefined): TemplateId =>
  TEMPLATE_IDS.includes(value as TemplateId) ? (value as TemplateId) : 'premium_classic';

/**
 * Types de documents pouvant recevoir un modèle propre (BP28C §7 et §9).
 *
 * La liste reste volontairement restreinte aux documents réellement produits
 * par l'application : proposer un réglage pour un document inexistant ferait
 * croire à une fonctionnalité absente.
 */
export const DOCUMENT_KINDS = {
  prescription: 'Ordonnance',
  consultation: 'Compte rendu de consultation',
  lab_result: 'Résultat de laboratoire',
  imaging_report: "Rapport d'imagerie",
  hospitalization: "Bulletin d'hospitalisation",
  discharge: 'Lettre de sortie',
  invoice: 'Facture',
  receipt: 'Reçu',
  quote: 'Devis',
  dispensation: 'Bon de dispensation',
} as const;

export type DocumentKind = keyof typeof DOCUMENT_KINDS;

// ---------------------------------------------------------------------------
// Composition de l'en-tête et du pied de page
// ---------------------------------------------------------------------------

export interface DocumentBranding {
  template: TemplateId;
  /** Nom affiché en tête : la raison sociale prime sur le nom d'usage. */
  title: string;
  slogan: string;
  logoUrl: string;
  signatureUrl: string;
  signatureHolder: string;
  stampUrl: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  /** Lignes composées automatiquement, dans l'ordre d'affichage. */
  headerLines: string[];
  footerLines: string[];
  legalMentions: string;
}

const compact = (values: (string | null | undefined)[], separator = ' · '): string =>
  values.map((v) => (v ?? '').trim()).filter((v) => v !== '').join(separator);

/**
 * En-tête : qui émet le document, et où le joindre.
 *
 * Ordre retenu : ce qui identifie l'établissement, puis où il se trouve, puis
 * comment le contacter. C'est l'ordre dans lequel un lecteur cherche ces
 * informations sur un papier à en-tête.
 */
export const buildHeaderLines = (profile: EstablishmentProfile): string[] => {
  const lines: string[] = [];

  const address = compact([profile.address, profile.postalCode], ' ');
  const place = compact([address, profile.city, profile.island, profile.country], ', ');
  if (place) lines.push(place);

  const phones = compact([profile.phone, profile.phoneSecondary], ' / ');
  const contact = compact([
    phones ? `Tél. ${phones}` : '',
    profile.whatsapp ? `WhatsApp ${profile.whatsapp}` : '',
    profile.email,
    profile.website,
  ]);
  if (contact) lines.push(contact);

  const identifiers = compact([
    profile.authorizationNumber ? `Autorisation ${profile.authorizationNumber}` : '',
    profile.tradeRegister ? `RC ${profile.tradeRegister}` : '',
    profile.taxId ? `NIF ${profile.taxId}` : '',
  ]);
  if (identifiers) lines.push(identifiers);

  return lines;
};

/**
 * Pied de page : les mentions qui engagent l'établissement.
 *
 * Le NIF y figure même s'il est déjà en tête : une facture peut être détachée
 * de sa première page, et l'administration fiscale le cherche en bas.
 */
export const buildFooterLines = (profile: EstablishmentProfile): string[] => {
  const lines: string[] = [];

  const identity = compact([
    profile.legalName || profile.name,
    profile.authorizationNumber ? `Autorisation ${profile.authorizationNumber}` : '',
    profile.taxId ? `NIF ${profile.taxId}` : '',
  ]);
  if (identity) lines.push(identity);

  const reach = compact([
    compact([profile.city, profile.country], ', '),
    profile.phone,
    profile.supportEmail || profile.email,
  ]);
  if (reach) lines.push(reach);

  if (profile.legalMentions.trim()) {
    lines.push(profile.legalMentions.trim());
  }

  return lines;
};

export const brandingOf = (
  profile: EstablishmentProfile,
  kind?: DocumentKind,
): DocumentBranding => ({
  template: templateFor(profile, kind),
  title: profile.legalName || profile.name,
  slogan: profile.slogan,
  logoUrl: profile.logoUrl,
  signatureUrl: profile.signatureUrl,
  signatureHolder: profile.signatureHolder,
  stampUrl: profile.stampUrl,
  primaryColor: profile.primaryColor,
  secondaryColor: profile.secondaryColor,
  currency: profile.currency,
  headerLines: buildHeaderLines(profile),
  footerLines: buildFooterLines(profile),
  legalMentions: profile.legalMentions,
});

/**
 * Modèle applicable à un document.
 *
 * BP28C §9 : un modèle par défaut pour l'établissement, et la possibilité d'en
 * attribuer un autre à certains types de documents.
 */
export const templateFor = (profile: EstablishmentProfile, kind?: DocumentKind): TemplateId => {
  if (kind) {
    const override = profile.documentTemplates?.[kind];
    if (override) return asTemplateId(override);
  }
  return asTemplateId(profile.pdfTemplate);
};

// ---------------------------------------------------------------------------
// Couleurs
// ---------------------------------------------------------------------------

/** `#RRGGBB` vers un triplet 0-255. Renvoie `null` si la chaîne est invalide. */
export const hexToRgb = (hex: string): [number, number, number] | null => {
  const match = /^#?([0-9a-f]{6})/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

/**
 * Choisit noir ou blanc pour rester lisible sur un fond donné.
 *
 * Un texte blanc sur une couleur claire choisie par l'établissement serait
 * illisible ; la luminance relative tranche à sa place.
 */
export const readableTextOn = (hex: string): [number, number, number] => {
  const rgb = hexToRgb(hex);
  if (!rgb) return [255, 255, 255];
  const [r, g, b] = rgb.map((c) => {
    const channel = c / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? [15, 23, 42] : [255, 255, 255];
};
