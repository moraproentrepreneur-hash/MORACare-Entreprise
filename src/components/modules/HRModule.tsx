'use client';

import React, { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { UserCheck, Plus, Clock, Calendar, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ShiftSchedule } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useData } from '@/context/DataContext';

export const HRModule: React.FC = () => {
  const { 
    employees, 
    addEmployee, 
    shiftSchedules, 
    addShiftSchedule, 
    payrollSlips, 
    addPayrollSlip 
  } = useData();

  const [activeTab, setActiveTab] = useState<'employees' | 'shifts' | 'payroll'>('employees');

  // Modals state
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [isAddShiftModalOpen, setIsAddShiftModalOpen] = useState(false);
  const [isAddPayrollModalOpen, setIsAddPayrollModalOpen] = useState(false);

  // Forms
  const [empForm, setEmpForm] = useState({
    full_name: '',
    department: 'Médecine Générale',
    position: 'Médecin Généraliste',
    base_salary: 250000,
    contract_type: 'CDI' as const,
    phone: '',
    email: '',
    diploma: 'Doctorat en Médecine'
  });

  const now = new Date();

  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    date: now.toISOString().split('T')[0],
    shift_type: 'Garde Nuit' as ShiftSchedule['shift_type'],
    start_time: '20:00',
    end_time: '08:00'
  });

  const [payrollForm, setPayrollForm] = useState({
    employee_id: '',
    period_month: now.getMonth() + 1,
    period_year: now.getFullYear(),
    base_salary: 0,
    guard_bonuses: 0,
    deductions: 0
  });

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCreateEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    try {
      await addEmployee({
        full_name: empForm.full_name,
        department: empForm.department,
        position: empForm.position,
        hire_date: new Date().toISOString().split('T')[0],
        base_salary: empForm.base_salary,
        contract_type: empForm.contract_type,
        phone: empForm.phone,
        email: empForm.email,
        diploma: empForm.diploma
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddEmpModalOpen(false);
    setEmpForm({
      full_name: '',
      department: 'Médecine Générale',
      position: 'Médecin Généraliste',
      base_salary: 250000,
      contract_type: 'CDI',
      phone: '',
      email: '',
      diploma: 'Doctorat en Médecine'
    });
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!shiftForm.employee_id) {
      setSubmitError('Sélectionnez un employé enregistré.');
      return;
    }

    try {
      await addShiftSchedule({
        employee_id: shiftForm.employee_id,
        shift_date: shiftForm.date,
        shift_type: shiftForm.shift_type,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddShiftModalOpen(false);
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!payrollForm.employee_id) {
      setSubmitError('Sélectionnez un employé enregistré.');
      return;
    }

    try {
      // Le net est une colonne générée par PostgreSQL : il n'est pas transmis.
      await addPayrollSlip({
        employee_id: payrollForm.employee_id,
        period_month: payrollForm.period_month,
        period_year: payrollForm.period_year,
        base_salary: payrollForm.base_salary,
        guard_bonuses: payrollForm.guard_bonuses,
        deductions: payrollForm.deductions
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddPayrollModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-mora-green" /> ERP Ressources Humaines & Gardes
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dossiers du personnel, diplômes, plannings des gardes/astreintes et génération des bulletins de paie.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="outline" onClick={() => setIsAddShiftModalOpen(true)} className="gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5" /> Planifier une Garde
          </Button>
          <Button variant="secondary" onClick={() => setIsAddEmpModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Nouveau Dossier RH
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 overflow-x-auto border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex shrink-0 whitespace-nowrap items-center gap-2 transition-all ${
            activeTab === 'employees' ? 'bg-mora-blue text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Dossiers du Personnel
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex shrink-0 whitespace-nowrap items-center gap-2 transition-all ${
            activeTab === 'shifts' ? 'bg-mora-blue text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" /> Gardes & Plannings
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex shrink-0 whitespace-nowrap items-center gap-2 transition-all ${
            activeTab === 'payroll' ? 'bg-mora-blue text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" /> Paie & Bulletins
        </button>
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          {employees.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <UserCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-300">Aucun dossier employé enregistré</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Le registre RH est vide. Enregistrez les fiches de vos soignants et collaborateurs.
              </p>
              <Button variant="secondary" onClick={() => setIsAddEmpModalOpen(true)} className="gap-2 mt-2">
                <Plus className="w-4 h-4" /> Enregistrer un Employé
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Réf. Employé</th>
                    <th className="p-4">Nom Complet</th>
                    <th className="p-4">Département</th>
                    <th className="p-4">Fonction</th>
                    <th className="p-4">Contrat</th>
                    <th className="p-4">Qualifications</th>
                    <th className="p-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employees.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-mono text-mora-green font-bold">{e.business_reference}</td>
                      <td className="p-4 font-bold text-white">{e.full_name}</td>
                      <td className="p-4">{e.department}</td>
                      <td className="p-4 font-semibold text-blue-400">{e.position}</td>
                      <td className="p-4 font-mono">{e.contract_type}</td>
                      <td className="p-4 text-slate-300">{e.diploma || 'N/A'}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase">
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHIFTS */}
      {activeTab === 'shifts' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <span className="font-bold text-white text-sm">Planning des Gardes Médicales & Astreintes</span>
            <Button size="sm" variant="secondary" onClick={() => setIsAddShiftModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter Garde
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Employé</th>
                  <th className="p-4">Service</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Type de Garde</th>
                  <th className="p-4">Horaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {shiftSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Aucun créneau de garde planifié.</td>
                  </tr>
                ) : (
                  shiftSchedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/50">
                      <td className="p-4 font-bold text-white">{s.employee_name}</td>
                      <td className="p-4">{s.department}</td>
                      <td className="p-4">{formatDate(s.date)}</td>
                      <td className="p-4 uppercase text-mora-green font-bold">{s.shift_type}</td>
                      <td className="p-4 font-mono">{s.start_time} - {s.end_time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <span className="font-bold text-white text-sm">Gestion des Bulletins de Paie</span>
            <Button size="sm" variant="secondary" onClick={() => setIsAddPayrollModalOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Éditer Bulletin
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Paie</th>
                  <th className="p-4">Employé</th>
                  <th className="p-4">Période</th>
                  <th className="p-4">Salaire Base</th>
                  <th className="p-4">Primes Gardes</th>
                  <th className="p-4">Salaire Net</th>
                  <th className="p-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payrollSlips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Aucun bulletin de paie généré.</td>
                  </tr>
                ) : (
                  payrollSlips.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50">
                      <td className="p-4 font-mono text-mora-green font-bold">{p.business_reference}</td>
                      <td className="p-4 font-bold text-white">{p.employee_name}</td>
                      <td className="p-4 font-semibold">{p.month_year}</td>
                      <td className="p-4 font-mono">{formatCurrency(p.base_salary)}</td>
                      <td className="p-4 font-mono text-emerald-400">+{formatCurrency(p.guard_bonuses)}</td>
                      <td className="p-4 font-mono font-bold text-white text-sm">{formatCurrency(p.net_salary)}</td>
                      <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">PAYÉ</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD EMPLOYEE */}
      <Modal isOpen={isAddEmpModalOpen} onClose={() => setIsAddEmpModalOpen(false)} title="Création Fiche Employé RH">
        <form onSubmit={handleCreateEmp} className="space-y-4 text-slate-900 dark:text-slate-100">
          {submitError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Nom complet *</label>
            <input
              type="text"
              required
              value={empForm.full_name}
              onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
              placeholder="Dr. Salima Bacar"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Département *</label>
              <input
                type="text"
                required
                value={empForm.department}
                onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Fonction *</label>
              <input
                type="text"
                required
                value={empForm.position}
                onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Salaire de Base (FC) *</label>
              <input
                type="number"
                required
                value={empForm.base_salary}
                onChange={(e) => setEmpForm({ ...empForm, base_salary: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Type de Contrat *</label>
              <Select
                value={empForm.contract_type}
                onChange={(value) => setEmpForm({ ...empForm, contract_type: value as any })}
                options={[
                  { value: 'CDI', label: 'CDI' },
                  { value: 'CDD', label: 'CDD' },
                  { value: 'Vacation', label: 'Vacation' },
                  { value: 'Stage', label: 'Stage' },
                  { value: 'Consultant', label: 'Consultant' },
                ]}
              />
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Créer la Fiche RH
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADD SHIFT */}
      <Modal isOpen={isAddShiftModalOpen} onClose={() => setIsAddShiftModalOpen(false)} title="Planifier un créneau de garde">
        <form onSubmit={handleCreateShift} className="space-y-4 text-slate-900 dark:text-slate-100">
          {submitError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Employé</label>
            <Select
              required
              value={shiftForm.employee_id}
              onChange={(value) => setShiftForm({ ...shiftForm, employee_id: value })}
              placeholder="— Sélectionner un employé —"
              options={employees.map((emp) => ({
                value: emp.id,
                label: emp.full_name,
                hint: emp.department,
              }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Date</label>
              <input
                type="date"
                required
                value={shiftForm.date}
                onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Type de Garde</label>
              <Select
                value={shiftForm.shift_type}
                onChange={(value) => setShiftForm({ ...shiftForm, shift_type: value as any })}
                options={[
                  { value: 'Garde Nuit', label: 'Garde Nuit' },
                  { value: 'Garde Jour', label: 'Garde Jour' },
                  { value: 'Astreinte', label: 'Astreinte' },
                ]}
              />
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Valider la Garde
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADD PAYROLL */}
      <Modal isOpen={isAddPayrollModalOpen} onClose={() => setIsAddPayrollModalOpen(false)} title="Édition de Bulletin de Paie">
        <form onSubmit={handleCreatePayroll} className="space-y-4 text-slate-900 dark:text-slate-100">
          {submitError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1">Employé</label>
            <Select
              required
              value={payrollForm.employee_id}
              onChange={(value) => setPayrollForm({ ...payrollForm, employee_id: value })}
              placeholder="— Sélectionner un employé —"
              options={employees.map((emp) => ({
                value: emp.id,
                label: emp.full_name,
                hint: emp.position,
              }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Mois</label>
              <input
                type="number"
                min={1}
                max={12}
                required
                value={payrollForm.period_month}
                onChange={(e) =>
                  setPayrollForm({ ...payrollForm, period_month: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Année</label>
              <input
                type="number"
                min={2000}
                max={2200}
                required
                value={payrollForm.period_year}
                onChange={(e) =>
                  setPayrollForm({ ...payrollForm, period_year: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Salaire Base (FC)</label>
              <input
                type="number"
                required
                value={payrollForm.base_salary}
                onChange={(e) => setPayrollForm({ ...payrollForm, base_salary: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Primes de Garde (FC)</label>
              <input
                type="number"
                required
                value={payrollForm.guard_bonuses}
                onChange={(e) => setPayrollForm({ ...payrollForm, guard_bonuses: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Générer Bulletin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
