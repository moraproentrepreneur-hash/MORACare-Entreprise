'use client';

import React, { useState } from 'react';
import { FlaskConical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LabOrder, Patient } from '@/types';
import { useData } from '@/context/DataContext';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { DoctorSelect } from '@/components/ui/DoctorSelect';

export const LabModule: React.FC = () => {
  const { patients, labOrders, addLabOrder } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    doctor_id: '',
    test_type: '',
    priority: 'routine' as LabOrder['priority']
  });

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatientId(p.id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedPatientId || !form.doctor_id) {
      setSubmitError('Sélectionnez un patient et un praticien enregistrés dans la base.');
      return;
    }

    try {
      // Une demande naît toujours au statut « pending » : les résultats sont
      // saisis par le laboratoire, jamais par le prescripteur à la création.
      await addLabOrder({
        patient_id: selectedPatientId,
        doctor_id: form.doctor_id,
        test_type: form.test_type,
        priority: form.priority
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddModalOpen(false);
    setSelectedPatientId('');
    setForm({ doctor_id: '', test_type: '', priority: 'routine' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-mora-green" /> Module Laboratoire & Bio-Analyses
          </h2>
          <p className="text-xs text-slate-400 mt-1">Prescription d'analyses, suivi des prélèvements et résultats biologiques.</p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Demander une Analyse
        </Button>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {labOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FlaskConical className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucune analyse de laboratoire</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Le cahier de paillasse est vide. Enregistrez la première demande d'analyse ci-dessous.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Créer une demande d'analyse
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Analyse</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Examen Demandé</th>
                  <th className="p-4">Priorité</th>
                  <th className="p-4">Résultats</th>
                  <th className="p-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {labOrders.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{l.business_reference}</td>
                    <td className="p-4 font-bold text-white">{l.patient_name}</td>
                    <td className="p-4">{l.test_type}</td>
                    <td className="p-4 uppercase text-[10px] font-semibold">{l.priority}</td>
                    <td className="p-4 text-slate-200">{l.results || 'En attente de paillasse'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${l.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nouvelle Demande d'Analyse">
        <form onSubmit={handleCreate} className="space-y-4 text-slate-900 dark:text-slate-100">
          {submitError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {submitError}
            </div>
          )}
          <div>
            <PatientSelect
              patients={patients}
              selectedPatientId={selectedPatientId}
              onSelectPatient={handleSelectPatient}
            />
          </div>
          <DoctorSelect
            value={form.doctor_id}
            onChange={(doctorId) => setForm({ ...form, doctor_id: doctorId })}
            label="Médecin prescripteur"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Type d'Analyse / Examen</label>
              <input
                type="text"
                required
                value={form.test_type}
                onChange={(e) => setForm({ ...form, test_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgente</option>
                <option value="emergency">Urgence Absolue</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            La demande est créée au statut « En attente ». Les résultats sont saisis par le
            laboratoire après réalisation de l&apos;analyse.
          </p>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Enregistrer la Demande
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
