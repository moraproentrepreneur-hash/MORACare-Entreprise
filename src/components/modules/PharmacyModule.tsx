'use client';

import React, { useState } from 'react';
import { Pill, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useData } from '@/context/DataContext';

export const PharmacyModule: React.FC = () => {
  // Ce module conservait auparavant son stock dans un état local : rien n'était
  // jamais enregistré. Il lit désormais la base comme les autres modules.
  const { pharmacyItems: items, addPharmacyItem } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    generic_name: '',
    category: 'Antibiotique',
    stock_quantity: 0,
    unit_price: 0,
    expiry_date: '',
    reorder_level: 10
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
      reorder_level: 10
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
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Ajouter un Médicament
        </Button>
      </div>

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
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{i.business_reference}</td>
                    <td className="p-4 font-bold text-white">{i.name}</td>
                    <td className="p-4">{i.generic_name || '-'}</td>
                    <td className="p-4">{i.category}</td>
                    <td className="p-4 font-bold text-emerald-400">{i.stock_quantity} unités</td>
                    <td className="p-4 font-mono text-slate-200">{formatCurrency(i.unit_price)}</td>
                    <td className="p-4">{formatDate(i.expiry_date || '')}</td>
                  </tr>
                ))}
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
              <input
                type="text"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
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
              <label className="block text-xs font-semibold mb-1">Prix Unitaire (FC)</label>
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
