'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Liste déroulante de MORACare.
 *
 * Remplace `<select>` partout dans l'application. Le contrôle natif délègue son
 * rendu au système : Android affiche une boîte de dialogue à boutons radio, iOS
 * un rouleau en bas d'écran. L'apparence changeait donc d'un appareil à l'autre,
 * sans rapport avec le reste de l'interface.
 *
 * Le composant reproduit le comportement attendu d'une liste déroulante plutôt
 * que sa seule apparence :
 *
 *   - navigation au clavier (flèches, Origine, Fin, Échap, Entrée) ;
 *   - saisie rapide : taper les premières lettres d'une option la sélectionne ;
 *   - rôles ARIA `combobox`/`listbox`, pour que les lecteurs d'écran
 *     l'annoncent comme une liste déroulante et non comme un bouton ;
 *   - ouverture vers le haut lorsque le bas de l'écran manque de place.
 *
 * L'API reste proche de celle d'un `<select>` contrôlé : `value`, `onChange`,
 * `options`. La migration d'un champ existant ne demande donc pas de repenser
 * le formulaire qui l'entoure.
 */

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Précision affichée sous le libellé, dans la liste ouverte uniquement. */
  hint?: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/** Hauteur maximale de la liste ouverte, en pixels. */
const MAX_LIST_HEIGHT = 288;

export function Select<T extends string = string>({
  value,
  onChange,
  options,
  id,
  name,
  placeholder = '— Sélectionner —',
  disabled = false,
  required = false,
  className = '',
  ...aria
}: SelectProps<T>): React.ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listId = `${controlId}-liste`;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openUpwards, setOpenUpwards] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Lettres tapées récemment, pour la recherche rapide. */
  const typedRef = useRef({ text: '', at: 0 });

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === value),
    [options, value],
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const firstEnabled = useCallback(
    (from: number, step: number): number => {
      for (let i = from; i >= 0 && i < options.length; i += step) {
        if (!options[i].disabled) return i;
      }
      return -1;
    },
    [options],
  );

  const open = useCallback(() => {
    if (disabled) return;

    // La liste s'ouvre vers le haut si le bas de l'écran ne peut pas la
    // contenir : sinon elle serait tronquée par le bord de la fenêtre.
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setOpenUpwards(below < Math.min(MAX_LIST_HEIGHT, 200) && rect.top > below);
    }

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(0, 1));
    setIsOpen(true);
  }, [disabled, selectedIndex, firstEnabled]);

  const close = useCallback((refocus = true) => {
    setIsOpen(false);
    setActiveIndex(-1);
    if (refocus) buttonRef.current?.focus();
  }, []);

  const commit = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      close();
    },
    [options, onChange, close],
  );

  // Fermeture au clic extérieur, au défilement d'un conteneur et au
  // redimensionnement : la liste est positionnée par rapport au bouton, elle
  // ne doit pas rester ouverte loin de lui.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close(false);
      }
    };
    const onResize = () => close(false);

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, close]);

  // L'option active reste visible pendant la navigation au clavier.
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  /** Sélection par saisie des premières lettres, comme un `<select>` natif. */
  const handleTyping = (key: string) => {
    const now = Date.now();
    // Au-delà d'une seconde, la frappe recommence une nouvelle recherche.
    const text = now - typedRef.current.at > 1000 ? key : typedRef.current.text + key;
    typedRef.current = { text, at: now };

    const needle = text.toLowerCase();
    const found = options.findIndex(
      (option) => !option.disabled && option.label.toLowerCase().startsWith(needle),
    );

    if (found >= 0) {
      if (isOpen) setActiveIndex(found);
      else commit(found);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) open();
        else setActiveIndex((i) => (firstEnabled(i + 1, 1) === -1 ? i : firstEnabled(i + 1, 1)));
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) open();
        else setActiveIndex((i) => (firstEnabled(i - 1, -1) === -1 ? i : firstEnabled(i - 1, -1)));
        break;

      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(firstEnabled(0, 1));
        }
        break;

      case 'End':
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(firstEnabled(options.length - 1, -1));
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) commit(activeIndex);
        else open();
        break;

      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          close();
        }
        break;

      case 'Tab':
        if (isOpen) close(false);
        break;

      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          handleTyping(event.key);
        }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/*
        Un champ caché porte la valeur : les formulaires natifs et la validation
        HTML `required` continuent de fonctionner comme avec un `<select>`.
      */}
      {name && <input type="hidden" name={name} value={value} required={required} />}

      <button
        ref={buttonRef}
        type="button"
        id={controlId}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={aria['aria-label']}
        aria-labelledby={aria['aria-labelledby']}
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-left text-sm outline-none transition-colors focus:ring-2 focus:ring-mora-green disabled:cursor-not-allowed disabled:opacity-60 ${
          selected ? 'text-slate-100' : 'text-slate-500'
        }`}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-activedescendant={activeIndex >= 0 ? `${controlId}-opt-${activeIndex}` : undefined}
          tabIndex={-1}
          className={`absolute z-50 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl ${
            openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.length === 0 && (
            <li className="px-3 py-2.5 text-xs text-slate-500">Aucune option disponible.</li>
          )}

          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;

            return (
              <li
                key={option.value}
                id={`${controlId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled}
                // `mousedown` plutôt que `click` : le bouton perdrait le focus
                // avant que le clic ne se termine, refermant la liste trop tôt.
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(index);
                }}
                onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                className={`flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm transition-colors ${
                  option.disabled
                    ? 'cursor-not-allowed text-slate-600'
                    : isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300'
                }`}
              >
                <Check
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    isSelected ? 'text-mora-green' : 'text-transparent'
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.hint && (
                    <span className="mt-0.5 block text-[11px] text-slate-500">{option.hint}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
