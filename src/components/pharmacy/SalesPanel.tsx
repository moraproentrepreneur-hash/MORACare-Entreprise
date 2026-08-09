'use client';

import React, { useMemo, useState } from 'react';
import { Banknote, FileText, Plus, Receipt, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Patient } from '@/types';
import {
  recordSale,
  suggestLots,
  type Dispensation,
  type LotSuggestion,
  type Pharmacy,
  type StockState,
} from '@/services/pharmacy.service';
import type { WriteContext } from '@/services/base.service';
import {
  Badge,
  EmptyState,
  Field,
  FIELD,
  Notice,
  ScrollTable,
} from '@/components/hospitalization/shared';

/**
 * Vente de médicaments au comptoir (BP19 §10).
 *
 * Une vente est une délivrance réglée sur place : elle emprunte le même circuit
 * que la délivrance sur ordonnance — sélection du lot selon la règle de sortie,
 * refus des lots périmés et rappelés, mouvement de sortie, décrémentation du
 * stock. Aucune de ces règles n'est réécrite ici ; elles sont tenues par la
 * base, et l'écran se contente de ne proposer que ce qui est vendable.
 *
 * Le stock disponible est vérifié deux fois : à l'ajout de la ligne, pour
 * prévenir l'opérateur, et à l'enregistrement par la base, qui tranche. Le
 * premier contrôle est un confort, le second fait autorité.
 */

interface SaleLine {
  key: string;
  itemId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  suggestions: LotSuggestion[];
  /** Quantité que le stock ne couvre pas. */
  shortfall: number;
}

export const SalesPanel: React.FC<{
  sales: readonly Dispensation[];
  stock: readonly StockState[];
  pharmacies: readonly Pharmacy[];
  patients: readonly Patient[];
  paymentMethods: readonly string[];
  currency: string;
  canSell: boolean;
  ctx: WriteContext | null;
  onPrint: (sale: Dispensation) => void;
  onChanged: () => Promise<void>;
}> = ({
  sales,
  stock,
  pharmacies,
  patients,
  paymentMethods,
  currency,
  canSell,
  ctx,
  onPrint,
  onChanged,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return sales;
    return sales.filter((sale) =>
      `${sale.reference} ${sale.patientName ?? ''} ${sale.customerName ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [sales, search]);

  const dayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return sales
      .filter((sale) => new Date(sale.dispensedAt).toDateString() === today)
      .reduce((total, sale) => total + sale.totalAmount, 0);
  }, [sales]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className={`${FIELD} sm:max-w-sm`}
          placeholder="Rechercher une vente, un client…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400">
            Aujourd&apos;hui :{' '}
            <span className="font-bold text-mora-green">
              {formatCurrency(dayTotal, currency)}
            </span>
          </p>
          {canSell && (
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                setIsOpen(true);
              }}
              disabled={stock.length === 0}
              className="shrink-0 gap-2"
            >
              <Plus className="h-4 w-4" /> Nouvelle vente
            </Button>
          )}
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={sales.length === 0 ? 'Aucune vente' : 'Aucun résultat'}
            description="Chaque vente décrémente le stock, produit un mouvement tracé et donne lieu à un reçu."
          />
        ) : (
          <ScrollTable minWidth="min-w-[52rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Client</th>
                <th className="p-4">Produits</th>
                <th className="p-4">Date</th>
                <th className="p-4">Règlement</th>
                <th className="p-4">Montant</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((sale) => (
                <tr key={sale.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="p-4 font-mono font-bold text-mora-green">{sale.reference}</td>
                  <td className="p-4">
                    <span className="font-bold text-white">
                      {sale.patientName ?? sale.customerName ?? '—'}
                    </span>
                    {sale.patientName === null && sale.customerName && (
                      <span className="mt-1 block">
                        <Badge label="Hors dossier" tone="neutral" />
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {sale.lines.map((line) => (
                      <span key={line.id} className="block text-[11px]">
                        {line.quantity} × {line.itemName}
                        {line.lotNumber && (
                          <span className="text-slate-500"> · lot {line.lotNumber}</span>
                        )}
                      </span>
                    ))}
                  </td>
                  <td className="p-4">{formatDateTime(sale.dispensedAt)}</td>
                  <td className="p-4">
                    {sale.paymentMethod ?? '—'}
                    {sale.paidAmount > 0 && sale.paidAmount < sale.totalAmount && (
                      <span className="block text-[11px] text-amber-400">
                        Reste {formatCurrency(sale.totalAmount - sale.paidAmount, currency)}
                      </span>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-slate-200">
                    {formatCurrency(sale.totalAmount, currency)}
                  </td>
                  <td className="p-4">
                    <ActionMenu
                      label={`Actions pour la vente ${sale.reference}`}
                      items={[
                        {
                          label: 'Reçu de vente',
                          icon: Receipt,
                          onSelect: () => onPrint(sale),
                        },
                        {
                          label: 'Facture patient',
                          icon: FileText,
                          disabled: !sale.invoiceId,
                          onSelect: () => onPrint(sale),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        )}
      </div>

      {isOpen && (
        <SaleForm
          stock={stock}
          pharmacies={pharmacies}
          patients={patients}
          paymentMethods={paymentMethods}
          currency={currency}
          error={error}
          onCancel={() => setIsOpen(false)}
          onSubmit={async (input) => {
            if (!ctx) return;
            setError(null);
            setNotice(null);
            try {
              const result = await recordSale(input, ctx);
              await onChanged();
              setIsOpen(false);
              setNotice(
                result.invoiceWarning ??
                  'Vente enregistrée : le stock est à jour et le reçu est disponible.',
              );
            } catch (err) {
              setError(err instanceof Error ? err.message : "La vente a échoué.");
            }
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const SaleForm: React.FC<{
  stock: readonly StockState[];
  pharmacies: readonly Pharmacy[];
  patients: readonly Patient[];
  paymentMethods: readonly string[];
  currency: string;
  error: string | null;
  onCancel: () => void;
  onSubmit: (input: {
    pharmacyId: string | null;
    patientId: string | null;
    customerName: string | null;
    paymentMethod: string;
    paidAmount: number;
    notes?: string;
    lines: { itemId: string; lotId: string | null; quantity: number; unitPrice: number }[];
  }) => Promise<void>;
}> = ({ stock, pharmacies, patients, paymentMethods, currency, error, onCancel, onSubmit }) => {
  const defaultPharmacy = pharmacies.find((entry) => entry.isDefault) ?? pharmacies[0] ?? null;

  const [pharmacyId, setPharmacyId] = useState(defaultPharmacy?.id ?? '');
  const [buyer, setBuyer] = useState<'patient' | 'walk_in'>('patient');
  const [patientId, setPatientId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0] ?? 'Espèces');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [pickItem, setPickItem] = useState('');
  const [pickQuantity, setPickQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Seuls les produits réellement en stock sont proposés : offrir une référence
  // en rupture ferait perdre du temps au comptoir.
  const available = useMemo(() => stock.filter((line) => line.quantity > 0), [stock]);

  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const [paidAmount, setPaidAmount] = useState(0);
  const blocked = lines.some((line) => line.shortfall > 0);

  const addLine = async () => {
    const product = available.find((entry) => entry.itemId === pickItem);
    if (!product || pickQuantity < 1) return;

    setLocalError(null);
    try {
      // La base propose les lots selon la règle de sortie du produit — FEFO par
      // défaut. L'opérateur ne choisit pas : c'est ce qui évite de laisser
      // périmer les lots les plus anciens au fond de l'étagère.
      const suggestions = await suggestLots(product.itemId, pharmacyId || null, pickQuantity);
      const covered = suggestions.reduce((sum, entry) => sum + entry.take, 0);

      setLines((current) => [
        ...current,
        {
          key: `${product.itemId}-${Date.now()}`,
          itemId: product.itemId,
          itemName: product.name,
          unit: product.unit,
          quantity: pickQuantity,
          unitPrice: product.unitPrice,
          suggestions,
          shortfall: Math.max(0, pickQuantity - covered),
        },
      ]);
      setPickItem('');
      setPickQuantity(1);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Sélection des lots impossible.');
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (lines.length === 0) {
      setLocalError('Ajoutez au moins un produit à la vente.');
      return;
    }
    if (buyer === 'patient' && !patientId) {
      setLocalError('Sélectionnez le patient, ou basculez sur une vente hors dossier.');
      return;
    }
    if (buyer === 'walk_in' && customerName.trim() === '') {
      setLocalError("Indiquez le nom de l'acquéreur.");
      return;
    }

    setIsSaving(true);

    // Une ligne servie sur plusieurs lots devient plusieurs lignes de vente :
    // c'est ce qui garde la trace du lot réellement remis au client.
    const payload = lines.flatMap((line) =>
      line.suggestions.length > 0
        ? line.suggestions.map((suggestion) => ({
            itemId: line.itemId,
            lotId: suggestion.lotId as string | null,
            quantity: suggestion.take,
            unitPrice: line.unitPrice,
          }))
        : [
            {
              itemId: line.itemId,
              lotId: null as string | null,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            },
          ],
    );

    await onSubmit({
      pharmacyId: pharmacyId || null,
      patientId: buyer === 'patient' ? patientId : null,
      customerName: buyer === 'walk_in' ? customerName : null,
      paymentMethod,
      paidAmount: paidAmount > 0 ? paidAmount : total,
      notes,
      lines: payload,
    });
    setIsSaving(false);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidth="xl"
      title="Vente de médicaments"
      description="Les lots sont sélectionnés automatiquement selon la règle de sortie du produit."
    >
      <form onSubmit={submit} className="space-y-4">
        {(error || localError) && <Notice tone="error">{error ?? localError}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pharmacie">
            <Select
              value={pharmacyId}
              onChange={setPharmacyId}
              placeholder="— Toutes pharmacies —"
              options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
          <Field label="Acquéreur *">
            <Select<'patient' | 'walk_in'>
              value={buyer}
              onChange={(value) => {
                setBuyer(value);
                setLocalError(null);
              }}
              options={[
                { value: 'patient', label: 'Patient du dossier', hint: 'Une facture est créée.' },
                {
                  value: 'walk_in',
                  label: 'Client de passage',
                  hint: 'Un reçu tient lieu de justificatif.',
                },
              ]}
            />
          </Field>
        </div>

        {buyer === 'patient' ? (
          <PatientSelect
            patients={patients as Patient[]}
            selectedPatientId={patientId}
            onSelectPatient={(entry) => setPatientId(entry.id)}
          />
        ) : (
          <Field label="Nom de l'acquéreur *" htmlFor="sale-customer">
            <input
              id="sale-customer"
              className={FIELD}
              placeholder="Nom figurant sur le reçu"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </Field>
        )}

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-300">Produits vendus</p>

          <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
            <Select
              aria-label="Médicament"
              value={pickItem}
              onChange={setPickItem}
              placeholder="— Rechercher un médicament —"
              options={available.map((entry) => ({
                value: entry.itemId,
                label: entry.name,
                hint: `${entry.quantity} ${entry.unit} en stock · ${formatCurrency(entry.unitPrice, currency)}`,
              }))}
            />
            <input
              type="number"
              min={1}
              aria-label="Quantité"
              className={FIELD}
              value={pickQuantity}
              onChange={(event) => setPickQuantity(Math.max(1, Number(event.target.value) || 1))}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pickItem === ''}
              onClick={() => void addLine()}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>

          {lines.length === 0 ? (
            <p className="mt-3 text-[11px] text-slate-500">Aucun produit ajouté.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {lines.map((line) => (
                <li key={line.key} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">
                        {line.quantity} {line.unit} — {line.itemName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {line.suggestions.length === 0
                          ? 'Aucun lot suivi : sortie sur le stock global.'
                          : line.suggestions
                              .map((s) => `${s.take} sur le lot ${s.lotNumber}`)
                              .join(' · ')}
                      </p>
                      {line.shortfall > 0 && (
                        <p className="mt-1 text-[11px] text-red-400">
                          {line.shortfall} unité(s) manquante(s) en stock disponible.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        {formatCurrency(line.quantity * line.unitPrice, currency)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Retirer ${line.itemName}`}
                        onClick={() =>
                          setLines((current) => current.filter((entry) => entry.key !== line.key))
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 && (
            <p className="mt-3 text-right text-sm font-bold text-white">
              Total : {formatCurrency(total, currency)}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode de règlement *">
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              options={(paymentMethods.length > 0 ? paymentMethods : ['Espèces']).map((entry) => ({
                value: entry,
                label: entry,
              }))}
            />
          </Field>
          <Field
            label={`Montant encaissé (${currency})`}
            htmlFor="sale-paid"
            hint="Laissez à zéro pour encaisser la totalité."
          >
            <input
              id="sale-paid"
              type="number"
              min={0}
              className={FIELD}
              value={paidAmount}
              onChange={(event) => setPaidAmount(Math.max(0, Number(event.target.value) || 0))}
            />
          </Field>
        </div>

        <Field label="Observations" htmlFor="sale-notes">
          <textarea
            id="sale-notes"
            rows={2}
            className={FIELD}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        {blocked && (
          <Notice tone="error">
            Le stock disponible ne couvre pas toutes les lignes. Réduisez les quantités
            concernées : la base refuserait l&apos;enregistrement.
          </Notice>
        )}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            disabled={blocked || lines.length === 0}
            className="flex-1 gap-2 font-bold"
          >
            <Banknote className="h-4 w-4" /> Encaisser {formatCurrency(total, currency)}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
