/**
 * @vitest-environment jsdom
 */

import React, { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Select } from '@/components/ui/Select';

/**
 * Comportement de la liste déroulante commune.
 *
 * Le défaut corrigé ici était précis : la liste se refermait dès qu'on saisissait
 * sa barre de défilement pour parcourir les options. Elle écoutait le
 * défilement en phase de capture et le traitait comme un mouvement de la page,
 * sans distinguer celui qu'elle produisait elle-même.
 *
 * Ces tests fixent la règle : une liste ouverte ne se ferme que sur un geste
 * volontaire — choix d'une option, appui hors du champ, Échap, ou disparition
 * du champ hors de l'écran.
 */

const OPTIONS = Array.from({ length: 20 }, (_, index) => ({
  value: `v${index}`,
  label: `Option ${index}`,
}));

const Harness: React.FC = () => {
  const [value, setValue] = useState('');
  return (
    <div>
      <button type="button" data-testid="dehors">
        Ailleurs
      </button>
      <Select
        aria-label="Champ de test"
        value={value}
        onChange={setValue}
        options={OPTIONS}
        placeholder="— Sélectionner —"
      />
    </div>
  );
};

const openList = (): HTMLElement => {
  fireEvent.click(screen.getByRole('combobox'));
  return screen.getByRole('listbox');
};

afterEach(cleanup);

describe('Liste déroulante', () => {
  it('reste ouverte quand on fait défiler ses propres options', () => {
    render(<Harness />);
    const list = openList();

    // Le geste étudié : la barre de défilement de la liste est saisie, puis la
    // liste défile. Les deux événements naissent dans la liste.
    fireEvent.pointerDown(list);
    fireEvent.scroll(list);

    expect(screen.queryByRole('listbox')).not.toBeNull();
  });

  it('reste ouverte quand on saisit sa barre de défilement sans relâcher', () => {
    render(<Harness />);
    const list = openList();

    // Une barre de défilement appartient à l'élément défilant : l'appui a pour
    // cible la liste elle-même, non l'une de ses options.
    fireEvent.pointerDown(list, { clientX: 300, clientY: 200 });

    expect(screen.queryByRole('listbox')).not.toBeNull();
  });

  it('reste ouverte quand on glisse depuis une option, sans rien sélectionner', () => {
    render(<Harness />);
    openList();
    const option = screen.getByRole('option', { name: /Option 3/ });

    // Sur écran tactile, faire défiler la liste commence par un contact sur une
    // option. Tant que le doigt n'a pas été relâché sur elle, rien n'est choisi.
    fireEvent.pointerDown(option);
    fireEvent.mouseDown(option);

    expect(screen.queryByRole('listbox')).not.toBeNull();
    expect(screen.getByRole('combobox').textContent).toContain('Sélectionner');
  });

  it('sélectionne au relâchement sur une option, et se ferme', () => {
    render(<Harness />);
    openList();

    fireEvent.click(screen.getByRole('option', { name: /Option 5/ }));

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox').textContent).toContain('Option 5');
  });

  it('se ferme sur un appui hors du champ', () => {
    render(<Harness />);
    openList();

    fireEvent.pointerDown(screen.getByTestId('dehors'));

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('se ferme sur Échap', () => {
    render(<Harness />);
    openList();

    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('suit le champ quand la page défile, sans se fermer', () => {
    render(<Harness />);
    openList();

    // Le défilement naît hors de la liste : le champ bouge, la liste le suit.
    // `getBoundingClientRect` renvoie zéro sous jsdom, donc un champ toujours
    // « visible » — c'est bien le cas nominal que l'on veut vérifier ici.
    fireEvent.scroll(document);

    expect(screen.queryByRole('listbox')).not.toBeNull();
  });

  it('se ferme lorsque le champ quitte l’écran', () => {
    render(<Harness />);
    openList();

    const combobox = screen.getByRole('combobox');
    const container = combobox.parentElement as HTMLElement;
    // Le conteneur est l'ancre : c'est sa position qui décide.
    container.getBoundingClientRect = () =>
      ({ top: -400, bottom: -360, left: 0, width: 200, height: 40 }) as DOMRect;

    fireEvent.scroll(document);

    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
