'use client';

import React, { useState } from 'react';
import { BedDouble, Plus, CheckCircle2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Patient } from '@/types';
import { formatDate } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { DoctorSelect } from '@/components/ui/DoctorSelect';

export const HospitalizationsModule: React.FC = () => {
  const { patients, hospitalizations, addHospitalization } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    doctor_id: '',
    room_number: '',
    bed_number: '',
    admission_reason: '',
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
      await addHospitalization({
        patient_id: selectedPatientId,
        doctor_id: form.doctor_id,
        room_number: form.room_number,
        bed_number: form.bed_number,
        admission_reason: form.admission_reason,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddModalOpen(false);
    setSelectedPatientId('');
    setForm({ doctor_id: '', room_number: '', bed_number: '', admission_reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-mora-green" /> Module Hospitalisation & Lits
          </h2>
          <p className="text-xs text-slate-400 mt-1">Gestion du parc de lits, des admissions et du séjour des patients.</p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Admettre un Patient
        </Button>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {hospitalizations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BedDouble className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucun patient hospitalisé</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Toutes les chambres sont disponibles. Cliquez ci-dessous pour procéder à une admission.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Admettre en hospitalisation
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Hospitalisation</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Chambre / Lit</th>
                  <th className="p-4">Date d'admission</th>
                  <th className="p-4">Motif d'admission</th>
                  <th className="p-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {hospitalizations.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{h.business_reference}</td>
                    <td className="p-4 font-bold text-white">{h.patient_name}</td>
                    <td className="p-4 font-semibold text-mora-gold">{h.room_number} - {h.bed_number}</td>
                    <td className="p-4">{formatDate(h.admission_date)}</td>
                    <td className="p-4">{h.admission_reason}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase">
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Admission en Hospitalisation">
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
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Numéro de Chambre</label>
              <input
                type="text"
                required
                value={form.room_number}
                onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Numéro de Lit</label>
              <input
                type="text"
                required
                value={form.bed_number}
                onChange={(e) => setForm({ ...form, bed_number: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Motif d'admission</label>
            <textarea
              required
              rows={2}
              value={form.admission_reason}
              onChange={(e) => setForm({ ...form, admission_reason: e.target.value })}
              placeholder="Surveillance post-opératoire..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Valider l'Admission
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
