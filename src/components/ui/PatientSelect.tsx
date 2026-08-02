'use client';

import React, { useState } from 'react';
import { Patient } from '@/types';
import { Search, Check, Plus } from 'lucide-react';

interface PatientSelectProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patient: Patient) => void;
  onAddNewPatientClick?: () => void;
}

export const PatientSelect: React.FC<PatientSelectProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onAddNewPatientClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const filteredPatients = patients.filter(
    (p) =>
      `${p.first_name} ${p.last_name} ${p.business_reference} ${p.phone}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
        Sélectionner le Patient dans la base *
      </label>

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-mora-blue"
      >
        {selectedPatient ? (
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-mora-green">{selectedPatient.business_reference}</span>
            <span className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</span>
            <span className="text-xs text-slate-400">({selectedPatient.phone})</span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">-- Choisir un patient existant dans la base --</span>
        )}
        <Search className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl p-2 animate-in fade-in zoom-in-95">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, réf MORA-PAT-..., téléphone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredPatients.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 space-y-2">
                <p>Aucun patient ne correspond à la recherche.</p>
                {onAddNewPatientClick && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNewPatientClick();
                    }}
                    className="inline-flex items-center gap-1 text-xs text-mora-green font-semibold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Créer un nouveau patient d'abord
                  </button>
                )}
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatientId;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectPatient(p);
                      setIsOpen(false);
                    }}
                    className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-mora-blue/20 text-white font-bold border border-mora-blue/40'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] text-mora-green font-bold">{p.business_reference}</span>
                      <span>{p.first_name} {p.last_name}</span>
                      <span className="text-[10px] text-slate-400">({p.phone})</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-mora-green" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
