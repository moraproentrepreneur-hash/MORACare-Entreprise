'use client';

import React, { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { DEFAULT_MODULE_SETTINGS } from '@/services/establishment.service';
import { FileText, Pill, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { useDocument } from '@/hooks/useDocument';

/**
 * Signalement des péremptions (BP19 §15).
 *
 * Un médicament périmé ne doit pas se lire comme les autres : la date seule
 * oblige à la comparer mentalement à celle du jour, à chaque ligne.
 *
 * Le délai de surveillance vient des Paramètres de l'établissement : trente
 * jours conviennent à une officine qui se réapprovisionne vite, pas à une
 * structure qui commande au trimestre.
 */
const expiryState = (
  date: string | null | undefined,
  warningDays: number,
): { tone: string; note: string | null } => {
  if (!date) return { tone: 'text-slate-400', note: null };

  const days = Math.round((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { tone: 'text-red-400', note: 'Périmé' };
  if (days <= warningDays) return { tone: 'text-amber-400', note: `Périme dans ${days} j` };
  return { tone: 'text-slate-300', note: null };
};

export const PharmacyModule: React.FC = () => {
  // Ce module conservait auparavant son stock dans un état local : rien n'était
  // jamais enregistré. Il lit désormais la base comme les autres modules.
  const { pharmacyItems: items, addPharmacyItem } = useData();
  const { print, error: documentError, profile } = useDocument();

  // Réglages de l'établissement (BP19). Les valeurs par défaut couvrent le cas
  // où le profil n'est pas encore chargé.
  const pharmacySettings = profile?.moduleSettings.pharmacy ?? DEFAULT_MODULE_SETTINGS.pharmacy;

  const categoryOptions = pharmacySettings.categories.map((category) => ({
    value: category,
    label: category,
  }));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * État du stock (BP19 §19).
   *
   * L'identité de l'établissement, ses couleurs et son modèle documentaire
   * viennent de ses Paramètres : cet état est un document officiel, pas un
   * export technique.
   */
  const printStockReport = () => {
    const valuation = items.reduce(
      (total, item) => total + item.stock_quantity * item.unit_price,
      0,
    );
    const lowStock = items.filter((item) => item.stock_quantity <= (item.reorder_level ?? 0));
    const expiring = items.filter((item) => expiryState(item.expiry_date, pharmacySettings.expiryWarningDays).note !== null);

    void print({
      kind: 'dispensation',
      reference: `STOCK-${new Date().toISOString().slice(0, 10)}`,
      title: 'État du stock pharmaceutique',
      subtitle: `Arrêté au ${formatDate(new Date().toISOString())}`,
      highlight: [
        { label: 'Références', value: String(items.length) },
        { label: 'Valorisation', value: formatCurrency(valuation) },
        { label: 'Sous le seuil', value: String(lowStock.length) },
        { label: 'Péremptions à surveiller', value: String(expiring.length) },
      ],
      sections: [
        {
          title: 'Inventaire',
          table: {
            columns: ['Référence', 'Médicament', 'Quantité', 'Valeur'],
            rows: items.map((item) => [
              item.business_reference,
              item.name,
              String(item.stock_quantity),
              formatCurrency(item.stock_quantity * item.unit_price),
            ]),
            numericColumns: [2, 3],
          },
        },
        ...(lowStock.length > 0
          ? [
              {
                title: 'À réapprovisionner',
                table: {
                  columns: ['Médicament', 'Stock', 'Seuil'],
                  rows: lowStock.map((item) => [
                    item.name,
                    String(item.stock_quantity),
                    String(item.reorder_level ?? 0),
                  ]),
                  numericColumns: [1, 2],
                },
              },
            ]
          : []),
        ...(expiring.length > 0
          ? [
              {
                title: 'Péremptions',
                table: {
                  columns: ['Médicament', 'Péremption', 'État'],
                  rows: expiring.map((item) => [
                    item.name,
                    item.expiry_date ? formatDate(item.expiry_date) : '—',
                    expiryState(item.expiry_date, pharmacySettings.expiryWarningDays).note ?? '—',
                  ]),
                },
              },
            ]
          : []),
      ],
      total: { label: 'Valorisation du stock', value: formatCurrency(valuation) },
    });
  };

  const [form, setForm] = useState({
    name: '',
    generic_name: '',
    category: 'Antibiotique',
    stock_quantity: 0,
    unit_price: 0,
    expiry_date: '',
    reorder_level: DEFAULT_MODULE_SETTINGS.pharmacy.lowStockThreshold
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      await addPharmacyItem({
        name: form.name,
        generic_name: form.generic_name || undefined,
        category: form.category,
        stock_quantity: form.stock_quantity,
        unit_price: form.unit_price,
        expiry_date: form.expiry_date || undefined,
        reorder_level: form.reorder_level
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddModalOpen(false);
    setForm({
      name: '',
      generic_name: '',
      category: 'Antibiotique',
      stock_quantity: 0,
      unit_price: 0,
      expiry_date: '',
      reorder_level: pharmacySettings.lowStockThreshold
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Pill className="w-5 h-5 text-mora-green" /> Gestion Pharmacie & Stocks
          </h2>
          <p className="text-xs text-slate-400 mt-1">Catalogue de médicaments, inventaire, réapprovisionnement et délivrance.</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {items.length > 0 && (
            <Button variant="outline" onClick={printStockReport} className="gap-2">
              <FileText className="w-4 h-4" /> État du stock
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Ajouter un Médicament
          </Button>
        </div>
      </div>

      {documentError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {documentError}
        </div>
      )}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Pill className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucun produit en stock</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              La pharmacie est vide. Cliquez sur "Ajouter un Médicament" pour renseigner votre catalogue pharmaceutique.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Entrer un médicament
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Produit</th>
                  <th className="p-4">Nom Produit</th>
                  <th className="p-4">DCI / Générique</th>
                  <th className="p-4">Catégorie</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Prix Unitaire</th>
                  <th className="p-4">Péremption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((i) => {
                  const expiry = expiryState(i.expiry_date, pharmacySettings.expiryWarningDays);
                  const lowStock = i.stock_quantity <= (i.reorder_level ?? 0);

                  return (
                    <tr key={i.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-mono text-mora-green font-bold">
                        {i.business_reference}
                      </td>
                      <td className="p-4 font-bold text-white">{i.name}</td>
                      <td className="p-4">{i.generic_name || '-'}</td>
                      <td className="p-4">{i.category}</td>
                      <td className="p-4">
                        {/* BP19 §13 : le seuil de réapprovisionnement doit se
                            voir sur la ligne, pas dans un rapport séparé. */}
                        <span
                          className={`font-bold ${lowStock ? 'text-amber-400' : 'text-emerald-400'}`}
                        >
                          {i.stock_quantity} unités
                        </span>
                        {lowStock && (
                          <span className="mt-0.5 block text-[10px] text-amber-400">
                            Seuil de réapprovisionnement atteint
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-200">
                        {formatCurrency(i.unit_price)}
                      </td>
                      <td className="p-4">
                        <span className={expiry.tone}>
                          {i.expiry_date ? formatDate(i.expiry_date) : '—'}
                        </span>
                        {expiry.note && (
                          <span className={`mt-0.5 block text-[10px] ${expiry.tone}`}>
                            {expiry.note}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nouveau Produit Pharmaceutique">
        <form onSubmit={handleCreate} className="space-y-4 text-slate-900 dark:text-slate-100">
          {submitError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Nom Commercial du Médicament</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Paracétamol 1000mg"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Nom Générique (DCI)</label>
              <input
                type="text"
                value={form.generic_name}
                onChange={(e) => setForm({ ...form, generic_name: e.target.value })}
                placeholder="Paracetamol"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Catégorie</label>
              <Select
                required
                value={form.category}
                onChange={(value) => setForm({ ...form, category: value })}
                placeholder="— Sélectionner une catégorie —"
                options={categoryOptions}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Quantité Stock</label>
              <input
                type="number"
                required
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Prix Unitaire (KMF)</label>
              <input
                type="number"
                required
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Date Péremption</label>
              <input
                type="date"
                required
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Enregistrer le produit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
