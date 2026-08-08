'use client';

import React, { useState } from 'react';
import { BedDouble, Pill, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type {
  HospitalizationSettings,
  ModuleSettings,
  PharmacySettings,
} from '@/services/establishment.service';

/**
 * Réglages des modules Hospitalisation et Pharmacie (BP16, BP19).
 *
 * Ces valeurs pilotent réellement les modules : le seuil de réapprovisionnement
 * et le délai de péremption surveillé décident de ce qui est signalé dans la
 * Pharmacie, les types de chambres et services alimentent les listes de
 * l'Hospitalisation. Ce ne sont pas des préférences d'affichage.
 */

const FIELD =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-mora-green disabled:opacity-60';

/** Liste de valeurs libres, éditable — types de chambres, catégories, services. */
const TagList: React.FC<{
  label: string;
  hint?: string;
  values: string[];
  editable: boolean;
  placeholder: string;
  onChange: (values: string[]) => void;
}> = ({ label, hint, values, editable, placeholder, onChange }) => {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    // Comparaison insensible à la casse : deux graphies d'une même valeur
    // rendraient tout regroupement faux.
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-300">{label}</p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={FIELD}
          disabled={!editable}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!editable || draft.trim() === ''}
          onClick={add}
          className="shrink-0 sm:px-6"
        >
          Ajouter
        </Button>
      </div>

      {values.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">Aucune valeur enregistrée.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 py-1 pl-3 pr-1.5 text-xs text-slate-200"
            >
              {value}
              {editable && (
                <button
                  type="button"
                  aria-label={`Retirer ${value}`}
                  onClick={() => onChange(values.filter((v) => v !== value))}
                  className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
};

const Panel: React.FC<{
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
    <div>
      <h4 className="flex items-center gap-2 text-sm font-bold text-white">
        <Icon className="h-4 w-4 shrink-0 text-mora-green" />
        {title}
      </h4>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
    {children}
  </section>
);

const Toggle: React.FC<{
  label: string;
  hint: string;
  checked: boolean;
  editable: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, hint, checked, editable, onChange }) => (
  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
    <input
      type="checkbox"
      disabled={!editable}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 accent-mora-green"
    />
    <span>
      {label}
      <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>
    </span>
  </label>
);

// ---------------------------------------------------------------------------
// Hospitalisation
// ---------------------------------------------------------------------------

export const HospitalizationSettingsPanel: React.FC<{
  settings: HospitalizationSettings;
  editable: boolean;
  currency: string;
  onChange: (settings: HospitalizationSettings) => void;
}> = ({ settings, editable, currency, onChange }) => {
  const update = (patch: Partial<HospitalizationSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <div className="space-y-4">
      <Panel
        title="Organisation des séjours"
        description="Ces listes alimentent les formulaires d'admission et de gestion des lits."
        icon={BedDouble}
      >
        <TagList
          label="Types de chambres"
          placeholder="Chambre individuelle, Soins intensifs…"
          values={settings.roomTypes}
          editable={editable}
          onChange={(roomTypes) => update({ roomTypes })}
        />
        <TagList
          label="Services d'admission"
          hint="Repris par les chambres, les admissions et les transferts."
          placeholder="Maternité, Chirurgie…"
          values={settings.admissionServices}
          editable={editable}
          onChange={(admissionServices) => update({ admissionServices })}
        />
        <TagList
          label="Natures de soin"
          hint="Proposées à la saisie quotidienne dans le dossier de séjour."
          placeholder="Constantes vitales, Soins infirmiers…"
          values={settings.careTypes}
          editable={editable}
          onChange={(careTypes) => update({ careTypes })}
        />
        <TagList
          label="Motifs de sortie"
          hint="Proposés au moment d'enregistrer la sortie du patient."
          placeholder="Guérison, Transfert externe…"
          values={settings.dischargeReasons}
          editable={editable}
          onChange={(dischargeReasons) => update({ dischargeReasons })}
        />

        {/* Les états d'un lit ne sont pas configurables : BP16 §7 les fixe, et
            la base les porte comme type énuméré. Les laisser saisir laissait
            croire à un choix qui n'existe pas. */}
        <p className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] text-slate-500">
          Les états d&apos;un lit — disponible, occupé, réservé, en nettoyage, hors service — sont
          fixés par le module et ne se paramètrent pas. L&apos;état « occupé » découle de
          l&apos;affectation d&apos;un patient.
        </p>
      </Panel>

      <Panel
        title="Règles de séjour"
        description="Tarification et contrôles appliqués aux hospitalisations."
        icon={BedDouble}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="hosp-rate" className="mb-1.5 block text-xs font-semibold text-slate-300">
              Tarif journalier ({currency})
            </label>
            <input
              id="hosp-rate"
              type="number"
              min={0}
              className={FIELD}
              disabled={!editable}
              value={settings.dailyRate}
              onChange={(e) => update({ dailyRate: Number(e.target.value) || 0 })}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Sert de base au calcul du séjour. 0 = non facturé.
            </p>
          </div>
          <div>
            <label htmlFor="hosp-stay" className="mb-1.5 block text-xs font-semibold text-slate-300">
              Durée de séjour surveillée (jours)
            </label>
            <input
              id="hosp-stay"
              type="number"
              min={1}
              max={365}
              className={FIELD}
              disabled={!editable}
              value={settings.maxStayDays}
              onChange={(e) => update({ maxStayDays: Number(e.target.value) || 1 })}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Au-delà, le séjour est signalé pour révision.
            </p>
          </div>
        </div>

        <Toggle
          label="Exiger une validation médicale avant la sortie"
          hint="La sortie ne peut pas être enregistrée sans l'accord d'un praticien."
          checked={settings.requireDischargeValidation}
          editable={editable}
          onChange={(requireDischargeValidation) => update({ requireDischargeValidation })}
        />
      </Panel>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Pharmacie
// ---------------------------------------------------------------------------

export const PharmacySettingsPanel: React.FC<{
  settings: PharmacySettings;
  editable: boolean;
  onChange: (settings: PharmacySettings) => void;
}> = ({ settings, editable, onChange }) => {
  const update = (patch: Partial<PharmacySettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-4">
      <Panel
        title="Alertes de stock"
        description="Ces seuils décident de ce qui est signalé dans le module Pharmacie."
        icon={Pill}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ph-low" className="mb-1.5 block text-xs font-semibold text-slate-300">
              Seuil de réapprovisionnement par défaut
            </label>
            <input
              id="ph-low"
              type="number"
              min={0}
              className={FIELD}
              disabled={!editable}
              value={settings.lowStockThreshold}
              onChange={(e) => update({ lowStockThreshold: Number(e.target.value) || 0 })}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Appliqué aux nouveaux produits. Chaque produit peut ensuite avoir le sien.
            </p>
          </div>
          <div>
            <label htmlFor="ph-exp" className="mb-1.5 block text-xs font-semibold text-slate-300">
              Péremption signalée (jours avant)
            </label>
            <input
              id="ph-exp"
              type="number"
              min={1}
              max={365}
              className={FIELD}
              disabled={!editable}
              value={settings.expiryWarningDays}
              onChange={(e) => update({ expiryWarningDays: Number(e.target.value) || 1 })}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Un produit dont la péremption approche est signalé dans l&apos;inventaire.
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Règles de délivrance"
        description="Contrôles appliqués avant toute sortie de stock."
        icon={Pill}
      >
        <Toggle
          label="Interdire la délivrance d'un produit périmé"
          hint="Un produit dont la date est dépassée ne peut plus sortir du stock."
          checked={settings.blockExpiredDispensing}
          editable={editable}
          onChange={(blockExpiredDispensing) => update({ blockExpiredDispensing })}
        />
        <Toggle
          label="Exiger la validation du pharmacien"
          hint="Une prescription doit être validée avant préparation et délivrance."
          checked={settings.requirePharmacistValidation}
          editable={editable}
          onChange={(requirePharmacistValidation) => update({ requirePharmacistValidation })}
        />
        <Toggle
          label="Suivre les numéros de lot"
          hint="Nécessaire au rappel de lot et à la traçabilité des médicaments réglementés."
          checked={settings.trackLots}
          editable={editable}
          onChange={(trackLots) => update({ trackLots })}
        />
      </Panel>

      <Panel
        title="Catalogue"
        description="Listes proposées à l'enregistrement d'un médicament (BP19 §5)."
        icon={Pill}
      >
        <TagList
          label="Catégories thérapeutiques"
          placeholder="Antibiotique, Antalgique…"
          values={settings.categories}
          editable={editable}
          onChange={(categories) => update({ categories })}
        />
        <TagList
          label="Formes pharmaceutiques"
          placeholder="Comprimé, Sirop, Solution injectable…"
          values={settings.forms}
          editable={editable}
          onChange={(forms) => update({ forms })}
        />
        <TagList
          label="Voies d'administration"
          placeholder="Orale, Intraveineuse…"
          values={settings.administrationRoutes}
          editable={editable}
          onChange={(administrationRoutes) => update({ administrationRoutes })}
        />

        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-300">Règle de sortie par défaut</p>
          <Select<'FEFO' | 'FIFO' | 'LIFO'>
            disabled={!editable}
            value={settings.defaultIssueRule}
            onChange={(defaultIssueRule) => update({ defaultIssueRule })}
            options={[
              {
                value: 'FEFO',
                label: 'FEFO — premier périmé, premier sorti',
                hint: 'Recommandé : limite les pertes par péremption.',
              },
              {
                value: 'FIFO',
                label: 'FIFO — premier entré, premier sorti',
                hint: "Suit l'ordre d'arrivée en stock.",
              },
              {
                value: 'LIFO',
                label: 'LIFO — dernier entré, premier sorti',
                hint: 'Réservé aux produits sans péremption.',
              },
            ]}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Appliquée aux nouveaux produits. Chaque produit peut ensuite porter la sienne.
          </p>
        </div>
      </Panel>
    </div>
  );
};

export type { ModuleSettings };
