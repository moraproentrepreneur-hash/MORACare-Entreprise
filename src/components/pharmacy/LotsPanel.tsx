'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Layers, Siren } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  LOT_STATE_LABELS,
  daysBeforeExpiry,
  recallLot,
  recordStockEntry,
  recordStockExit,
  type Lot,
  type Medication,
  type MovementKind,
  type Pharmacy,
  type Supplier,
} from '@/services/pharmacy.service';
import type { PharmacySettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice, ScrollTable } from '@/components/hospitalization/shared';

/**
 * Lots, entrées et sorties de stock (BP18 §9, §11 ; BP19 §14, §15).
 *
 * Toute variation de quantité passe par un mouvement : c'est le registre qui
 * fait foi, et la base refuse qu'on écrive une quantité directement. Une
 * correction se fait par un mouvement inverse, qui reste visible dans
 * l'historique.
 */

const lotTone = (lot: Lot): 'good' | 'warn' | 'bad' | 'neutral' => {
  if (lot.state === 'recalled') return 'bad';
  if (lot.state === 'expired') return 'bad';
  if (lot.state !== 'available') return 'neutral';
  if (lot.quantity === 0) return 'neutral';
  return 'good';
};

/** Sorties manuelles : la délivrance a son propre écran. */
const EXIT_KINDS: { value: MovementKind; label: string; hint: string }[] = [
  { value: 'exit', label: 'Sortie de stock', hint: 'Consommation interne, service, bloc.' },
  { value: 'return', label: 'Retour fournisseur', hint: 'Le produit quitte définitivement le stock.' },
  { value: 'destruction', label: 'Destruction', hint: 'Produit périmé, cassé ou rappelé.' },
  { value: 'adjustment', label: 'Ajustement', hint: 'Correction motivée, positive ou négative.' },
];

type Scope = 'all' | 'available' | 'expiring' | 'expired' | 'recalled';

export const LotsPanel: React.FC<{
  lots: readonly Lot[];
  medications: readonly Medication[];
  pharmacies: readonly Pharmacy[];
  suppliers: readonly Supplier[];
  settings: PharmacySettings;
  currency: string;
  canManage: boolean;
  ctx: WriteContext | null;
  focusItemId: string | null;
  onClearFocus: () => void;
  onChanged: () => Promise<void>;
}> = ({
  lots,
  medications,
  pharmacies,
  suppliers,
  settings,
  currency,
  canManage,
  ctx,
  focusItemId,
  onClearFocus,
  onChanged,
}) => {
  const [scope, setScope] = useState<Scope>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'entry' | 'exit' | 'recall' | null>(null);
  const [target, setTarget] = useState<Lot | null>(null);

  const focusName = focusItemId
    ? (medications.find((entry) => entry.id === focusItemId)?.name ?? null)
    : null;

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return lots
      .filter((lot) => (focusItemId ? lot.itemId === focusItemId : true))
      .filter((lot) => {
        const days = daysBeforeExpiry(lot.expiresOn);
        if (scope === 'available') return lot.state === 'available' && lot.quantity > 0;
        if (scope === 'expiring') {
          return days !== null && days >= 0 && days <= settings.expiryWarningDays && lot.quantity > 0;
        }
        if (scope === 'expired') return days !== null && days < 0 && lot.quantity > 0;
        if (scope === 'recalled') return lot.state === 'recalled';
        return true;
      })
      .filter((lot) =>
        needle === ''
          ? true
          : `${lot.lotNumber} ${lot.itemName} ${lot.supplierName ?? ''}`.toLowerCase().includes(needle),
      );
  }, [lots, focusItemId, scope, search, settings.expiryWarningDays]);

  const run = async (task: () => Promise<void>, message: string) => {
    setError(null);
    setNotice(null);
    try {
      await task();
      await onChanged();
      setNotice(message);
      setDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    }
  };

  return (
    <div className="space-y-4">
      {focusItemId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-mora-blue/40 bg-mora-blue/10 p-3 text-xs text-slate-200">
          <span>
            Lots de <strong>{focusName}</strong> uniquement.
          </span>
          <button
            type="button"
            onClick={onClearFocus}
            className="font-semibold text-mora-blue underline-offset-2 hover:underline"
          >
            Voir tous les lots
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <input
          className={FIELD}
          placeholder="Rechercher un lot, un produit, un fournisseur…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select<Scope>
          aria-label="Filtrer les lots"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'Tous les lots' },
            { value: 'available', label: 'Disponibles' },
            {
              value: 'expiring',
              label: `Péremption sous ${settings.expiryWarningDays} jours`,
            },
            { value: 'expired', label: 'Périmés' },
            { value: 'recalled', label: 'Rappelés' },
          ]}
        />
        {canManage && (
          <Button
            variant="secondary"
            onClick={() => {
              setTarget(null);
              setError(null);
              setDialog('entry');
            }}
            disabled={medications.length === 0}
            className="gap-2"
          >
            <ArrowDownToLine className="h-4 w-4" /> Entrée en stock
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={lots.length === 0 ? 'Aucun lot enregistré' : 'Aucun lot ne correspond'}
            description={
              lots.length === 0
                ? "Une entrée en stock crée le lot et l'alimente. C'est le lot qui porte la péremption, donc la règle FEFO et la traçabilité."
                : 'Modifiez les filtres pour élargir la recherche.'
            }
          />
        ) : (
          <ScrollTable minWidth="min-w-[60rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Lot</th>
                <th className="p-4">Médicament</th>
                <th className="p-4">Pharmacie</th>
                <th className="p-4">Fournisseur</th>
                <th className="p-4">Quantité</th>
                <th className="p-4">Péremption</th>
                <th className="p-4">Valeur</th>
                <th className="p-4">État</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((lot) => {
                const days = daysBeforeExpiry(lot.expiresOn);
                const expired = days !== null && days < 0;
                const soon = days !== null && days >= 0 && days <= settings.expiryWarningDays;

                return (
                  <tr key={lot.id} className="transition-colors hover:bg-slate-800/50">
                    <td className="p-4">
                      <span className="font-mono font-bold text-mora-gold">{lot.lotNumber}</span>
                      <span className="block font-mono text-[10px] text-slate-600">
                        {lot.reference}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white">{lot.itemName}</td>
                    <td className="p-4">{lot.pharmacyName ?? '—'}</td>
                    <td className="p-4">{lot.supplierName ?? '—'}</td>
                    <td className="p-4 font-bold text-slate-200">{lot.quantity}</td>
                    <td className="p-4">
                      {lot.expiresOn === null ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <>
                          <span
                            className={
                              expired ? 'text-red-400' : soon ? 'text-amber-400' : 'text-slate-300'
                            }
                          >
                            {formatDate(lot.expiresOn)}
                          </span>
                          {expired && (
                            <span className="block text-[11px] text-red-400">
                              Périmé depuis {Math.abs(days)} j
                            </span>
                          )}
                          {soon && (
                            <span className="block text-[11px] text-amber-400">
                              Dans {days} j
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-4 text-slate-400">
                      {formatCurrency(lot.quantity * lot.unitCost, currency)}
                    </td>
                    <td className="p-4">
                      <Badge label={LOT_STATE_LABELS[lot.state]} tone={lotTone(lot)} />
                    </td>
                    <td className="p-4">
                      <ActionMenu
                        label={`Actions pour le lot ${lot.lotNumber}`}
                        items={[
                          {
                            label: 'Sortie de stock',
                            icon: ArrowUpFromLine,
                            disabled: !canManage || lot.quantity <= 0,
                            onSelect: () => {
                              setTarget(lot);
                              setError(null);
                              setDialog('exit');
                            },
                          },
                          {
                            label: 'Déclarer un rappel',
                            icon: Siren,
                            destructive: true,
                            disabled: !canManage || lot.state === 'recalled',
                            onSelect: () => {
                              setTarget(lot);
                              setError(null);
                              setDialog('recall');
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

      {dialog === 'entry' && (
        <EntryForm
          medications={medications}
          pharmacies={pharmacies}
          suppliers={suppliers}
          currency={currency}
          error={error}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(
              () => recordStockEntry(input, ctx as WriteContext),
              'Entrée enregistrée : le stock est à jour.',
            )
          }
        />
      )}

      {dialog === 'exit' && target && (
        <ExitForm
          lot={target}
          error={error}
          onCancel={() => setDialog(null)}
          onSubmit={(quantity, kind, reason) =>
            run(
              () =>
                recordStockExit(
                  {
                    itemId: target.itemId,
                    lotId: target.id,
                    pharmacyId: target.pharmacyId,
                    quantity,
                    kind,
                    reason,
                  },
                  ctx as WriteContext,
                ),
              'Mouvement enregistré.',
            )
          }
        />
      )}

      {dialog === 'recall' && target && (
        <RecallForm
          lot={target}
          error={error}
          onCancel={() => setDialog(null)}
          onSubmit={(reason) =>
            run(
              () => recallLot(target.id, reason, ctx?.userId ?? ''),
              'Lot rappelé : sa délivrance est désormais interdite.',
            )
          }
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const EntryForm: React.FC<{
  medications: readonly Medication[];
  pharmacies: readonly Pharmacy[];
  suppliers: readonly Supplier[];
  currency: string;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: {
    itemId: string;
    pharmacyId: string | null;
    supplierId: string | null;
    lotNumber: string;
    manufacturedOn?: string | null;
    expiresOn?: string | null;
    quantity: number;
    unitCost: number;
    reason?: string;
  }) => Promise<void>;
}> = ({ medications, pharmacies, suppliers, currency, error, onCancel, onSubmit }) => {
  const [form, setForm] = useState({
    itemId: medications[0]?.id ?? '',
    pharmacyId: pharmacies.find((p) => p.isDefault)?.id ?? pharmacies[0]?.id ?? '',
    supplierId: '',
    lotNumber: '',
    manufacturedOn: '',
    expiresOn: '',
    quantity: 1,
    unitCost: 0,
    reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Le prix d'achat du catalogue sert de proposition : il évite de resaisir
  // une valeur qui change rarement d'une livraison à l'autre.
  const selected = medications.find((entry) => entry.id === form.itemId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSubmit({
      ...form,
      pharmacyId: form.pharmacyId || null,
      supplierId: form.supplierId || null,
      manufacturedOn: form.manufacturedOn || null,
      expiresOn: form.expiresOn || null,
      unitCost: form.unitCost || selected?.purchasePrice || 0,
    });
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Entrée en stock"
      description="Le lot est créé s’il n’existe pas encore, puis alimenté par le mouvement."
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        <Field label="Médicament *">
          <Select
            required
            value={form.itemId}
            onChange={(value) => setForm({ ...form, itemId: value })}
            options={medications.map((entry) => ({
              value: entry.id,
              label: entry.name,
              hint: [entry.form, entry.dosage].filter(Boolean).join(' · '),
            }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pharmacie">
            <Select
              value={form.pharmacyId}
              onChange={(value) => setForm({ ...form, pharmacyId: value })}
              placeholder="— Non affectée —"
              options={pharmacies.map((entry) => ({
                value: entry.id,
                label: entry.name,
                hint: entry.isServiceCabinet ? 'Armoire de service' : undefined,
              }))}
            />
          </Field>
          <Field label="Fournisseur">
            <Select
              value={form.supplierId}
              onChange={(value) => setForm({ ...form, supplierId: value })}
              placeholder="— Non précisé —"
              options={suppliers.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Numéro de lot *" htmlFor="lot-number">
            <input
              id="lot-number"
              required
              className={FIELD}
              value={form.lotNumber}
              onChange={(event) => setForm({ ...form, lotNumber: event.target.value })}
            />
          </Field>
          <Field
            label="Fabrication"
            htmlFor="lot-made"
            hint="Facultative : tous les conditionnements ne la portent pas."
          >
            <input
              id="lot-made"
              type="date"
              className={FIELD}
              value={form.manufacturedOn}
              onChange={(event) => setForm({ ...form, manufacturedOn: event.target.value })}
            />
          </Field>
          <Field
            label="Péremption *"
            htmlFor="lot-expiry"
            hint="Obligatoire : elle commande la règle FEFO et les alertes."
          >
            <input
              id="lot-expiry"
              type="date"
              required
              className={FIELD}
              value={form.expiresOn}
              onChange={(event) => setForm({ ...form, expiresOn: event.target.value })}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantité reçue *" htmlFor="lot-qty">
            <input
              id="lot-qty"
              type="number"
              min={1}
              required
              className={FIELD}
              value={form.quantity}
              onChange={(event) =>
                setForm({ ...form, quantity: Math.max(1, Number(event.target.value) || 1) })
              }
            />
          </Field>
          <Field
            label={`Coût unitaire (${currency})`}
            htmlFor="lot-cost"
            hint={
              selected && selected.purchasePrice > 0
                ? `Prix d’achat au catalogue : ${formatCurrency(selected.purchasePrice, currency)}`
                : undefined
            }
          >
            <input
              id="lot-cost"
              type="number"
              min={0}
              className={FIELD}
              value={form.unitCost}
              onChange={(event) =>
                setForm({ ...form, unitCost: Math.max(0, Number(event.target.value) || 0) })
              }
            />
          </Field>
        </div>

        <Field label="Motif ou référence de livraison" htmlFor="lot-reason">
          <input
            id="lot-reason"
            className={FIELD}
            placeholder="Bon de livraison n° …"
            value={form.reason}
            onChange={(event) => setForm({ ...form, reason: event.target.value })}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Enregistrer l’entrée
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ExitForm: React.FC<{
  lot: Lot;
  error: string | null;
  onCancel: () => void;
  onSubmit: (
    quantity: number,
    kind: 'exit' | 'return' | 'destruction' | 'adjustment',
    reason: string,
  ) => Promise<void>;
}> = ({ lot, error, onCancel, onSubmit }) => {
  const [quantity, setQuantity] = useState(1);
  const [kind, setKind] = useState<'exit' | 'return' | 'destruction' | 'adjustment'>('exit');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSubmit(quantity, kind, reason);
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`Mouvement sur le lot ${lot.lotNumber}`}
      description={`${lot.itemName} · ${lot.quantity} en stock`}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        <Field label="Nature du mouvement *">
          <Select
            value={kind}
            onChange={(value) => setKind(value as typeof kind)}
            options={EXIT_KINDS.filter((entry) => entry.value !== 'correction').map((entry) => ({
              value: entry.value,
              label: entry.label,
              hint: entry.hint,
            }))}
          />
        </Field>

        <Field
          label="Quantité *"
          htmlFor="exit-qty"
          hint={
            kind === 'adjustment'
              ? 'Un ajustement peut être négatif : saisissez la variation.'
              : `${lot.quantity} unité(s) disponible(s) sur ce lot.`
          }
        >
          <input
            id="exit-qty"
            type="number"
            required
            className={FIELD}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value) || 0)}
          />
        </Field>

        <Field label="Motif *" htmlFor="exit-reason">
          <textarea
            id="exit-reason"
            required
            rows={2}
            className={FIELD}
            placeholder="Consommation au bloc, casse, retour fournisseur…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <Notice tone="info">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          Le registre des mouvements est immuable : cette écriture ne pourra pas être modifiée, mais
          une erreur se corrige par un mouvement inverse.
        </Notice>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Enregistrer
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const RecallForm: React.FC<{
  lot: Lot;
  error: string | null;
  onCancel: () => void;
  onSubmit: (reason: string) => Promise<void>;
}> = ({ lot, error, onCancel, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    await onSubmit(reason);
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`Rappel du lot ${lot.lotNumber}`}
      description={`${lot.itemName} · ${lot.quantity} unité(s) concernée(s)`}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}

        <Notice tone="info">
          Un lot rappelé ne peut plus être délivré, quel que soit le paramétrage de
          l&apos;établissement. Le stock reste visible : la traçabilité d&apos;un lot rappelé est
          précisément ce qui permet de retrouver les patients servis.
        </Notice>

        <Field label="Motif du rappel *" htmlFor="recall-reason">
          <textarea
            id="recall-reason"
            required
            rows={3}
            className={FIELD}
            placeholder="Rappel fabricant, défaut de conservation…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="danger" isLoading={isSaving} className="flex-1 font-bold">
            Déclarer le rappel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
