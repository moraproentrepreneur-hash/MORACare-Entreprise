'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Download, 
  DollarSign, 
  Wallet, 
  FileText, 
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
  Receipt,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Invoice, Patient, CashRegister, CashMovement, CashClosure } from '@/types';
import { formatCurrency, formatDate, downloadMedicalPDF } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { PatientSelect } from '@/components/ui/PatientSelect';

export const FinanceModule: React.FC = () => {
  const { 
    patients, 
    invoices, 
    addInvoice, 
    cashRegisters, 
    openCashRegister, 
    closeCashRegister, 
    cashMovements, 
    addCashMovement 
  } = useData();

  const [activeTab, setActiveTab] = useState<'invoices' | 'cash_movements' | 'cash_registers' | 'treasury'>('invoices');

  // Modals state
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [isOpenRegModalOpen, setIsOpenRegModalOpen] = useState(false);
  const [isCloseRegModalOpen, setIsCloseRegModalOpen] = useState(false);

  // Form states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    description: 'Prestation médicale',
    subtotal: 0,
    tax_amount: 0,
    paid_amount: 0,
    payment_method: 'Espèces' as CashMovement['payment_method'],
  });

  const [regForm, setRegForm] = useState({
    name: 'Caisse Principale',
    opening_balance: 0,
  });

  const [closeForm, setCloseForm] = useState({
    register_id: '',
    physical_cash_count: 0,
    explanation: '',
  });

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatientId(p.id);
  };

  const openRegister = cashRegisters.find((r) => r.status === 'open');

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedPatientId) {
      setSubmitError('Sélectionnez un patient enregistré dans la base.');
      return;
    }

    try {
      // Les totaux sont recalculés par le service à partir des lignes.
      await addInvoice({
        patient_id: selectedPatientId,
        items: [
          {
            description: invoiceForm.description,
            quantity: 1,
            unit_price: invoiceForm.subtotal,
          },
        ],
        tax_amount: invoiceForm.tax_amount,
      });

      // BP22B : l'encaissement suit la facture, mais il exige une caisse
      // ouverte. Sans caisse, on ne fabrique pas un mouvement orphelin.
      if (invoiceForm.paid_amount > 0) {
        if (!openRegister) {
          setSubmitError(
            'Facture enregistrée, mais aucun encaissement possible : aucune caisse ouverte.',
          );
          return;
        }

        await addCashMovement({
          cash_register_id: openRegister.id,
          type: 'encaissement',
          payment_method: invoiceForm.payment_method,
          amount: invoiceForm.paid_amount,
          reason: `Règlement — ${invoiceForm.description}`,
          patient_id: selectedPatientId,
        });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddInvoiceModalOpen(false);
    setSelectedPatientId('');
    setInvoiceForm({
      description: 'Prestation médicale',
      subtotal: 0,
      tax_amount: 0,
      paid_amount: 0,
      payment_method: 'Espèces',
    });
  };

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      await openCashRegister({
        name: regForm.name,
        opening_balance: regForm.opening_balance,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'ouverture de caisse.");
      return;
    }

    setIsOpenRegModalOpen(false);
  };

  const handleCloseRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const targetReg = cashRegisters.find((r) => r.id === closeForm.register_id) ?? openRegister;
    if (!targetReg) {
      setSubmitError('Aucune caisse ouverte à clôturer.');
      return;
    }

    try {
      // L'écart est une colonne générée par PostgreSQL : il n'est pas transmis
      // et ne peut donc pas être falsifié depuis le navigateur.
      await closeCashRegister({
        cash_register_id: targetReg.id,
        theoretical_balance: targetReg.current_balance,
        physical_cash_count: closeForm.physical_cash_count,
        explanation: closeForm.explanation || undefined,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Échec de la clôture.');
      return;
    }

    setIsCloseRegModalOpen(false);
  };

  const handleDownloadInvoicePDF = (inv: Invoice) => {
    downloadMedicalPDF(
      'Facture Médicale Officielle',
      `Patient: ${inv.patient_name}`,
      inv.business_reference,
      [
        `Date de facturation: ${formatDate(inv.invoice_date)}`,
        `Montant Sous-Total: ${formatCurrency(inv.subtotal)}`,
        `Taxes / TVA: ${formatCurrency(inv.tax_amount)}`,
        `Montant Total Réglé: ${formatCurrency(inv.paid_amount)}`,
        `Statut du règlement: ${inv.status.toUpperCase()}`,
        '--------------------------------------------------',
        'Reçu comptable conforme BP-022A/B généré via MORACare SaaS.',
      ]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-mora-green" /> ERP Finance, Facturation & Caisses (BP-022A/B/C)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Grilles tarifaires, encaissements multi-modes, gestion des caisses avec comptage physique et livre comptable.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setIsOpenRegModalOpen(true)} className="gap-1.5 text-xs">
            <Unlock className="w-3.5 h-3.5" /> Ouvrir une Caisse
          </Button>
          <Button variant="secondary" onClick={() => setIsAddInvoiceModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Émettre une Facture
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'invoices' ? 'bg-mora-blue text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Factures & Prestations (BP-022A)
        </button>
        <button
          onClick={() => setActiveTab('cash_movements')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'cash_movements' ? 'bg-mora-blue text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" /> Encaissements & Reçus (BP-022B)
        </button>
        <button
          onClick={() => setActiveTab('cash_registers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'cash_registers' ? 'bg-mora-blue text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4" /> Gestion des Caisses & Clôtures
        </button>
        <button
          onClick={() => setActiveTab('treasury')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'treasury' ? 'bg-mora-blue text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" /> Livre Comptable (BP-022C)
        </button>
      </div>

      {/* TAB 1: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CreditCard className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-300">Aucune facture émise</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cliquez ci-dessous pour émettre une facture liée à un patient existant dans la base.
              </p>
              <Button variant="secondary" onClick={() => setIsAddInvoiceModalOpen(true)} className="gap-2 mt-2">
                <Plus className="w-4 h-4" /> Créer une Facture
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Réf. Facture</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Réglé</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-mono text-mora-green font-bold">{inv.business_reference}</td>
                      <td className="p-4 font-bold text-white">{inv.patient_name}</td>
                      <td className="p-4">{formatDate(inv.invoice_date)}</td>
                      <td className="p-4 font-mono text-white font-bold">{formatCurrency(inv.total_amount)}</td>
                      <td className="p-4 font-mono text-emerald-400 font-bold">{formatCurrency(inv.paid_amount)}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase">
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadInvoicePDF(inv)} className="gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Reçu PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CASH MOVEMENTS */}
      {activeTab === 'cash_movements' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-bold text-white text-sm">
            Journal des Encaissements & Décaissements (BP-022B)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Mouvement</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Payeur / Bénéficiaire</th>
                  <th className="p-4">Mode de Règlement</th>
                  <th className="p-4">Montant</th>
                  <th className="p-4">Motif</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cashMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Aucun mouvement de caisse enregistré.</td>
                  </tr>
                ) : (
                  cashMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-800/50">
                      <td className="p-4 font-mono text-mora-green font-bold">{mov.business_reference}</td>
                      <td className="p-4 uppercase font-bold text-emerald-400">{mov.type}</td>
                      <td className="p-4 font-bold text-white">{mov.patient_name || 'N/A'}</td>
                      <td className="p-4 font-semibold text-blue-400">{mov.payment_method}</td>
                      <td className="p-4 font-mono font-bold text-emerald-400">{formatCurrency(mov.amount)}</td>
                      <td className="p-4">{mov.reason}</td>
                      <td className="p-4">{formatDate(mov.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CASH REGISTERS */}
      {activeTab === 'cash_registers' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            {cashRegisters.length === 0 ? (
              <div className="col-span-3 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">Aucune caisse ouverte</h4>
                <Button variant="outline" onClick={() => setIsOpenRegModalOpen(true)}>Ouvrir une Caisse</Button>
              </div>
            ) : (
              cashRegisters.map((reg) => (
                <div key={reg.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-mora-green text-xs font-bold">{reg.business_reference}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${reg.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {reg.status}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{reg.name}</h4>
                  <p className="text-xs text-slate-400">Caissier: {reg.cashier_name}</p>
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Solde théorique</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(reg.current_balance)}</span>
                  </div>
                  {reg.status === 'open' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setCloseForm({ ...closeForm, register_id: reg.id, physical_cash_count: reg.current_balance });
                        setIsCloseRegModalOpen(true);
                      }} 
                      className="w-full text-xs text-red-400 border-red-950 hover:bg-red-950/30"
                    >
                      <Lock className="w-3.5 h-3.5 mr-1" /> Clôture avec Comptage Physique
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TREASURY & INALTERABLE JOURNAL */}
      {activeTab === 'treasury' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Livre de Caisse Inaltérable & Traçabilité (BP-022C)</h3>
          <p className="text-xs text-slate-400">Toutes les opérations d'ouverture, d'encaissement et de clôture sont contrepassées et historisées.</p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
            <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-mora-green" /> Contrôle d'écarts de caisse quotidien activé.</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-mora-green" /> Historique audit sans aucune possibilité de suppression physique (BR-118/BR-130).</p>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD INVOICE */}
      <Modal isOpen={isAddInvoiceModalOpen} onClose={() => setIsAddInvoiceModalOpen(false)} title="Émission de Facture Soins">
        <form onSubmit={handleCreateInvoice} className="space-y-4 text-slate-900 dark:text-slate-100">
          <div>
            <PatientSelect
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={handleSelectPatient}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Montant Actes (FC) *</label>
              <input
                type="number"
                required
                value={invoiceForm.subtotal}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Montant Encaissé (FC) *</label>
              <input
                type="number"
                required
                value={invoiceForm.paid_amount}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, paid_amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Mode de Règlement *</label>
            <select
              value={invoiceForm.payment_method}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, payment_method: e.target.value as any })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            >
              <option value="Espèces">Espèces</option>
              <option value="Holo">Holo (Mobile Money)</option>
              <option value="Mvola">Mvola</option>
              <option value="Wakati">Wakati</option>
              <option value="Chèque">Chèque Bancaire</option>
              <option value="Carte">Carte Bancaire</option>
            </select>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Valider & Générer Facture
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: OPEN REGISTER */}
      <Modal isOpen={isOpenRegModalOpen} onClose={() => setIsOpenRegModalOpen(false)} title="Ouverture de Caisse">
        <form onSubmit={handleOpenRegister} className="space-y-4 text-slate-900 dark:text-slate-100">
          <div>
            <label className="block text-xs font-semibold mb-1">Nom de la Caisse</label>
            <input
              type="text"
              required
              value={regForm.name}
              onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Solde d'Ouverture (FC) *</label>
            <input
              type="number"
              required
              value={regForm.opening_balance}
              onChange={(e) => setRegForm({ ...regForm, opening_balance: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Valider Ouverture de Caisse
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: CLOSE REGISTER WITH PHYSICAL COUNT */}
      <Modal isOpen={isCloseRegModalOpen} onClose={() => setIsCloseRegModalOpen(false)} title="Clôture de Caisse & Comptage Physique">
        <form onSubmit={handleCloseRegisterSubmit} className="space-y-4 text-slate-900 dark:text-slate-100">
          <div>
            <label className="block text-xs font-semibold mb-1">Comptage Physique Espèces (FC) *</label>
            <input
              type="number"
              required
              value={closeForm.physical_cash_count}
              onChange={(e) => setCloseForm({ ...closeForm, physical_cash_count: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Explication en cas d'écart de caisse</label>
            <textarea
              rows={2}
              value={closeForm.explanation}
              onChange={(e) => setCloseForm({ ...closeForm, explanation: e.target.value })}
              placeholder="Rendu monnaie ou erreur de caisse..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Valider la Clôture Définitive
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
