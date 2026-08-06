import { failIf, getClient } from './base.service';
import type { Establishment, EstablishmentType } from '@/types';
import type { Json } from '@/types/database';

/**
 * Établissements clients de la plateforme SaaS (BP30, UG01 §5-6).
 *
 * Réservé au Super Admin : la politique `establishments_super_admin` est la
 * seule qui autorise l'écriture. Un responsable d'établissement ne peut que
 * lire le sien.
 */

export interface EstablishmentInput {
  name: string;
  type: EstablishmentType;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  subscription_plan?: string;
  max_users?: number;
}

export const listEstablishments = async (): Promise<Establishment[]> => {
  const { data, error } = await getClient()
    .from('establishments')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  failIf(error, 'Chargement des établissements');

  return (data ?? []).map((row) => ({
    id: row.id,
    business_reference: row.business_reference,
    name: row.name,
    type: row.type,
    email: row.email,
    phone: row.phone,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? '',
    subscription_status: row.subscription_status,
    subscription_plan: row.subscription_plan ?? '',
    max_users: row.max_users ?? 0,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
};

// ---------------------------------------------------------------------------
// Profil complet de l'établissement
// ---------------------------------------------------------------------------

/**
 * Identité institutionnelle, telle que la décrivent BP28A §5, BP28C §4 et §11
 * et UG02 §16.
 *
 * Ces champs alimentent l'en-tête des documents produits, les factures et
 * l'affichage de l'application. Ils sont tenus à jour par le responsable de
 * l'établissement, jamais par MORA Shawiri : c'est lui qui connaît son numéro
 * d'autorisation et ses horaires.
 */

export type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche',
};

export const DAY_ORDER: readonly DayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export interface DayHours {
  closed: boolean;
  open: string;
  close: string;
}

export type OpeningHours = Record<DayKey, DayHours>;

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { closed: false, open: '08:00', close: '17:00' },
  tuesday: { closed: false, open: '08:00', close: '17:00' },
  wednesday: { closed: false, open: '08:00', close: '17:00' },
  thursday: { closed: false, open: '08:00', close: '17:00' },
  friday: { closed: false, open: '08:00', close: '17:00' },
  saturday: { closed: false, open: '08:00', close: '12:00' },
  sunday: { closed: true, open: '08:00', close: '12:00' },
};

export interface EstablishmentProfile {
  id: string;
  businessReference: string;

  // Identité
  name: string;
  legalName: string;
  shortName: string;
  slogan: string;
  type: EstablishmentType;
  logoUrl: string;
  bannerUrl: string;

  // Informations légales
  authorizationNumber: string;
  tradeRegister: string;
  taxId: string;
  legalMentions: string;

  // Coordonnées
  phone: string;
  phoneSecondary: string;
  whatsapp: string;
  email: string;
  supportEmail: string;
  website: string;
  address: string;
  city: string;
  island: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;

  // Préférences
  currency: string;
  timezone: string;
  locale: string;
  openingHours: OpeningHours;
  specialties: string[];

  // Documents et identité visuelle
  primaryColor: string;
  secondaryColor: string;
  /** Modèle documentaire par défaut (BP28C §9). */
  pdfTemplate: string;
  /** Modèle attribué à certains types de documents. */
  documentTemplates: Record<string, string> | null;
  signatureUrl: string;
  signatureHolder: string;
  stampUrl: string;
}

/** Complète les jours manquants : la base peut contenir un objet partiel. */
const toOpeningHours = (value: unknown): OpeningHours => {
  if (!value || typeof value !== 'object') return { ...DEFAULT_OPENING_HOURS };

  const source = value as Partial<Record<DayKey, Partial<DayHours>>>;
  const result = {} as OpeningHours;

  for (const day of DAY_ORDER) {
    const entry = source[day];
    result[day] = {
      closed: entry?.closed ?? DEFAULT_OPENING_HOURS[day].closed,
      open: entry?.open ?? DEFAULT_OPENING_HOURS[day].open,
      close: entry?.close ?? DEFAULT_OPENING_HOURS[day].close,
    };
  }

  return result;
};

export const getEstablishmentProfile = async (
  establishmentId: string,
): Promise<EstablishmentProfile | null> => {
  const { data, error } = await getClient()
    .from('establishments')
    .select('*')
    .eq('id', establishmentId)
    .is('deleted_at', null)
    .maybeSingle();

  failIf(error, "Chargement du profil de l'établissement");
  if (!data) return null;

  return {
    id: data.id,
    businessReference: data.business_reference,

    name: data.name,
    legalName: data.legal_name ?? data.name,
    shortName: data.short_name ?? '',
    slogan: data.slogan ?? '',
    type: data.type,
    logoUrl: data.logo_url ?? '',
    bannerUrl: data.banner_url ?? '',

    authorizationNumber: data.authorization_number ?? '',
    tradeRegister: data.trade_register ?? '',
    taxId: data.tax_id ?? '',
    legalMentions: data.legal_mentions ?? '',

    phone: data.phone,
    phoneSecondary: data.phone_secondary ?? '',
    whatsapp: data.whatsapp ?? '',
    email: data.email,
    supportEmail: data.support_email ?? '',
    website: data.website ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    island: data.island ?? '',
    postalCode: data.postal_code ?? '',
    country: data.country ?? '',
    latitude: data.latitude === null ? null : Number(data.latitude),
    longitude: data.longitude === null ? null : Number(data.longitude),

    currency: data.currency,
    timezone: data.timezone,
    locale: data.locale,
    openingHours: toOpeningHours(data.opening_hours),
    specialties: data.specialties ?? [],

    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    pdfTemplate: data.pdf_template,
    documentTemplates:
      data.document_templates && typeof data.document_templates === 'object'
        ? (data.document_templates as Record<string, string>)
        : null,
    signatureUrl: data.signature_url ?? '',
    signatureHolder: data.signature_holder ?? '',
    stampUrl: data.stamp_url ?? '',
  };
};

/**
 * Enregistre le profil.
 *
 * Les colonnes commerciales — formule, statut d'abonnement, plafond
 * d'utilisateurs — ne figurent volontairement pas ici : un trigger les restitue
 * de toute façon si un autre qu'un Super Admin tentait d'y toucher.
 */
export const saveEstablishmentProfile = async (
  establishmentId: string,
  profile: EstablishmentProfile,
): Promise<void> => {
  const trimmed = (value: string): string | null => {
    const cleaned = value.trim();
    return cleaned === '' ? null : cleaned;
  };

  const { error } = await getClient()
    .from('establishments')
    .update({
      name: profile.name.trim(),
      legal_name: trimmed(profile.legalName),
      short_name: trimmed(profile.shortName),
      slogan: trimmed(profile.slogan),
      type: profile.type,
      logo_url: trimmed(profile.logoUrl),
      banner_url: trimmed(profile.bannerUrl),

      authorization_number: trimmed(profile.authorizationNumber),
      trade_register: trimmed(profile.tradeRegister),
      tax_id: trimmed(profile.taxId),
      legal_mentions: trimmed(profile.legalMentions),

      phone: profile.phone.trim(),
      phone_secondary: trimmed(profile.phoneSecondary),
      whatsapp: trimmed(profile.whatsapp),
      email: profile.email.trim(),
      support_email: trimmed(profile.supportEmail),
      website: trimmed(profile.website),
      address: trimmed(profile.address),
      city: trimmed(profile.city),
      island: trimmed(profile.island),
      postal_code: trimmed(profile.postalCode),
      country: trimmed(profile.country),
      latitude: profile.latitude,
      longitude: profile.longitude,

      currency: profile.currency,
      timezone: profile.timezone,
      locale: profile.locale,
      opening_hours: profile.openingHours as unknown as Json,
      specialties: profile.specialties,

      primary_color: profile.primaryColor,
      secondary_color: profile.secondaryColor,
      pdf_template: profile.pdfTemplate,
      document_templates: (profile.documentTemplates ?? null) as Json,
      signature_url: trimmed(profile.signatureUrl),
      signature_holder: trimmed(profile.signatureHolder),
      stamp_url: trimmed(profile.stampUrl),
    })
    .eq('id', establishmentId);

  failIf(error, "Mise à jour de l'établissement");
};

// ---------------------------------------------------------------------------
// Fichiers d'identité
// ---------------------------------------------------------------------------

export type AssetKind = 'logo' | 'banner' | 'signature' | 'stamp';

/** 2 Mio, comme la limite posée sur le compartiment. */
export const MAX_ASSET_BYTES = 2 * 1024 * 1024;

export const ACCEPTED_ASSET_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

/**
 * Téléverse un fichier d'identité et renvoie son URL publique.
 *
 * Le chemin commence par l'identifiant de l'établissement : c'est ce segment
 * que la politique de stockage confronte à celui de l'utilisateur. Le nom porte
 * un horodatage pour que le remplacement d'un logo ne soit pas masqué par le
 * cache du navigateur.
 */
export const uploadEstablishmentAsset = async (
  establishmentId: string,
  kind: AssetKind,
  file: File,
): Promise<string> => {
  if (file.size > MAX_ASSET_BYTES) {
    throw new Error('Le fichier dépasse 2 Mio.');
  }
  if (!ACCEPTED_ASSET_TYPES.includes(file.type)) {
    throw new Error('Format non accepté. Utilisez PNG, JPEG, WebP ou SVG.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const objectPath = `${establishmentId}/${kind}-${Date.now()}.${extension}`;

  const client = getClient();
  const { error } = await client.storage
    .from('establishment-assets')
    .upload(objectPath, file, { upsert: true, contentType: file.type });

  if (error) {
    throw new Error(`Téléversement impossible : ${error.message}`);
  }

  const { data } = client.storage.from('establishment-assets').getPublicUrl(objectPath);
  return data.publicUrl;
};

/**
 * Crée un établissement et renvoie son identifiant.
 *
 * L'identifiant est indispensable à l'appelant : la création se poursuit
 * immédiatement par celle de l'administrateur de l'établissement, sans quoi
 * personne ne pourrait s'y connecter.
 */
export const createEstablishment = async (input: EstablishmentInput): Promise<Establishment> => {
  const { data, error } = await getClient()
    .from('establishments')
    .insert({
      name: input.name,
      type: input.type,
      email: input.email,
      phone: input.phone,
      address: input.address ?? null,
      city: input.city ?? null,
      country: input.country ?? 'Comores',
      subscription_plan: input.subscription_plan ?? null,
      max_users: input.max_users ?? 50,
      subscription_status: 'trial',
      is_active: true,
    })
    .select('*')
    .single();

  failIf(error, "Création de l'établissement");

  const row = data as NonNullable<typeof data>;
  return {
    id: row.id,
    business_reference: row.business_reference,
    name: row.name,
    type: row.type,
    email: row.email,
    phone: row.phone,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? '',
    subscription_status: row.subscription_status,
    subscription_plan: row.subscription_plan ?? '',
    max_users: row.max_users ?? 0,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Suspend ou réactive un établissement (UG01 §5-6).
 *
 * BP30 BR-290 : une suspension ne supprime jamais les données de
 * l'établissement, elle en bloque seulement l'accès.
 */
export const setEstablishmentActive = async (
  establishmentId: string,
  isActive: boolean,
): Promise<void> => {
  const { error } = await getClient()
    .from('establishments')
    .update({
      is_active: isActive,
      subscription_status: isActive ? 'active' : 'suspended',
    })
    .eq('id', establishmentId);

  failIf(error, "Mise à jour du statut de l'établissement");
};
