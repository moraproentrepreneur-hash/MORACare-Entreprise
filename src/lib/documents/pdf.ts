import type jsPDF from 'jspdf';
import {
  DOCUMENT_KINDS,
  brandingOf,
  hexToRgb,
  readableTextOn,
  type DocumentBranding,
  type DocumentKind,
  type TemplateId,
} from './branding';
import type { EstablishmentProfile } from '@/services/establishment.service';
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
    let y = 19;
    for (const line of branding.headerLines) {
      doc.text(line, left, y, { maxWidth: 118 });
      y += 4;
    }

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
    let y = 17;
    for (const line of branding.headerLines) {
      doc.text(line, left, y, { maxWidth: 118 });
      y += 3.8;
    }

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
    let y = branding.slogan ? 27 : 23;
    for (const line of branding.headerLines) {
      doc.text(line, left, y, { maxWidth: 118 });
      y += 3.6;
    }

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

export const generateDocument = async (
  profile: EstablishmentProfile,
  payload: DocumentPayload,
  output: DocumentOutput = 'download',
): Promise<void> => {
  if (typeof window === 'undefined') return;

  const branding = brandingOf(profile, payload.kind);
  const skin = SKINS[branding.template];

  const { jsPDF: JsPdf } = await import('jspdf');
  const doc = new JsPdf();

  const [logo, signature, stamp, qr] = await Promise.all([
    loadImage(branding.logoUrl),
    loadImage(branding.signatureUrl),
    skin.showStamp ? loadImage(branding.stampUrl) : Promise.resolve(null),
    skin.showQr
      ? buildQrCode(`${branding.title} — ${DOCUMENT_KINDS[payload.kind]} — ${payload.reference}`)
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
  doc.text(skin.uppercaseTitle ? payload.title.toUpperCase() : payload.title, MARGIN, y);
  y += skin.titleFont === 'times' ? 7 : 6;

  if (payload.subtitle) {
    doc.setFont(skin.bodyFont, skin.titleFont === 'times' ? 'italic' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(payload.subtitle, MARGIN, y);
    y += 6;
  }
  y += 2;

  // ----- Bloc mis en évidence -----
  if (payload.highlight && payload.highlight.length > 0) {
    const rows = Math.ceil(payload.highlight.length / 2);
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

    payload.highlight.forEach((field, index) => {
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
  for (const section of payload.sections) {
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

    for (const field of section.fields ?? []) {
      ensureSpace(7);
      doc.setFont(skin.bodyFont, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${field.label} :`, MARGIN, y);

      doc.setFont(skin.bodyFont, skin.titleFont === 'times' ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      const wrapped = doc.splitTextToSize(field.value, CONTENT_WIDTH - 52) as string[];
      doc.text(wrapped, MARGIN + 50, y);
      y += Math.max(6, wrapped.length * 5);
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
  if (payload.total) {
    ensureSpace(16);
    const width = 78;
    const x = PAGE_WIDTH - MARGIN - width;

    doc.setFillColor(...primary);
    doc.roundedRect(x, y, width, 12, 2, 2, 'F');

    const text = readableTextOn(branding.primaryColor);
    doc.setTextColor(...text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(payload.total.label.toUpperCase(), x + 4, y + 7.5);
    doc.setFontSize(11);
    doc.text(payload.total.value, x + width - 4, y + 7.5, { align: 'right' });

    y += 20;
  }

  // ----- Note -----
  if (payload.note) {
    const wrapped = doc.splitTextToSize(payload.note, CONTENT_WIDTH) as string[];
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

  const slug = payload.title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${payload.reference}-${slug}.pdf`;

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

/** Tableau. Les colonnes se partagent la largeur utile à parts égales. */
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

  const columnWidth = CONTENT_WIDTH / table.columns.length;
  const numeric = new Set(table.numericColumns ?? []);

  const primary = rgbOr(branding.primaryColor, [0, 51, 102]);

  const drawHead = () => {
    const fill = skin.tableHeadFill(branding);

    if (fill) {
      const text = readableTextOn(
        `#${fill.map((c) => c.toString(16).padStart(2, '0')).join('')}`,
      );
      doc.setFillColor(...fill);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
      doc.setTextColor(...text);
    } else {
      // Executive : pas d'aplat, un filet appuyé sous l'en-tête suffit.
      doc.setTextColor(...primary);
      doc.setDrawColor(...primary);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y + 7.6, PAGE_WIDTH - MARGIN, y + 7.6);
    }

    doc.setFont(skin.titleFont, 'bold');
    doc.setFontSize(8);

    table.columns.forEach((column, index) => {
      const x = MARGIN + index * columnWidth;
      doc.text(column, numeric.has(index) ? x + columnWidth - 3 : x + 3, y + 5.5, {
        align: numeric.has(index) ? 'right' : 'left',
        maxWidth: columnWidth - 6,
      });
    });

    y += 8;
  };

  ensureSpace(20);
  const tableTop = y;
  drawHead();

  doc.setFont(skin.bodyFont, 'normal');
  doc.setFontSize(8.5);

  table.rows.forEach((row, rowIndex) => {
    if (y + 7 > PAGE_HEIGHT - 26) {
      ensureSpace(20);
      drawHead();
      doc.setFont(skin.bodyFont, 'normal');
      doc.setFontSize(8.5);
    }

    if (skin.tableStyle === 'zebra' && rowIndex % 2 === 1) {
      // Medical : alternance discrète — suivre une ligne sur toute la largeur
      // est pénible sans repère.
      doc.setFillColor(248, 250, 252);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
    }

    if (skin.tableStyle === 'hairline') {
      // Executive : un filet très clair entre les lignes, rien d'autre.
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.1);
      doc.line(MARGIN, y + 7, PAGE_WIDTH - MARGIN, y + 7);
    }

    doc.setTextColor(30, 41, 59);
    row.forEach((cell, index) => {
      const x = MARGIN + index * columnWidth;
      doc.text(cell, numeric.has(index) ? x + columnWidth - 3 : x + 3, y + 5, {
        align: numeric.has(index) ? 'right' : 'left',
        maxWidth: columnWidth - 6,
      });
    });

    y += 7;
  });

  if (skin.tableStyle === 'bordered') {
    // Classic : grille complète, comme un imprimé administratif.
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.rect(MARGIN, tableTop, CONTENT_WIDTH, y - tableTop, 'S');

    for (let row = tableTop + 8; row < y; row += 7) {
      doc.line(MARGIN, row, PAGE_WIDTH - MARGIN, row);
    }
    for (let column = 1; column < table.columns.length; column += 1) {
      const x = MARGIN + column * columnWidth;
      doc.line(x, tableTop, x, y);
    }
  }

  return y + 2;
};
