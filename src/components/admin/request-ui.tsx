'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
} from '@/services/saas-requests.service';
import type { RequestStatus } from '@/types/database';

/**
 * Éléments partagés par les écrans « Gestion des Demandes » et « Prises de
 * contact ».
 *
 * Les deux écrans manipulent le même vocabulaire de statuts ; le dupliquer
 * garantirait qu'ils divergent au premier changement.
 */

export const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => (
  <span
    className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${REQUEST_STATUS_TONES[status]}`}
  >
    {REQUEST_STATUS_LABELS[status]}
  </span>
);

const STATUS_OPTIONS = REQUEST_STATUSES.map((status) => ({
  value: status,
  label: REQUEST_STATUS_LABELS[status],
}));

/** Sélecteur de statut : c'est ici que le Super Admin fait avancer un dossier. */
export const StatusSelect: React.FC<{
  value: RequestStatus;
  onChange: (status: RequestStatus) => void;
  disabled?: boolean;
  'aria-label'?: string;
}> = ({ value, onChange, disabled, ...rest }) => (
  <Select<RequestStatus>
    value={value}
    onChange={onChange}
    disabled={disabled}
    aria-label={rest['aria-label'] ?? 'Statut'}
    options={STATUS_OPTIONS}
    className="min-w-[9rem]"
  />
);

/** Filtre de statut, avec l'option « Tous » que le sélecteur d'édition n'a pas. */
export const StatusFilter: React.FC<{
  value: RequestStatus | 'all';
  onChange: (value: RequestStatus | 'all') => void;
}> = ({ value, onChange }) => (
  <Select
    value={value}
    onChange={(next) => onChange(next as RequestStatus | 'all')}
    aria-label="Filtrer par statut"
    options={[{ value: 'all', label: 'Tous les statuts' }, ...STATUS_OPTIONS]}
    className="sm:w-52"
  />
);

export const SearchField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <div className="relative flex-1">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-800 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-mora-blue"
    />
  </div>
);

/** En-tête de colonne triable. Le tri se fait côté client : les volumes sont faibles. */
export const SortableHeader = <K extends string>({
  column,
  label,
  sort,
  onSort,
  className,
}: {
  column: K;
  label: string;
  sort: { column: K; direction: 'asc' | 'desc' };
  onSort: (column: K) => void;
  className?: string;
}): React.ReactElement => {
  const active = sort.column === column;
  return (
    <th scope="col" className={`p-4 ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-slate-200 ${
          active ? 'text-mora-green' : ''
        }`}
      >
        {label}
        <span aria-hidden className="text-[9px]">
          {active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  );
};

/** Bascule un tri : même colonne = inversion, colonne différente = ascendant. */
export const nextSort = <K extends string>(
  current: { column: K; direction: 'asc' | 'desc' },
  column: K,
): { column: K; direction: 'asc' | 'desc' } =>
  current.column === column
    ? { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { column, direction: 'asc' };

export const compareValues = (a: string | number, b: string | number, direction: 'asc' | 'desc'): number => {
  const result =
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'fr');
  return direction === 'asc' ? result : -result;
};
