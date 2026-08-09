'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  PackageCheck,
  Plus,
  Send,
  ShoppingBag,
  Trash2,
  Undo2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  CONSULTATION_TYPES,
  PRIORITIES,
  PURCHASE_LABELS,
  QUALITY_LABELS,
  REQUISITION_LABELS,
  REQUISITION_TONES,
  RETURN_TYPES,
  TRANSFER_STATUS_LABELS,
  cancelRequisition,
  cancelStockTransfer,
  controlReceipt,
  createPurchaseOrder,
  createQuote,
  createReceipt,
  createRequisition,
  createStockTransfer,
  createSupplierReturn,
  decideRequisition,
  listPurchaseOrders,
  listQuotes,
  listReceipts,
  listRequisitions,
  listStockTransfers,
  listSupplierReturns,
  postReceipt,
  postSupplierReturn,
  receiveStockTransfer,
  selectQuote,
  shipStockTransfer,
  submitRequisition,
  type PurchaseOrder,
  type PurchaseReceipt,
  type QualityResult,
  type Requisition,
  type StockTransfer,
  type SupplierQuote,
  type SupplierReturn,
} from '@/services/procurement.service';
import type { Lot, Medication, Pharmacy, Supplier } from '@/services/pharmacy.service';
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
 * Achats, approvisionnements et logistique interne (BP17, BP18 §12).
 *
 * Les onglets suivent le circuit : le besoin s'exprime, on consulte, on
 * commande, on réceptionne, on contrôle, on met en stock — et l'on retourne ce
 * qui ne convient pas. Le réapprovisionnement interne ferme la boucle en
 * distribuant vers les armoires de service.
 */

type Tab = 'requisitions' | 'orders' | 'receipts' | 'returns' | 'transfers';

const TABS: readonly { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'requisitions', label: "Demandes d'achat", icon: ClipboardList },
  { id: 'orders', label: 'Commandes', icon: ShoppingBag },
  { id: 'receipts', label: 'Réceptions', icon: PackageCheck },
  { id: 'returns', label: 'Retours', icon: Undo2 },
  { id: 'transfers', label: 'Transferts internes', icon: ArrowLeftRight },
];

interface DraftItemLine {
  key: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
}

/** Ligne de réception vierge : ce qui n'a pas encore été relevé au déballage. */
const EMPTY_RECEIPT_LINE = { quantity: 0, lot: '', expires: '', serial: '' };

const newLine = (): DraftItemLine => ({
  key: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  itemId: '',
  quantity: 1,
  unitPrice: 0,
});

export const ProcurementPanel: React.FC<{
  medications: readonly Medication[];
  lots: readonly Lot[];
  pharmacies: readonly Pharmacy[];
  suppliers: readonly Supplier[];
  services: readonly string[];
  currency: string;
  canManage: boolean;
  ctx: WriteContext | null;
  onPrintOrder: (order: PurchaseOrder) => void;
  onPrintReceipt: (receipt: PurchaseReceipt) => void;
  onPrintTransfer: (transfer: StockTransfer) => void;
  onPrintReturn: (entry: SupplierReturn) => void;
}> = ({
  medications,
  lots,
  pharmacies,
  suppliers,
  services,
  currency,
  canManage,
  ctx,
  onPrintOrder,
  onPrintReceipt,
  onPrintTransfer,
  onPrintReturn,
}) => {
  const [tab, setTab] = useState<Tab>('requisitions');
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [returns, setReturns] = useState<SupplierReturn[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Tab | null>(null);
  const [comparing, setComparing] = useState<Requisition | null>(null);
  const [controlling, setControlling] = useState<PurchaseReceipt | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [r, q, o, rc, rt, tr] = await Promise.all([
        listRequisitions(),
        listQuotes(),
        listPurchaseOrders(),
        listReceipts(),
        listSupplierReturns(),
        listStockTransfers(),
      ]);
      setRequisitions(r);
      setQuotes(q);
      setOrders(o);
      setReceipts(rc);
      setReturns(rt);
      setTransfers(tr);
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

  const run = async (task: () => Promise<void>, message: string) => {
    setError(null);
    setNotice(null);
    try {
      await task();
      await load();
      setNotice(message);
      setDialog(null);
      setComparing(null);
      setControlling(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'opération a échoué.");
    }
  };

  const userId = ctx?.userId ?? '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                  tab === entry.id
                    ? 'bg-mora-blue text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {entry.label}
              </button>
            );
          })}
        </div>

        {canManage && (
          <Button
            variant="secondary"
            onClick={() => {
              setError(null);
              setDialog(tab);
            }}
            className="shrink-0 gap-2"
          >
            <Plus className="h-4 w-4" /> Nouveau
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          {tab === 'requisitions' && (
            requisitions.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Aucune demande d’achat"
                description="Le besoin s’exprime ici, passe en validation, puis donne lieu à une consultation des fournisseurs."
              />
            ) : (
              <ScrollTable minWidth="min-w-[56rem]">
                <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-4">Référence</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Articles</th>
                    <th className="p-4">Estimation</th>
                    <th className="p-4">Priorité</th>
                    <th className="p-4">Offres</th>
                    <th className="p-4">État</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {requisitions.map((entry) => {
                    const related = quotes.filter((q) => q.requisitionId === entry.id);
                    return (
                      <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                        <td className="p-4 font-mono font-bold text-mora-green">
                          {entry.reference}
                        </td>
                        <td className="p-4 font-bold text-white">{entry.requestingService}</td>
                        <td className="p-4">
                          {entry.lines.map((line) => (
                            <span key={line.id} className="block text-[11px]">
                              {line.quantity} × {line.label}
                            </span>
                          ))}
                        </td>
                        <td className="p-4">{formatCurrency(entry.estimatedTotal, currency)}</td>
                        <td className="p-4 capitalize">{entry.priority}</td>
                        <td className="p-4">
                          {related.length === 0 ? (
                            <span className="text-slate-600">—</span>
                          ) : (
                            <span>
                              {related.length}
                              {related.some((q) => q.isSelected) && (
                                <span className="ml-1 text-mora-green">✓</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge
                            label={REQUISITION_LABELS[entry.status]}
                            tone={REQUISITION_TONES[entry.status]}
                          />
                        </td>
                        <td className="p-4">
                          <ActionMenu
                            label={`Actions pour ${entry.reference}`}
                            items={[
                              {
                                label: 'Soumettre à validation',
                                icon: Send,
                                disabled: !canManage || entry.status !== 'draft',
                                onSelect: () =>
                                  void run(
                                    () => submitRequisition(entry.id, userId),
                                    'Demande soumise à validation.',
                                  ),
                              },
                              {
                                label: 'Valider',
                                icon: CheckCircle2,
                                disabled: !canManage || entry.status !== 'submitted',
                                onSelect: () =>
                                  void run(
                                    () =>
                                      decideRequisition(entry.id, 'approved', null, userId),
                                    'Demande validée.',
                                  ),
                              },
                              {
                                label: 'Refuser',
                                icon: XCircle,
                                destructive: true,
                                disabled: !canManage || entry.status !== 'submitted',
                                onSelect: () =>
                                  void run(
                                    () =>
                                      decideRequisition(
                                        entry.id,
                                        'rejected',
                                        'Refusée à la validation',
                                        userId,
                                      ),
                                    'Demande refusée.',
                                  ),
                              },
                              {
                                label: 'Consulter les fournisseurs',
                                icon: FileText,
                                disabled: !canManage || entry.status === 'canceled',
                                onSelect: () => setComparing(entry),
                              },
                              {
                                label: 'Annuler la demande',
                                icon: Trash2,
                                destructive: true,
                                disabled: !canManage || entry.status === 'canceled',
                                onSelect: () =>
                                  void run(
                                    () => cancelRequisition(entry.id, userId),
                                    'Demande annulée.',
                                  ),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ScrollTable>
            )
          )}

          {tab === 'orders' && (
            orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="Aucune commande"
                description="Le bon de commande reprend l’offre retenue et engage le fournisseur."
              />
            ) : (
              <ScrollTable minWidth="min-w-[52rem]">
                <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-4">Référence</th>
                    <th className="p-4">Fournisseur</th>
                    <th className="p-4">Articles</th>
                    <th className="p-4">Commandé le</th>
                    <th className="p-4">Attendu</th>
                    <th className="p-4">Montant</th>
                    <th className="p-4">État</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {orders.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                      <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                      <td className="p-4 font-bold text-white">{entry.supplierName}</td>
                      <td className="p-4">
                        {entry.lines.map((line) => (
                          <span key={line.id} className="block text-[11px]">
                            {line.quantityReceived}/{line.quantityOrdered} × {line.itemName}
                          </span>
                        ))}
                      </td>
                      <td className="p-4">{formatDate(entry.orderedOn)}</td>
                      <td className="p-4">
                        {entry.expectedOn ? formatDate(entry.expectedOn) : '—'}
                      </td>
                      <td className="p-4 font-semibold text-slate-200">
                        {formatCurrency(entry.totalAmount, currency)}
                      </td>
                      <td className="p-4">
                        <Badge
                          label={PURCHASE_LABELS[entry.status]}
                          tone={
                            entry.status === 'received'
                              ? 'good'
                              : entry.status === 'canceled'
                                ? 'bad'
                                : 'warn'
                          }
                        />
                      </td>
                      <td className="p-4">
                        <ActionMenu
                          label={`Actions pour ${entry.reference}`}
                          items={[
                            {
                              label: 'Bon de commande',
                              icon: FileText,
                              onSelect: () => onPrintOrder(entry),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            )
          )}

          {tab === 'receipts' && (
            receipts.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="Aucune réception"
                description="La marchandise est contrôlée avant sa mise en stock : une réception refusée ne crédite jamais le stock."
              />
            ) : (
              <ScrollTable minWidth="min-w-[56rem]">
                <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-4">Référence</th>
                    <th className="p-4">Commande</th>
                    <th className="p-4">Fournisseur</th>
                    <th className="p-4">Articles</th>
                    <th className="p-4">Reçue le</th>
                    <th className="p-4">Contrôle</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {receipts.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                      <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                      <td className="p-4 font-mono text-[11px]">{entry.orderReference}</td>
                      <td className="p-4 font-bold text-white">{entry.supplierName}</td>
                      <td className="p-4">
                        {entry.lines.map((line) => (
                          <span key={line.id} className="block text-[11px]">
                            {line.quantityReceived} × {line.itemName}
                            {line.lotNumber && (
                              <span className="text-slate-500"> · lot {line.lotNumber}</span>
                            )}
                          </span>
                        ))}
                      </td>
                      <td className="p-4">{formatDate(entry.receivedOn)}</td>
                      <td className="p-4">
                        {entry.qualityResult ? (
                          <Badge
                            label={QUALITY_LABELS[entry.qualityResult]}
                            tone={
                              entry.qualityResult === 'refused'
                                ? 'bad'
                                : entry.qualityResult === 'accepted'
                                  ? 'good'
                                  : 'warn'
                            }
                          />
                        ) : (
                          <Badge label="À contrôler" tone="warn" />
                        )}
                      </td>
                      <td className="p-4">
                        {entry.stockedAt ? (
                          <Badge label="En stock" tone="good" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <ActionMenu
                          label={`Actions pour ${entry.reference}`}
                          items={[
                            {
                              label: 'Contrôle qualité',
                              icon: ClipboardCheck,
                              disabled: !canManage || entry.stockedAt !== null,
                              onSelect: () => setControlling(entry),
                            },
                            {
                              label: 'Mettre en stock',
                              icon: PackageCheck,
                              disabled:
                                !canManage ||
                                entry.stockedAt !== null ||
                                entry.qualityResult === null ||
                                entry.qualityResult === 'refused',
                              onSelect: () =>
                                void run(async () => {
                                  const posted = await postReceipt(entry.id, userId);
                                  if (posted === 0) {
                                    throw new Error(
                                      'Aucune ligne à mettre en stock sur cette réception.',
                                    );
                                  }
                                }, 'Réception mise en stock : les lots sont créés et le stock à jour.'),
                            },
                            {
                              label: 'Bon de réception',
                              icon: FileText,
                              onSelect: () => onPrintReceipt(entry),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            )
          )}

          {tab === 'returns' && (
            returns.length === 0 ? (
              <EmptyState
                icon={Undo2}
                title="Aucun retour fournisseur"
                description="La marchandise ne quitte le stock qu’à l’expédition du retour."
              />
            ) : (
              <ScrollTable minWidth="min-w-[48rem]">
                <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-4">Référence</th>
                    <th className="p-4">Fournisseur</th>
                    <th className="p-4">Nature</th>
                    <th className="p-4">Articles</th>
                    <th className="p-4">Motif</th>
                    <th className="p-4">Avoir</th>
                    <th className="p-4">État</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {returns.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                      <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                      <td className="p-4 font-bold text-white">{entry.supplierName}</td>
                      <td className="p-4 capitalize">{entry.returnType}</td>
                      <td className="p-4">
                        {entry.lines.map((line) => (
                          <span key={line.id} className="block text-[11px]">
                            {line.quantity} × {line.itemName}
                          </span>
                        ))}
                      </td>
                      <td className="p-4 text-[11px]">{entry.reason}</td>
                      <td className="p-4">{formatCurrency(entry.creditAmount, currency)}</td>
                      <td className="p-4">
                        <Badge
                          label={
                            entry.status === 'draft'
                              ? 'Brouillon'
                              : entry.status === 'sent'
                                ? 'Expédié'
                                : entry.status === 'settled'
                                  ? 'Soldé'
                                  : 'Annulé'
                          }
                          tone={entry.postedAt ? 'good' : 'warn'}
                        />
                      </td>
                      <td className="p-4">
                        <ActionMenu
                          label={`Actions pour ${entry.reference}`}
                          items={[
                            {
                              label: 'Expédier le retour',
                              icon: Send,
                              disabled: !canManage || entry.postedAt !== null,
                              onSelect: () =>
                                void run(
                                  async () => {
                                    await postSupplierReturn(entry.id, userId);
                                  },
                                  'Retour expédié : le stock est décrémenté.',
                                ),
                            },
                            {
                              label: 'Bon de retour',
                              icon: FileText,
                              onSelect: () => onPrintReturn(entry),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            )
          )}

          {tab === 'transfers' && (
            transfers.length === 0 ? (
              <EmptyState
                icon={ArrowLeftRight}
                title="Aucun transfert interne"
                description="Le réapprovisionnement déplace du stock d’un magasin vers un autre, en conservant les lots."
              />
            ) : (
              <ScrollTable minWidth="min-w-[48rem]">
                <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-4">Référence</th>
                    <th className="p-4">Origine</th>
                    <th className="p-4">Destination</th>
                    <th className="p-4">Articles</th>
                    <th className="p-4">Demandé le</th>
                    <th className="p-4">État</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transfers.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                      <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                      <td className="p-4">{entry.fromPharmacyName}</td>
                      <td className="p-4 font-bold text-white">{entry.toPharmacyName}</td>
                      <td className="p-4">
                        {entry.lines.map((line) => (
                          <span key={line.id} className="block text-[11px]">
                            {line.quantityShipped || line.quantityRequested} × {line.itemName}
                            {line.lotNumber && (
                              <span className="text-slate-500"> · lot {line.lotNumber}</span>
                            )}
                          </span>
                        ))}
                      </td>
                      <td className="p-4">{formatDate(entry.requestedOn)}</td>
                      <td className="p-4">
                        <Badge
                          label={TRANSFER_STATUS_LABELS[entry.status] ?? entry.status}
                          tone={
                            entry.status === 'received'
                              ? 'good'
                              : entry.status === 'canceled'
                                ? 'bad'
                                : 'warn'
                          }
                        />
                      </td>
                      <td className="p-4">
                        <ActionMenu
                          label={`Actions pour ${entry.reference}`}
                          items={[
                            {
                              label: 'Expédier',
                              icon: Send,
                              disabled:
                                !canManage || !['draft', 'requested'].includes(entry.status),
                              onSelect: () =>
                                void run(async () => {
                                  await shipStockTransfer(entry.id, userId);
                                }, 'Transfert expédié : le stock a été déplacé.'),
                            },
                            {
                              label: 'Accuser réception',
                              icon: CheckCircle2,
                              disabled: !canManage || entry.status !== 'shipped',
                              onSelect: () =>
                                void run(
                                  () => receiveStockTransfer(entry.id, userId),
                                  'Réception du transfert enregistrée.',
                                ),
                            },
                            {
                              label: 'Bon de transfert',
                              icon: FileText,
                              onSelect: () => onPrintTransfer(entry),
                            },
                            {
                              label: 'Annuler',
                              icon: XCircle,
                              destructive: true,
                              disabled:
                                !canManage || !['draft', 'requested'].includes(entry.status),
                              onSelect: () =>
                                void run(
                                  () => cancelStockTransfer(entry.id, userId),
                                  'Transfert annulé.',
                                ),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            )
          )}
        </div>
      )}

      {dialog === 'requisitions' && (
        <RequisitionForm
          medications={medications}
          pharmacies={pharmacies}
          services={services}
          currency={currency}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              await createRequisition(input, ctx as WriteContext);
            }, 'Demande d’achat enregistrée.')
          }
        />
      )}

      {dialog === 'orders' && (
        <OrderForm
          medications={medications}
          pharmacies={pharmacies}
          suppliers={suppliers}
          requisitions={requisitions.filter((entry) => entry.status === 'approved')}
          quotes={quotes}
          currency={currency}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              await createPurchaseOrder(input, ctx as WriteContext);
            }, 'Bon de commande émis.')
          }
        />
      )}

      {dialog === 'receipts' && (
        <ReceiptForm
          orders={orders.filter((entry) =>
            ['ordered', 'partially_received', 'validated'].includes(entry.status),
          )}
          pharmacies={pharmacies}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              await createReceipt(input, ctx as WriteContext);
            }, 'Réception enregistrée. Contrôlez-la avant sa mise en stock.')
          }
        />
      )}

      {dialog === 'returns' && (
        <ReturnForm
          suppliers={suppliers}
          pharmacies={pharmacies}
          lots={lots}
          medications={medications}
          currency={currency}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              await createSupplierReturn(input, ctx as WriteContext);
            }, 'Retour enregistré. Expédiez-le pour décrémenter le stock.')
          }
        />
      )}

      {dialog === 'transfers' && (
        <TransferForm
          pharmacies={pharmacies}
          lots={lots}
          medications={medications}
          onCancel={() => setDialog(null)}
          onSubmit={(input) =>
            run(async () => {
              await createStockTransfer(input, ctx as WriteContext);
            }, 'Transfert créé. Expédiez-le pour déplacer le stock.')
          }
        />
      )}

      {comparing && (
        <QuoteComparison
          requisition={comparing}
          quotes={quotes.filter((entry) => entry.requisitionId === comparing.id)}
          suppliers={suppliers}
          currency={currency}
          canManage={canManage}
          onCancel={() => setComparing(null)}
          onCreate={(input) =>
            run(async () => {
              await createQuote(input, ctx as WriteContext);
            }, 'Offre enregistrée.')
          }
          onSelect={(quoteId, reason) =>
            run(
              () => selectQuote(quoteId, comparing.id, reason, userId),
              'Offre retenue. Le choix est historisé.',
            )
          }
        />
      )}

      {controlling && (
        <QualityForm
          receipt={controlling}
          onCancel={() => setControlling(null)}
          onSubmit={(result, note) =>
            run(
              () => controlReceipt(controlling.id, result, note, userId),
              'Contrôle qualité enregistré.',
            )
          }
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------------

/** Éditeur de lignes article/quantité/prix, partagé par les formulaires. */
const LineEditor: React.FC<{
  medications: readonly Medication[];
  lines: DraftItemLine[];
  currency: string;
  showPrice?: boolean;
  onChange: (lines: DraftItemLine[]) => void;
}> = ({ medications, lines, currency, showPrice = true, onChange }) => (
  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold text-slate-300">Articles</p>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...lines, newLine()])}
        className="gap-1.5"
      >
        <Plus className="h-4 w-4" /> Ligne
      </Button>
    </div>

    {lines.map((line, index) => (
      <div key={line.key} className="grid gap-2 sm:grid-cols-[1fr_6rem_7rem_auto]">
        <Select
          aria-label={`Article ${index + 1}`}
          value={line.itemId}
          onChange={(value) => {
            const found = medications.find((entry) => entry.id === value);
            onChange(
              lines.map((entry) =>
                entry.key === line.key
                  ? {
                      ...entry,
                      itemId: value,
                      // Le prix d'achat du catalogue sert de proposition : il
                      // change rarement d'une commande à l'autre.
                      unitPrice: entry.unitPrice || (found?.purchasePrice ?? 0),
                    }
                  : entry,
              ),
            );
          }}
          placeholder="— Choisir un article —"
          options={medications.map((entry) => ({
            value: entry.id,
            label: entry.name,
            hint: [entry.form, entry.dosage].filter(Boolean).join(' · '),
          }))}
        />
        <input
          type="number"
          min={1}
          aria-label={`Quantité ${index + 1}`}
          className={FIELD}
          value={line.quantity}
          onChange={(event) =>
            onChange(
              lines.map((entry) =>
                entry.key === line.key
                  ? { ...entry, quantity: Math.max(1, Number(event.target.value) || 1) }
                  : entry,
              ),
            )
          }
        />
        {showPrice ? (
          <input
            type="number"
            min={0}
            aria-label={`Prix unitaire ${index + 1} en ${currency}`}
            className={FIELD}
            value={line.unitPrice}
            onChange={(event) =>
              onChange(
                lines.map((entry) =>
                  entry.key === line.key
                    ? { ...entry, unitPrice: Math.max(0, Number(event.target.value) || 0) }
                    : entry,
                ),
              )
            }
          />
        ) : (
          <span />
        )}
        <button
          type="button"
          aria-label={`Retirer la ligne ${index + 1}`}
          disabled={lines.length === 1}
          onClick={() => onChange(lines.filter((entry) => entry.key !== line.key))}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400 disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    ))}

    {showPrice && (
      <p className="text-right text-xs font-bold text-white">
        Total :{' '}
        {formatCurrency(
          lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
          currency,
        )}
      </p>
    )}
  </div>
);

const RequisitionForm: React.FC<{
  medications: readonly Medication[];
  pharmacies: readonly Pharmacy[];
  services: readonly string[];
  currency: string;
  onCancel: () => void;
  onSubmit: (input: {
    requestingService: string;
    pharmacyId: string | null;
    justification: string;
    priority: string;
    neededBy: string | null;
    lines: {
      itemId: string | null;
      label: string;
      quantity: number;
      unit: string | null;
      estimatedPrice: number;
    }[];
  }) => Promise<void>;
}> = ({ medications, pharmacies, services, currency, onCancel, onSubmit }) => {
  const [requestingService, setRequestingService] = useState(services[0] ?? 'Pharmacie');
  const [pharmacyId, setPharmacyId] = useState('');
  const [justification, setJustification] = useState('');
  const [priority, setPriority] = useState('normale');
  const [neededBy, setNeededBy] = useState('');
  const [lines, setLines] = useState<DraftItemLine[]>([newLine()]);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidth="xl"
      title="Nouvelle demande d’achat"
      description="Le besoin est exprimé ici, puis soumis au circuit de validation."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const filled = lines.filter((line) => line.itemId !== '');
          if (filled.length === 0) {
            setLocalError('Ajoutez au moins un article à la demande.');
            return;
          }
          setIsSaving(true);
          await onSubmit({
            requestingService,
            pharmacyId: pharmacyId || null,
            justification,
            priority,
            neededBy: neededBy || null,
            lines: filled.map((line) => {
              const found = medications.find((entry) => entry.id === line.itemId);
              return {
                itemId: line.itemId,
                label: found?.name ?? 'Article',
                quantity: line.quantity,
                unit: found?.unit ?? null,
                estimatedPrice: line.unitPrice,
              };
            }),
          });
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        {localError && <Notice tone="error">{localError}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service demandeur *">
            <Select
              value={requestingService}
              onChange={setRequestingService}
              options={[...services, 'Pharmacie', 'Dépôt Central', 'Laboratoire', 'Administration']
                .filter((value, index, all) => all.indexOf(value) === index)
                .map((entry) => ({ value: entry, label: entry }))}
            />
          </Field>
          <Field label="Magasin destinataire">
            <Select
              value={pharmacyId}
              onChange={setPharmacyId}
              placeholder="— Non précisé —"
              options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priorité">
            <Select
              value={priority}
              onChange={setPriority}
              options={PRIORITIES.map((entry) => ({ value: entry.value, label: entry.label }))}
            />
          </Field>
          <Field label="Date souhaitée" htmlFor="req-date">
            <input
              id="req-date"
              type="date"
              className={FIELD}
              value={neededBy}
              onChange={(event) => setNeededBy(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Justification *" htmlFor="req-just">
          <textarea
            id="req-just"
            required
            rows={2}
            className={FIELD}
            placeholder="Réapprovisionnement trimestriel, rupture imminente…"
            value={justification}
            onChange={(event) => setJustification(event.target.value)}
          />
        </Field>

        <LineEditor
          medications={medications}
          lines={lines}
          currency={currency}
          onChange={setLines}
        />

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Enregistrer la demande
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const OrderForm: React.FC<{
  medications: readonly Medication[];
  pharmacies: readonly Pharmacy[];
  suppliers: readonly Supplier[];
  requisitions: readonly Requisition[];
  quotes: readonly SupplierQuote[];
  currency: string;
  onCancel: () => void;
  onSubmit: (input: {
    supplierId: string;
    pharmacyId: string | null;
    requisitionId: string | null;
    quoteId: string | null;
    expectedOn: string | null;
    priority: string;
    deliveryMode: string | null;
    paymentTerms: string | null;
    taxAmount: number;
    discountAmount: number;
    shippingCost: number;
    notes: string | null;
    lines: { itemId: string; quantityOrdered: number; unitPrice: number }[];
  }) => Promise<void>;
}> = ({
  medications,
  pharmacies,
  suppliers,
  requisitions,
  quotes,
  currency,
  onCancel,
  onSubmit,
}) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [pharmacyId, setPharmacyId] = useState('');
  const [requisitionId, setRequisitionId] = useState('');
  const [expectedOn, setExpectedOn] = useState('');
  const [priority, setPriority] = useState('normale');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftItemLine[]>([newLine()]);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reprendre l'offre retenue évite de resaisir un détail déjà négocié.
  const selectedQuote = useMemo(
    () => quotes.find((entry) => entry.requisitionId === requisitionId && entry.isSelected) ?? null,
    [quotes, requisitionId],
  );

  const applyRequisition = (id: string) => {
    setRequisitionId(id);
    const requisition = requisitions.find((entry) => entry.id === id);
    if (!requisition) return;

    const quote = quotes.find((entry) => entry.requisitionId === id && entry.isSelected);
    if (quote) setSupplierId(quote.supplierId);
    if (requisition.pharmacyId) setPharmacyId(requisition.pharmacyId);

    setLines(
      requisition.lines
        .filter((line) => line.itemId)
        .map((line) => ({
          key: `l-${line.id}`,
          itemId: line.itemId as string,
          quantity: line.quantity,
          unitPrice: line.estimatedPrice,
        })),
    );
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidth="xl"
      title="Nouveau bon de commande"
      description="Reprend l’offre retenue lorsque la commande découle d’une demande d’achat."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const filled = lines.filter((line) => line.itemId !== '');
          if (filled.length === 0) {
            setLocalError('Ajoutez au moins un article à la commande.');
            return;
          }
          setIsSaving(true);
          await onSubmit({
            supplierId,
            pharmacyId: pharmacyId || null,
            requisitionId: requisitionId || null,
            quoteId: selectedQuote?.id ?? null,
            expectedOn: expectedOn || null,
            priority,
            deliveryMode: deliveryMode || null,
            paymentTerms: paymentTerms || null,
            taxAmount,
            discountAmount,
            shippingCost,
            notes: notes || null,
            lines: filled.map((line) => ({
              itemId: line.itemId,
              quantityOrdered: line.quantity,
              unitPrice: line.unitPrice,
            })),
          });
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        {localError && <Notice tone="error">{localError}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Demande d’achat à l’origine"
            hint="Renseigne automatiquement le fournisseur et les articles."
          >
            <Select
              value={requisitionId}
              onChange={applyRequisition}
              placeholder="— Commande directe —"
              options={requisitions.map((entry) => ({
                value: entry.id,
                label: entry.reference,
                hint: `${entry.requestingService} · ${entry.lines.length} article(s)`,
              }))}
            />
          </Field>
          <Field label="Fournisseur *">
            <Select
              required
              value={supplierId}
              onChange={setSupplierId}
              options={suppliers.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
        </div>

        {selectedQuote && (
          <Notice tone="info">
            Offre retenue : {formatCurrency(selectedQuote.totalAmount, currency)}
            {selectedQuote.deliveryDays !== null && ` · livraison ${selectedQuote.deliveryDays} j`}
          </Notice>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Magasin de réception">
            <Select
              value={pharmacyId}
              onChange={setPharmacyId}
              placeholder="— Non précisé —"
              options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
          <Field label="Livraison attendue" htmlFor="ord-date">
            <input
              id="ord-date"
              type="date"
              className={FIELD}
              value={expectedOn}
              onChange={(event) => setExpectedOn(event.target.value)}
            />
          </Field>
          <Field label="Priorité">
            <Select
              value={priority}
              onChange={setPriority}
              options={PRIORITIES.map((entry) => ({ value: entry.value, label: entry.label }))}
            />
          </Field>
        </div>

        <LineEditor
          medications={medications}
          lines={lines}
          currency={currency}
          onChange={setLines}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`Taxes (${currency})`} htmlFor="ord-tax">
            <input
              id="ord-tax"
              type="number"
              min={0}
              className={FIELD}
              value={taxAmount}
              onChange={(event) => setTaxAmount(Math.max(0, Number(event.target.value) || 0))}
            />
          </Field>
          <Field label={`Remise (${currency})`} htmlFor="ord-disc">
            <input
              id="ord-disc"
              type="number"
              min={0}
              className={FIELD}
              value={discountAmount}
              onChange={(event) => setDiscountAmount(Math.max(0, Number(event.target.value) || 0))}
            />
          </Field>
          <Field label={`Frais de transport (${currency})`} htmlFor="ord-ship">
            <input
              id="ord-ship"
              type="number"
              min={0}
              className={FIELD}
              value={shippingCost}
              onChange={(event) => setShippingCost(Math.max(0, Number(event.target.value) || 0))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode de livraison" htmlFor="ord-mode">
            <input
              id="ord-mode"
              className={FIELD}
              placeholder="Livraison sur site"
              value={deliveryMode}
              onChange={(event) => setDeliveryMode(event.target.value)}
            />
          </Field>
          <Field label="Conditions de paiement" htmlFor="ord-terms">
            <input
              id="ord-terms"
              className={FIELD}
              placeholder="30 jours fin de mois"
              value={paymentTerms}
              onChange={(event) => setPaymentTerms(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Observations" htmlFor="ord-notes">
          <textarea
            id="ord-notes"
            rows={2}
            className={FIELD}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Émettre le bon de commande
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const ReceiptForm: React.FC<{
  orders: readonly PurchaseOrder[];
  pharmacies: readonly Pharmacy[];
  onCancel: () => void;
  onSubmit: (input: {
    orderId: string;
    pharmacyId: string | null;
    deliveryNote: string | null;
    receivedOn: string;
    notes: string | null;
    lines: {
      orderLineId: string | null;
      itemId: string;
      quantityReceived: number;
      lotNumber: string | null;
      manufacturedOn: string | null;
      expiresOn: string | null;
      serialNumber: string | null;
      unitPrice: number;
      observations: string | null;
    }[];
  }) => Promise<void>;
}> = ({ orders, pharmacies, onCancel, onSubmit }) => {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? '');
  const [pharmacyId, setPharmacyId] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const order = orders.find((entry) => entry.id === orderId) ?? null;

  // Le reliquat attendu est proposé par défaut : c'est le cas courant, et cela
  // évite de ressaisir des quantités déjà connues du bon de commande.
  const [received, setReceived] = useState<
    Record<string, { quantity: number; lot: string; expires: string; serial: string }>
  >({});

  const setLine = (
    lineId: string,
    patch: Partial<{ quantity: number; lot: string; expires: string; serial: string }>,
  ) =>
    setReceived((current) => ({
      ...current,
      // Valeurs de départ, puis ce qui a déjà été saisi, puis la modification :
      // l'ordre importe, une ligne partiellement remplie ne doit pas être remise
      // à zéro par une frappe dans un autre champ.
      [lineId]: { ...EMPTY_RECEIPT_LINE, ...current[lineId], ...patch },
    }));

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidth="2xl"
      title="Nouvelle réception"
      description="La marchandise devra être contrôlée avant sa mise en stock (BR-068)."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!order) return;

          const lines = order.lines
            .map((line) => {
              const entry = received[line.id];
              const quantity = entry?.quantity ?? 0;
              if (quantity <= 0) return null;
              return {
                orderLineId: line.id,
                itemId: line.itemId,
                quantityReceived: quantity,
                lotNumber: entry?.lot || null,
                manufacturedOn: null,
                expiresOn: entry?.expires || null,
                serialNumber: entry?.serial || null,
                unitPrice: line.unitPrice,
                observations: null,
              };
            })
            .filter((line): line is NonNullable<typeof line> => line !== null);

          if (lines.length === 0) {
            setLocalError('Indiquez au moins une quantité reçue.');
            return;
          }

          setIsSaving(true);
          await onSubmit({
            orderId,
            pharmacyId: pharmacyId || order.pharmacyId,
            deliveryNote: deliveryNote || null,
            receivedOn,
            notes: notes || null,
            lines,
          });
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        {localError && <Notice tone="error">{localError}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bon de commande *">
            <Select
              required
              value={orderId}
              onChange={(value) => {
                setOrderId(value);
                setReceived({});
              }}
              options={orders.map((entry) => ({
                value: entry.id,
                label: entry.reference,
                hint: entry.supplierName,
              }))}
            />
          </Field>
          <Field label="Magasin de réception">
            <Select
              value={pharmacyId}
              onChange={setPharmacyId}
              placeholder="— Celui du bon de commande —"
              options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bon de livraison" htmlFor="rec-bl">
            <input
              id="rec-bl"
              className={FIELD}
              placeholder="BL-2026-001"
              value={deliveryNote}
              onChange={(event) => setDeliveryNote(event.target.value)}
            />
          </Field>
          <Field label="Date de réception *" htmlFor="rec-date">
            <input
              id="rec-date"
              type="date"
              required
              className={FIELD}
              value={receivedOn}
              onChange={(event) => setReceivedOn(event.target.value)}
            />
          </Field>
        </div>

        {order && (
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs font-semibold text-slate-300">
              Articles attendus — indiquez ce qui a réellement été livré
            </p>

            {order.lines.map((line) => {
              const remaining = line.quantityOrdered - line.quantityReceived;
              return (
                <div key={line.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <p className="text-xs font-bold text-white">
                    {line.itemName}
                    <span className="ml-2 font-normal text-slate-500">
                      {line.quantityReceived}/{line.quantityOrdered} reçus · reste {remaining}
                    </span>
                  </p>

                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      aria-label={`Quantité reçue pour ${line.itemName}`}
                      placeholder="Quantité"
                      className={FIELD}
                      value={received[line.id]?.quantity ?? ''}
                      onChange={(event) =>
                        setLine(line.id, {
                          quantity: Math.min(remaining, Number(event.target.value) || 0),
                        })
                      }
                    />
                    <input
                      aria-label={`Numéro de lot pour ${line.itemName}`}
                      placeholder="N° de lot"
                      className={FIELD}
                      value={received[line.id]?.lot ?? ''}
                      onChange={(event) => setLine(line.id, { lot: event.target.value })}
                    />
                    <input
                      type="date"
                      aria-label={`Péremption pour ${line.itemName}`}
                      className={FIELD}
                      value={received[line.id]?.expires ?? ''}
                      onChange={(event) => setLine(line.id, { expires: event.target.value })}
                    />
                    <input
                      aria-label={`Numéro de série pour ${line.itemName}`}
                      placeholder="N° de série"
                      className={FIELD}
                      value={received[line.id]?.serial ?? ''}
                      onChange={(event) => setLine(line.id, { serial: event.target.value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Field label="Observations" htmlFor="rec-notes">
          <textarea
            id="rec-notes"
            rows={2}
            className={FIELD}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Enregistrer la réception
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const QualityForm: React.FC<{
  receipt: PurchaseReceipt;
  onCancel: () => void;
  onSubmit: (result: QualityResult, note: string | null) => Promise<void>;
}> = ({ receipt, onCancel, onSubmit }) => {
  const [note, setNote] = useState(receipt.qualityNote ?? '');
  const [busy, setBusy] = useState<string | null>(null);

  const decide = async (result: QualityResult) => {
    if (result !== 'accepted' && note.trim() === '') return;
    setBusy(result);
    await onSubmit(result, note);
    setBusy(null);
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`Contrôle qualité — ${receipt.reference}`}
      description={`${receipt.supplierName} · ${receipt.lines.length} ligne(s) livrée(s)`}
    >
      <div className="space-y-4">
        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950">
          {receipt.lines.map((line) => (
            <li key={line.id} className="p-3">
              <p className="text-xs font-bold text-white">
                {line.quantityReceived} × {line.itemName}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {line.lotNumber ? `Lot ${line.lotNumber}` : 'Sans numéro de lot'}
                {line.expiresOn && ` · péremption ${formatDate(line.expiresOn)}`}
                {line.serialNumber && ` · série ${line.serialNumber}`}
              </p>
            </li>
          ))}
        </ul>

        <Field
          label="Motif du contrôle"
          htmlFor="qc-note"
          hint="Obligatoire pour une acceptation avec réserve ou un refus."
        >
          <textarea
            id="qc-note"
            rows={3}
            className={FIELD}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>

        <Notice tone="info">
          Une réception refusée ne peut pas être mise en stock : la marchandise repart sans jamais
          avoir été disponible.
        </Notice>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            variant="secondary"
            isLoading={busy === 'accepted'}
            onClick={() => void decide('accepted')}
            className="gap-2 font-bold"
          >
            <CheckCircle2 className="h-4 w-4" /> Accepter
          </Button>
          <Button
            variant="outline"
            isLoading={busy === 'accepted_with_reserve'}
            disabled={note.trim() === ''}
            onClick={() => void decide('accepted_with_reserve')}
          >
            Avec réserve
          </Button>
          <Button
            variant="danger"
            isLoading={busy === 'refused'}
            disabled={note.trim() === ''}
            onClick={() => void decide('refused')}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" /> Refuser
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const QuoteComparison: React.FC<{
  requisition: Requisition;
  quotes: readonly SupplierQuote[];
  suppliers: readonly Supplier[];
  currency: string;
  canManage: boolean;
  onCancel: () => void;
  onCreate: (input: {
    requisitionId: string | null;
    supplierId: string;
    consultationType: string;
    receivedOn: string | null;
    validUntil: string | null;
    deliveryDays: number | null;
    warrantyMonths: number | null;
    shippingCost: number;
    paymentTerms: string | null;
    qualityNote: number | null;
    lines: { itemId: string | null; label: string; quantity: number; unitPrice: number }[];
  }) => Promise<void>;
  onSelect: (quoteId: string, reason: string) => Promise<void>;
}> = ({ requisition, quotes, suppliers, currency, canManage, onCancel, onCreate, onSelect }) => {
  const [adding, setAdding] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [consultationType, setConsultationType] = useState('devis');
  const [amount, setAmount] = useState(0);
  const [deliveryDays, setDeliveryDays] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [qualityNote, setQualityNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Les fournisseurs déjà consultés ne sont plus proposés : la base refuse une
  // seconde offre du même fournisseur sur la demande.
  const consulted = new Set(quotes.map((entry) => entry.supplierId));
  const remaining = suppliers.filter((entry) => !consulted.has(entry.id));

  const best = useMemo(() => {
    if (quotes.length === 0) return null;
    return [...quotes].sort((a, b) => a.totalAmount - b.totalAmount)[0];
  }, [quotes]);

  return (
    <Modal
      isOpen
      onClose={onCancel}
      maxWidth="2xl"
      title={`Consultation des fournisseurs — ${requisition.reference}`}
      description="Comparez les offres, puis retenez-en une. Le choix est historisé."
    >
      <div className="space-y-4">
        {quotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucune offre"
            description="Enregistrez les offres reçues pour les comparer sur le prix, le délai, la garantie et les conditions."
          />
        ) : (
          <ScrollTable minWidth="min-w-[44rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3">Fournisseur</th>
                <th className="p-3">Nature</th>
                <th className="p-3">Montant</th>
                <th className="p-3">Délai</th>
                <th className="p-3">Garantie</th>
                <th className="p-3">Transport</th>
                <th className="p-3">Qualité</th>
                <th className="p-3">Choix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {quotes.map((quote) => (
                <tr key={quote.id} className={quote.isSelected ? 'bg-mora-green/5' : ''}>
                  <td className="p-3 font-bold text-white">{quote.supplierName}</td>
                  <td className="p-3 text-[11px]">
                    {CONSULTATION_TYPES.find((t) => t.value === quote.consultationType)?.label ??
                      quote.consultationType}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        best?.id === quote.id ? 'font-bold text-mora-green' : 'text-slate-200'
                      }
                    >
                      {formatCurrency(quote.totalAmount, currency)}
                    </span>
                  </td>
                  <td className="p-3">
                    {quote.deliveryDays !== null ? `${quote.deliveryDays} j` : '—'}
                  </td>
                  <td className="p-3">
                    {quote.warrantyMonths !== null ? `${quote.warrantyMonths} mois` : '—'}
                  </td>
                  <td className="p-3">{formatCurrency(quote.shippingCost, currency)}</td>
                  <td className="p-3">{quote.qualityNote !== null ? `${quote.qualityNote}/5` : '—'}</td>
                  <td className="p-3">
                    {quote.isSelected ? (
                      <Badge label="Retenue" tone="good" />
                    ) : (
                      canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void onSelect(
                              quote.id,
                              best?.id === quote.id
                                ? 'Offre la moins-disante'
                                : 'Retenue après comparaison',
                            )
                          }
                        >
                          Retenir
                        </Button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        )}

        {canManage && !adding && remaining.length > 0 && (
          <Button variant="outline" onClick={() => setAdding(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Enregistrer une offre
          </Button>
        )}

        {canManage && remaining.length === 0 && quotes.length > 0 && (
          <Notice tone="info">
            Tous les fournisseurs enregistrés ont été consultés pour cette demande.
          </Notice>
        )}

        {adding && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSaving(true);
              await onCreate({
                requisitionId: requisition.id,
                supplierId,
                consultationType,
                receivedOn: new Date().toISOString().slice(0, 10),
                validUntil: null,
                deliveryDays: deliveryDays === '' ? null : Number(deliveryDays),
                warrantyMonths: warrantyMonths === '' ? null : Number(warrantyMonths),
                shippingCost,
                paymentTerms: paymentTerms || null,
                qualityNote: qualityNote === '' ? null : Number(qualityNote),
                // Le montant global suffit à comparer : le détail ligne à ligne
                // n'est saisi qu'au bon de commande, une fois l'offre retenue.
                lines: [
                  {
                    itemId: null,
                    label: `Offre globale — ${requisition.reference}`,
                    quantity: 1,
                    unitPrice: amount,
                  },
                ],
              });
              setIsSaving(false);
              setAdding(false);
            }}
            className="space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fournisseur *">
                <Select
                  required
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="— Choisir —"
                  options={remaining.map((entry) => ({ value: entry.id, label: entry.name }))}
                />
              </Field>
              <Field label="Nature de la consultation">
                <Select
                  value={consultationType}
                  onChange={setConsultationType}
                  options={CONSULTATION_TYPES.map((entry) => ({
                    value: entry.value,
                    label: entry.label,
                  }))}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={`Montant proposé (${currency}) *`} htmlFor="q-amount">
                <input
                  id="q-amount"
                  type="number"
                  min={0}
                  required
                  className={FIELD}
                  value={amount}
                  onChange={(event) => setAmount(Math.max(0, Number(event.target.value) || 0))}
                />
              </Field>
              <Field label="Délai (jours)" htmlFor="q-delay">
                <input
                  id="q-delay"
                  type="number"
                  min={0}
                  className={FIELD}
                  value={deliveryDays}
                  onChange={(event) => setDeliveryDays(event.target.value)}
                />
              </Field>
              <Field label={`Transport (${currency})`} htmlFor="q-ship">
                <input
                  id="q-ship"
                  type="number"
                  min={0}
                  className={FIELD}
                  value={shippingCost}
                  onChange={(event) => setShippingCost(Math.max(0, Number(event.target.value) || 0))}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Garantie (mois)" htmlFor="q-warranty">
                <input
                  id="q-warranty"
                  type="number"
                  min={0}
                  className={FIELD}
                  value={warrantyMonths}
                  onChange={(event) => setWarrantyMonths(event.target.value)}
                />
              </Field>
              <Field label="Conditions de paiement" htmlFor="q-terms">
                <input
                  id="q-terms"
                  className={FIELD}
                  value={paymentTerms}
                  onChange={(event) => setPaymentTerms(event.target.value)}
                />
              </Field>
              <Field label="Qualité (1 à 5)" htmlFor="q-quality">
                <input
                  id="q-quality"
                  type="number"
                  min={1}
                  max={5}
                  className={FIELD}
                  value={qualityNote}
                  onChange={(event) => setQualityNote(event.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdding(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="secondary"
                isLoading={isSaving}
                disabled={supplierId === ''}
                className="flex-1 font-bold"
              >
                Enregistrer l’offre
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

const ReturnForm: React.FC<{
  suppliers: readonly Supplier[];
  pharmacies: readonly Pharmacy[];
  lots: readonly Lot[];
  medications: readonly Medication[];
  currency: string;
  onCancel: () => void;
  onSubmit: (input: {
    supplierId: string;
    orderId: null;
    receiptId: null;
    pharmacyId: string | null;
    returnType: string;
    reason: string;
    returnedOn: string;
    lines: {
      itemId: string;
      lotId: string | null;
      quantity: number;
      unitPrice: number;
      observations: null;
    }[];
  }) => Promise<void>;
}> = ({ suppliers, pharmacies, lots, medications, currency, onCancel, onSubmit }) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '');
  const [pharmacyId, setPharmacyId] = useState('');
  const [returnType, setReturnType] = useState('partiel');
  const [reason, setReason] = useState('');
  const [lotId, setLotId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Seuls les lots réellement en stock peuvent être retournés.
  const returnable = lots.filter((lot) => lot.quantity > 0);
  const lot = returnable.find((entry) => entry.id === lotId) ?? null;
  const medication = lot ? medications.find((entry) => entry.id === lot.itemId) : null;

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Nouveau retour fournisseur"
      description="Le stock ne sera décrémenté qu’à l’expédition du retour."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!lot) {
            setLocalError('Sélectionnez le lot à retourner.');
            return;
          }
          if (quantity > lot.quantity) {
            setLocalError(`Ce lot ne contient que ${lot.quantity} unité(s).`);
            return;
          }

          setIsSaving(true);
          await onSubmit({
            supplierId,
            orderId: null,
            receiptId: null,
            pharmacyId: pharmacyId || lot.pharmacyId,
            returnType,
            reason,
            returnedOn: new Date().toISOString().slice(0, 10),
            lines: [
              {
                itemId: lot.itemId,
                lotId: lot.id,
                quantity,
                unitPrice: medication?.purchasePrice ?? lot.unitCost,
                observations: null,
              },
            ],
          });
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        {localError && <Notice tone="error">{localError}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fournisseur *">
            <Select
              required
              value={supplierId}
              onChange={setSupplierId}
              options={suppliers.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
          <Field label="Nature du retour *">
            <Select
              value={returnType}
              onChange={setReturnType}
              options={RETURN_TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
            />
          </Field>
        </div>

        <Field label="Lot à retourner *">
          <Select
            required
            value={lotId}
            onChange={(value) => {
              setLotId(value);
              setLocalError(null);
            }}
            placeholder="— Choisir un lot en stock —"
            options={returnable.map((entry) => ({
              value: entry.id,
              label: `${entry.itemName} — lot ${entry.lotNumber}`,
              hint: `${entry.quantity} en stock${entry.expiresOn ? ` · périme le ${formatDate(entry.expiresOn)}` : ''}`,
            }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Quantité retournée *"
            htmlFor="ret-qty"
            hint={lot ? `${lot.quantity} unité(s) disponible(s).` : undefined}
          >
            <input
              id="ret-qty"
              type="number"
              min={1}
              required
              className={FIELD}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
            />
          </Field>
          <Field label="Magasin d’origine">
            <Select
              value={pharmacyId}
              onChange={setPharmacyId}
              placeholder="— Celui du lot —"
              options={pharmacies.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
        </div>

        {lot && medication && (
          <Notice tone="info">
            Avoir estimé :{' '}
            {formatCurrency(quantity * (medication.purchasePrice || lot.unitCost), currency)}
          </Notice>
        )}

        <Field label="Motif du retour *" htmlFor="ret-reason">
          <textarea
            id="ret-reason"
            required
            rows={2}
            className={FIELD}
            placeholder="Conditionnement endommagé, non-conformité, péremption trop proche…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
            Enregistrer le retour
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const TransferForm: React.FC<{
  pharmacies: readonly Pharmacy[];
  lots: readonly Lot[];
  medications: readonly Medication[];
  onCancel: () => void;
  onSubmit: (input: {
    fromPharmacyId: string;
    toPharmacyId: string;
    notes: string | null;
    lines: { itemId: string; lotId: string | null; quantityRequested: number }[];
  }) => Promise<void>;
}> = ({ pharmacies, lots, onCancel, onSubmit }) => {
  const sources = pharmacies.filter((entry) => !entry.isServiceCabinet);
  const [fromPharmacyId, setFromPharmacyId] = useState(
    sources.find((entry) => entry.isDefault)?.id ?? sources[0]?.id ?? '',
  );
  const [toPharmacyId, setToPharmacyId] = useState('');
  const [lotId, setLotId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Seuls les lots du magasin source, et réellement pourvus.
  const available = lots.filter(
    (lot) => lot.quantity > 0 && lot.pharmacyId === fromPharmacyId && lot.state === 'available',
  );
  const lot = available.find((entry) => entry.id === lotId) ?? null;

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title="Nouveau transfert interne"
      description="Le stock est déplacé d’un magasin vers un autre, lot compris (BR-071)."
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!lot) {
            setLocalError('Sélectionnez le lot à transférer.');
            return;
          }
          if (fromPharmacyId === toPharmacyId) {
            setLocalError('Un magasin ne se réapprovisionne pas auprès de lui-même.');
            return;
          }
          if (quantity > lot.quantity) {
            setLocalError(`Ce lot ne contient que ${lot.quantity} unité(s).`);
            return;
          }

          setIsSaving(true);
          await onSubmit({
            fromPharmacyId,
            toPharmacyId,
            notes: notes || null,
            lines: [{ itemId: lot.itemId, lotId: lot.id, quantityRequested: quantity }],
          });
          setIsSaving(false);
        }}
        className="space-y-4"
      >
        {localError && <Notice tone="error">{localError}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Magasin d’origine *">
            <Select
              required
              value={fromPharmacyId}
              onChange={(value) => {
                setFromPharmacyId(value);
                setLotId('');
              }}
              options={sources.map((entry) => ({ value: entry.id, label: entry.name }))}
            />
          </Field>
          <Field label="Magasin destinataire *" hint="Pharmacie ou armoire de service.">
            <Select
              required
              value={toPharmacyId}
              onChange={setToPharmacyId}
              placeholder="— Choisir —"
              options={pharmacies
                .filter((entry) => entry.id !== fromPharmacyId)
                .map((entry) => ({
                  value: entry.id,
                  label: entry.name,
                  hint: entry.isServiceCabinet ? 'Armoire de service' : undefined,
                }))}
            />
          </Field>
        </div>

        <Field
          label="Lot à transférer *"
          hint={
            available.length === 0
              ? 'Aucun lot disponible dans ce magasin.'
              : undefined
          }
        >
          <Select
            required
            value={lotId}
            onChange={(value) => {
              setLotId(value);
              setLocalError(null);
            }}
            placeholder="— Choisir un lot —"
            options={available.map((entry) => ({
              value: entry.id,
              label: `${entry.itemName} — lot ${entry.lotNumber}`,
              hint: `${entry.quantity} en stock${entry.expiresOn ? ` · périme le ${formatDate(entry.expiresOn)}` : ''}`,
            }))}
          />
        </Field>

        <Field
          label="Quantité *"
          htmlFor="tsf-qty"
          hint={lot ? `${lot.quantity} unité(s) disponible(s).` : undefined}
        >
          <input
            id="tsf-qty"
            type="number"
            min={1}
            required
            className={FIELD}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
          />
        </Field>

        <Field label="Observations" htmlFor="tsf-notes">
          <textarea
            id="tsf-notes"
            rows={2}
            className={FIELD}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
          <Button
            type="submit"
            variant="secondary"
            isLoading={isSaving}
            disabled={available.length === 0}
            className="flex-1 font-bold"
          >
            Créer le transfert
          </Button>
        </div>
      </form>
    </Modal>
  );
};
