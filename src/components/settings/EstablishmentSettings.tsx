'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Check,
  Clock,
  FileText,
  Globe2,
  ImagePlus,
  Landmark,
  LayoutTemplate,
  Loader2,
  MapPin,
  Palette,
  Phone,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { recordAudit } from '@/services/audit.service';
import {
  DAY_LABELS,
  DAY_ORDER,
  getEstablishmentProfile,
  saveEstablishmentProfile,
  uploadEstablishmentAsset,
  type AssetKind,
  type DayKey,
  type EstablishmentProfile,
} from '@/services/establishment.service';
import { useBranding } from '@/context/BrandingContext';
import {
  DOCUMENT_KINDS,
  TEMPLATES,
  TEMPLATE_IDS,
  buildFooterLines,
  buildHeaderLines,
} from '@/lib/documents/branding';
import type { EstablishmentType } from '@/types';

/**
 * Profil de l'établissement (BP28A §5, BP28C §4 et §11, UG02 §16).
 *
 * Ce n'est pas la fiche de création tenue par MORA Shawiri : c'est l'identité
 * institutionnelle, celle qui figure en tête des ordonnances, sur les factures
 * et dans les documents remis aux patients. Elle appartient au responsable de
 * l'établissement, seul à connaître son numéro d'autorisation, ses horaires ou
 * le nom de son signataire.
 *
 * Les champs commerciaux — formule, statut, plafond d'utilisateurs — n'y
 * figurent pas : ils relèvent de l'éditeur, et un trigger les protège en base.
 */

const TYPE_LABELS: Record<EstablishmentType, string> = {
  cabinet: 'Cabinet médical',
  clinique: 'Clinique',
  centre_medical: 'Centre médical',
  hopital: 'Hôpital',
  laboratoire: 'Laboratoire',
  imagerie: "Centre d'imagerie",
  ong: 'ONG médicale',
};

/** Fuseaux utiles à la zone desservie. La liste reste courte volontairement. */
const TIMEZONES = [
  { value: 'Indian/Comoro', label: 'Comores (UTC+3)' },
  { value: 'Africa/Nairobi', label: 'Afrique de l’Est (UTC+3)' },
  { value: 'Indian/Antananarivo', label: 'Madagascar (UTC+3)' },
  { value: 'Africa/Dar_es_Salaam', label: 'Tanzanie (UTC+3)' },
  { value: 'Europe/Paris', label: 'France (UTC+1/+2)' },
  { value: 'UTC', label: 'Temps universel (UTC)' },
];

const ISLANDS = [
  { value: 'Ngazidja', label: 'Ngazidja (Grande Comore)' },
  { value: 'Ndzuwani', label: 'Ndzuwani (Anjouan)' },
  { value: 'Mwali', label: 'Mwali (Mohéli)' },
  { value: 'Maore', label: 'Maore (Mayotte)' },
  { value: 'Autre', label: 'Autre / hors Comores' },
];

type Section = 'identity' | 'legal' | 'contact' | 'regional' | 'hours' | 'documents';

const SECTIONS: readonly { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'identity', label: 'Identité', icon: Building2 },
  { id: 'legal', label: 'Informations légales', icon: Landmark },
  { id: 'contact', label: 'Coordonnées', icon: Phone },
  { id: 'regional', label: 'Préférences', icon: Globe2 },
  { id: 'hours', label: 'Horaires & spécialités', icon: Clock },
  { id: 'documents', label: 'Documents & identité visuelle', icon: FileText },
];

const FIELD =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-mora-green disabled:opacity-60';

export const EstablishmentSettings: React.FC = () => {
  const { user } = useAuth();
  const { canUpdate } = usePermissions();
  const { refresh: refreshBranding } = useBranding();

  const [profile, setProfile] = useState<EstablishmentProfile | null>(null);
  const [draft, setDraft] = useState<EstablishmentProfile | null>(null);
  const [section, setSection] = useState<Section>('identity');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [specialtyInput, setSpecialtyInput] = useState('');

  const editable = canUpdate('settings');

  const load = useCallback(async () => {
    if (!user?.establishment_id) {
      setIsLoading(false);
      return;
    }

    try {
      const found = await getEstablishmentProfile(user.establishment_id);
      setProfile(found);
      setDraft(found);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = JSON.stringify(profile) !== JSON.stringify(draft);

  const update = (patch: Partial<EstablishmentProfile>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  // Aperçu composé à la volée : ce que l'on voit ici est exactement ce que le
  // moteur documentaire imprimera, puisqu'il appelle les mêmes fonctions.
  const headerPreview = useMemo(() => (draft ? buildHeaderLines(draft) : []), [draft]);
  const footerPreview = useMemo(() => (draft ? buildFooterLines(draft) : []), [draft]);

  const handleSave = async () => {
    if (!draft || !user?.establishment_id) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);

    try {
      await saveEstablishmentProfile(user.establishment_id, draft);
      await recordAudit(
        {
          action: 'establishment_profile_updated',
          entityName: 'establishments',
          entityId: user.establishment_id,
          newValues: { name: draft.name, legalName: draft.legalName },
        },
        user.establishment_id,
        user.id,
      );
      await load();
      // Les couleurs de l'interface suivent immédiatement : sans cela, il
      // faudrait recharger la page pour voir l'effet du réglage.
      await refreshBranding();
      setNotice('Le profil de votre établissement est enregistré.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const addSpecialty = () => {
    const value = specialtyInput.trim();
    if (!value || !draft) return;
    // Comparaison insensible à la casse : « Cardiologie » et « cardiologie »
    // désignent la même spécialité.
    if (draft.specialties.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSpecialtyInput('');
      return;
    }
    update({ specialties: [...draft.specialties, value] });
    setSpecialtyInput('');
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />;
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
        Aucun établissement n&apos;est rattaché à votre compte.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-bold text-white">
              <Building2 className="h-4 w-4 shrink-0 text-mora-green" /> Profil de l&apos;établissement
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Ces informations figurent en tête de vos documents, sur vos factures et dans
              l&apos;application.
            </p>
          </div>
          <span className="shrink-0 font-mono text-[11px] font-bold text-mora-green">
            {draft.businessReference}
          </span>
        </div>
        {!editable && (
          <p className="mt-3 text-[11px] text-amber-400">
            Consultation seule : votre rôle ne permet pas de modifier ces paramètres.
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
          {notice}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {SECTIONS.map((entry) => {
          const Icon = entry.icon;
          const active = section === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSection(entry.id)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                active
                  ? 'bg-mora-blue text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{entry.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------- Identité ------------------------------ */}
      {section === 'identity' && (
        <Panel title="Identité" description="Nom, image et présentation de votre structure.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom d'usage" htmlFor="es-name" required>
              <input
                id="es-name"
                className={FIELD}
                disabled={!editable}
                value={draft.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
            <Field label="Nom abrégé" htmlFor="es-short" hint="Utilisé là où la place manque.">
              <input
                id="es-short"
                className={FIELD}
                disabled={!editable}
                value={draft.shortName}
                onChange={(e) => update({ shortName: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label="Nom officiel complet"
            htmlFor="es-legal"
            hint="Raison sociale portée sur les documents administratifs."
          >
            <input
              id="es-legal"
              className={FIELD}
              disabled={!editable}
              value={draft.legalName}
              onChange={(e) => update({ legalName: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slogan" htmlFor="es-slogan">
              <input
                id="es-slogan"
                className={FIELD}
                disabled={!editable}
                placeholder="Votre santé, notre engagement"
                value={draft.slogan}
                onChange={(e) => update({ slogan: e.target.value })}
              />
            </Field>
            <Field label="Type d'établissement" htmlFor="es-type">
              <Select<EstablishmentType>
                id="es-type"
                disabled={!editable}
                value={draft.type}
                onChange={(value) => update({ type: value })}
                options={(Object.keys(TYPE_LABELS) as EstablishmentType[]).map((type) => ({
                  value: type,
                  label: TYPE_LABELS[type],
                }))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AssetField
              kind="logo"
              label="Logo"
              hint="Carré de préférence. PNG, JPEG, WebP ou SVG, 2 Mio maximum."
              url={draft.logoUrl}
              editable={editable}
              establishmentId={draft.id}
              onChange={(url) => update({ logoUrl: url })}
              onError={setError}
            />
            <AssetField
              kind="banner"
              label="Bannière"
              hint="Image large, affichée en en-tête."
              url={draft.bannerUrl}
              editable={editable}
              establishmentId={draft.id}
              onChange={(url) => update({ bannerUrl: url })}
              onError={setError}
              wide
            />
          </div>
        </Panel>
      )}

      {/* --------------------------- Informations légales ---------------------- */}
      {section === 'legal' && (
        <Panel
          title="Informations légales"
          description="Reportées sur les factures et les documents officiels."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Numéro d'autorisation"
              htmlFor="es-auth"
              hint="Délivré par l'autorité de santé."
            >
              <input
                id="es-auth"
                className={FIELD}
                disabled={!editable}
                value={draft.authorizationNumber}
                onChange={(e) => update({ authorizationNumber: e.target.value })}
              />
            </Field>
            <Field label="Registre de commerce" htmlFor="es-rc" hint="Le cas échéant.">
              <input
                id="es-rc"
                className={FIELD}
                disabled={!editable}
                value={draft.tradeRegister}
                onChange={(e) => update({ tradeRegister: e.target.value })}
              />
            </Field>
          </div>

          <Field label="NIF / Identifiant fiscal" htmlFor="es-nif">
            <input
              id="es-nif"
              className={FIELD}
              disabled={!editable}
              value={draft.taxId}
              onChange={(e) => update({ taxId: e.target.value })}
            />
          </Field>

          <Field
            label="Mentions légales"
            htmlFor="es-mentions"
            hint="Bloc reproduit en pied des documents générés."
          >
            <textarea
              id="es-mentions"
              rows={4}
              className={FIELD}
              disabled={!editable}
              value={draft.legalMentions}
              onChange={(e) => update({ legalMentions: e.target.value })}
            />
          </Field>
        </Panel>
      )}

      {/* ------------------------------ Coordonnées ---------------------------- */}
      {section === 'contact' && (
        <>
          <Panel title="Téléphone et messagerie">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Téléphone principal" htmlFor="es-phone" required>
                <input
                  id="es-phone"
                  type="tel"
                  className={FIELD}
                  disabled={!editable}
                  value={draft.phone}
                  onChange={(e) => update({ phone: e.target.value })}
                />
              </Field>
              <Field label="Téléphone secondaire" htmlFor="es-phone2">
                <input
                  id="es-phone2"
                  type="tel"
                  className={FIELD}
                  disabled={!editable}
                  value={draft.phoneSecondary}
                  onChange={(e) => update({ phoneSecondary: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp" htmlFor="es-wa">
                <input
                  id="es-wa"
                  type="tel"
                  className={FIELD}
                  disabled={!editable}
                  placeholder="+269 ..."
                  value={draft.whatsapp}
                  onChange={(e) => update({ whatsapp: e.target.value })}
                />
              </Field>
              <Field label="Site web" htmlFor="es-web">
                <input
                  id="es-web"
                  type="url"
                  className={FIELD}
                  disabled={!editable}
                  placeholder="https://"
                  value={draft.website}
                  onChange={(e) => update({ website: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail principal" htmlFor="es-mail" required>
                <input
                  id="es-mail"
                  type="email"
                  className={FIELD}
                  disabled={!editable}
                  value={draft.email}
                  onChange={(e) => update({ email: e.target.value })}
                />
              </Field>
              <Field label="E-mail support" htmlFor="es-support">
                <input
                  id="es-support"
                  type="email"
                  className={FIELD}
                  disabled={!editable}
                  value={draft.supportEmail}
                  onChange={(e) => update({ supportEmail: e.target.value })}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Adresse" icon={MapPin}>
            <Field label="Adresse complète" htmlFor="es-addr">
              <textarea
                id="es-addr"
                rows={2}
                className={FIELD}
                disabled={!editable}
                value={draft.address}
                onChange={(e) => update({ address: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Ville" htmlFor="es-city">
                <input
                  id="es-city"
                  className={FIELD}
                  disabled={!editable}
                  value={draft.city}
                  onChange={(e) => update({ city: e.target.value })}
                />
              </Field>
              <Field label="Île" htmlFor="es-island">
                <Select
                  id="es-island"
                  disabled={!editable}
                  value={draft.island}
                  onChange={(value) => update({ island: value })}
                  placeholder="— Sélectionner —"
                  options={ISLANDS}
                />
              </Field>
              <Field label="Code postal" htmlFor="es-zip">
                <input
                  id="es-zip"
                  className={FIELD}
                  disabled={!editable}
                  value={draft.postalCode}
                  onChange={(e) => update({ postalCode: e.target.value })}
                />
              </Field>
              <Field label="Pays" htmlFor="es-country">
                <input
                  id="es-country"
                  className={FIELD}
                  disabled={!editable}
                  value={draft.country}
                  onChange={(e) => update({ country: e.target.value })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor="es-lat" hint="Facultatif. Entre −90 et 90.">
                <input
                  id="es-lat"
                  type="number"
                  step="0.000001"
                  min={-90}
                  max={90}
                  className={FIELD}
                  disabled={!editable}
                  value={draft.latitude ?? ''}
                  onChange={(e) =>
                    update({ latitude: e.target.value === '' ? null : Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Longitude" htmlFor="es-lng" hint="Facultatif. Entre −180 et 180.">
                <input
                  id="es-lng"
                  type="number"
                  step="0.000001"
                  min={-180}
                  max={180}
                  className={FIELD}
                  disabled={!editable}
                  value={draft.longitude ?? ''}
                  onChange={(e) =>
                    update({ longitude: e.target.value === '' ? null : Number(e.target.value) })
                  }
                />
              </Field>
            </div>
          </Panel>
        </>
      )}

      {/* ------------------------------ Préférences ---------------------------- */}
      {section === 'regional' && (
        <Panel
          title="Préférences régionales"
          description="Appliquées aux montants, aux dates et aux libellés."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Devise" htmlFor="es-cur">
              <Select
                id="es-cur"
                disabled={!editable}
                value={draft.currency}
                onChange={(value) => update({ currency: value })}
                options={[{ value: 'KMF', label: 'KMF — Franc comorien' }]}
              />
            </Field>
            <Field label="Fuseau horaire" htmlFor="es-tz">
              <Select
                id="es-tz"
                disabled={!editable}
                value={draft.timezone}
                onChange={(value) => update({ timezone: value })}
                options={TIMEZONES}
              />
            </Field>
            <Field label="Langue" htmlFor="es-loc">
              <Select
                id="es-loc"
                disabled={!editable}
                value={draft.locale}
                onChange={(value) => update({ locale: value })}
                options={[
                  { value: 'fr', label: 'Français' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </Field>
          </div>
        </Panel>
      )}

      {/* -------------------------- Horaires & spécialités --------------------- */}
      {section === 'hours' && (
        <>
          <Panel title="Horaires d'ouverture" icon={Clock}>
            <div className="space-y-2">
              {DAY_ORDER.map((day) => (
                <DayRow
                  key={day}
                  day={day}
                  value={draft.openingHours[day]}
                  editable={editable}
                  onChange={(hours) =>
                    update({ openingHours: { ...draft.openingHours, [day]: hours } })
                  }
                />
              ))}
            </div>
          </Panel>

          <Panel
            title="Spécialités proposées"
            icon={Stethoscope}
            description="Affichées sur la fiche de votre établissement."
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className={FIELD}
                disabled={!editable}
                placeholder="Cardiologie, Pédiatrie, Maternité…"
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!editable || specialtyInput.trim() === ''}
                onClick={addSpecialty}
                className="shrink-0 sm:px-6"
              >
                Ajouter
              </Button>
            </div>

            {draft.specialties.length === 0 ? (
              <p className="text-xs text-slate-500">Aucune spécialité enregistrée.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {draft.specialties.map((specialty) => (
                  <span
                    key={specialty}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 py-1 pl-3 pr-1.5 text-xs text-slate-200"
                  >
                    {specialty}
                    {editable && (
                      <button
                        type="button"
                        aria-label={`Retirer ${specialty}`}
                        onClick={() =>
                          update({
                            specialties: draft.specialties.filter((s) => s !== specialty),
                          })
                        }
                        className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ---------------------- Documents & identité visuelle ------------------ */}
      {section === 'documents' && (
        <>
          <Panel
            title="Modèle de document"
            icon={LayoutTemplate}
            description="Trois présentations professionnelles. Le modèle choisi s'applique à tous vos documents."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {TEMPLATE_IDS.map((id) => {
                const template = TEMPLATES[id];
                const selected = draft.pdfTemplate === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!editable}
                    onClick={() => update({ pdfTemplate: id })}
                    aria-pressed={selected}
                    className={`rounded-xl border p-4 text-left transition-all disabled:opacity-60 ${
                      selected
                        ? 'border-mora-green bg-slate-950 ring-1 ring-mora-green/40'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <TemplatePreview
                      templateId={id}
                      primary={draft.primaryColor}
                      secondary={draft.secondaryColor}
                    />
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-white">
                      {template.name}
                      {selected && <Check className="h-3.5 w-3.5 text-mora-green" />}
                    </p>
                    <p className="text-[11px] text-slate-500">{template.style}</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                      {template.description}
                    </p>
                    <p className="mt-2 text-[10px] italic text-slate-500">{template.audience}</p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel
            title="Modèle par type de document"
            description="Facultatif. Un type sans modèle propre utilise celui de l'établissement."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(DOCUMENT_KINDS) as (keyof typeof DOCUMENT_KINDS)[]).map((kind) => (
                <Field key={kind} label={DOCUMENT_KINDS[kind]} htmlFor={`es-tpl-${kind}`}>
                  <Select
                    id={`es-tpl-${kind}`}
                    disabled={!editable}
                    value={draft.documentTemplates?.[kind] ?? ''}
                    onChange={(value) => {
                      const next = { ...(draft.documentTemplates ?? {}) };
                      if (value === '') delete next[kind];
                      else next[kind] = value;
                      update({
                        documentTemplates: Object.keys(next).length > 0 ? next : null,
                      });
                    }}
                    placeholder="Modèle de l'établissement"
                    options={[
                      { value: '', label: "Modèle de l'établissement" },
                      ...TEMPLATE_IDS.map((id) => ({ value: id, label: TEMPLATES[id].name })),
                    ]}
                  />
                </Field>
              ))}
            </div>
          </Panel>

          <Panel
            title="En-tête et pied de page"
            icon={FileText}
            description="Composés automatiquement à partir de l'identité, des coordonnées et des informations légales. Rien n'est saisi ici : corrigez la source."
          >
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-300">En-tête généré</p>
                <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-sm font-bold text-white">
                    {draft.legalName || draft.name || '—'}
                  </p>
                  {headerPreview.length === 0 ? (
                    <p className="text-[11px] italic text-slate-500">
                      Aucune coordonnée saisie : l&apos;en-tête ne portera que le nom.
                    </p>
                  ) : (
                    headerPreview.map((line) => (
                      <p key={line} className="text-[11px] text-slate-400">
                        {line}
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-300">Pied de page généré</p>
                <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  {footerPreview.length === 0 ? (
                    <p className="text-[11px] italic text-slate-500">
                      Renseignez vos informations légales pour alimenter le pied de page.
                    </p>
                  ) : (
                    footerPreview.map((line) => (
                      <p key={line} className="text-[11px] text-slate-400">
                        {line}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Signature et cachet" description="Apposés sur les documents officiels.">
            <Field label="Nom et qualité du signataire" htmlFor="es-holder">
              <input
                id="es-holder"
                className={FIELD}
                disabled={!editable}
                placeholder="Dr. …, Directeur médical"
                value={draft.signatureHolder}
                onChange={(e) => update({ signatureHolder: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <AssetField
                kind="signature"
                label="Signature numérisée"
                hint="Fond transparent de préférence (PNG)."
                url={draft.signatureUrl}
                editable={editable}
                establishmentId={draft.id}
                onChange={(url) => update({ signatureUrl: url })}
                onError={setError}
                wide
              />
              <AssetField
                kind="stamp"
                label="Cachet de l'établissement"
                hint="Fond transparent de préférence (PNG)."
                url={draft.stampUrl}
                editable={editable}
                establishmentId={draft.id}
                onChange={(url) => update({ stampUrl: url })}
                onError={setError}
              />
            </div>
          </Panel>

          <Panel title="Couleurs de l'établissement" icon={Palette}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Couleur principale"
                id="es-c1"
                value={draft.primaryColor}
                editable={editable}
                onChange={(value) => update({ primaryColor: value })}
              />
              <ColorField
                label="Couleur secondaire"
                id="es-c2"
                value={draft.secondaryColor}
                editable={editable}
                onChange={(value) => update({ secondaryColor: value })}
              />
            </div>

            <div
              className="flex flex-wrap items-center gap-3 rounded-xl p-4"
              style={{ backgroundColor: `${draft.primaryColor}1A` }}
            >
              <span
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: draft.primaryColor }}
              >
                Couleur principale
              </span>
              <span
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: draft.secondaryColor }}
              >
                Couleur secondaire
              </span>
              <span className="text-[11px] text-slate-400">Aperçu</span>
            </div>
          </Panel>
        </>
      )}

      {editable && dirty && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-2xl border border-mora-green/40 bg-slate-900/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-300">Des modifications ne sont pas encore enregistrées.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDraft(profile)} className="flex-1 sm:flex-none">
              Annuler
            </Button>
            <Button
              variant="secondary"
              isLoading={isSaving}
              onClick={() => void handleSave()}
              className="flex-1 font-bold sm:flex-none sm:px-8"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Éléments de mise en page
// ---------------------------------------------------------------------------

const Panel: React.FC<{
  title: string;
  description?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
    <div>
      <h4 className="flex items-center gap-2 text-sm font-bold text-white">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-mora-green" />}
        {title}
      </h4>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
    {children}
  </section>
);

const Field: React.FC<{
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, required, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-300">
      {label} {required && <span className="text-mora-green">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
  </div>
);

/**
 * Vignette d'un modèle.
 *
 * Une miniature en HTML, et non une image : elle reprend les couleurs saisies,
 * de sorte que le choix se fasse sur le rendu réel de l'établissement et non
 * sur une capture générique.
 */
const TemplatePreview: React.FC<{
  templateId: string;
  primary: string;
  secondary: string;
}> = ({ templateId, primary, secondary }) => (
  <div className="h-20 overflow-hidden rounded-lg border border-slate-800 bg-white">
    {templateId === 'premium_classic' && (
      <>
        <div className="h-6" style={{ backgroundColor: primary }} />
        <div className="space-y-1 p-1.5">
          <div className="h-1 w-1/2 rounded-full bg-slate-300" />
          <div className="h-1 w-full rounded-full bg-slate-200" />
          <div className="h-1 w-4/5 rounded-full bg-slate-200" />
        </div>
      </>
    )}

    {templateId === 'premium_medical' && (
      <>
        <div className="h-5 bg-slate-100" />
        <div className="h-0.5" style={{ backgroundColor: secondary }} />
        <div className="space-y-1 p-1.5">
          <div
            className="h-3 w-full rounded"
            style={{ backgroundColor: `${secondary}22` }}
          />
          <div className="h-1 w-full rounded-full bg-slate-200" />
          <div className="h-1 w-3/5 rounded-full bg-slate-200" />
        </div>
      </>
    )}

    {templateId === 'premium_executive' && (
      <div className="space-y-1 p-1.5">
        <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: primary }} />
        <div className="h-0.5 w-full" style={{ backgroundColor: primary }} />
        <div className="h-px w-full" style={{ backgroundColor: secondary }} />
        <div className="h-1 w-full rounded-full bg-slate-200" />
        <div className="h-1 w-5/6 rounded-full bg-slate-200" />
        <div className="h-1 w-2/3 rounded-full bg-slate-200" />
      </div>
    )}
  </div>
);

const ColorField: React.FC<{
  label: string;
  id: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}> = ({ label, id, value, editable, onChange }) => (
  <Field label={label} htmlFor={id}>
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        disabled={!editable}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-60"
      />
      <input
        aria-label={`${label} en hexadécimal`}
        disabled={!editable}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} font-mono uppercase`}
      />
    </div>
  </Field>
);

const DayRow: React.FC<{
  day: DayKey;
  value: { closed: boolean; open: string; close: string };
  editable: boolean;
  onChange: (hours: { closed: boolean; open: string; close: string }) => void;
}> = ({ day, value, editable, onChange }) => (
  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-950 p-3">
    <span className="w-24 shrink-0 text-xs font-semibold text-slate-200">{DAY_LABELS[day]}</span>

    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] text-slate-400">
      <input
        type="checkbox"
        disabled={!editable}
        checked={value.closed}
        onChange={(e) => onChange({ ...value, closed: e.target.checked })}
        className="h-4 w-4 accent-mora-green"
      />
      Fermé
    </label>

    {!value.closed && (
      <div className="flex flex-1 items-center gap-2">
        <input
          type="time"
          aria-label={`Ouverture ${DAY_LABELS[day]}`}
          disabled={!editable}
          value={value.open}
          onChange={(e) => onChange({ ...value, open: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-mora-green disabled:opacity-60"
        />
        <span className="text-xs text-slate-500">à</span>
        <input
          type="time"
          aria-label={`Fermeture ${DAY_LABELS[day]}`}
          disabled={!editable}
          value={value.close}
          onChange={(e) => onChange({ ...value, close: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-mora-green disabled:opacity-60"
        />
      </div>
    )}
  </div>
);

/**
 * Champ de fichier.
 *
 * Le téléversement a lieu immédiatement, mais l'URL n'est retenue qu'à
 * l'enregistrement du formulaire : annuler laisse un fichier orphelin dans le
 * compartiment, ce qui est préférable à une image affichée avant confirmation.
 */
const AssetField: React.FC<{
  kind: AssetKind;
  label: string;
  hint: string;
  url: string;
  editable: boolean;
  establishmentId: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  wide?: boolean;
}> = ({ kind, label, hint, url, editable, establishmentId, onChange, onError, wide }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      onChange(await uploadEstablishmentAsset(establishmentId, kind, file));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Téléversement impossible.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-300">{label}</p>

      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-950 ${
          wide ? 'h-24' : 'h-24 sm:h-28'
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-slate-600">
            <ImagePlus className="h-6 w-6" />
            <span className="text-[10px]">Aucun fichier</span>
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          disabled={!editable || isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…
            </>
          ) : (
            <>
              <ImagePlus className="h-3.5 w-3.5" /> {url ? 'Remplacer' : 'Téléverser'}
            </>
          )}
        </button>

        {url && editable && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Retirer
          </button>
        )}
      </div>

      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
};
