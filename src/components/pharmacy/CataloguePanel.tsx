'use client';

import React, { useMemo, useState } from 'react';
import { Archive, Boxes, Layers, Package, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  archiveMedication,
  createMedication,
  daysBeforeExpiry,
  updateMedication,
  type IssueRule,
  type Medication,
  type MedicationInput,
  type StockState,
} from '@/services/pharmacy.service';
import { CONTROLLED_CLASSES } from '@/services/pharmacy.service';
import type { PharmacySettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice, ScrollTable } from '@/components/hospitalization/shared';

/**
 * Catalogue et état du stock (BP19 §5, BP18 §19).
 *
 * L'écran combine délibérément la fiche produit et sa situation en stock : le
 * pharmacien qui cherche un médicament veut savoir dans le même mouvement s'il
 * en reste, et quand le prochain lot périme. Deux écrans séparés l'obligeraient
 * à faire l'aller-retour pour chaque produit.
 */

const emptyForm = (settings: PharmacySettings): MedicationInput => ({
  name: '',
  genericName: '',
  category: settings.categories[0] ?? '',
  form: settings.forms[0] ?? '',
  dosage: '',
  administrationRoute: settings.administrationRoutes[0] ?? '',
  unit: 'Boîte',
  packaging: '',
  atcCode: '',
  storageConditions: '',
  unitPrice: 0,
  purchasePrice: 0,
  reorderLevel: settings.lowStockThreshold,
  maxStock: null,
  isControlled: false,
  controlledClass: null,
  issueRule: settings.defaultIssueRule,
});

/** Unités de conditionnement usuelles en pharmacie hospitalière. */
const UNITS = ['Boîte', 'Comprimé', 'Flacon', 'Ampoule', 'Sachet', 'Tube', 'Poche', 'Unité'];

type Filter = 'all' | 'low' | 'out' | 'expiring' | 'controlled';

export const CataloguePanel: React.FC<{
  stock: readonly StockState[];
  medications: readonly Medication[];
  settings: PharmacySettings;
  currency: string;
  canManage: boolean;
  ctx: WriteContext | null;
  onOpenLots: (itemId: string) => void;
  onChanged: () => Promise<void>;
}> = ({ stock, medications, settings, currency, canManage, ctx, onOpenLots, onChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState<MedicationInput>(emptyForm(settings));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return stock
      .filter((line) => {
        if (filter === 'low') return line.quantity > 0 && line.quantity <= line.reorderLevel;
        if (filter === 'out') return line.quantity <= 0;
        if (filter === 'expiring') return line.expiringQuantity > 0 || line.expiredQuantity > 0;
        if (filter === 'controlled') return line.isControlled;
        return true;
      })
      .filter((line) =>
        needle === ''
          ? true
          : `${line.reference} ${line.name} ${line.genericName ?? ''} ${line.category} ${line.dosage ?? ''}`
              .toLowerCase()
              .includes(needle),
      );
  }, [stock, search, filter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(settings));
    setError(null);
    setIsOpen(true);
  };

  const openEdit = (itemId: string) => {
    const medication = medications.find((entry) => entry.id === itemId);
    if (!medication) return;

    setEditing(medication);
    setForm({
      name: medication.name,
      genericName: medication.genericName ?? '',
      category: medication.category,
      form: medication.form ?? '',
      dosage: medication.dosage ?? '',
      administrationRoute: medication.administrationRoute ?? '',
      unit: medication.unit,
      packaging: medication.packaging ?? '',
      atcCode: medication.atcCode ?? '',
      storageConditions: medication.storageConditions ?? '',
      unitPrice: medication.unitPrice,
      purchasePrice: medication.purchasePrice,
      reorderLevel: medication.reorderLevel,
      maxStock: medication.maxStock,
      isControlled: medication.isControlled,
      controlledClass: medication.controlledClass,
      issueRule: medication.issueRule,
    });
    setError(null);
    setIsOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    setIsSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateMedication(editing.id, form, ctx.userId);
      } else {
        await createMedication(form, ctx);
      }
      await onChanged();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const archive = async (itemId: string) => {
    if (!ctx) return;
    try {
      await archiveMedication(itemId, ctx.userId);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archivage impossible.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <input
          className={FIELD}
          placeholder="Rechercher un médicament, une DCI, une référence…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select<Filter>
          aria-label="Filtrer le catalogue"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tout le catalogue' },
            { value: 'low', label: 'Stock faible' },
            { value: 'out', label: 'En rupture' },
            { value: 'expiring', label: 'Péremption à surveiller' },
            { value: 'controlled', label: 'Médicaments réglementés' },
          ]}
        />
        {canManage && (
          <Button variant="secondary" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Nouveau médicament
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={Package}
            title={stock.length === 0 ? 'Catalogue vide' : 'Aucun résultat'}
            description={
              stock.length === 0
                ? "Enregistrez d'abord vos médicaments : les lots, les entrées et les délivrances s'y rattachent."
                : 'Aucun produit ne correspond à cette recherche.'
            }
            action={
              canManage && stock.length === 0 ? (
                <Button variant="secondary" onClick={openCreate} className="mt-2 gap-2">
                  <Plus className="h-4 w-4" /> Ajouter le premier médicament
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ScrollTable minWidth="min-w-[62rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Médicament</th>
                <th className="p-4">Catégorie</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Lots</th>
                <th className="p-4">Péremption</th>
                <th className="p-4">Prix</th>
                <th className="p-4">Valeur</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((line) => {
                const days = daysBeforeExpiry(line.nextExpiry);
                const isOut = line.quantity <= 0;
                const isLow = !isOut && line.quantity <= line.reorderLevel;

                return (
                  <tr key={line.itemId} className="transition-colors hover:bg-slate-800/50">
                    <td className="p-4 font-mono font-bold text-mora-green">{line.reference}</td>
                    <td className="p-4">
                      <span className="font-bold text-white">{line.name}</span>
                      <span className="block text-[11px] text-slate-500">
                        {[line.genericName, line.form, line.dosage].filter(Boolean).join(' · ') ||
                          '—'}
                      </span>
                      {line.isControlled && (
                        <span className="mt-1 inline-block">
                          <Badge label="Réglementé" tone="bad" />
                        </span>
                      )}
                    </td>
                    <td className="p-4">{line.category}</td>
                    <td className="p-4">
                      <span
                        className={`font-bold ${
                          isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-200'
                        }`}
                      >
                        {line.quantity} {line.unit}
                      </span>
                      {isOut && <span className="block text-[11px] text-red-400">Rupture</span>}
                      {isLow && (
                        <span className="block text-[11px] text-amber-400">
                          Seuil : {line.reorderLevel}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {line.lotCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onOpenLots(line.itemId)}
                          className="inline-flex items-center gap-1 text-mora-blue underline-offset-2 hover:underline"
                        >
                          <Layers className="h-3.5 w-3.5" /> {line.lotCount}
                        </button>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {line.nextExpiry === null ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <>
                          <span
                            className={
                              days !== null && days < 0
                                ? 'text-red-400'
                                : days !== null && days <= settings.expiryWarningDays
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
                            }
                          >
                            {formatDate(line.nextExpiry)}
                          </span>
                          {line.expiredQuantity > 0 && (
                            <span className="block text-[11px] text-red-400">
                              {line.expiredQuantity} périmé(s)
                            </span>
                          )}
                          {line.expiringQuantity > 0 && (
                            <span className="block text-[11px] text-amber-400">
                              {line.expiringQuantity} à surveiller
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-4">{formatCurrency(line.unitPrice, currency)}</td>
                    <td className="p-4 text-slate-400">
                      {formatCurrency(line.stockValue, currency)}
                    </td>
                    <td className="p-4">
                      <ActionMenu
                        label={`Actions pour ${line.name}`}
                        items={[
                          {
                            label: 'Voir les lots',
                            icon: Layers,
                            onSelect: () => onOpenLots(line.itemId),
                          },
                          {
                            label: 'Modifier la fiche',
                            icon: Pencil,
                            disabled: !canManage,
                            onSelect: () => openEdit(line.itemId),
                          },
                          {
                            label: 'Retirer du catalogue',
                            icon: Archive,
                            destructive: true,
                            disabled: !canManage,
                            onSelect: () => void archive(line.itemId),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ScrollTable>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="xl"
        title={editing ? editing.name : 'Nouveau médicament'}
        description="Les listes proviennent des Paramètres de l’établissement."
      >
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dénomination commerciale *" htmlFor="med-name">
              <input
                id="med-name"
                required
                className={FIELD}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="DCI (dénomination commune)" htmlFor="med-dci">
              <input
                id="med-dci"
                className={FIELD}
                value={form.genericName}
                placeholder="Amoxicilline"
                onChange={(event) => setForm({ ...form, genericName: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Catégorie thérapeutique *">
              <Select
                required
                value={form.category}
                onChange={(value) => setForm({ ...form, category: value })}
                options={settings.categories.map((entry) => ({ value: entry, label: entry }))}
              />
            </Field>
            <Field label="Forme pharmaceutique">
              <Select
                value={form.form ?? ''}
                onChange={(value) => setForm({ ...form, form: value })}
                placeholder="— Non précisée —"
                options={settings.forms.map((entry) => ({ value: entry, label: entry }))}
              />
            </Field>
            <Field label="Dosage" htmlFor="med-dosage">
              <input
                id="med-dosage"
                className={FIELD}
                placeholder="500 mg"
                value={form.dosage}
                onChange={(event) => setForm({ ...form, dosage: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Voie d’administration">
              <Select
                value={form.administrationRoute ?? ''}
                onChange={(value) => setForm({ ...form, administrationRoute: value })}
                placeholder="— Non précisée —"
                options={settings.administrationRoutes.map((entry) => ({
                  value: entry,
                  label: entry,
                }))}
              />
            </Field>
            <Field label="Unité de délivrance *">
              <Select
                required
                value={form.unit}
                onChange={(value) => setForm({ ...form, unit: value })}
                options={UNITS.map((entry) => ({ value: entry, label: entry }))}
              />
            </Field>
            <Field label="Conditionnement" htmlFor="med-packaging">
              <input
                id="med-packaging"
                className={FIELD}
                placeholder="Boîte de 16"
                value={form.packaging}
                onChange={(event) => setForm({ ...form, packaging: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Prix d'achat (${currency})`} htmlFor="med-purchase">
              <input
                id="med-purchase"
                type="number"
                min={0}
                className={FIELD}
                value={form.purchasePrice}
                onChange={(event) =>
                  setForm({ ...form, purchasePrice: Math.max(0, Number(event.target.value) || 0) })
                }
              />
            </Field>
            <Field label={`Prix de vente (${currency})`} htmlFor="med-price">
              <input
                id="med-price"
                type="number"
                min={0}
                className={FIELD}
                value={form.unitPrice}
                onChange={(event) =>
                  setForm({ ...form, unitPrice: Math.max(0, Number(event.target.value) || 0) })
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Seuil de réapprovisionnement"
              htmlFor="med-reorder"
              hint={`0 applique le seuil des Paramètres (${settings.lowStockThreshold}).`}
            >
              <input
                id="med-reorder"
                type="number"
                min={0}
                className={FIELD}
                value={form.reorderLevel}
                onChange={(event) =>
                  setForm({ ...form, reorderLevel: Math.max(0, Number(event.target.value) || 0) })
                }
              />
            </Field>
            <Field label="Stock maximum" htmlFor="med-max">
              <input
                id="med-max"
                type="number"
                min={0}
                className={FIELD}
                value={form.maxStock ?? ''}
                onChange={(event) =>
                  setForm({
                    ...form,
                    maxStock: event.target.value === '' ? null : Number(event.target.value),
                  })
                }
              />
            </Field>
            <Field label="Règle de sortie" hint="FEFO : premier périmé, premier sorti.">
              <Select<IssueRule>
                value={form.issueRule}
                onChange={(value) => setForm({ ...form, issueRule: value })}
                options={[
                  { value: 'FEFO', label: 'FEFO' },
                  { value: 'FIFO', label: 'FIFO' },
                  { value: 'LIFO', label: 'LIFO' },
                ]}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code ATC" htmlFor="med-atc">
              <input
                id="med-atc"
                className={FIELD}
                placeholder="J01CA04"
                value={form.atcCode}
                onChange={(event) => setForm({ ...form, atcCode: event.target.value })}
              />
            </Field>
            <Field label="Conditions de conservation" htmlFor="med-storage">
              <input
                id="med-storage"
                className={FIELD}
                placeholder="Entre 2 et 8 °C, à l’abri de la lumière"
                value={form.storageConditions}
                onChange={(event) => setForm({ ...form, storageConditions: event.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-slate-300">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-mora-green"
                checked={form.isControlled}
                onChange={(event) =>
                  setForm({ ...form, isControlled: event.target.checked })
                }
              />
              <span>
                Médicament réglementé
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Stupéfiant, psychotrope ou produit soumis à autorisation : sa traçabilité est
                  renforcée (BP19 §16).
                </span>
              </span>
            </label>

            {form.isControlled && (
              <div className="mt-3">
                <Select
                  aria-label="Catégorie réglementée"
                  value={form.controlledClass ?? ''}
                  onChange={(value) => setForm({ ...form, controlledClass: value })}
                  placeholder="— Choisir la catégorie —"
                  options={CONTROLLED_CLASSES.map((entry) => ({ value: entry, label: entry }))}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
              {editing ? 'Enregistrer' : 'Créer le médicament'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const CatalogueIcon = Boxes;
