import { failIf, getClient } from './base.service';
import type { DocumentIssuer } from '@/lib/documents/branding';

/**
 * Identité documentaire de MORA Shawiri, éditeur de la plateforme (BP28C, BP30).
 *
 * Strictement séparée de celle des établissements : elle habille les documents
 * que l'éditeur émet — factures d'abonnement, reçus, courriers de plateforme —
 * et un établissement ne peut pas la modifier. Il peut en revanche la lire, ce
 * qui est nécessaire : la facture d'abonnement qu'il télécharge depuis son
 * espace est émise par l'éditeur et doit porter son en-tête.
 */

export interface PlatformIdentity extends DocumentIssuer {
  id: string;
  shortName: string;
  updatedAt: string;
}

/**
 * Identité de repli.
 *
 * Utilisée tant que la table n'a pas répondu — au premier rendu, ou si la
 * lecture échoue. Un document sans émetteur n'a aucune valeur ; mieux vaut
 * l'identité officielle de l'éditeur qu'un en-tête vide.
 */
export const FALLBACK_PLATFORM_IDENTITY: PlatformIdentity = {
  id: '',
  name: 'MORACare Enterprise',
  legalName: 'MORA Shawiri',
  shortName: 'MORACare',
  slogan: "Le système d'information hospitalier des établissements de santé",
  logoUrl: '',
  authorizationNumber: '',
  tradeRegister: '',
  taxId: '',
  legalMentions:
    'MORACare Enterprise est édité par MORA Shawiri. Document émis par voie électronique.',
  phone: '',
  phoneSecondary: '',
  whatsapp: '',
  email: 'contact@morashawiri.com',
  supportEmail: '',
  website: 'www.moracare.km',
  address: '',
  postalCode: '',
  city: '',
  island: '',
  country: 'Comores',
  primaryColor: '#003366',
  secondaryColor: '#00A859',
  signatureUrl: '',
  signatureHolder: '',
  stampUrl: '',
  currency: 'KMF',
  pdfTemplate: 'premium_executive',
  documentTemplates: null,
  updatedAt: '',
};

interface PlatformRow {
  id: string;
  name: string;
  legal_name: string;
  short_name: string;
  slogan: string;
  logo_url: string;
  authorization_number: string;
  trade_register: string;
  tax_id: string;
  legal_mentions: string;
  phone: string;
  phone_secondary: string;
  whatsapp: string;
  email: string;
  support_email: string;
  website: string;
  address: string;
  postal_code: string;
  city: string;
  island: string;
  country: string;
  primary_color: string;
  secondary_color: string;
  signature_url: string;
  signature_holder: string;
  stamp_url: string;
  pdf_template: string;
  document_templates: unknown;
  currency: string;
  updated_at: string;
}

const asTemplateMap = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => typeof v === 'string' && v !== '',
  ) as [string, string][];

  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const toIdentity = (row: PlatformRow): PlatformIdentity => ({
  id: row.id,
  name: row.name,
  legalName: row.legal_name,
  shortName: row.short_name,
  slogan: row.slogan,
  logoUrl: row.logo_url,
  authorizationNumber: row.authorization_number,
  tradeRegister: row.trade_register,
  taxId: row.tax_id,
  legalMentions: row.legal_mentions,
  phone: row.phone,
  phoneSecondary: row.phone_secondary,
  whatsapp: row.whatsapp,
  email: row.email,
  supportEmail: row.support_email,
  website: row.website,
  address: row.address,
  postalCode: row.postal_code,
  city: row.city,
  island: row.island,
  country: row.country,
  primaryColor: row.primary_color,
  secondaryColor: row.secondary_color,
  signatureUrl: row.signature_url,
  signatureHolder: row.signature_holder,
  stampUrl: row.stamp_url,
  currency: row.currency,
  pdfTemplate: row.pdf_template,
  documentTemplates: asTemplateMap(row.document_templates),
  updatedAt: row.updated_at,
});

export const getPlatformIdentity = async (): Promise<PlatformIdentity> => {
  const { data, error } = await getClient()
    .from('platform_identity')
    .select('*')
    .limit(1)
    .maybeSingle();

  failIf(error, "Chargement de l'identité de la plateforme");

  return data ? toIdentity(data as unknown as PlatformRow) : FALLBACK_PLATFORM_IDENTITY;
};

export const savePlatformIdentity = async (
  identity: PlatformIdentity,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('platform_identity')
    .update({
      name: identity.name.trim(),
      legal_name: identity.legalName.trim(),
      short_name: identity.shortName.trim(),
      slogan: identity.slogan.trim(),
      logo_url: identity.logoUrl,
      authorization_number: identity.authorizationNumber.trim(),
      trade_register: identity.tradeRegister.trim(),
      tax_id: identity.taxId.trim(),
      legal_mentions: identity.legalMentions.trim(),
      phone: identity.phone.trim(),
      phone_secondary: identity.phoneSecondary.trim(),
      whatsapp: identity.whatsapp.trim(),
      email: identity.email.trim(),
      support_email: identity.supportEmail.trim(),
      website: identity.website.trim(),
      address: identity.address.trim(),
      postal_code: identity.postalCode.trim(),
      city: identity.city.trim(),
      island: identity.island.trim(),
      country: identity.country.trim(),
      primary_color: identity.primaryColor,
      secondary_color: identity.secondaryColor,
      signature_url: identity.signatureUrl,
      signature_holder: identity.signatureHolder.trim(),
      stamp_url: identity.stampUrl,
      pdf_template: identity.pdfTemplate,
      document_templates: identity.documentTemplates,
      currency: identity.currency,
      updated_by: userId,
    })
    .eq('id', identity.id);

  failIf(error, "Enregistrement de l'identité de la plateforme");
};

/**
 * Dépose un visuel de la plateforme et renvoie son adresse publique.
 *
 * Compartiment distinct de celui des établissements : leurs politiques
 * cloisonnent par dossier d'établissement, et l'éditeur n'en a aucun.
 */
export const uploadPlatformAsset = async (
  kind: 'logo' | 'signature' | 'stamp',
  file: File,
): Promise<string> => {
  const client = getClient();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  // L'horodatage évite qu'un navigateur serve l'ancien visuel depuis son cache
  // après un remplacement.
  const path = `${kind}-${Date.now()}.${extension}`;

  const { error } = await client.storage
    .from('platform-assets')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error(`Dépôt du fichier impossible : ${error.message}`);
  }

  const { data } = client.storage.from('platform-assets').getPublicUrl(path);
  return data.publicUrl;
};
