'use client';

import React, { useState } from 'react';
import { Calendar, Plus, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Patient } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { DoctorSelect } from '@/components/ui/DoctorSelect';

export const AppointmentsModule: React.FC = () => {
  const { patients, appointments, addAppointment } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedPatientId, setSelectedPatientId] = useState('');

  const [form, setForm] = useState({
    doctor_id: '',
    appointment_date: '',
    reason: '',
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
      // L'identifiant, la référence métier et l'établissement sont déterminés
      // par la base de données, jamais par le client.
      await addAppointment({
        patient_id: selectedPatientId,
        doctor_id: form.doctor_id,
        appointment_date: form.appointment_date,
        reason: form.reason,
      });

      setIsAddModalOpen(false);
      setSelectedPatientId('');
      setForm({ doctor_id: '', appointment_date: '', reason: '' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-mora-green" /> Agenda & Prise de Rendez-vous
          </h2>
          <p className="text-xs text-slate-400 mt-1">Planning des praticiens, convocations et suivi des créneaux.</p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Programmer un RDV
        </Button>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {appointments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucun rendez-vous planifié</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              L'agenda est actuellement libre. Cliquez sur "Programmer un RDV" pour planifier la première consultation.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Prendre un rendez-vous
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. RDV</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Médecin référent</th>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4">Motif</th>
                  <th className="p-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{a.business_reference}</td>
                    <td className="p-4 font-bold text-white">{a.patient_name}</td>
                    <td className="p-4">{a.doctor_name}</td>
                    <td className="p-4 font-medium text-slate-200">{formatDateTime(a.appointment_date)}</td>
                    <td className="p-4">{a.reason}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] uppercase">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Prise de Rendez-vous" description="Sélectionnez un patient dans la base et fixez la date.">
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
          <div>
            <label className="block text-xs font-semibold mb-1">Date et Heure du RDV</label>
            <input
              type="datetime-local"
              required
              value={form.appointment_date}
              onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Motif de consultation</label>
            <textarea
              required
              rows={2}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Contrôle général, suivi traitement..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Confirmer le Rendez-vous
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
