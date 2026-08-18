'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, FileText, Landmark, LayoutTemplate, Palette, Phone, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBranding } from '@/context/BrandingContext';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { recordAudit } from '@/services/audit.service';
import {
  getPlatformIdentity,
  savePlatformIdentity,
  uploadPlatformAsset,
  type PlatformIdentity,
} from '@/services/platform.service';
import {
  DOCUMENT_KINDS,
  TEMPLATES,
  documentKindsFor,
  TEMPLATE_IDS,
  buildFooterLines,
  buildHeaderLines,
} from '@/lib/documents/branding';
import { buildSubscriptionInvoiceDocument } from '@/lib/documents/subscription-invoice';
import { useDocument } from '@/hooks/useDocument';
import {
  AssetField,
  ColorField,
  Field,
  FIELD,
  Panel,
  TemplatePreview,
} from './settings-ui';

/**
 * Configuration documentaire de la plateforme (BP28C, BP30).
 *
 * Réglages de MORA Shawiri, éditeur : ils habillent les documents que la
 * plateforme émet — factures d'abonnement au premier chef — et n'ont aucun
 * effet sur ceux des établissements, qui disposent des leurs.
 *
 * La séparation est tenue par les politiques RLS : seul le Super Admin écrit
 * ici. Les établissements lisent cette identité, ce qui est nécessaire pour que
 * la facture qu'ils téléchargent porte l'en-tête de celui qui la leur adresse.
 */

type Section = 'identity' | 'contact' | 'legal' | 'documents';

const SECTIONS: readonly { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'identity', label: 'Identité', icon: Shield },
  { id: 'contact', label: 'Coordonnées', icon: Phone },
  { id: 'legal', label: 'Informations légales', icon: Landmark },
  { id: 'documents', label: 'Documents & identité visuelle', icon: FileText },
];

/** Facture fictive servant à l'aperçu du modèle, jamais enregistrée. */
const previewInvoice = (identity: PlatformIdentity) => ({
  id: 'apercu',
  reference: 'MORA-FSA-000000',
  establishmentId: '',
  establishmentName: 'Établissement de démonstration',
  customer: {
    name: 'Établissement de démonstration',
    legalName: 'Clinique de démonstration',
    address: 'Rue de la Corniche',
    city: 'Moroni — Ngazidja',
    country: 'Comores',
    phone: '+269 000 00 00',
    email: 'contact@exemple.km',
    taxId: '',
    tradeRegister: '',
  },
  subscriptionId: null,
  planName: 'Standard',
  periodStart: new Date().toISOString().slice(0, 10),
  periodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  durationMonths: 1,
  baseMonthlyPrice: 5000,
  monthlyPrice: 5000,
  discountAmount: 0,
  totalAmount: 5000,
  paidAmount: 0,
  balance: 5000,
  currency: identity.currency,
  status: 'issued' as const,
  issuedOn: new Date().toISOString().slice(0, 10),
  dueOn: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  paymentMethod: null,
  notes: null,
  payments: [],
});

export const PlatformDocumentSettings: React.FC = () => {
  const { user } = useAuth();
  const { refresh: refreshBranding } = useBranding();

  const [identity, setIdentity] = useState<PlatformIdentity | null>(null);
  const [draft, setDraft] = useState<PlatformIdentity | null>(null);
  const [section, setSection] = useState<Section>('documents');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // L'aperçu utilise le brouillon en cours, pas l'identité enregistrée : on
  // veut voir ce que l'on vient de régler avant de le valider.
  const { preview, error: documentError } = useDocument(draft);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await getPlatformIdentity();
      setIdentity(loaded);
      setDraft(loaded);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (patch: Partial<PlatformIdentity>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const dirty = JSON.stringify(identity) !== JSON.stringify(draft);

  const headerPreview = useMemo(() => (draft ? buildHeaderLines(draft) : []), [draft]);
  const footerPreview = useMemo(() => (draft ? buildFooterLines(draft) : []), [draft]);

  const save = async () => {
    if (!draft || !user) return;

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await savePlatformIdentity(draft, user.id);
      await recordAudit(
        {
          action: 'platform_identity_updated',
          entityName: 'platform_identity',
          entityId: draft.id,
          newValues: { template: draft.pdfTemplate },
        },
        // La plateforme n'appartient à aucun établissement : le journal le
        // consigne comme un acte d'administration globale.
        null,
        user.id,
      );
      await load();
      await refreshBranding();
      setNotice('La configuration documentaire de la plateforme est enregistrée.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />;
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
        L&apos;identité de la plateforme n&apos;a pas pu être chargée.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-white">
          <Shield className="h-4 w-4 text-mora-green" /> Identité documentaire de la plateforme
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Ces réglages habillent les documents émis par MORA Shawiri — factures d&apos;abonnement,
          reçus, courriers. Ils sont indépendants de ceux des établissements, qui conservent leur
          propre configuration pour leurs documents de soin.
        </p>
      </div>

      {(error || documentError) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error ?? documentError}
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
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSection(entry.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                section === entry.id
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

      {section === 'identity' && (
        <Panel title="Identité de l'éditeur" icon={Shield}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom du produit" htmlFor="pf-name" required>
              <input
                id="pf-name"
                className={FIELD}
                value={draft.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
            <Field
              label="Raison sociale"
              htmlFor="pf-legal"
              required
              hint="Portée en tête des documents et dans le pied de page."
            >
              <input
                id="pf-legal"
                className={FIELD}
                value={draft.legalName}
                onChange={(e) => update({ legalName: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom court" htmlFor="pf-short">
              <input
                id="pf-short"
                className={FIELD}
                value={draft.shortName}
                onChange={(e) => update({ shortName: e.target.value })}
              />
            </Field>
            <Field label="Devise de facturation" htmlFor="pf-currency">
              <input
                id="pf-currency"
                className={`${FIELD} uppercase`}
                value={draft.currency}
                onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
              />
            </Field>
          </div>

          <Field label="Signature de marque" htmlFor="pf-slogan">
            <input
              id="pf-slogan"
              className={FIELD}
              value={draft.slogan}
              onChange={(e) => update({ slogan: e.target.value })}
            />
          </Field>

          <AssetField
            label="Logo de la plateforme"
            hint="Carré de préférence. PNG, JPEG, WebP ou SVG, 5 Mio maximum."
            url={draft.logoUrl}
            editable
            upload={(file) => uploadPlatformAsset('logo', file)}
            onChange={(url) => update({ logoUrl: url })}
            onError={setError}
            wide
          />
        </Panel>
      )}

      {section === 'contact' && (
        <Panel title="Coordonnées de l'éditeur" icon={Phone}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Téléphone" htmlFor="pf-phone">
              <input
                id="pf-phone"
                className={FIELD}
                value={draft.phone}
                onChange={(e) => update({ phone: e.target.value })}
              />
            </Field>
            <Field label="Téléphone secondaire" htmlFor="pf-phone2">
              <input
                id="pf-phone2"
                className={FIELD}
                value={draft.phoneSecondary}
                onChange={(e) => update({ phoneSecondary: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp" htmlFor="pf-wa">
              <input
                id="pf-wa"
                className={FIELD}
                value={draft.whatsapp}
                onChange={(e) => update({ whatsapp: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Courriel" htmlFor="pf-email">
              <input
                id="pf-email"
                type="email"
                className={FIELD}
                value={draft.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            </Field>
            <Field label="Courriel du support" htmlFor="pf-support">
              <input
                id="pf-support"
                type="email"
                className={FIELD}
                value={draft.supportEmail}
                onChange={(e) => update({ supportEmail: e.target.value })}
              />
            </Field>
            <Field label="Site web" htmlFor="pf-web">
              <input
                id="pf-web"
                className={FIELD}
                value={draft.website}
                onChange={(e) => update({ website: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Adresse" htmlFor="pf-address">
            <input
              id="pf-address"
              className={FIELD}
              value={draft.address}
              onChange={(e) => update({ address: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Code postal" htmlFor="pf-zip">
              <input
                id="pf-zip"
                className={FIELD}
                value={draft.postalCode}
                onChange={(e) => update({ postalCode: e.target.value })}
              />
            </Field>
            <Field label="Ville" htmlFor="pf-city">
              <input
                id="pf-city"
                className={FIELD}
                value={draft.city}
                onChange={(e) => update({ city: e.target.value })}
              />
            </Field>
            <Field label="Île ou région" htmlFor="pf-island">
              <input
                id="pf-island"
                className={FIELD}
                value={draft.island}
                onChange={(e) => update({ island: e.target.value })}
              />
            </Field>
            <Field label="Pays" htmlFor="pf-country">
              <input
                id="pf-country"
                className={FIELD}
                value={draft.country}
                onChange={(e) => update({ country: e.target.value })}
              />
            </Field>
          </div>
        </Panel>
      )}

      {section === 'legal' && (
        <Panel
          title="Informations légales"
          icon={Landmark}
          description="Reprises en tête et en pied des documents émis par la plateforme."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Numéro d'autorisation" htmlFor="pf-auth">
              <input
                id="pf-auth"
                className={FIELD}
                value={draft.authorizationNumber}
                onChange={(e) => update({ authorizationNumber: e.target.value })}
              />
            </Field>
            <Field label="Registre du commerce" htmlFor="pf-rc">
              <input
                id="pf-rc"
                className={FIELD}
                value={draft.tradeRegister}
                onChange={(e) => update({ tradeRegister: e.target.value })}
              />
            </Field>
            <Field label="Identifiant fiscal" htmlFor="pf-nif">
              <input
                id="pf-nif"
                className={FIELD}
                value={draft.taxId}
                onChange={(e) => update({ taxId: e.target.value })}
              />
            </Field>
          </div>

          <Field
            label="Mentions légales"
            htmlFor="pf-mentions"
            hint="Affichées en pied de chaque document émis par la plateforme."
          >
            <textarea
              id="pf-mentions"
              rows={3}
              className={FIELD}
              value={draft.legalMentions}
              onChange={(e) => update({ legalMentions: e.target.value })}
            />
          </Field>
        </Panel>
      )}

      {section === 'documents' && (
        <>
          <Panel
            title="Modèle de document"
            icon={LayoutTemplate}
            description="Les trois modèles Premium sont disponibles. Celui-ci s'applique aux documents de la plateforme."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {TEMPLATE_IDS.map((id) => {
                const template = TEMPLATES[id];
                const selected = draft.pdfTemplate === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update({ pdfTemplate: id })}
                    aria-pressed={selected}
                    className={`rounded-xl border p-4 text-left transition-all ${
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
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              onClick={() => void preview(buildSubscriptionInvoiceDocument(previewInvoice(draft)))}
              className="w-full gap-2 sm:w-auto"
            >
              <FileText className="h-4 w-4" /> Aperçu sur une facture d&apos;exemple
            </Button>
          </Panel>

          <Panel
            title="Modèle par type de document"
            description="Facultatif. Seuls les documents émis par la plateforme figurent ici : la facturation SaaS est indépendante de la facturation médicale des établissements (BP30 §13)."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {documentKindsFor('platform').map((kind) => (
                <Field key={kind} label={DOCUMENT_KINDS[kind]} htmlFor={`pf-tpl-${kind}`}>
                  <Select
                    id={`pf-tpl-${kind}`}
                    value={draft.documentTemplates?.[kind] ?? ''}
                    onChange={(value) => {
                      const next = { ...(draft.documentTemplates ?? {}) };
                      if (value === '') delete next[kind];
                      else next[kind] = value;
                      update({
                        documentTemplates: Object.keys(next).length > 0 ? next : null,
                      });
                    }}
                    placeholder="Modèle de la plateforme"
                    options={[
                      { value: '', label: 'Modèle de la plateforme' },
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
            description="Composés automatiquement à partir de l'identité, des coordonnées et des informations légales."
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
                      Renseignez les informations légales pour alimenter le pied de page.
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

          <Panel
            title="Signature et cachet"
            description="Apposés sur les documents officiels de la plateforme."
          >
            <Field label="Nom et qualité du signataire" htmlFor="pf-holder">
              <input
                id="pf-holder"
                className={FIELD}
                placeholder="MORA Shawiri, Direction"
                value={draft.signatureHolder}
                onChange={(e) => update({ signatureHolder: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <AssetField
                label="Signature numérisée"
                hint="Fond transparent de préférence (PNG)."
                url={draft.signatureUrl}
                editable
                upload={(file) => uploadPlatformAsset('signature', file)}
                onChange={(url) => update({ signatureUrl: url })}
                onError={setError}
                wide
              />
              <AssetField
                label="Cachet de l'éditeur"
                hint="Fond transparent de préférence (PNG)."
                url={draft.stampUrl}
                editable
                upload={(file) => uploadPlatformAsset('stamp', file)}
                onChange={(url) => update({ stampUrl: url })}
                onError={setError}
              />
            </div>
          </Panel>

          <Panel title="Couleurs de la plateforme" icon={Palette}>
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                label="Couleur principale"
                id="pf-c1"
                value={draft.primaryColor}
                editable
                onChange={(value) => update({ primaryColor: value })}
              />
              <ColorField
                label="Couleur secondaire"
                id="pf-c2"
                value={draft.secondaryColor}
                editable
                onChange={(value) => update({ secondaryColor: value })}
              />
            </div>
          </Panel>
        </>
      )}

      {dirty && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 rounded-2xl border border-mora-green/40 bg-slate-900/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-300">Des modifications ne sont pas encore enregistrées.</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDraft(identity)}
              className="flex-1 sm:flex-none"
            >
              Annuler
            </Button>
            <Button
              variant="secondary"
              isLoading={isSaving}
              onClick={() => void save()}
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
