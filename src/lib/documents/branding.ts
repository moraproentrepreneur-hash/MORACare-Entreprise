/**
 * Identité documentaire d'un émetteur.
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

/**
 * Ce dont un document a besoin pour désigner son émetteur.
 *
 * Deux entités le satisfont : l'établissement, pour ses documents de soin, et
 * MORA Shawiri, pour ceux qu'émet la plateforme — au premier rang desquels les
 * factures d'abonnement.
 *
 * Le moteur exigeait auparavant un `EstablishmentProfile`. Le Super Admin
 * n'appartenant à aucun établissement, toute génération depuis sa console
 * échouait : c'est ce qui empêchait le téléchargement des factures. Décrire ce
 * dont le document a réellement besoin, plutôt que d'où il vient, lève la
 * contrainte sans rien relâcher.
 */
export interface DocumentIssuer {
  name: string;
  legalName: string;
  slogan: string;
  logoUrl: string;

  authorizationNumber: string;
  tradeRegister: string;
  taxId: string;
  legalMentions: string;

  phone: string;
  phoneSecondary: string;
  whatsapp: string;
  email: string;
  supportEmail: string;
  website: string;
  address: string;
  postalCode: string;
  city: string;
  island: string;
  country: string;

  primaryColor: string;
  secondaryColor: string;
  signatureUrl: string;
  signatureHolder: string;
  stampUrl: string;
  currency: string;
  pdfTemplate: string;
  documentTemplates: Record<string, string> | null;
}

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
  patient_record: 'Dossier patient',
  prescription: 'Ordonnance',
  consultation: 'Compte rendu de consultation',
  lab_result: 'Résultat de laboratoire',
  imaging_report: "Rapport d'imagerie",
  hospitalization: "Bulletin d'hospitalisation",
  discharge: 'Lettre de sortie',
  invoice: 'Facture',
  receipt: 'Reçu',
  quote: 'Devis',
  dispensation: 'Bon de délivrance',
  stock_state: 'État du stock',
  inventory_sheet: "Feuille d'inventaire",
  bed_occupancy: "État d'occupation des lits",
} as const;

export type DocumentKind = keyof typeof DOCUMENT_KINDS;

/**
 * Qui émet ce type de document.
 *
 * BP30 §13 est explicite : la facturation SaaS — devis, factures, paiements —
 * « concerne exclusivement la relation entre MORA Shawiri et les établissements
 * clients » et reste « totalement indépendante de la facturation médicale
 * réalisée par les établissements ».
 *
 * Un ordonnance, un compte rendu de consultation ou un bulletin
 * d'hospitalisation n'ont donc rien à faire dans les réglages du Super Admin :
 * il n'en émet aucun, et lui en proposer le paramétrage laisse croire que la
 * plateforme intervient dans l'activité clinique. À l'inverse, une facture ou
 * un reçu existent des deux côtés — l'un pour l'abonnement, l'autre pour le
 * patient — et chacun conserve son propre modèle.
 */
export type DocumentAudience = 'platform' | 'establishment' | 'both';

const DOCUMENT_AUDIENCES: Record<DocumentKind, DocumentAudience> = {
  // Activité clinique et pharmaceutique : l'établissement seul.
  patient_record: 'establishment',
  prescription: 'establishment',
  consultation: 'establishment',
  lab_result: 'establishment',
  imaging_report: 'establishment',
  hospitalization: 'establishment',
  discharge: 'establishment',
  dispensation: 'establishment',
  stock_state: 'establishment',
  inventory_sheet: 'establishment',
  bed_occupancy: 'establishment',

  // Documents commerciaux : les deux niveaux en produisent, chacun les siens.
  invoice: 'both',
  receipt: 'both',
  quote: 'both',
};

/** Types de documents qu'un émetteur donné peut réellement configurer. */
export const documentKindsFor = (audience: 'platform' | 'establishment'): DocumentKind[] =>
  (Object.keys(DOCUMENT_KINDS) as DocumentKind[]).filter((kind) => {
    const scope = DOCUMENT_AUDIENCES[kind];
    return scope === 'both' || scope === audience;
  });

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
export const buildHeaderLines = (issuer: DocumentIssuer): string[] => {
  const lines: string[] = [];

  const address = compact([issuer.address, issuer.postalCode], ' ');
  const place = compact([address, issuer.city, issuer.island, issuer.country], ', ');
  if (place) lines.push(place);

  const phones = compact([issuer.phone, issuer.phoneSecondary], ' / ');
  const contact = compact([
    phones ? `Tél. ${phones}` : '',
    issuer.whatsapp ? `WhatsApp ${issuer.whatsapp}` : '',
    issuer.email,
    issuer.website,
  ]);
  if (contact) lines.push(contact);

  const identifiers = compact([
    issuer.authorizationNumber ? `Autorisation ${issuer.authorizationNumber}` : '',
    issuer.tradeRegister ? `RC ${issuer.tradeRegister}` : '',
    issuer.taxId ? `NIF ${issuer.taxId}` : '',
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
export const buildFooterLines = (issuer: DocumentIssuer): string[] => {
  const lines: string[] = [];

  const identity = compact([
    issuer.legalName || issuer.name,
    issuer.authorizationNumber ? `Autorisation ${issuer.authorizationNumber}` : '',
    issuer.taxId ? `NIF ${issuer.taxId}` : '',
  ]);
  if (identity) lines.push(identity);

  const reach = compact([
    compact([issuer.city, issuer.country], ', '),
    issuer.phone,
    issuer.supportEmail || issuer.email,
  ]);
  if (reach) lines.push(reach);

  if (issuer.legalMentions.trim()) {
    lines.push(issuer.legalMentions.trim());
  }

  return lines;
};

export const brandingOf = (
  issuer: DocumentIssuer,
  kind?: DocumentKind,
): DocumentBranding => ({
  template: templateFor(issuer, kind),
  title: issuer.legalName || issuer.name,
  slogan: issuer.slogan,
  logoUrl: issuer.logoUrl,
  signatureUrl: issuer.signatureUrl,
  signatureHolder: issuer.signatureHolder,
  stampUrl: issuer.stampUrl,
  primaryColor: issuer.primaryColor,
  secondaryColor: issuer.secondaryColor,
  currency: issuer.currency,
  headerLines: buildHeaderLines(issuer),
  footerLines: buildFooterLines(issuer),
  legalMentions: issuer.legalMentions,
});

/**
 * Modèle applicable à un document.
 *
 * BP28C §9 : un modèle par défaut pour l'établissement, et la possibilité d'en
 * attribuer un autre à certains types de documents.
 */
export const templateFor = (issuer: DocumentIssuer, kind?: DocumentKind): TemplateId => {
  if (kind) {
    const override = issuer.documentTemplates?.[kind];
    if (override) return asTemplateId(override);
  }
  return asTemplateId(issuer.pdfTemplate);
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
