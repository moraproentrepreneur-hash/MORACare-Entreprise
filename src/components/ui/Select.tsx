'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useAnchoredPanel } from '@/hooks/useAnchoredPanel';

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
  const [position, setPosition] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);

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

  /**
   * Calcule la position de la liste.
   *
   * La liste est rendue en position **fixe**, hors du flux. En `absolute`, elle
   * était découpée par le premier ancêtre qui masque son débordement — le corps
   * défilant d'une fenêtre modale, typiquement : le champ « Type
   * d'établissement » de la création d'un établissement voyait ainsi sa liste
   * coupée sur ordinateur, sans rapport avec la taille de l'écran.
   *
   * La hauteur disponible est mesurée des deux côtés du champ : la liste
   * s'ouvre vers le haut si le bas manque de place, et se borne à ce qui reste
   * afin de rester entièrement visible dans tous les cas.
   */
  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const upwards = below < Math.min(MAX_LIST_HEIGHT, 180) && above > below;

    setPosition({
      left: rect.left,
      width: rect.width,
      top: upwards ? undefined : rect.bottom + 4,
      bottom: upwards ? window.innerHeight - rect.top + 4 : undefined,
      maxHeight: Math.max(120, Math.min(MAX_LIST_HEIGHT, upwards ? above : below)),
    });
  }, []);

  const open = useCallback(() => {
    if (disabled) return;
    place();
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(0, 1));
    setIsOpen(true);
  }, [disabled, place, selectedIndex, firstEnabled]);

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

  /**
   * La liste ne se ferme que sur un geste volontaire.
   *
   * Elle est testée comme intérieure au même titre que le champ : rendue en
   * position fixe, elle n'est plus dans le conteneur. Sans cela, saisir sa
   * barre de défilement comptait comme un appui extérieur — c'est ce qui la
   * refermait dès qu'on cherchait à parcourir les options.
   */
  const dismiss = useCallback(() => close(false), [close]);

  useAnchoredPanel({
    isOpen,
    anchorRef: containerRef,
    insideRefs: [listRef],
    place,
    onDismiss: dismiss,
  });

  /**
   * L'option active reste visible pendant la navigation au clavier.
   *
   * Le défilement est appliqué à la liste seule. `scrollIntoView` remonte la
   * chaîne des ancêtres et déplaçait aussi la page derrière la liste.
   */
  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;

    const list = listRef.current;
    const option = list?.children[activeIndex] as HTMLElement | undefined;
    if (!list || !option) return;

    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop;
    } else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
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

      {isOpen && position && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-activedescendant={activeIndex >= 0 ? `${controlId}-opt-${activeIndex}` : undefined}
          tabIndex={-1}
          style={{
            left: position.left,
            width: position.width,
            top: position.top,
            bottom: position.bottom,
            maxHeight: position.maxHeight,
          }}
          // `overscroll-contain` : arrivé en bout de liste, le geste ne se
          // propage pas à la page derrière.
          className="fixed z-[60] overflow-y-auto overscroll-contain rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl"
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
                // La sélection est validée au relâchement, comme sur un
                // `<select>` natif : glisser depuis une option pour faire
                // défiler la liste ne sélectionne donc rien. `mousedown` se
                // contente d'empêcher le champ de perdre le focus, pour que la
                // navigation au clavier reprenne après le choix.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(index)}
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
