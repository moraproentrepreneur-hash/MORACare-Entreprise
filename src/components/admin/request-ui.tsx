'use client';

import React from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
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

/**
 * Statut d'un dossier : un badge, et le changement derrière un menu.
 *
 * Une liste déroulante occupait toute la cellule et imposait sa largeur à la
 * colonne ; ouverte, elle débordait du conteneur défilant du tableau. Le badge
 * dit l'état d'un coup d'œil, et le menu — rendu en position fixe, donc jamais
 * découpé — sert à le faire avancer.
 *
 * Le statut courant reste coché dans le menu : sans repère, on ne saurait plus
 * d'où l'on part une fois le menu ouvert.
 */
export const StatusSelect: React.FC<{
  value: RequestStatus;
  onChange: (status: RequestStatus) => void;
  disabled?: boolean;
  'aria-label'?: string;
}> = ({ value, onChange, disabled, ...rest }) => (
  <StatusMenu
    value={value}
    onChange={onChange}
    disabled={disabled}
    label={rest['aria-label'] ?? 'Changer le statut'}
  />
);

const StatusMenu: React.FC<{
  value: RequestStatus;
  onChange: (status: RequestStatus) => void;
  disabled?: boolean;
  label: string;
}> = ({ value, onChange, disabled, label }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const close = React.useCallback((refocus = true) => {
    setIsOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  const open = () => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const height = REQUEST_STATUSES.length * 38 + 16;
      const below = window.innerHeight - rect.bottom;
      setPosition({
        top: below < height && rect.top > below ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
        left: Math.min(Math.max(8, rect.left), window.innerWidth - STATUS_MENU_WIDTH - 8),
      });
    }
    setIsOpen(true);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        close(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onMove = () => close(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [isOpen, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${label} — actuellement ${REQUEST_STATUS_LABELS[value]}`}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase transition-opacity hover:opacity-80 disabled:opacity-50 ${REQUEST_STATUS_TONES[value]}`}
      >
        {REQUEST_STATUS_LABELS[value]}
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>

      {isOpen && position && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ top: position.top, left: position.left, width: STATUS_MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl"
        >
          {REQUEST_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              role="menuitemradio"
              aria-checked={status === value}
              onClick={() => {
                close(false);
                if (status !== value) onChange(status);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800"
            >
              <Check
                className={`h-3.5 w-3.5 shrink-0 ${
                  status === value ? 'text-mora-green' : 'text-transparent'
                }`}
              />
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${REQUEST_STATUS_TONES[status].split(' ')[0]}`}
              />
              <span className="truncate">{REQUEST_STATUS_LABELS[status]}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
};

const STATUS_MENU_WIDTH = 200;

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
