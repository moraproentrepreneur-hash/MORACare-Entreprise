'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useAnchoredPanel } from '@/hooks/useAnchoredPanel';

/**
 * Menu d'actions d'une ligne de tableau.
 *
 * Les actions étaient auparavant alignées en boutons dans la cellule. À quatre
 * ou cinq actions, la colonne devenait la plus large du tableau et poussait les
 * données utiles hors de l'écran. Un déclencheur unique rend la largeur de la
 * colonne indépendante du nombre d'actions.
 *
 * Le menu est rendu en position fixe et non dans le flux : une cellule de
 * tableau découpe son contenu au débordement, et le menu de la dernière ligne
 * serait sinon tronqué par le conteneur défilant.
 */

export interface ActionItem {
  label: string;
  onSelect: () => void;
  icon?: React.ElementType;
  /** Action destructrice : signalée en rouge et séparée des autres. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: readonly ActionItem[];
  disabled?: boolean;
  /** Décrit la ligne concernée, pour les lecteurs d'écran. */
  label?: string;
}

/** Largeur du panneau. Fixe, pour pouvoir le repositionner sans le mesurer. */
const MENU_WIDTH = 224;

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  disabled = false,
  label = 'Actions',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const available = items.filter((item) => !item.disabled);

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const estimatedHeight = Math.min(available.length * 40 + 16, 320);
    const spaceBelow = window.innerHeight - rect.bottom;

    // Le menu s'ouvre vers le haut quand le bas de l'écran ne suffit pas, et
    // reste dans la fenêtre horizontalement quelle que soit la position de la
    // colonne — y compris la dernière, collée au bord droit.
    const top = spaceBelow < estimatedHeight && rect.top > spaceBelow
      ? Math.max(8, rect.top - estimatedHeight - 4)
      : rect.bottom + 4;

    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8,
    );

    setPosition({ top, left });
  }, [available.length]);

  const open = () => {
    if (disabled) return;
    place();
    setIsOpen(true);
  };

  const close = useCallback((refocus = true) => {
    setIsOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  // Appui extérieur, défilement de la page, redimensionnement : le menu suit
  // sa ligne et ne se ferme que sur un geste volontaire.
  const dismiss = useCallback(() => close(false), [close]);

  useAnchoredPanel({
    isOpen,
    anchorRef: buttonRef,
    insideRefs: [menuRef],
    place,
    onDismiss: dismiss,
  });

  if (available.length === 0) {
    return <span className="text-slate-600">—</span>;
  }

  const destructive = available.filter((item) => item.destructive);
  const ordinary = available.filter((item) => !item.destructive);

  const renderItem = (item: ActionItem, index: number) => {
    const Icon = item.icon;
    return (
      <button
        key={`${item.label}-${index}`}
        type="button"
        role="menuitem"
        onClick={() => {
          close(false);
          item.onSelect();
        }}
        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
          item.destructive
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-slate-200 hover:bg-slate-800'
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-40"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && position && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
          className="fixed z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl"
        >
          {ordinary.map(renderItem)}

          {destructive.length > 0 && ordinary.length > 0 && (
            <div className="my-1 border-t border-slate-800" />
          )}

          {destructive.map(renderItem)}
        </div>
      )}
    </>
  );
};
