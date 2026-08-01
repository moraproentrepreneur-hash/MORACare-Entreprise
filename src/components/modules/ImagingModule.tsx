'use client';

import React, { useState } from 'react';
import { Binary, Plus, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ImagingOrder, Patient } from '@/types';
import { formatDate } from '@/lib/utils';
import { useData } from '@/context/DataContext';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { DoctorSelect } from '@/components/ui/DoctorSelect';

export const ImagingModule: React.FC = () => {
  const { patients, imagingOrders, addImagingOrder } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    doctor_id: '',
    modality: 'X-Ray' as ImagingOrder['modality'],
    body_part: '',
    clinical_notes: '',
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
      // Le compte rendu est rédigé par le radiologue après réalisation :
      // la demande naît donc systématiquement au statut « pending ».
      await addImagingOrder({
        patient_id: selectedPatientId,
        doctor_id: form.doctor_id,
        modality: form.modality,
        body_part: form.body_part,
        clinical_notes: form.clinical_notes || undefined,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddModalOpen(false);
    setSelectedPatientId('');
    setForm({ doctor_id: '', modality: 'X-Ray', body_part: '', clinical_notes: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Binary className="w-5 h-5 text-mora-green" /> Module Imagerie Médicale & DICOM
          </h2>
          <p className="text-xs text-slate-400 mt-1">Examens radiologiques, comptes-rendus et visionneuse d'images.</p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Demander un Examen Imagerie
        </Button>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {imagingOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Binary className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucun examen d'imagerie enregistré</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Le registre d'imagerie est vide. Cliquez ci-dessous pour planifier une demande de radiologie ou échographie.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Créer une demande d'examen
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Examen</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Modalité</th>
                  <th className="p-4">Région Anatomique</th>
                  <th className="p-4">Compte-rendu</th>
                  <th className="p-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {imagingOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{o.business_reference}</td>
                    <td className="p-4 font-bold text-white">{o.patient_name}</td>
                    <td className="p-4 font-bold text-blue-400">{o.modality}</td>
                    <td className="p-4">{o.body_part}</td>
                    <td className="p-4 text-slate-200">{o.report_text || 'En attente de lecture radiologique'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${o.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nouvel Examen d'Imagerie">
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
              <label className="block text-xs font-semibold mb-1">Modalité</label>
              <select
                value={form.modality}
                onChange={(e) => setForm({ ...form, modality: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              >
                <option value="X-Ray">Radiographie (X-Ray)</option>
                <option value="Ultrasound">Échographie</option>
                <option value="CT">Scanner (CT-Scan)</option>
                <option value="MRI">IRM (MRI)</option>
                <option value="ECG">Électrocardiogramme (ECG)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Région Anatomique</label>
              <input
                type="text"
                required
                value={form.body_part}
                onChange={(e) => setForm({ ...form, body_part: e.target.value })}
                placeholder="Thorax, Abdomen, Membre inférieur"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Renseignements cliniques</label>
            <textarea
              rows={2}
              value={form.clinical_notes}
              onChange={(e) => setForm({ ...form, clinical_notes: e.target.value })}
              placeholder="Contexte clinique motivant l'examen..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Le compte rendu radiologique est rédigé par le radiologue après réalisation de
            l&apos;examen.
          </p>
          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Enregistrer l'Examen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
