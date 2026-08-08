'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, ClipboardList, Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatDateTime } from '@/lib/utils';
import {
  closeInventory,
  listInventoryLines,
  openInventory,
  saveInventoryCount,
  type Inventory,
  type InventoryLine,
  type Pharmacy,
  type StockState,
} from '@/services/pharmacy.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice, ScrollTable } from '@/components/hospitalization/shared';

/**
 * Inventaires et écarts (BP18 §13).
 *
 * La quantité théorique est figée à l'ouverture. Un écart n'a de sens que
 * rapporté à ce que le système annonçait au moment du comptage : la recalculer
 * à la clôture rendrait le résultat ininterprétable si un mouvement a eu lieu
 * entre-temps.
 */

const TYPES = [
  { value: 'general', label: 'Inventaire général', hint: 'Tout le catalogue.' },
  { value: 'rolling', label: 'Inventaire tournant', hint: 'Une partie du stock, par rotation.' },
  { value: 'targeted', label: 'Inventaire ciblé', hint: 'Quelques produits choisis.' },
  { value: 'location', label: 'Par emplacement', hint: 'Le stock d’une pharmacie donnée.' },
] as const;

const STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'neutral' }> = {
  open: { label: 'En cours', tone: 'warn' },
  counted: { label: 'Compté', tone: 'warn' },
  closed: { label: 'Clôturé', tone: 'good' },
  canceled: { label: 'Annulé', tone: 'neutral' },
};

export const InventoryPanel: React.FC<{
  inventories: readonly Inventory[];
  stock: readonly StockState[];
  pharmacies: readonly Pharmacy[];
  canManage: boolean;
  ctx: WriteContext | null;
  onChanged: () => Promise<void>;
}> = ({ inventories, stock, pharmacies, canManage, ctx, onChanged }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [opened, setOpened] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400">
          À la clôture, chaque écart constaté devient un mouvement d’inventaire, explicable ligne à
          ligne dans l’historique.
        </p>
        {canManage && (
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setIsOpening(true);
            }}
            disabled={stock.length === 0}
            className="shrink-0 gap-2"
          >
            <Plus className="h-4 w-4" /> Lancer un inventaire
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {inventories.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun inventaire"
            description="Un inventaire fige les quantités théoriques, recueille le comptage physique et convertit les écarts en mouvements."
          />
        ) : (
          <ScrollTable minWidth="min-w-[44rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Type</th>
                <th className="p-4">Pharmacie</th>
                <th className="p-4">Ouvert le</th>
                <th className="p-4">Lignes</th>
                <th className="p-4">Écarts</th>
                <th className="p-4">État</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {inventories.map((entry) => {
                const status = STATUS[entry.status] ?? { label: entry.status, tone: 'neutral' as const };
                return (
                  <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                    <td className="p-4">
                      {TYPES.find((type) => type.value === entry.inventoryType)?.label ??
                        entry.inventoryType}
                    </td>
                    <td className="p-4">{entry.pharmacyName ?? '—'}</td>
                    <td className="p-4">{formatDateTime(entry.startedAt)}</td>
                    <td className="p-4">{entry.lineCount}</td>
                    <td className="p-4">
                      <span className={entry.varianceCount > 0 ? 'font-bold text-amber-400' : ''}>
                        {entry.varianceCount}
                      </span>
                    </td>
                    <td className="p-4">
                      <Badge label={status.label} tone={status.tone} />
                    </td>
                    <td className="p-4">
                      <ActionMenu
                        label={`Actions pour ${entry.reference}`}
                        items={[
                          {
                            label: entry.status === 'closed' ? 'Consulter' : 'Saisir le comptage',
                            icon: ClipboardCheck,
                            onSelect: () => {
                              setError(null);
                              setOpened(entry);
                            },
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

      {isOpening && (
        <OpenForm
          stock={stock}
          pharmacies={pharmacies}
          onCancel={() => setIsOpening(false)}
          onSubmit={async (input) => {
            setError(null);
            try {
              await openInventory(input, ctx as WriteContext);
              await onChanged();
              setIsOpening(false);
              setNotice('Inventaire ouvert : les quantités théoriques sont figées.');
            } catch (err) {
              setError(err instanceof Error ? err.message : "Ouverture impossible.");
            }
          }}
        />
      )}

      {opened && (
        <CountSheet
          inventory={opened}
          canManage={canManage}
          ctx={ctx}
          onClose={() => setOpened(null)}
          onClosed={async (adjusted) => {
            setOpened(null);
            await onChanged();
            setNotice(
              adjusted === 0
                ? 'Inventaire clôturé : aucun écart constaté.'
                : `Inventaire clôturé : ${adjusted} écart(s) reporté(s) en mouvement.`,
            );
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const OpenForm: React.FC<{
  stock: readonly StockState[];
  pharmacies: readonly Pharmacy[];
  onCancel: () => void;
  onSubmit: (input: {
    pharmacyId: string | null;
    inventoryType: string;
    itemIds: string[];
  }) => Promise<void>;
}> = ({ stock, pharmacies, onCancel, onSubmit }) => {
  const [inventoryType, setInventoryType] = useState<string>('general');
  const [pharmacyId, setPharmacyId] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const targeted = inventoryType === 'targeted';
  const itemIds = targeted ? selected : stock.map((line) => line.itemId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (itemIds.length === 0) return;
    setIsSaving(true);
    await onSubmit({ pharmacyId: pharmacyId || null, inventoryType, itemIds });
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Lancer un inventaire"
      description="Les quantités théoriques seront figées à l’ouverture."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Type d’inventaire *">
          <Select
            value={inventoryType}
            onChange={setInventoryType}
            options={TYPES.map((type) => ({
              value: type.value,
              label: type.label,
              hint: type.hint,
            }))}
          />
        </Field>

        <Field label="Pharmacie">
          <Select
            value={pharmacyId}
            onChange={setPharmacyId}
            placeholder="— Toutes pharmacies —"
            options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
          />
        </Field>

        {targeted && (
          <Field
            label="Produits à compter *"
            hint={`${selected.length} produit(s) sélectionné(s).`}
          >
            <div className="max-h-56 space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-slate-800 bg-slate-950 p-2">
              {stock.map((line) => (
                <label
                  key={line.itemId}
                  className="flex cursor-pointer items-center gap-2 rounded p-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-mora-green"
                    checked={selected.includes(line.itemId)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, line.itemId]
                          : current.filter((id) => id !== line.itemId),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{line.name}</span>
                  <span className="shrink-0 text-slate-500">{line.quantity}</span>
                </label>
              ))}
            </div>
          </Field>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            disabled={itemIds.length === 0}
            className="flex-1 font-bold"
          >
            Ouvrir l’inventaire
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const CountSheet: React.FC<{
  inventory: Inventory;
  canManage: boolean;
  ctx: WriteContext | null;
  onClose: () => void;
  onClosed: (adjusted: number) => Promise<void>;
}> = ({ inventory, canManage, ctx, onClose, onClosed }) => {
  const [lines, setLines] = useState<InventoryLine[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await listInventoryLines(inventory.id);
      setLines(loaded);
      setDrafts(
        Object.fromEntries(
          loaded.map((line) => [
            line.id,
            line.countedQuantity === null ? '' : String(line.countedQuantity),
          ]),
        ),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [inventory.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isClosed = inventory.status === 'closed';

  const saveLine = async (line: InventoryLine) => {
    const raw = drafts[line.id];
    if (raw === '' || raw === undefined || !ctx) return;

    try {
      await saveInventoryCount(line.id, Number(raw), null, ctx.userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  };

  const close = async () => {
    if (!ctx) return;
    setIsClosing(true);
    setError(null);
    try {
      const adjusted = await closeInventory(inventory.id, ctx.userId);
      await onClosed(adjusted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clôture impossible.');
      setIsClosing(false);
    }
  };

  const counted = lines.filter((line) => line.countedQuantity !== null).length;

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="2xl"
      title={`Inventaire ${inventory.reference}`}
      description={
        isClosed
          ? 'Inventaire clôturé : les écarts ont été reportés en mouvements.'
          : `${counted} / ${lines.length} ligne(s) comptée(s)`
      }
    >
      <div className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        {isLoading ? (
          <div className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-950" />
        ) : (
          <div className="max-h-96 overflow-y-auto overscroll-contain rounded-xl border border-slate-800">
            <ScrollTable minWidth="min-w-[38rem]">
              <thead className="sticky top-0 bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-3">Produit</th>
                  <th className="p-3">Lot</th>
                  <th className="p-3">Théorique</th>
                  <th className="p-3">Compté</th>
                  <th className="p-3">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="p-3 font-semibold text-white">{line.itemName}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      {line.lotNumber ?? '—'}
                    </td>
                    <td className="p-3">{line.expectedQuantity}</td>
                    <td className="p-3">
                      {isClosed || !canManage ? (
                        <span>{line.countedQuantity ?? '—'}</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          aria-label={`Quantité comptée pour ${line.itemName}`}
                          className={`${FIELD} w-24 px-2 py-1`}
                          value={drafts[line.id] ?? ''}
                          onChange={(event) =>
                            setDrafts((current) => ({ ...current, [line.id]: event.target.value }))
                          }
                          onBlur={() => void saveLine(line)}
                        />
                      )}
                    </td>
                    <td className="p-3">
                      {line.countedQuantity === null ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <span
                          className={
                            line.variance === 0
                              ? 'text-slate-400'
                              : line.variance > 0
                                ? 'font-bold text-mora-green'
                                : 'font-bold text-red-400'
                          }
                        >
                          {line.variance > 0 ? `+${line.variance}` : line.variance}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollTable>
          </div>
        )}

        {!isClosed && canManage && (
          <>
            <Notice tone="info">
              La clôture est définitive : chaque écart produit un mouvement d’inventaire qui corrige
              le stock et reste visible dans l’historique.
            </Notice>
            <Button
              variant="secondary"
              isLoading={isClosing}
              disabled={counted === 0}
              onClick={() => void close()}
              className="w-full gap-2 font-bold"
            >
              <Lock className="h-4 w-4" /> Clôturer l’inventaire
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};
