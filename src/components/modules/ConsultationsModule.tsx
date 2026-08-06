'use client';

import React, { useState } from 'react';
import { Stethoscope, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Consultation, Patient } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { useDocument } from '@/hooks/useDocument';
import { useData } from '@/context/DataContext';
import { PatientSelect } from '@/components/ui/PatientSelect';
import { DoctorSelect } from '@/components/ui/DoctorSelect';

export const ConsultationsModule: React.FC = () => {
  const { patients, consultations, addConsultation } = useData();
  const { print, error: documentError } = useDocument();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    doctor_id: '',
    chief_complaint: '',
    symptoms: '',
    weight_kg: 70,
    temperature_celsius: 37,
    bp_systolic: 120,
    bp_diastolic: 80,
    diagnosis_summary: '',
    treatment_plan: ''
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
      await addConsultation({
        patient_id: selectedPatientId,
        doctor_id: form.doctor_id,
        chief_complaint: form.chief_complaint,
        symptoms: form.symptoms,
        weight_kg: form.weight_kg,
        temperature_celsius: form.temperature_celsius,
        blood_pressure_systolic: form.bp_systolic,
        blood_pressure_diastolic: form.bp_diastolic,
        diagnosis_summary: form.diagnosis_summary,
        treatment_plan: form.treatment_plan
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddModalOpen(false);
    setSelectedPatientId('');
    setForm({
      doctor_id: '',
      chief_complaint: '',
      symptoms: '',
      weight_kg: 70,
      temperature_celsius: 37,
      bp_systolic: 120,
      bp_diastolic: 80,
      diagnosis_summary: '',
      treatment_plan: ''
    });
  };

  /**
   * Compte rendu de consultation.
   *
   * L'identité de l'émetteur, les couleurs, la signature et le modèle viennent
   * des Paramètres de l'établissement : rien n'est écrit en dur ici.
   */
  const handleDownloadPDF = (con: Consultation) => {
    void print({
      kind: 'consultation',
      reference: con.business_reference,
      title: 'Compte rendu de consultation',
      subtitle: formatDateTime(con.consultation_date),
      highlight: [
        { label: 'Patient', value: con.patient_name },
        { label: 'Praticien', value: con.doctor_name },
        { label: 'Référence', value: con.business_reference },
        { label: 'Date', value: formatDateTime(con.consultation_date) },
      ],
      sections: [
        {
          title: 'Motif et observations',
          fields: [
            { label: 'Motif', value: con.chief_complaint || '—' },
            { label: 'Symptômes', value: con.symptoms || 'Non renseignés' },
          ],
        },
        {
          title: 'Constantes vitales',
          table: {
            columns: ['Paramètre', 'Valeur'],
            rows: [
              ['Poids', `${con.weight_kg} kg`],
              ['Température', `${con.temperature_celsius} °C`],
              [
                'Tension artérielle',
                `${con.blood_pressure_systolic}/${con.blood_pressure_diastolic} mmHg`,
              ],
            ],
            numericColumns: [1],
          },
        },
        {
          title: 'Diagnostic et conduite à tenir',
          fields: [{ label: 'Diagnostic', value: con.diagnosis_summary || '—' }],
          paragraphs: con.treatment_plan ? [con.treatment_plan] : [],
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-mora-green" /> Module Consultations & Examens
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fiche de consultation clinique, saisie des constantes vitale, diagnostic et ordonnance PDF.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nouvelle Consultation
        </Button>
      </div>

      {documentError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {documentError}
        </div>
      )}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {consultations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Stethoscope className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucune consultation enregistrée</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Le registre des consultations est vide. Démarrez la première consultation en cliquant sur le bouton ci-dessous.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Enregistrer une consultation
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Consultation</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Médecin</th>
                  <th className="p-4">Motif</th>
                  <th className="p-4">Diagnostic</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {consultations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{c.business_reference}</td>
                    <td className="p-4 font-bold text-white">{c.patient_name}</td>
                    <td className="p-4">{c.doctor_name}</td>
                    <td className="p-4">{c.chief_complaint}</td>
                    <td className="p-4 font-medium text-slate-200">{c.diagnosis_summary}</td>
                    <td className="p-4">{formatDateTime(c.consultation_date)}</td>
                    <td className="p-4">
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(c)} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Fiche de Consultation Médicale" maxWidth="xl">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold mb-1">Motif principal</label>
              <input
                type="text"
                required
                value={form.chief_complaint}
                onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
                placeholder="Céphalées intenses, fièvre"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Symptômes observés</label>
              <input
                type="text"
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                placeholder="Frissons, fatigue générale"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-semibold mb-1">Poids (kg)</label>
              <input
                type="number"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: parseFloat(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">Temp. (°C)</label>
              <input
                type="number"
                step="0.1"
                value={form.temperature_celsius}
                onChange={(e) => setForm({ ...form, temperature_celsius: parseFloat(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">TA Syst (mmHg)</label>
              <input
                type="number"
                value={form.bp_systolic}
                onChange={(e) => setForm({ ...form, bp_systolic: parseInt(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1">TA Diast (mmHg)</label>
              <input
                type="number"
                value={form.bp_diastolic}
                onChange={(e) => setForm({ ...form, bp_diastolic: parseInt(e.target.value) })}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Résumé Diagnostic (CIM-10)</label>
            <input
              type="text"
              required
              value={form.diagnosis_summary}
              onChange={(e) => setForm({ ...form, diagnosis_summary: e.target.value })}
              placeholder="Paludisme simple à Plasmodium falciparum"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Plan de Traitement & Prescriptions</label>
            <textarea
              required
              rows={3}
              value={form.treatment_plan}
              onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })}
              placeholder="Artemether-Lumefantrine 80/480mg 1 tab x 2 par jour pendant 3 jours + Paracétamol 1g"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Finaliser la Consultation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
