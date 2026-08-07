'use client';

import { useCallback, useState } from 'react';
import { useBranding } from '@/context/BrandingContext';
import {
  generateDocument,
  type DocumentOutput,
  type DocumentPayload,
} from '@/lib/documents/pdf';

/**
 * Production d'un document PDF depuis un module.
 *
 * Le profil de l'établissement vient du contexte, déjà chargé : aucun module
 * n'a à le connaître ni à le recharger. L'appelant décrit le contenu — un titre,
 * des sections, un total — et ignore tout de la présentation, qui dépend du
 * modèle choisi dans les Paramètres.
 *
 * Sans établissement rattaché, la génération est refusée plutôt que produite
 * avec une identité inventée : un document médical sans émetteur n'a aucune
 * valeur.
 */
export const useDocument = () => {
  const { profile } = useBranding();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const print = useCallback(
    async (payload: DocumentPayload, output: DocumentOutput = 'download'): Promise<boolean> => {
      if (!profile) {
        setError(
          "Aucun établissement n'est rattaché à votre compte : le document ne peut pas être émis.",
        );
        return false;
      }

      setIsGenerating(true);
      setError(null);
      try {
        await generateDocument(profile, payload, output);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Génération du document impossible.');
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [profile],
  );

  /** Ouvre le document dans un onglet, sans l'enregistrer (BP28C §6). */
  const preview = useCallback(
    (payload: DocumentPayload) => print(payload, 'preview'),
    [print],
  );

  return { print, preview, isGenerating, error, clearError: () => setError(null), profile };
};
