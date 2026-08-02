'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { useData } from '@/context/DataContext';

export const PatientsModule: React.FC = () => {
  const { patients, addPatient } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    gender: 'M' as const,
    birth_date: '',
    national_id: '',
    phone: '',
    email: '',
    blood_group: 'O+',
    allergies: '',
    chronic_conditions: ''
  });

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const splitList = (raw: string): string[] =>
      raw.split(',').map((s) => s.trim()).filter(Boolean);

    try {
      // Identifiant, référence métier et établissement proviennent de la base.
      await addPatient({
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        birth_date: form.birth_date,
        national_id: form.national_id || undefined,
        phone: form.phone,
        email: form.email || undefined,
        blood_group: form.blood_group,
        allergies: splitList(form.allergies),
        chronic_conditions: splitList(form.chronic_conditions)
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Échec de l'enregistrement.");
      return;
    }

    setIsAddModalOpen(false);
    setForm({
      first_name: '',
      last_name: '',
      gender: 'M',
      birth_date: '',
      national_id: '',
      phone: '',
      email: '',
      blood_group: 'O+',
      allergies: '',
      chronic_conditions: ''
    });
  };

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.business_reference} ${p.phone}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-mora-green" /> Gestion des Dossiers Patients
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dossier Médical Partagé (DMP), antécédents, constantes vitale et historique de soins.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Enregistrer un Patient
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, téléphone, ou référence MORA-PAT-..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-mora-blue"
        />
      </div>

      {/* Patient List Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {filteredPatients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-300">Aucun dossier patient enregistré</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Le registre patient est totalement vide. Cliquez sur "Enregistrer un Patient" pour créer le premier dossier médical.
            </p>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" /> Créer un premier dossier
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Réf. Patient</th>
                  <th className="p-4">Nom & Prénom</th>
                  <th className="p-4">Sexe</th>
                  <th className="p-4">Date de naissance</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Groupe Sanguin</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredPatients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-mono text-mora-green font-bold">{p.business_reference}</td>
                    <td className="p-4 font-bold text-white">{p.first_name} {p.last_name}</td>
                    <td className="p-4">{p.gender}</td>
                    <td className="p-4">{formatDate(p.birth_date)}</td>
                    <td className="p-4">{p.phone}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold font-mono">
                        {p.blood_group || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/patients/${p.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-semibold transition-colors"
                      >
                        Voir Dossier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PATIENT MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Création de Dossier Patient" description="Saisissez les informations de l'état-civil et médical du nouveau patient.">
        <form onSubmit={handleCreatePatient} className="space-y-4 text-slate-900 dark:text-slate-100">
          {submitError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              {submitError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Prénom</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Ahmed"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nom</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Ali"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Sexe</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Date de Naissance</label>
              <input
                type="date"
                required
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Groupe Sanguin</label>
              <select
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Téléphone</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+269 330 00 00"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">N° Carte d'Identité / Passeport</label>
              <input
                type="text"
                value={form.national_id}
                onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                placeholder="NIN-948271"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Allergies (séparées par des virgules)</label>
            <input
              type="text"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="Pénicilline, Aspirine, Latex"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" variant="secondary" className="w-full py-2.5 font-bold">
              Créer le Dossier Patient
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
