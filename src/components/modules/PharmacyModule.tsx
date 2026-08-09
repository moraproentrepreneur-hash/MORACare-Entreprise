'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building,
  ClipboardList,
  FileText,
  HandCoins,
  History,
  Layers,
  Package,
  Pill,
  ShoppingCart,
  Stethoscope,
  Truck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useDocument } from '@/hooks/useDocument';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { DEFAULT_MODULE_SETTINGS } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import {
  MOVEMENT_LABELS,
  buildAlerts,
  listDispensations,
  listInventories,
  listLocations,
  listLots,
  listMedications,
  listMovements,
  listPharmacies,
  listPrescriptionsForPharmacy,
  listSuppliers,
  loadStockState,
  type Dispensation,
  type Inventory,
  type Lot,
  type Medication,
  type Movement,
  type MovementKind,
  type PendingPrescription,
  type Pharmacy,
  type StockLocation,
  type StockState,
  type Supplier,
} from '@/services/pharmacy.service';
import { CataloguePanel } from '@/components/pharmacy/CataloguePanel';
import { LotsPanel } from '@/components/pharmacy/LotsPanel';
import { DispensationPanel } from '@/components/pharmacy/DispensationPanel';
import { InventoryPanel } from '@/components/pharmacy/InventoryPanel';
import { OrganisationPanel } from '@/components/pharmacy/OrganisationPanel';
import { SalesPanel } from '@/components/pharmacy/SalesPanel';
import { TherapeuticPanel } from '@/components/pharmacy/TherapeuticPanel';
import { ProcurementPanel } from '@/components/procurement/ProcurementPanel';
import {
  buildPurchaseOrderDocument,
  buildReceiptDocument,
  buildSaleReceipt,
  buildSupplierReturnDocument,
  buildTherapeuticPlanDocument,
  buildTransferDocument,
  buildWardRoundDocument,
} from '@/lib/documents/pharmacy-documents';
import { listPaymentMethods } from '@/services/subscription.service';
import {
  Badge,
  EmptyState,
  Metric,
  Notice,
  ScrollTable,
} from '@/components/hospitalization/shared';

/**
 * Module Pharmacie (BP17, BP18, BP19).
 *
 * Les onglets suivent le circuit du médicament : le catalogue décrit les
 * produits, les lots les font entrer, la délivrance les fait sortir,
 * l'inventaire vérifie, l'historique explique. L'organisation — pharmacies,
 * emplacements, fournisseurs — vient en dernier : on la règle une fois.
 *
 * Les rôles sans droit de gestion n'ont accès qu'au stock : BP19 §23 leur
 * reconnaît la consultation, pour vérifier la disponibilité d'un produit avant
 * de le prescrire, mais aucune écriture.
 */

type Tab =
  | 'stock'
  | 'lots'
  | 'sales'
  | 'dispensation'
  | 'therapeutic'
  | 'procurement'
  | 'inventory'
  | 'movements'
  | 'organisation';

const ALL_TABS: readonly {
  id: Tab;
  label: string;
  icon: React.ElementType;
  managerOnly: boolean;
}[] = [
  { id: 'stock', label: 'Stock', icon: Package, managerOnly: false },
  { id: 'lots', label: 'Lots', icon: Layers, managerOnly: false },
  { id: 'sales', label: 'Ventes', icon: ShoppingCart, managerOnly: true },
  { id: 'dispensation', label: 'Délivrance', icon: HandCoins, managerOnly: true },
  { id: 'therapeutic', label: 'Plans & tournées', icon: Stethoscope, managerOnly: true },
  { id: 'procurement', label: 'Achats & logistique', icon: Truck, managerOnly: true },
  { id: 'inventory', label: 'Inventaires', icon: ClipboardList, managerOnly: true },
  { id: 'movements', label: 'Mouvements', icon: History, managerOnly: false },
  { id: 'organisation', label: 'Organisation', icon: Building, managerOnly: true },
];

export const PharmacyModule: React.FC = () => {
  const { user } = useAuth();
  const { patients, refresh } = useData();
  const { canUpdate } = usePermissions();
  const { print, error: documentError, profile } = useDocument();

  const [tab, setTab] = useState<Tab>('stock');
  const [stock, setStock] = useState<StockState[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [dispensations, setDispensations] = useState<Dispensation[]>([]);
  const [prescriptions, setPrescriptions] = useState<PendingPrescription[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);

  const settings = profile?.moduleSettings.pharmacy ?? DEFAULT_MODULE_SETTINGS.pharmacy;
  const hospitalizationSettings =
    profile?.moduleSettings.hospitalization ?? DEFAULT_MODULE_SETTINGS.hospitalization;
  const currency = profile?.currency ?? 'KMF';

  const canManage = canUpdate('pharmacy');

  const tabs = useMemo(
    () => ALL_TABS.filter((entry) => !entry.managerOnly || canManage),
    [canManage],
  );

  const ctx: WriteContext | null = useMemo(
    () =>
      user?.establishment_id && user.id
        ? { establishmentId: user.establishment_id, userId: user.id }
        : null,
    [user],
  );

  /**
   * Chargement du module.
   *
   * Les écrans réservés au pharmacien ne sont pas chargés pour les autres
   * rôles : ramener des délivrances nominatives pour un écran qu'ils ne verront
   * pas serait une collecte sans objet.
   */
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedStock, loadedMedications, loadedLots, loadedMovements, loadedPharmacies] =
        await Promise.all([
          loadStockState(),
          listMedications(),
          listLots(),
          listMovements(200),
          listPharmacies(),
        ]);

      setStock(loadedStock);
      setMedications(loadedMedications);
      setLots(loadedLots);
      setMovements(loadedMovements);
      setPharmacies(loadedPharmacies);

      if (canManage) {
        const [
          loadedDispensations,
          loadedPrescriptions,
          loadedInventories,
          loadedLocations,
          loadedSuppliers,
          loadedMethods,
        ] = await Promise.all([
          listDispensations(),
          listPrescriptionsForPharmacy(),
          listInventories(),
          listLocations(),
          listSuppliers(),
          listPaymentMethods(),
        ]);

        setDispensations(loadedDispensations);
        setPrescriptions(loadedPrescriptions);
        setInventories(loadedInventories);
        setLocations(loadedLocations);
        setSuppliers(loadedSuppliers);
        setPaymentMethods(loadedMethods.map((method) => method.label));
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(async () => {
    await load();
    await refresh();
  }, [load, refresh]);

  // Un onglet réservé ne doit pas rester affiché si le rôle change.
  const currentTab = tabs.some((entry) => entry.id === tab) ? tab : tabs[0].id;

  const alerts = useMemo(() => buildAlerts(stock), [stock]);

  const openLots = (itemId: string) => {
    setFocusItemId(itemId);
    setTab('lots');
  };

  /** État du stock (BP18 §19, BP19 §22). */
  const printStockState = () => {
    void print({
      kind: 'stock_state',
      reference: `ETAT-${new Date().toISOString().slice(0, 10)}`,
      title: 'État du stock pharmaceutique',
      subtitle: `Situation au ${formatDate(new Date().toISOString())}`,
      highlight: [
        { label: 'Références', value: String(stock.length) },
        { label: 'Valeur du stock', value: formatCurrency(alerts.totalValue, currency) },
        { label: 'Sous le seuil', value: String(alerts.lowStock.length) },
        { label: 'Ruptures', value: String(alerts.outOfStock.length) },
      ],
      sections: [
        {
          title: 'Inventaire valorisé',
          table: {
            columns: ['Médicament', 'Catégorie', 'Quantité', 'Valeur'],
            rows: stock.map((line) => [
              line.name,
              line.category,
              `${line.quantity} ${line.unit}`,
              formatCurrency(line.stockValue, currency),
            ]),
          },
        },
        ...(alerts.lowStock.length > 0
          ? [
              {
                title: 'Produits sous le seuil de réapprovisionnement',
                table: {
                  columns: ['Médicament', 'Stock', 'Seuil'],
                  rows: alerts.lowStock.map((line) => [
                    line.name,
                    String(line.quantity),
                    String(line.reorderLevel),
                  ]),
                },
              },
            ]
          : []),
        ...(alerts.expiring.length > 0 || alerts.expired.length > 0
          ? [
              {
                title: 'Péremptions à surveiller',
                table: {
                  columns: ['Médicament', 'Prochaine péremption', 'Périmé', 'À surveiller'],
                  rows: [...alerts.expired, ...alerts.expiring]
                    // Un produit à la fois périmé et proche de péremption ne
                    // doit apparaître qu'une seule fois.
                    .filter(
                      (line, index, all) =>
                        all.findIndex((entry) => entry.itemId === line.itemId) === index,
                    )
                    .map((line) => [
                      line.name,
                      line.nextExpiry ? formatDate(line.nextExpiry) : '—',
                      String(line.expiredQuantity),
                      String(line.expiringQuantity),
                    ]),
                },
              },
            ]
          : []),
      ],
      note: `Seuil de réapprovisionnement par défaut : ${settings.lowStockThreshold}. Péremption signalée ${settings.expiryWarningDays} jours à l'avance.`,
    });
  };

  /** Bon de délivrance nominatif (BP19 §10). */
  const printDispensation = (dispensation: Dispensation) => {
    void print({
      kind: 'dispensation',
      reference: dispensation.reference,
      title: 'Bon de délivrance',
      subtitle: `Délivré le ${formatDate(dispensation.dispensedAt)}`,
      highlight: [
        { label: 'Patient', value: dispensation.patientName ?? 'Délivrance au comptoir' },
        { label: 'Pharmacie', value: dispensation.pharmacyName ?? '—' },
        { label: 'Pharmacien', value: dispensation.dispensedByName ?? '—' },
        { label: 'Montant', value: formatCurrency(dispensation.totalAmount, currency) },
      ],
      sections: [
        {
          title: 'Produits délivrés',
          table: {
            columns: ['Médicament', 'Lot', 'Quantité', 'Prix unitaire', 'Total'],
            rows: dispensation.lines.map((line) => [
              line.itemName,
              line.lotNumber ?? '—',
              String(line.quantity),
              formatCurrency(line.unitPrice, currency),
              formatCurrency(line.quantity * line.unitPrice, currency),
            ]),
          },
        },
        ...(dispensation.lines.some((line) => line.posology)
          ? [
              {
                title: 'Posologie',
                fields: dispensation.lines
                  .filter((line) => line.posology)
                  .map((line) => ({ label: line.itemName, value: line.posology as string })),
              },
            ]
          : []),
        ...(dispensation.notes
          ? [{ title: 'Observations', paragraphs: [dispensation.notes] }]
          : []),
      ],
      note: 'Conservez ce bon : il atteste des lots qui vous ont été remis.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
            <Pill className="h-5 w-5 shrink-0 text-mora-green" /> Pharmacie
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {canManage
              ? 'Catalogue, lots, mouvements, délivrance, inventaires et fournisseurs.'
              : 'Consultation du stock disponible avant prescription.'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={printStockState}
          disabled={stock.length === 0}
          className="shrink-0 gap-2"
        >
          <FileText className="h-4 w-4" /> État du stock
        </Button>
      </div>

      {(error || documentError) && <Notice tone="error">{error ?? documentError}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Références" value={stock.length} hint={`${lots.length} lot(s) suivi(s)`} />
        <Metric
          label="Valeur du stock"
          value={formatCurrency(alerts.totalValue, currency)}
          hint="Au prix d'achat"
        />
        <Metric
          label="Sous le seuil"
          value={alerts.lowStock.length + alerts.outOfStock.length}
          hint={`dont ${alerts.outOfStock.length} en rupture`}
          tone={alerts.outOfStock.length > 0 ? 'bad' : alerts.lowStock.length > 0 ? 'warn' : 'good'}
        />
        <Metric
          label="Péremptions"
          value={alerts.expiring.length + alerts.expired.length}
          hint={`dont ${alerts.expired.length} périmé(s)`}
          tone={alerts.expired.length > 0 ? 'bad' : alerts.expiring.length > 0 ? 'warn' : 'good'}
        />
      </div>

      {(alerts.outOfStock.length > 0 || alerts.expired.length > 0) && (
        <Notice tone="error">
          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
          {alerts.outOfStock.length > 0 && (
            <>
              {alerts.outOfStock.length} produit(s) en rupture
              {alerts.expired.length > 0 && ', '}
            </>
          )}
          {alerts.expired.length > 0 && <>{alerts.expired.length} produit(s) périmé(s) en stock</>}
          .{' '}
          {settings.blockExpiredDispensing
            ? 'Les produits périmés ne peuvent pas être délivrés.'
            : 'Le blocage des périmés est désactivé dans les Paramètres.'}
        </Notice>
      )}

      <div className="flex gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        {tabs.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                currentTab === entry.id
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

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />
      ) : (
        <>
          {currentTab === 'stock' && (
            <CataloguePanel
              stock={stock}
              medications={medications}
              settings={settings}
              currency={currency}
              canManage={canManage}
              ctx={ctx}
              onOpenLots={openLots}
              onChanged={reload}
            />
          )}

          {currentTab === 'lots' && (
            <LotsPanel
              lots={lots}
              medications={medications}
              pharmacies={pharmacies}
              suppliers={suppliers}
              settings={settings}
              currency={currency}
              canManage={canManage}
              ctx={ctx}
              focusItemId={focusItemId}
              onClearFocus={() => setFocusItemId(null)}
              onChanged={reload}
            />
          )}

          {currentTab === 'sales' && (
            <SalesPanel
              sales={dispensations.filter((entry) => entry.channel === 'sale')}
              stock={stock}
              pharmacies={pharmacies}
              patients={patients}
              paymentMethods={paymentMethods}
              currency={currency}
              canSell={canManage}
              ctx={ctx}
              onPrint={(sale) => void print(buildSaleReceipt(sale, currency))}
              onChanged={reload}
            />
          )}

          {currentTab === 'therapeutic' && (
            <TherapeuticPanel
              medications={medications}
              pharmacies={pharmacies}
              patients={patients}
              settings={hospitalizationSettings}
              routes={settings.administrationRoutes}
              canManage={canManage}
              ctx={ctx}
              onPrintPlan={(plan) => void print(buildTherapeuticPlanDocument(plan))}
              onPrintRound={(round) => void print(buildWardRoundDocument(round))}
            />
          )}

          {currentTab === 'procurement' && (
            <ProcurementPanel
              medications={medications}
              lots={lots}
              pharmacies={pharmacies}
              suppliers={suppliers}
              services={hospitalizationSettings.admissionServices}
              currency={currency}
              canManage={canManage}
              ctx={ctx}
              onPrintOrder={(order) => void print(buildPurchaseOrderDocument(order, currency))}
              onPrintReceipt={(receipt) => void print(buildReceiptDocument(receipt, currency))}
              onPrintTransfer={(transfer) => void print(buildTransferDocument(transfer))}
              onPrintReturn={(entry) => void print(buildSupplierReturnDocument(entry, currency))}
            />
          )}

          {currentTab === 'dispensation' && (
            <DispensationPanel
              // Les ventes au comptoir ont leur propre écran : les mêler aux
              // délivrances sur ordonnance rendrait l'un et l'autre illisibles.
              dispensations={dispensations.filter((entry) => entry.channel !== 'sale')}
              prescriptions={prescriptions}
              stock={stock}
              pharmacies={pharmacies}
              patients={patients}
              settings={settings}
              currency={currency}
              canDispense={canManage}
              ctx={ctx}
              onPrint={printDispensation}
              onChanged={reload}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryPanel
              inventories={inventories}
              stock={stock}
              pharmacies={pharmacies}
              canManage={canManage}
              ctx={ctx}
              onChanged={reload}
            />
          )}

          {currentTab === 'movements' && (
            <MovementsPanel movements={movements} currency={currency} />
          )}

          {currentTab === 'organisation' && (
            <OrganisationPanel
              pharmacies={pharmacies}
              locations={locations}
              suppliers={suppliers}
              hospitalizationSettings={hospitalizationSettings}
              canManage={canManage}
              ctx={ctx}
              onChanged={reload}
            />
          )}
        </>
      )}
    </div>
  );
};

/** Historique des mouvements (BP18 §11, §19). */
const MovementsPanel: React.FC<{ movements: readonly Movement[]; currency: string }> = ({
  movements,
  currency,
}) => {
  const [kind, setKind] = useState<MovementKind | 'all'>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return movements
      .filter((entry) => (kind === 'all' ? true : entry.kind === kind))
      .filter((entry) =>
        needle === ''
          ? true
          : `${entry.reference} ${entry.itemName} ${entry.lotNumber ?? ''} ${entry.reason ?? ''}`
              .toLowerCase()
              .includes(needle),
      );
  }, [movements, kind, search]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-mora-green"
          placeholder="Rechercher un mouvement, un produit, un lot…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          aria-label="Filtrer par nature"
          value={kind}
          onChange={(value) => setKind(value as MovementKind | 'all')}
          options={[
            { value: 'all', label: 'Toutes les natures' },
            ...(Object.keys(MOVEMENT_LABELS) as MovementKind[]).map((entry) => ({
              value: entry,
              label: MOVEMENT_LABELS[entry],
            })),
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={History}
            title={movements.length === 0 ? 'Aucun mouvement' : 'Aucun résultat'}
            description="Le registre est immuable : chaque entrée, sortie, délivrance ou écart d’inventaire y laisse une trace définitive."
          />
        ) : (
          <ScrollTable minWidth="min-w-[56rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Date</th>
                <th className="p-4">Nature</th>
                <th className="p-4">Médicament</th>
                <th className="p-4">Lot</th>
                <th className="p-4">Quantité</th>
                <th className="p-4">Motif</th>
                <th className="p-4">Opérateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((entry) => (
                <tr key={entry.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="p-4 font-mono font-bold text-mora-green">{entry.reference}</td>
                  <td className="p-4">{formatDateTime(entry.occurredAt)}</td>
                  <td className="p-4">
                    <Badge
                      label={MOVEMENT_LABELS[entry.kind]}
                      tone={entry.quantity > 0 ? 'good' : 'warn'}
                    />
                  </td>
                  <td className="p-4 font-semibold text-white">{entry.itemName}</td>
                  <td className="p-4 font-mono text-[11px] text-slate-400">
                    {entry.lotNumber ?? '—'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`font-bold ${
                        entry.quantity > 0 ? 'text-mora-green' : 'text-red-400'
                      }`}
                    >
                      {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                    </span>
                    {entry.unitCost > 0 && (
                      <span className="block text-[11px] text-slate-500">
                        {formatCurrency(Math.abs(entry.quantity) * entry.unitCost, currency)}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {entry.reason ?? '—'}
                    {entry.patientName && (
                      <span className="block text-[11px] text-slate-500">{entry.patientName}</span>
                    )}
                  </td>
                  <td className="p-4">{entry.performedByName ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        )}
      </div>
    </div>
  );
};
