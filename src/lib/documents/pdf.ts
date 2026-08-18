import type jsPDF from 'jspdf';
import {
  DOCUMENT_KINDS,
  brandingOf,
  hexToRgb,
  readableTextOn,
  type DocumentBranding,
  type DocumentIssuer,
  type DocumentKind,
  type TemplateId,
} from './branding';
import { formatDate } from '@/lib/utils';

/**
 * Moteur documentaire (BP28C §6 à §11).
 *
 * Un seul générateur, trois habillages. La structure du document — en-tête,
 * titre, sections, tableaux, signature, pied de page — est identique quel que
 * soit le modèle : BP28C §10 la déclare protégée « afin de garantir sa
 * conformité ». Seule la présentation change.
 *
 * Tout ce qui identifie l'établissement vient de ses Paramètres. Aucune
 * mention n'est écrite en dur : ni nom, ni coordonnées, ni couleurs. Un
 * document produit par deux établissements différents ne se ressemble pas.
 */

export interface DocumentField {
  label: string;
  value: string;
}

export interface DocumentTable {
  title?: string;
  columns: string[];
  rows: string[][];
  /** Colonnes alignées à droite, par indice. Les montants, en pratique. */
  numericColumns?: number[];
}

export interface DocumentSection {
  title?: string;
  fields?: DocumentField[];
  paragraphs?: string[];
  table?: DocumentTable;
}

export interface DocumentPayload {
  kind: DocumentKind;
  /** Référence métier. Elle identifie le document et alimente le QR Code. */
  reference: string;
  title: string;
  subtitle?: string;
  /** Bloc mis en évidence en tête : le patient, le plus souvent. */
  highlight?: DocumentField[];
  sections: DocumentSection[];
  /** Ligne de total, détachée du reste. */
  total?: { label: string; value: string };
  /** Mention libre placée avant la signature. */
  note?: string;
}

const MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Rgb = [number, number, number];

const rgbOr = (hex: string, fallback: Rgb): Rgb => hexToRgb(hex) ?? fallback;

// ---------------------------------------------------------------------------
// Encodage du texte
// ---------------------------------------------------------------------------

/**
 * Équivalents Latin-1 des caractères typographiques courants.
 *
 * Les polices standard d'un PDF (Helvetica, Times) sont encodées en WinAnsi,
 * qui s'arrête à 255. Dès qu'une chaîne contient un caractère au-delà, jsPDF
 * bascule **toute la chaîne** en UTF-16 : chaque caractère est alors précédé
 * d'un octet nul, que la police rend comme une espace.
 *
 * C'est ce qui produisait « 1 8 0 0 0   K M F » à la place de « 18 000 KMF ».
 * Le coupable était l'espace fine insécable U+202F que `Intl.NumberFormat`
 * insère comme séparateur de milliers en français — invisible à la relecture du
 * code, et fatale à l'impression. Ses deux octets, 0x20 et 0x2F, expliquent
 * aussi le « / » aperçu au milieu des montants.
 *
 * La table ci-dessous ramène ces caractères à leur équivalent imprimable. Elle
 * ne « nettoie » pas le texte : elle le transpose dans le jeu que la police
 * sait rendre.
 */
const LATIN1_EQUIVALENTS: Record<string, string> = {
  ' ': ' ', // espace insécable
  ' ': ' ', // espace fine insécable — séparateur de milliers français
  ' ': ' ', // espace tabulaire
  ' ': ' ', // espace fine
  '​': '', // espace sans chasse
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '–': '-', // tiret demi-cadratin
  '—': '-', // tiret cadratin
  '‘': "'",
  '’': "'", // apostrophe typographique
  '‚': ',',
  '“': '"',
  '”': '"',
  '„': '"',
  '•': '-', // puce
  '…': '...', // points de suspension
  '‰': '%',
  '‹': '<',
  '›': '>',
  '€': '', // € : présent en WinAnsi à la position 0x80
  '−': '-', // signe moins mathématique
  '«': '"',
  '»': '"',
};

/**
 * Rend une chaîne imprimable par une police standard.
 *
 * Tout caractère resté hors de Latin-1 après transposition est retiré plutôt
 * que laissé : un seul suffirait à faire basculer la chaîne entière en UTF-16
 * et à rendre le document illisible.
 */
export const toPdfSafe = (value: string): string => {
  let out = '';

  for (const character of value.normalize('NFC')) {
    const replacement = LATIN1_EQUIVALENTS[character];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    if (character.codePointAt(0)! <= 0xff) {
      out += character;
      continue;
    }
    // Dernier recours : décomposer pour retirer les diacritiques exotiques
    // tout en gardant la lettre de base.
    const stripped = character.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += [...stripped].filter((c) => c.codePointAt(0)! <= 0xff).join('');
  }

  return out;
};

/** Applique `toPdfSafe` à toutes les chaînes d'une structure. */
const sanitizeDeep = <T>(value: T): T => {
  if (typeof value === 'string') return toPdfSafe(value) as unknown as T;
  if (Array.isArray(value)) return value.map(sanitizeDeep) as unknown as T;

  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      // Les adresses d'images restent intactes : ce sont des URL, pas du texte
      // imprimé, et les transposer les rendrait injoignables.
      out[key] = key.endsWith('Url') ? entry : sanitizeDeep(entry);
    }
    return out as T;
  }

  return value;
};

/**
 * Charge une image distante en data-URL.
 *
 * jsPDF n'accepte pas une URL : il lui faut les octets. L'échec est absorbé —
 * un logo injoignable ne doit pas empêcher d'imprimer une ordonnance.
 */
const loadImage = async (url: string): Promise<{ data: string; ratio: number } | null> => {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    // Le SVG n'est pas rastérisé par jsPDF : il serait ignoré silencieusement.
    if (blob.type === 'image/svg+xml') return null;

    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('lecture impossible'));
      reader.readAsDataURL(blob);
    });

    const ratio = await new Promise<number>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image.width / image.height || 1);
      image.onerror = () => resolve(1);
      image.src = data;
    });

    return { data, ratio };
  } catch {
    return null;
  }
};

/**
 * QR Code de vérification (BP28C §12).
 *
 * Encodé sans dépendance : la référence métier est portée par un QR de version
 * fixe serait fragile, aussi le code est délégué à `qrcode`, déjà nécessaire
 * ailleurs. En cas d'absence, le document reste valide sans QR.
 */
const buildQrCode = async (text: string): Promise<string | null> => {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(text, {
      margin: 0,
      width: 256,
      errorCorrectionLevel: 'M',
    });
  } catch {
    return null;
  }
};

interface Assets {
  logo: { data: string; ratio: number } | null;
  signature: { data: string; ratio: number } | null;
  stamp: { data: string; ratio: number } | null;
  qr: string | null;
}

/**
 * Écrit les lignes d'en-tête sans jamais les superposer.
 *
 * L'option `maxWidth` de jsPDF replie silencieusement une ligne trop longue sur
 * plusieurs, mais ne le dit pas à l'appelant. Les trois habillages avançaient
 * donc d'une hauteur fixe par ligne logique : une adresse un peu longue se
 * repliait sur deux lignes physiques, et la suivante venait s'écrire par-dessus.
 * C'est ce qui faisait chevaucher le site web et le numéro d'autorisation.
 *
 * Le repli est ici calculé avant l'écriture, et la hauteur consommée est celle
 * des lignes réellement produites. Ce qui ne tient pas dans la bande d'en-tête
 * est abandonné plutôt qu'écrit par-dessus le corps du document : mieux vaut
 * une coordonnée manquante qu'un document illisible.
 */
const drawHeaderLines = (
  doc: jsPDF,
  lines: readonly string[],
  options: { left: number; top: number; maxWidth: number; lineHeight: number; limit: number },
): number => {
  let y = options.top;

  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, options.maxWidth) as string[];

    for (const physical of wrapped) {
      if (y > options.limit) return y;
      doc.text(physical, options.left, y);
      y += options.lineHeight;
    }
  }

  return y;
};

// ---------------------------------------------------------------------------
// Habillage par modèle
// ---------------------------------------------------------------------------

/**
 * Habillage d'un modèle.
 *
 * La différence entre les trois ne peut pas se limiter au bandeau : il occupe
 * un dixième de la page, et trois documents ne se distingueraient alors qu'à
 * leur première ligne. Chaque modèle définit donc aussi sa typographie, le
 * traitement de ses titres de section, le style de ses tableaux et la mise en
 * avant de son bloc d'en-tête.
 *
 * La structure, elle, reste commune — BP28C §10 la déclare protégée « afin de
 * garantir la conformité » du document.
 */
interface Skin {
  /** Hauteur du bandeau supérieur. */
  headerHeight: number;
  /** Dessine le bandeau et renvoie l'ordonnée du premier contenu. */
  header: (doc: jsPDF, b: DocumentBranding, p: DocumentPayload, a: Assets) => number;

  /** Police des titres. Times donne un rendu nettement plus formel. */
  titleFont: 'helvetica' | 'times';
  /** Police du corps. */
  bodyFont: 'helvetica' | 'times';
  /** Titre du document en capitales, ou tel quel. */
  uppercaseTitle: boolean;
  /** Interlettrage des titres de section, en millimètres. */
  sectionTracking: number;

  /** Traitement d'un titre de section. */
  sectionStyle: 'rule' | 'filled' | 'accent-bar';
  /** Traitement d'un tableau. */
  tableStyle: 'bordered' | 'zebra' | 'hairline';
  /** Traitement du bloc mis en avant. */
  highlightStyle: 'outline' | 'tinted' | 'sober';

  /** Fond des titres de section. `null` = pas de fond. */
  sectionFill: (b: DocumentBranding) => Rgb | null;
  /** Fond de l'en-tête des tableaux. `null` = pas de fond. */
  tableHeadFill: (b: DocumentBranding) => Rgb | null;

  showQr: boolean;
  showStamp: boolean;
  showLegalMentions: boolean;
}

const drawLogo = (doc: jsPDF, assets: Assets, x: number, y: number, maxHeight: number): number => {
  if (!assets.logo) return 0;
  const width = Math.min(maxHeight * assets.logo.ratio, 42);
  doc.addImage(assets.logo.data, x, y, width, maxHeight, undefined, 'FAST');
  return width;
};

/** Premium Classic — bandeau plein, sobre, tourné vers l'administration. */
const classic: Skin = {
  headerHeight: 34,
  header: (doc, branding, payload, assets) => {
    const primary = rgbOr(branding.primaryColor, [0, 51, 102]);
    const text = readableTextOn(branding.primaryColor);

    doc.setFillColor(...primary);
    doc.rect(0, 0, PAGE_WIDTH, classic.headerHeight, 'F');

    const logoWidth = drawLogo(doc, assets, MARGIN, 6, 22);
    const left = MARGIN + (logoWidth > 0 ? logoWidth + 6 : 0);

    doc.setTextColor(...text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(branding.title, left, 14, { maxWidth: 110 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    drawHeaderLines(doc, branding.headerLines, {
      left,
      top: 19,
      // La largeur s'arrête avant le bloc de droite, qui porte la référence et
      // la date : les deux se chevauchaient sur un nom d'établissement long.
      maxWidth: PAGE_WIDTH - MARGIN - 44 - left,
      lineHeight: 3.6,
      limit: classic.headerHeight - 3,
    });

    doc.setFontSize(8);
    doc.text(`Réf. ${payload.reference}`, PAGE_WIDTH - MARGIN, 13, { align: 'right' });
    doc.text(formatDate(new Date().toISOString()), PAGE_WIDTH - MARGIN, 18, { align: 'right' });

    return classic.headerHeight + 12;
  },
  titleFont: 'helvetica',
  bodyFont: 'helvetica',
  uppercaseTitle: true,
  sectionTracking: 0,
  sectionStyle: 'rule',
  tableStyle: 'bordered',
  highlightStyle: 'outline',
  sectionFill: () => null,
  tableHeadFill: (b) => rgbOr(b.primaryColor, [0, 51, 102]),
  showQr: false,
  showStamp: false,
  showLegalMentions: false,
};

/** Premium Medical — sections colorées, patient mis en évidence, QR Code. */
const medical: Skin = {
  headerHeight: 30,
  header: (doc, branding, payload, assets) => {
    const primary = rgbOr(branding.primaryColor, [0, 51, 102]);
    const secondary = rgbOr(branding.secondaryColor, [0, 168, 89]);

    // Bandeau clair : la couleur reste un accent, pas un aplat.
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, PAGE_WIDTH, medical.headerHeight, 'F');
    doc.setFillColor(...secondary);
    doc.rect(0, medical.headerHeight - 2, PAGE_WIDTH, 2, 'F');

    const logoWidth = drawLogo(doc, assets, MARGIN, 5, 20);
    const left = MARGIN + (logoWidth > 0 ? logoWidth + 6 : 0);

    doc.setTextColor(...primary);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(branding.title, left, 12, { maxWidth: 110 });

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    drawHeaderLines(doc, branding.headerLines, {
      left,
      top: 17,
      // Le QR Code occupe le coin droit : la largeur utile s'arrête avant lui.
      maxWidth: PAGE_WIDTH - MARGIN - (assets.qr ? 22 : 4) - left,
      lineHeight: 3.5,
      limit: medical.headerHeight - 3,
    });

    if (assets.qr) {
      doc.addImage(assets.qr, PAGE_WIDTH - MARGIN - 18, 5, 18, 18, undefined, 'FAST');
    }

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.text(`Réf. ${payload.reference}`, PAGE_WIDTH - MARGIN, 26, { align: 'right' });

    return medical.headerHeight + 10;
  },
  sectionFill: (b) => {
    const rgb = rgbOr(b.secondaryColor, [0, 168, 89]);
    // Teinte très claire de la couleur secondaire, pour ne pas gêner la lecture.
    return [
      Math.round(255 - (255 - rgb[0]) * 0.12),
      Math.round(255 - (255 - rgb[1]) * 0.12),
      Math.round(255 - (255 - rgb[2]) * 0.12),
    ];
  },
  titleFont: 'helvetica',
  bodyFont: 'helvetica',
  uppercaseTitle: false,
  sectionTracking: 0,
  sectionStyle: 'accent-bar',
  tableStyle: 'zebra',
  highlightStyle: 'tinted',
  tableHeadFill: (b) => rgbOr(b.secondaryColor, [0, 168, 89]),
  showQr: true,
  showStamp: false,
  showLegalMentions: false,
};

/** Premium Executive — filet fin, typographie soignée, cachet et mentions. */
const executive: Skin = {
  headerHeight: 38,
  header: (doc, branding, payload, assets) => {
    const primary = rgbOr(branding.primaryColor, [0, 51, 102]);
    const secondary = rgbOr(branding.secondaryColor, [0, 168, 89]);

    const logoWidth = drawLogo(doc, assets, MARGIN, 10, 20);
    const left = MARGIN + (logoWidth > 0 ? logoWidth + 8 : 0);

    doc.setTextColor(...primary);
    doc.setFont('times', 'bold');
    doc.setFontSize(17);
    doc.text(branding.title, left, 17, { maxWidth: 110 });

    if (branding.slogan) {
      doc.setFont('times', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(branding.slogan, left, 22, { maxWidth: 110 });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    drawHeaderLines(doc, branding.headerLines, {
      left,
      top: branding.slogan ? 27 : 23,
      maxWidth: PAGE_WIDTH - MARGIN - (assets.qr ? 20 : 4) - left,
      lineHeight: 3.4,
      limit: executive.headerHeight - 3,
    });

    if (assets.qr) {
      doc.addImage(assets.qr, PAGE_WIDTH - MARGIN - 16, 10, 16, 16, undefined, 'FAST');
    }

    doc.setFontSize(7.5);
    doc.setTextColor(...primary);
    doc.text(`Réf. ${payload.reference}`, PAGE_WIDTH - MARGIN, 30, { align: 'right' });

    // Double filet : la signature visuelle du modèle.
    doc.setDrawColor(...primary);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, executive.headerHeight - 3, PAGE_WIDTH - MARGIN, executive.headerHeight - 3);
    doc.setDrawColor(...secondary);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, executive.headerHeight - 1.8, PAGE_WIDTH - MARGIN, executive.headerHeight - 1.8);

    return executive.headerHeight + 10;
  },
  titleFont: 'times',
  bodyFont: 'times',
  uppercaseTitle: false,
  sectionTracking: 0.6,
  sectionStyle: 'rule',
  tableStyle: 'hairline',
  highlightStyle: 'sober',
  sectionFill: () => null,
  tableHeadFill: () => null,
  showQr: true,
  showStamp: true,
  showLegalMentions: true,
};

const SKINS: Record<TemplateId, Skin> = {
  premium_classic: classic,
  premium_medical: medical,
  premium_executive: executive,
};

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

/**
 * Ce que l'on fait du document une fois produit.
 *
 * BP28C §6 exige qu'il soit « visualisable avant téléchargement » : l'aperçu
 * n'est donc pas un agrément, c'est une étape du circuit documentaire.
 */
export type DocumentOutput = 'download' | 'preview';

/**
 * Compose le document et renvoie le PDF, sans l'enregistrer.
 *
 * Séparer la composition de l'enregistrement rend le rendu vérifiable : un test
 * peut lire les chaînes réellement écrites dans le fichier, ce qui est la seule
 * façon d'attraper un montant correct en mémoire mais illisible à l'impression.
 * Cela ne dépend d'aucun navigateur.
 */
export const composeDocument = async (
  issuer: DocumentIssuer,
  payload: DocumentPayload,
): Promise<{ doc: jsPDF; filename: string }> => {
  /*
   * Tout le texte est transposé une seule fois, à l'entrée.
   *
   * Le faire ici plutôt qu'à chaque appel de `doc.text` garantit la couverture :
   * aucune chaîne ne peut atteindre le moteur sans être passée par là, et il
   * n'y a pas d'appel à oublier lors d'un ajout ultérieur.
   */
  const branding = sanitizeDeep(brandingOf(issuer, payload.kind));
  const safePayload = sanitizeDeep(payload);
  const skin = SKINS[branding.template];

  const { jsPDF: JsPdf } = await import('jspdf');
  const doc = new JsPdf();

  const [logo, signature, stamp, qr] = await Promise.all([
    loadImage(branding.logoUrl),
    loadImage(branding.signatureUrl),
    skin.showStamp ? loadImage(branding.stampUrl) : Promise.resolve(null),
    skin.showQr
      ? buildQrCode(`${branding.title} — ${DOCUMENT_KINDS[safePayload.kind]} — ${safePayload.reference}`)
      : Promise.resolve(null),
  ]);

  const assets: Assets = { logo, signature, stamp, qr };
  const primary = rgbOr(branding.primaryColor, [0, 51, 102]);

  let y = skin.header(doc, branding, payload, assets);

  /** Passe à la page suivante quand la place manque, en gardant le bandeau. */
  const ensureSpace = (needed: number) => {
    if (y + needed <= PAGE_HEIGHT - 26) return;
    doc.addPage();
    y = skin.header(doc, branding, payload, assets);
  };

  // ----- Titre du document -----
  doc.setTextColor(...primary);
  doc.setFont(skin.titleFont, 'bold');
  doc.setFontSize(skin.titleFont === 'times' ? 18 : 15);
  doc.text(skin.uppercaseTitle ? safePayload.title.toUpperCase() : safePayload.title, MARGIN, y);
  y += skin.titleFont === 'times' ? 7 : 6;

  if (safePayload.subtitle) {
    doc.setFont(skin.bodyFont, skin.titleFont === 'times' ? 'italic' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(safePayload.subtitle, MARGIN, y);
    y += 6;
  }
  y += 2;

  // ----- Bloc mis en évidence -----
  if (safePayload.highlight && safePayload.highlight.length > 0) {
    const rows = Math.ceil(safePayload.highlight.length / 2);
    const boxHeight = rows * 8 + 6;
    ensureSpace(boxHeight + 6);

    const secondary = rgbOr(branding.secondaryColor, [0, 168, 89]);

    if (skin.highlightStyle === 'tinted') {
      // Medical : le bloc patient est l'information la plus regardée d'un
      // document de soins ; il est teinté et souligné d'un filet d'accent.
      doc.setFillColor(...(skin.sectionFill(branding) ?? [241, 245, 249]));
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 2, 2, 'F');
      doc.setFillColor(...secondary);
      doc.rect(MARGIN, y, 1.6, boxHeight, 'F');
    } else if (skin.highlightStyle === 'outline') {
      // Classic : encadré, sans aplat — un formulaire administratif.
      doc.setDrawColor(...primary);
      doc.setLineWidth(0.4);
      doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'S');
    } else {
      // Executive : aucun cadre, deux filets fins qui laissent respirer.
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      doc.line(MARGIN, y + boxHeight, PAGE_WIDTH - MARGIN, y + boxHeight);
    }

    safePayload.highlight.forEach((field, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + (skin.highlightStyle === 'tinted' ? 7 : 5) + column * (CONTENT_WIDTH / 2);
      const lineY = y + 7 + row * 8;

      doc.setFont(skin.bodyFont, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(field.label.toUpperCase(), x, lineY);

      doc.setFont(skin.bodyFont, 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(field.value, x, lineY + 4, { maxWidth: CONTENT_WIDTH / 2 - 12 });
    });

    y += boxHeight + 8;
  }

  // ----- Sections -----
  for (const section of safePayload.sections) {
    if (section.title) {
      ensureSpace(14);
      const fill = skin.sectionFill(branding);
      const secondary = rgbOr(branding.secondaryColor, [0, 168, 89]);

      if (skin.sectionStyle === 'accent-bar') {
        // Medical : bandeau teinté et barre d'accent à gauche.
        if (fill) {
          doc.setFillColor(...fill);
          doc.rect(MARGIN, y - 4.5, CONTENT_WIDTH, 8, 'F');
        }
        doc.setFillColor(...secondary);
        doc.rect(MARGIN, y - 4.5, 1.6, 8, 'F');
      } else if (skin.sectionStyle === 'filled' && fill) {
        doc.setFillColor(...fill);
        doc.rect(MARGIN, y - 4.5, CONTENT_WIDTH, 8, 'F');
      }

      doc.setFont(skin.titleFont, 'bold');
      doc.setFontSize(skin.titleFont === 'times' ? 11 : 10);
      doc.setTextColor(...primary);

      const titleX = MARGIN + (skin.sectionStyle === 'accent-bar' ? 4.5 : 0);
      if (skin.sectionTracking > 0) {
        // Executive : petites capitales espacées, dessinées lettre à lettre —
        // jsPDF n'expose pas d'interlettrage.
        let cursor = titleX;
        for (const letter of section.title.toUpperCase()) {
          doc.text(letter, cursor, y);
          cursor += doc.getTextWidth(letter) + skin.sectionTracking;
        }
      } else {
        doc.text(section.title, titleX, y);
      }

      if (skin.sectionStyle === 'rule') {
        doc.setDrawColor(...primary);
        doc.setLineWidth(skin.titleFont === 'times' ? 0.5 : 0.3);
        doc.line(MARGIN, y + 1.8, PAGE_WIDTH - MARGIN, y + 1.8);
      }

      y += skin.titleFont === 'times' ? 10 : 9;
    }

    /** Colonne où commence la valeur d'un champ. */
    const VALUE_X = MARGIN + 50;

    for (const field of section.fields ?? []) {
      const label = `${field.label} :`;

      doc.setFont(skin.bodyFont, 'normal');
      doc.setFontSize(9);
      const labelWidth = doc.getTextWidth(label);

      /*
       * Un libellé plus large que sa colonne pousse la valeur à la ligne
       * suivante. Auparavant, les deux se chevauchaient : la valeur était
       * toujours écrite à 50 mm de la marge, quelle que soit la place occupée
       * par le libellé.
       */
      const inline = labelWidth < VALUE_X - MARGIN - 3;

      doc.setFont(skin.bodyFont, skin.titleFont === 'times' ? 'bold' : 'normal');
      const wrapped = doc.splitTextToSize(
        field.value,
        inline ? CONTENT_WIDTH - 52 : CONTENT_WIDTH - 4,
      ) as string[];

      // La place est réservée une fois le repli connu : la réserver avant
      // laissait déborder un champ de plusieurs lignes en bas de page.
      const height = Math.max(6, wrapped.length * 5) + (inline ? 0 : 5);
      ensureSpace(height + 2);

      doc.setFont(skin.bodyFont, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, MARGIN, y);

      doc.setFont(skin.bodyFont, skin.titleFont === 'times' ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(wrapped, inline ? VALUE_X : MARGIN + 4, inline ? y : y + 5);

      y += height;
    }

    for (const paragraph of section.paragraphs ?? []) {
      const wrapped = doc.splitTextToSize(paragraph, CONTENT_WIDTH) as string[];
      ensureSpace(wrapped.length * 5 + 3);
      doc.setFont(skin.bodyFont, 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * 5 + 3;
    }

    if (section.table) {
      y = drawTable(doc, section.table, y, branding, skin, ensureSpace);
    }

    y += 4;
  }

  // ----- Total -----
  if (safePayload.total) {
    ensureSpace(16);

    const label = safePayload.total.label.toUpperCase();
    const value = safePayload.total.value;

    /*
     * Le bloc s'adapte à son contenu.
     *
     * Il faisait 78 mm quoi qu'il arrive : un libellé long ou un montant à
     * sept chiffres débordait du cadre, et le montant se retrouvait tronqué au
     * bord de la page. La largeur est désormais celle qu'il faut, bornée par ce
     * que la page peut offrir.
     */
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const labelWidth = doc.getTextWidth(label);
    doc.setFontSize(11);
    const valueWidth = doc.getTextWidth(value);

    const width = Math.min(CONTENT_WIDTH, Math.max(78, labelWidth + valueWidth + 16));
    const x = PAGE_WIDTH - MARGIN - width;

    doc.setFillColor(...primary);
    doc.roundedRect(x, y, width, 12, 2, 2, 'F');

    const text = readableTextOn(branding.primaryColor);
    doc.setTextColor(...text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, x + 5, y + 7.5);
    doc.setFontSize(11);
    doc.text(value, x + width - 5, y + 7.5, { align: 'right' });

    y += 20;
  }

  // ----- Note -----
  if (safePayload.note) {
    const wrapped = doc.splitTextToSize(safePayload.note, CONTENT_WIDTH) as string[];
    ensureSpace(wrapped.length * 4.5 + 4);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 4.5 + 6;
  }

  // ----- Signature et cachet -----
  ensureSpace(34);
  const signX = PAGE_WIDTH - MARGIN - 62;

  if (assets.stamp && skin.showStamp) {
    // Le cachet chevauche légèrement la signature, comme sur un document papier.
    doc.addImage(assets.stamp.data, signX - 26, y, 24, 24, undefined, 'FAST');
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature et cachet', signX, y + 3);

  if (assets.signature) {
    const height = 16;
    doc.addImage(
      assets.signature.data,
      signX,
      y + 5,
      Math.min(height * assets.signature.ratio, 58),
      height,
      undefined,
      'FAST',
    );
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(signX, y + 24, PAGE_WIDTH - MARGIN, y + 24);

  if (branding.signatureHolder) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(branding.signatureHolder, signX, y + 28, { maxWidth: 62 });
  }

  // ----- Pied de page, sur toutes les pages -----
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_HEIGHT - 20, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);

    const lines = skin.showLegalMentions
      ? branding.footerLines
      : branding.footerLines.slice(0, 2);

    let footerY = PAGE_HEIGHT - 16;
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH - 24) as string[];
      for (const part of wrapped.slice(0, 2)) {
        doc.text(part, MARGIN, footerY);
        footerY += 3.2;
      }
    }

    doc.text(`Page ${page} / ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 16, {
      align: 'right',
    });
  }

  const slug = safePayload.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${safePayload.reference}-${slug}.pdf`;

  return { doc, filename };
};

/** Produit le document et le remet à l'utilisateur : aperçu ou téléchargement. */
export const generateDocument = async (
  issuer: DocumentIssuer,
  payload: DocumentPayload,
  output: DocumentOutput = 'download',
): Promise<void> => {
  if (typeof window === 'undefined') return;

  const { doc, filename } = await composeDocument(issuer, payload);

  if (output === 'preview') {
    /*
     * Aperçu dans un onglet.
     *
     * L'onglet est ouvert **avant** d'attendre quoi que ce soit d'asynchrone —
     * ici tout est déjà résolu — sans quoi le navigateur le bloquerait comme
     * une fenêtre surgissante non sollicitée. Si le blocage survient malgré
     * tout, on retombe sur le téléchargement plutôt que de ne rien faire.
     */
    const url = doc.output('bloburl');
    const opened = window.open(String(url), '_blank', 'noopener,noreferrer');
    if (!opened) doc.save(filename);
    return;
  }

  doc.save(filename);
};

/**
 * Tableau.
 *
 * Les colonnes ne se partagent plus la largeur à parts égales : une désignation
 * de quarante caractères recevait autant de place qu'une quantité à deux
 * chiffres, se repliait sur plusieurs lignes physiques, et débordait sur la
 * ligne suivante puisque la hauteur de rangée était fixe. C'est ce qui faisait
 * chevaucher « Abonnement MORACare Enterprise — formule » et le titre de la
 * section suivante.
 *
 * La largeur est désormais proportionnelle au contenu réellement mesuré, bornée
 * par un minimum lisible, et la hauteur d'une rangée suit le nombre de lignes
 * qu'elle produit. Aucune cellule ne peut donc déborder de sa zone.
 */
const drawTable = (
  doc: jsPDF,
  table: DocumentTable,
  startY: number,
  branding: DocumentBranding,
  skin: Skin,
  ensureSpace: (needed: number) => void,
): number => {
  let y = startY;

  if (table.title) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(table.title, MARGIN, y);
    y += 6;
  }

  const numeric = new Set(table.numericColumns ?? []);
  const primary = rgbOr(branding.primaryColor, [0, 51, 102]);

  /** Marge intérieure d'une cellule, de chaque côté. */
  const PADDING = 3;
  const LINE_HEIGHT = 4;
  const MIN_COLUMN = 16;

  /*
   * Largeur des colonnes.
   *
   * On mesure d'abord ce que chaque colonne demanderait sans repli, puis on
   * répartit la largeur disponible au prorata. Une colonne étroite — quantité,
   * prix — n'a pas besoin de plus que son contenu ; le surplus va donc aux
   * colonnes de texte, qui sont celles qui se replient.
   */
  const columnWidths = ((): number[] => {
    doc.setFont(skin.bodyFont, 'normal');
    doc.setFontSize(8.5);

    const natural = table.columns.map((column, index) => {
      doc.setFont(skin.titleFont, 'bold');
      doc.setFontSize(8);
      let widest = doc.getTextWidth(column);

      doc.setFont(skin.bodyFont, 'normal');
      doc.setFontSize(8.5);
      for (const row of table.rows) {
        widest = Math.max(widest, doc.getTextWidth(row[index] ?? ''));
      }

      /*
       * Un demi-millimètre de jeu.
       *
       * Sans lui, la colonne mesure exactement la largeur de son contenu le
       * plus large, et `splitTextToSize` — qui compare au millième — replie ce
       * contenu sur deux lignes. Les montants à six chiffres se coupaient tous
       * ainsi, alors que ceux à cinq chiffres, plus étroits, passaient.
       */
      return widest + PADDING * 2 + 0.5;
    });

    /*
     * Plancher d'une colonne : la largeur de son mot d'en-tête le plus long.
     *
     * En deçà, jsPDF coupe au milieu du mot — « Quantité » devenait
     * « Quantit » suivi de « é » sur la ligne d'en dessous. Un en-tête tronqué
     * rend le tableau indéchiffrable, alors qu'un libellé de cellule replié sur
     * deux lignes reste parfaitement lisible.
     */
    doc.setFont(skin.titleFont, 'bold');
    doc.setFontSize(8);
    const floors = table.columns.map((column) => {
      const longest = column
        .split(/\s+/)
        .reduce((widest, word) => Math.max(widest, doc.getTextWidth(word)), 0);
      return Math.min(CONTENT_WIDTH / table.columns.length, longest + PADDING * 2);
    });

    const total = natural.reduce((sum, width) => sum + width, 0);

    // Tout tient : on distribue le reliquat aux colonnes les plus larges, qui
    // sont celles où le texte respire le moins.
    if (total <= CONTENT_WIDTH) {
      const surplus = CONTENT_WIDTH - total;
      return natural.map((width) => width + (surplus * width) / total);
    }

    /*
     * Partage équitable, du plus étroit au plus large.
     *
     * Chaque colonne reçoit ce dont elle a besoin tant que cela ne dépasse pas
     * la part qui lui revient ; ce qu'elle n'utilise pas profite aux suivantes.
     * Les colonnes courtes — quantité, prix, montant — gardent donc leur
     * largeur naturelle, et seule la désignation, qui est la cause du manque de
     * place, se replie.
     *
     * Une répartition strictement proportionnelle faisait l'inverse : elle
     * rabotait chaque colonne du même pourcentage, si bien qu'un montant de
     * onze caractères se retrouvait coupé en deux à cause d'une désignation
     * située trois colonnes plus loin.
     */
    const widths = new Array<number>(natural.length).fill(0);
    const order = natural.map((_, index) => index).sort((a, b) => natural[a] - natural[b]);

    let remaining = CONTENT_WIDTH;
    let left = order.length;

    for (const index of order) {
      const share = remaining / left;
      widths[index] = Math.max(
        Math.min(natural[index], share),
        // Le plancher prime : mieux vaut mordre sur une autre colonne que
        // rendre un en-tête illisible.
        Math.min(floors[index], MIN_COLUMN + PADDING * 2),
      );
      remaining -= widths[index];
      left -= 1;
    }

    return widths;
  })();

  /** Abscisse du bord gauche de chaque colonne. */
  const columnX = columnWidths.reduce<number[]>((positions, _width, index) => {
    positions.push(index === 0 ? MARGIN : positions[index - 1] + columnWidths[index - 1]);
    return positions;
  }, []);

  /** Découpe une rangée en lignes physiques, colonne par colonne. */
  const wrapRow = (row: readonly string[]): string[][] => {
    doc.setFont(skin.bodyFont, 'normal');
    doc.setFontSize(8.5);
    return columnWidths.map(
      (width, index) =>
        doc.splitTextToSize(row[index] ?? '', width - PADDING * 2) as string[],
    );
  };

  const drawHead = () => {
    const fill = skin.tableHeadFill(branding);
    const headLines = wrapHead();
    const headHeight = Math.max(8, headLines * LINE_HEIGHT + 4);

    if (fill) {
      const text = readableTextOn(
        `#${fill.map((c) => c.toString(16).padStart(2, '0')).join('')}`,
      );
      doc.setFillColor(...fill);
      doc.rect(MARGIN, y, CONTENT_WIDTH, headHeight, 'F');
      doc.setTextColor(...text);
    } else {
      // Executive : pas d'aplat, un filet appuyé sous l'en-tête suffit.
      doc.setTextColor(...primary);
      doc.setDrawColor(...primary);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y + headHeight - 0.4, PAGE_WIDTH - MARGIN, y + headHeight - 0.4);
    }

    doc.setFont(skin.titleFont, 'bold');
    doc.setFontSize(8);

    table.columns.forEach((column, index) => {
      const width = columnWidths[index];
      const wrapped = doc.splitTextToSize(column, width - PADDING * 2) as string[];
      const x = numeric.has(index)
        ? columnX[index] + width - PADDING
        : columnX[index] + PADDING;

      doc.text(wrapped, x, y + 5.2, { align: numeric.has(index) ? 'right' : 'left' });
    });

    y += headHeight;
    return headHeight;
  };

  /** Nombre de lignes physiques de l'en-tête, une fois replié. */
  const wrapHead = (): number => {
    doc.setFont(skin.titleFont, 'bold');
    doc.setFontSize(8);
    return table.columns.reduce((most, column, index) => {
      const wrapped = doc.splitTextToSize(column, columnWidths[index] - PADDING * 2) as string[];
      return Math.max(most, wrapped.length);
    }, 1);
  };

  ensureSpace(24);
  let tableTop = y;
  drawHead();
  // Ordonnées des filets horizontaux, pour la grille du modèle Classic. Les
  // déduire d'un pas fixe était faux dès qu'une rangée occupait deux lignes.
  let rules: number[] = [y];

  table.rows.forEach((row, rowIndex) => {
    const cells = wrapRow(row);
    const height = Math.max(7, Math.max(...cells.map((lines) => lines.length)) * LINE_HEIGHT + 3);

    // La rangée passe entière à la page suivante : la couper en deux la rendrait
    // illisible, et le total ne se rattacherait plus à sa désignation.
    if (y + height > PAGE_HEIGHT - 26) {
      finishBorder(tableTop, rules);
      ensureSpace(24);
      tableTop = y;
      drawHead();
      rules = [y];
    }

    if (skin.tableStyle === 'zebra' && rowIndex % 2 === 1) {
      // Medical : alternance discrète — suivre une ligne sur toute la largeur
      // est pénible sans repère.
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, height, 'F');
    }

    if (skin.tableStyle === 'hairline') {
      // Executive : un filet très clair entre les lignes, rien d'autre.
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.line(MARGIN, y + height, PAGE_WIDTH - MARGIN, y + height);
    }

    doc.setFont(skin.bodyFont, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    cells.forEach((lines, index) => {
      const width = columnWidths[index];
      const x = numeric.has(index)
        ? columnX[index] + width - PADDING
        : columnX[index] + PADDING;

      doc.text(lines, x, y + 4.8, { align: numeric.has(index) ? 'right' : 'left' });
    });

    y += height;
    rules.push(y);
  });

  finishBorder(tableTop, rules);

  /** Grille du modèle Classic, tracée une fois les hauteurs connues. */
  function finishBorder(top: number, horizontals: number[]) {
    if (skin.tableStyle !== 'bordered' || y <= top) return;

    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, top, CONTENT_WIDTH, y - top, 'S');

    for (const rule of horizontals) {
      if (rule > top && rule < y) doc.line(MARGIN, rule, PAGE_WIDTH - MARGIN, rule);
    }
    for (let column = 1; column < table.columns.length; column += 1) {
      doc.line(columnX[column], top, columnX[column], y);
    }
  }

  return y + 2;
};
