'use client';

import React from 'react';
import { Stethoscope } from 'lucide-react';
import { useData } from '@/context/DataContext';

interface DoctorSelectProps {
  value: string;
  onChange: (doctorId: string) => void;
  label?: string;
  required?: boolean;
}

/**
 * Sélection d'un praticien depuis la base.
 *
 * CLAUDE.md § Interconnexion : « Les données existantes doivent toujours être
 * sélectionnées depuis la base. Aucune saisie libre lorsqu'une relation existe
 * déjà. » Le nom du praticien n'est donc jamais saisi ni stocké en doublon :
 * seul `doctor_id` est enregistré.
 */
export const DoctorSelect: React.FC<DoctorSelectProps> = ({
  value,
  onChange,
  label = 'Médecin référent',
  required = true,
}) => {
  const { doctors } = useData();

  return (
    <div>
      <label htmlFor="doctor-select" className="block text-xs font-semibold mb-1">
        {label}
      </label>

      {doctors.length === 0 ? (
        <div className="flex items-start gap-2 px-3 py-2 text-xs rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300">
          <Stethoscope className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Aucun praticien enregistré dans cet établissement. Créez d&apos;abord un compte avec le
            rôle « Médecin » dans Gestion Utilisateurs.
          </span>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Stethoscope className="w-4 h-4" />
          </div>
          <select
            id="doctor-select"
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-mora-blue outline-none"
          >
            <option value="">— Sélectionner un praticien —</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.full_name}
                {doctor.specialty ? ` — ${doctor.specialty}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
