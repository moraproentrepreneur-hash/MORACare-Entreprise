'use client';

import { useCallback, useState } from 'react';
import { useBranding } from '@/context/BrandingContext';
import {
  generateDocument,
  type DocumentOutput,
  type DocumentPayload,
} from '@/lib/documents/pdf';
import type { DocumentIssuer } from '@/lib/documents/branding';

/**
 * Production d'un document PDF depuis un module.
 *
 * L'émetteur vient du contexte, déjà chargé : aucun module n'a à le connaître
 * ni à le recharger. L'appelant décrit le contenu — un titre, des sections, un
 * total — et ignore tout de la présentation, qui dépend du modèle choisi dans
 * les Paramètres.
 *
 * L'émetteur par défaut est celui de l'espace courant : l'établissement pour un
 * soignant, la plateforme pour le Super Admin. Un appelant peut en imposer un
 * autre — c'est le cas de la facture d'abonnement, émise par MORA Shawiri même
 * lorsqu'un responsable la télécharge depuis son propre espace.
 */
export const useDocument = (override?: DocumentIssuer | null) => {
  const { issuer, profile, platform } = useBranding();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeIssuer = override ?? issuer;

  const print = useCallback(
    async (payload: DocumentPayload, output: DocumentOutput = 'download'): Promise<boolean> => {
      setIsGenerating(true);
      setError(null);
      try {
        await generateDocument(activeIssuer, payload, output);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Génération du document impossible.');
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [activeIssuer],
  );

  /** Ouvre le document dans un onglet, sans l'enregistrer (BP28C §6). */
  const preview = useCallback(
    (payload: DocumentPayload) => print(payload, 'preview'),
    [print],
  );

  return {
    print,
    preview,
    isGenerating,
    error,
    clearError: () => setError(null),
    profile,
    platform,
    issuer: activeIssuer,
  };
};
