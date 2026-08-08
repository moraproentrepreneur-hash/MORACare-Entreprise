'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Comportement commun des panneaux ancrés à un champ : liste déroulante, menu
 * d'actions, sélecteur de patient.
 *
 * Ces panneaux sont rendus en position **fixe**, hors du flux, pour échapper au
 * découpage du premier ancêtre qui masque son débordement — le corps défilant
 * d'une fenêtre modale, une cellule de tableau. Ils doivent donc gérer
 * eux-mêmes trois choses que le navigateur ne fait plus pour eux : se fermer au
 * bon moment, suivre leur ancre, et ne pas se fermer au mauvais moment.
 *
 * Le troisième point est celui qui posait problème. Un panneau ouvert émet des
 * événements de défilement quand on parcourt ses propres options ; les traiter
 * comme un mouvement de la page le refermait sous les doigts de l'utilisateur,
 * exactement quand il cherchait à lire la suite de la liste. La règle retenue
 * est donc : un panneau ne se ferme que sur un geste volontaire — un appui hors
 * de lui, la touche Échap, ou la disparition de son ancre hors de l'écran.
 *
 * `pointerdown` plutôt que `mousedown` : le tactile n'émet des événements
 * souris qu'en fin de geste, et seulement si celui-ci a été interprété comme un
 * appui. Un panneau ouvert sur téléphone ne se refermait pas au premier contact
 * hors de lui.
 */
export interface AnchoredPanelOptions {
  isOpen: boolean;
  /** Élément auquel le panneau est ancré : le champ ou le bouton déclencheur. */
  anchorRef: RefObject<HTMLElement | null>;
  /**
   * Éléments considérés comme « intérieurs ». Un geste qui y prend naissance
   * ne ferme pas le panneau et ne le repositionne pas — saisir la barre de
   * défilement de la liste en fait partie.
   */
  insideRefs: readonly RefObject<HTMLElement | null>[];
  /** Recalcule la position à partir de l'ancre. */
  place: () => void;
  /** Ferme le panneau, sans rendre le focus au déclencheur. */
  onDismiss: () => void;
}

export const useAnchoredPanel = ({
  isOpen,
  anchorRef,
  insideRefs,
  place,
  onDismiss,
}: AnchoredPanelOptions): void => {
  // Le tableau des refs est reconstruit à chaque rendu par l'appelant. Le
  // conserver dans une ref évite de réinstaller les écouteurs à chaque fois
  // sans obliger chaque appelant à mémoriser son tableau.
  const insideRef = useRef(insideRefs);
  insideRef.current = insideRefs;

  useEffect(() => {
    if (!isOpen) return;

    const isInside = (target: Node | null): boolean =>
      !!target &&
      (anchorRef.current?.contains(target) === true ||
        insideRef.current.some((ref) => ref.current?.contains(target) === true));

    const onPointerDown = (event: PointerEvent) => {
      if (!isInside(event.target as Node)) onDismiss();
    };

    const onScroll = (event: Event) => {
      // Le défilement du panneau lui-même est le geste normal d'un panneau
      // ouvert : il ne le concerne pas.
      if (isInside(event.target as Node)) return;

      const rect = anchorRef.current?.getBoundingClientRect();
      // L'ancre a quitté l'écran : le panneau flotterait seul, loin de ce qu'il
      // décrit.
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        onDismiss();
        return;
      }
      place();
    };

    // Le clavier virtuel d'un téléphone redimensionne la fenêtre : replacer le
    // panneau vaut mieux que le fermer.
    const onResize = () => place();

    document.addEventListener('pointerdown', onPointerDown, true);
    // `true` : capte aussi le défilement d'un conteneur interne, celui d'une
    // fenêtre modale par exemple.
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [isOpen, anchorRef, place, onDismiss]);
};
