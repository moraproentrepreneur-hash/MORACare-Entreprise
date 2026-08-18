'use client';

import React, { useState } from 'react';
import { Building, MapPin, Pencil, Plus, Power, PowerOff, Truck } from 'lucide-react';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  LOCATION_LEVEL_LABELS,
  SUPPLIER_TYPES,
  createLocation,
  createPharmacy,
  setPharmacyActive,
  updatePharmacy,
  createSupplier,
  type LocationLevel,
  type Pharmacy,
  type StockByLocation,
  type StockLocation,
  type Supplier,
} from '@/services/pharmacy.service';
import type { HospitalizationSettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice } from '@/components/hospitalization/shared';

/**
 * Pharmacies, emplacements et fournisseurs (BP17 §5, BP18 §4-§7, BP19 §4, §12).
 *
 * Les trois sont réunis parce qu'ils décrivent l'organisation, pas l'activité :
 * on les règle une fois, puis on n'y revient qu'à l'ouverture d'un service ou
 * à l'arrivée d'un nouveau fournisseur.
 */

/** Niveaux ordonnés du BP18 §4 : chacun s'accroche au précédent. */
const LEVELS: LocationLevel[] = ['site', 'warehouse', 'zone', 'aisle', 'shelf', 'tier', 'bin'];

export const OrganisationPanel: React.FC<{
  pharmacies: readonly Pharmacy[];
  locations: readonly StockLocation[];
  stockByLocation: readonly StockByLocation[];
  suppliers: readonly Supplier[];
  hospitalizationSettings: HospitalizationSettings;
  canManage: boolean;
  ctx: WriteContext | null;
  onChanged: () => Promise<void>;
}> = ({
  pharmacies,
  locations,
  stockByLocation,
  suppliers,
  hospitalizationSettings,
  canManage,
  ctx,
  onChanged,
}) => {
  const [dialog, setDialog] = useState<'pharmacy' | 'location' | 'supplier' | null>(null);
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (task: () => Promise<void>) => {
    setError(null);
    try {
      await task();
      await onChanged();
      setDialog(null);
      setEditingPharmacy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    }
  };

  return (
    <div className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Building className="h-4 w-4 text-mora-green" /> Pharmacies et armoires de service
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Un établissement peut en gérer plusieurs. Une armoire de service est réapprovisionnée
              par une pharmacie.
            </p>
          </div>
          {canManage && (
            <Button variant="outline" onClick={() => setDialog('pharmacy')} className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          )}
        </div>

        {pharmacies.length === 0 ? (
          <EmptyState
            icon={Building}
            title="Aucune pharmacie"
            description="Créez au moins une pharmacie : elle porte les lots, les entrées et les délivrances."
          />
        ) : (
          <ul className="divide-y divide-slate-800">
            {pharmacies.map((entry) => {
              // Quantité réellement détenue : c'est elle qui interdit la
              // fermeture d'un magasin dont les rayons ne sont pas vides.
              const held = stockByLocation
                .filter((line) => line.pharmacyId === entry.id)
                .reduce((sum, line) => sum + line.availableQuantity, 0);

              return (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-white">
                      {entry.name}
                      {entry.isDefault && <Badge label="Par défaut" tone="good" />}
                      {entry.isServiceCabinet && <Badge label="Armoire de service" tone="info" />}
                      {!entry.isActive && <Badge label="Fermée" tone="bad" />}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {entry.reference}
                      {entry.service && ` · ${entry.service}`}
                      {entry.locationName && ` · ${entry.locationName}`}
                      {` · ${held} unité(s) en stock`}
                    </p>
                  </div>

                  <ActionMenu
                    label={`Actions pour ${entry.name}`}
                    items={[
                      {
                        label: 'Modifier',
                        icon: Pencil,
                        disabled: !canManage,
                        onSelect: () => setEditingPharmacy(entry),
                      },
                      {
                        label: entry.isActive ? 'Fermer la pharmacie' : 'Rouvrir la pharmacie',
                        icon: entry.isActive ? PowerOff : Power,
                        destructive: entry.isActive,
                        disabled: !canManage || entry.isDefault,
                        onSelect: () =>
                          void run(() =>
                            setPharmacyActive(entry.id, !entry.isActive, ctx?.userId ?? ''),
                          ),
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <MapPin className="h-4 w-4 text-mora-green" /> Emplacements de stockage
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Site, magasin, zone, allée, étagère, niveau, bac. Descendez aussi loin que votre
              organisation l’exige.
            </p>
          </div>
          {canManage && (
            <Button variant="outline" onClick={() => setDialog('location')} className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          )}
        </div>

        {locations.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Aucun emplacement"
            description="Commencez par un site de stockage — un Dépôt Central, par exemple — puis affinez si besoin."
          />
        ) : (
          <ul className="divide-y divide-slate-800">
            {locations.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">
                    <span className="font-mono text-mora-gold">{entry.code}</span> — {entry.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {LOCATION_LEVEL_LABELS[entry.level]} · {entry.reference}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Truck className="h-4 w-4 text-mora-green" /> Fournisseurs
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Rattachés aux lots reçus, ils permettent de remonter la chaîne en cas de rappel.
            </p>
          </div>
          {canManage && (
            <Button variant="outline" onClick={() => setDialog('supplier')} className="gap-2">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          )}
        </div>

        {suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Aucun fournisseur"
            description="Enregistrez vos fournisseurs pour tracer l’origine de chaque lot."
          />
        ) : (
          <ul className="divide-y divide-slate-800">
            {suppliers.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">{entry.name}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {entry.supplierType}
                    {entry.city && ` · ${entry.city}`}
                    {entry.phone && ` · ${entry.phone}`}
                    {entry.averageLeadDays !== null && ` · livraison ~${entry.averageLeadDays} j`}
                  </p>
                </div>
                {entry.rating !== null && <Badge label={`${entry.rating}/5`} tone="info" />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingPharmacy && (
        <PharmacyForm
          pharmacies={pharmacies}
          locations={locations}
          services={hospitalizationSettings.admissionServices}
          hasDefault={pharmacies.some((entry) => entry.isDefault && entry.id !== editingPharmacy.id)}
          existing={editingPharmacy}
          onCancel={() => setEditingPharmacy(null)}
          onSubmit={(input) =>
            run(() => updatePharmacy(editingPharmacy.id, input, ctx?.userId ?? ''))
          }
        />
      )}

      {dialog === 'pharmacy' && (
        <PharmacyForm
          pharmacies={pharmacies}
          locations={locations}
          services={hospitalizationSettings.admissionServices}
          hasDefault={pharmacies.some((entry) => entry.isDefault)}
          onCancel={() => setDialog(null)}
          onSubmit={(input) => run(() => createPharmacy(input, ctx as WriteContext))}
        />
      )}

      {dialog === 'location' && (
        <LocationForm
          locations={locations}
          onCancel={() => setDialog(null)}
          onSubmit={(input) => run(() => createLocation(input, ctx as WriteContext))}
        />
      )}

      {dialog === 'supplier' && (
        <SupplierForm
          onCancel={() => setDialog(null)}
          onSubmit={(input) => run(() => createSupplier(input, ctx as WriteContext))}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const PharmacyForm: React.FC<{
  pharmacies: readonly Pharmacy[];
  locations: readonly StockLocation[];
  services: readonly string[];
  hasDefault: boolean;
  /** Pharmacie à modifier ; absente, le formulaire en crée une. */
  existing?: Pharmacy;
  onCancel: () => void;
  onSubmit: (input: {
    name: string;
    locationId: string | null;
    isServiceCabinet: boolean;
    service: string | null;
    suppliedBy: string | null;
    isDefault: boolean;
  }) => Promise<void>;
}> = ({ pharmacies, locations, services, hasDefault, existing, onCancel, onSubmit }) => {
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    locationId: existing?.locationId ?? '',
    isServiceCabinet: existing?.isServiceCabinet ?? false,
    service: existing?.service ?? '',
    suppliedBy: existing?.suppliedBy ?? '',
    isDefault: existing?.isDefault ?? !hasDefault,
  });
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSubmit({
      name: form.name,
      locationId: form.locationId || null,
      isServiceCabinet: form.isServiceCabinet,
      service: form.isServiceCabinet ? form.service || null : null,
      suppliedBy: form.isServiceCabinet ? form.suppliedBy || null : null,
      isDefault: form.isDefault,
    });
    setIsSaving(false);
  };

  // Seuls les magasins reçoivent une pharmacie : BR-083 l'exige, et un bac ou
  // une étagère ne se gère pas comme un point de délivrance.
  const stores = locations.filter(
    (entry) => entry.level === 'site' || entry.level === 'warehouse',
  );

  return (
    <Modal isOpen onClose={onCancel} title={existing ? `Pharmacie ${existing.name}` : 'Nouvelle pharmacie'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom *" htmlFor="pharmacy-name">
          <input
            id="pharmacy-name"
            required
            className={FIELD}
            placeholder="Pharmacie Centrale"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </Field>

        <Field label="Magasin rattaché" hint="BR-083 : chaque pharmacie est adossée à un magasin.">
          <Select
            value={form.locationId}
            onChange={(value) => setForm({ ...form, locationId: value })}
            placeholder="— Aucun —"
            options={stores.map((entry) => ({
              value: entry.id,
              label: entry.name,
              hint: LOCATION_LEVEL_LABELS[entry.level],
            }))}
          />
        </Field>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-mora-green"
            checked={form.isServiceCabinet}
            onChange={(event) =>
              setForm({ ...form, isServiceCabinet: event.target.checked, isDefault: false })
            }
          />
          <span>
            Armoire pharmaceutique de service
            <span className="mt-0.5 block text-[11px] text-slate-500">
              Magasin secondaire réapprovisionné par une pharmacie (BP19 §12).
            </span>
          </span>
        </label>

        {form.isServiceCabinet && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service">
              <Select
                value={form.service}
                onChange={(value) => setForm({ ...form, service: value })}
                placeholder="— Choisir —"
                options={services.map((entry) => ({ value: entry, label: entry }))}
              />
            </Field>
            <Field label="Réapprovisionnée par">
              <Select
                value={form.suppliedBy}
                onChange={(value) => setForm({ ...form, suppliedBy: value })}
                placeholder="— Choisir —"
                options={pharmacies
                  .filter((entry) => !entry.isServiceCabinet)
                  .map((entry) => ({ value: entry.id, label: entry.name }))}
              />
            </Field>
          </div>
        )}

        {!form.isServiceCabinet && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-mora-green"
              checked={form.isDefault}
              onChange={(event) => setForm({ ...form, isDefault: event.target.checked })}
            />
            <span>
              Pharmacie par défaut
              <span className="mt-0.5 block text-[11px] text-slate-500">
                Retenue automatiquement pour les entrées et les délivrances. Une seule à la fois.
              </span>
            </span>
          </label>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            {existing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const LocationForm: React.FC<{
  locations: readonly StockLocation[];
  onCancel: () => void;
  onSubmit: (input: {
    parentId: string | null;
    level: LocationLevel;
    code: string;
    name: string;
  }) => Promise<void>;
}> = ({ locations, onCancel, onSubmit }) => {
  const [level, setLevel] = useState<LocationLevel>(locations.length === 0 ? 'site' : 'warehouse');
  const [parentId, setParentId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isSite = level === 'site';
  // Le parent est toujours le niveau immédiatement supérieur : la hiérarchie du
  // BP18 §4 ne se saute pas.
  const parentLevel = LEVELS[Math.max(0, LEVELS.indexOf(level) - 1)];
  const parents = locations.filter((entry) => entry.level === parentLevel);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSubmit({ parentId: isSite ? null : parentId, level, code, name });
    setIsSaving(false);
  };

  return (
    <Modal isOpen onClose={onCancel} title="Nouvel emplacement">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Niveau *">
          <Select<LocationLevel>
            value={level}
            onChange={(value) => {
              setLevel(value);
              setParentId('');
            }}
            options={LEVELS.map((entry) => ({
              value: entry,
              label: LOCATION_LEVEL_LABELS[entry],
            }))}
          />
        </Field>

        {!isSite && (
          <Field
            label={`${LOCATION_LEVEL_LABELS[parentLevel]} parent *`}
            hint={
              parents.length === 0
                ? `Créez d’abord un niveau « ${LOCATION_LEVEL_LABELS[parentLevel]} ».`
                : undefined
            }
          >
            <Select
              required
              value={parentId}
              onChange={setParentId}
              options={parents.map((entry) => ({
                value: entry.id,
                label: `${entry.code} — ${entry.name}`,
              }))}
            />
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code *" htmlFor="loc-code">
            <input
              id="loc-code"
              required
              className={FIELD}
              placeholder="DEPOT, ZA, A03…"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </Field>
          <Field label="Nom *" htmlFor="loc-name">
            <input
              id="loc-name"
              required
              className={FIELD}
              placeholder="Dépôt Central"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            disabled={!isSite && parents.length === 0}
            className="flex-1 font-bold"
          >
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const SupplierForm: React.FC<{
  onCancel: () => void;
  onSubmit: (input: {
    name: string;
    supplierType: string;
    contactName?: string;
    email?: string;
    phone?: string;
    city?: string;
    country?: string;
    averageLeadDays?: number | null;
    paymentTerms?: string;
    rating?: number | null;
  }) => Promise<void>;
}> = ({ onCancel, onSubmit }) => {
  const [form, setForm] = useState({
    name: '',
    supplierType: 'distributeur',
    contactName: '',
    email: '',
    phone: '',
    city: '',
    country: 'Comores',
    averageLeadDays: '',
    paymentTerms: '',
    rating: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSubmit({
      ...form,
      averageLeadDays: form.averageLeadDays === '' ? null : Number(form.averageLeadDays),
      rating: form.rating === '' ? null : Number(form.rating),
    });
    setIsSaving(false);
  };

  return (
    <Modal isOpen onClose={onCancel} title="Nouveau fournisseur">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Raison sociale *" htmlFor="sup-name">
            <input
              id="sup-name"
              required
              className={FIELD}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Field>
          <Field label="Nature *">
            <Select
              value={form.supplierType}
              onChange={(value) => setForm({ ...form, supplierType: value })}
              options={SUPPLIER_TYPES.map((entry) => ({
                value: entry,
                label: entry.charAt(0).toUpperCase() + entry.slice(1),
              }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact" htmlFor="sup-contact">
            <input
              id="sup-contact"
              className={FIELD}
              value={form.contactName}
              onChange={(event) => setForm({ ...form, contactName: event.target.value })}
            />
          </Field>
          <Field label="Téléphone" htmlFor="sup-phone">
            <input
              id="sup-phone"
              className={FIELD}
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
          <Field label="Courriel" htmlFor="sup-email">
            <input
              id="sup-email"
              type="email"
              className={FIELD}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ville" htmlFor="sup-city">
            <input
              id="sup-city"
              className={FIELD}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>
          <Field label="Pays" htmlFor="sup-country">
            <input
              id="sup-country"
              className={FIELD}
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Délai moyen (jours)" htmlFor="sup-lead">
            <input
              id="sup-lead"
              type="number"
              min={0}
              max={365}
              className={FIELD}
              value={form.averageLeadDays}
              onChange={(event) => setForm({ ...form, averageLeadDays: event.target.value })}
            />
          </Field>
          <Field label="Conditions de paiement" htmlFor="sup-terms">
            <input
              id="sup-terms"
              className={FIELD}
              placeholder="30 jours fin de mois"
              value={form.paymentTerms}
              onChange={(event) => setForm({ ...form, paymentTerms: event.target.value })}
            />
          </Field>
          <Field label="Évaluation (1 à 5)" htmlFor="sup-rating">
            <input
              id="sup-rating"
              type="number"
              min={1}
              max={5}
              className={FIELD}
              value={form.rating}
              onChange={(event) => setForm({ ...form, rating: event.target.value })}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Créer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
