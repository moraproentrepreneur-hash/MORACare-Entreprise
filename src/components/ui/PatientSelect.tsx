'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Patient } from '@/types';
import { Search, Check, Plus } from 'lucide-react';
import { useAnchoredPanel } from '@/hooks/useAnchoredPanel';

/**
 * Sélection d'un patient depuis la base, avec recherche.
 *
 * CLAUDE.md § Interconnexion : « Les données existantes doivent toujours être
 * sélectionnées depuis la base. » Le patient n'est donc jamais saisi.
 *
 * Le panneau est rendu en position fixe, comme la liste déroulante et le menu
 * d'actions : en position absolue, il était découpé par le corps défilant de la
 * fenêtre modale qui l'accueille le plus souvent.
 */

interface PatientSelectProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patient: Patient) => void;
  onAddNewPatientClick?: () => void;
}

/** Hauteur maximale du panneau ouvert, recherche comprise. */
const MAX_PANEL_HEIGHT = 320;

export const PatientSelect: React.FC<PatientSelectProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onAddNewPatientClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const filteredPatients = patients.filter((p) =>
    `${p.first_name} ${p.last_name} ${p.business_reference} ${p.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const place = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const upwards = below < Math.min(MAX_PANEL_HEIGHT, 220) && above > below;

    setPosition({
      left: rect.left,
      width: rect.width,
      top: upwards ? undefined : rect.bottom + 4,
      bottom: upwards ? window.innerHeight - rect.top + 4 : undefined,
      maxHeight: Math.max(160, Math.min(MAX_PANEL_HEIGHT, upwards ? above : below)),
    });
  }, []);

  const dismiss = useCallback(() => setIsOpen(false), []);

  useAnchoredPanel({
    isOpen,
    anchorRef,
    insideRefs: [panelRef],
    place,
    onDismiss: dismiss,
  });

  const toggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    place();
    setIsOpen(true);
  };

  return (
    <div>
      <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
        Sélectionner le Patient dans la base *
      </label>

      <div
        ref={anchorRef}
        role="button"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          } else if (event.key === 'Escape' && isOpen) {
            setIsOpen(false);
          }
        }}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-between gap-2 cursor-pointer outline-none focus:ring-2 focus:ring-mora-blue"
      >
        {selectedPatient ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-xs font-bold text-mora-green shrink-0">
              {selectedPatient.business_reference}
            </span>
            <span className="truncate font-semibold">
              {selectedPatient.first_name} {selectedPatient.last_name}
            </span>
            <span className="text-xs text-slate-400 shrink-0">({selectedPatient.phone})</span>
          </span>
        ) : (
          <span className="text-slate-400 text-xs">
            — Choisir un patient existant dans la base —
          </span>
        )}
        <Search className="w-4 h-4 shrink-0 text-slate-400" />
      </div>

      {isOpen && position && (
        <div
          ref={panelRef}
          style={{
            left: position.left,
            width: position.width,
            top: position.top,
            bottom: position.bottom,
            maxHeight: position.maxHeight,
          }}
          className="fixed z-[60] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl p-2"
        >
          <div className="relative mb-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, référence ou téléphone…"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
              autoFocus
            />
          </div>

          {/* `overscroll-contain` : arrivé en bout de liste, le geste ne se
              propage pas à la page derrière. */}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
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
                    <Plus className="w-3.5 h-3.5" /> Créer d&apos;abord un nouveau patient
                  </button>
                )}
              </div>
            ) : (
              filteredPatients.map((p) => {
                const isSelected = p.id === selectedPatientId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectPatient(p);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2 rounded-lg text-xs flex items-center justify-between gap-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-mora-blue/20 text-white font-bold border border-mora-blue/40'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-[11px] text-mora-green font-bold shrink-0">
                        {p.business_reference}
                      </span>
                      <span className="truncate">
                        {p.first_name} {p.last_name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">({p.phone})</span>
                    </span>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-mora-green" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
