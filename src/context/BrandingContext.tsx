'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { hexToRgb } from '@/lib/documents/branding';
import {
  getEstablishmentProfile,
  type EstablishmentProfile,
} from '@/services/establishment.service';
import {
  FALLBACK_PLATFORM_IDENTITY,
  getPlatformIdentity,
  type PlatformIdentity,
} from '@/services/platform.service';
import type { DocumentIssuer } from '@/lib/documents/branding';

/**
 * Identité visuelle de l'établissement, appliquée à l'interface.
 *
 * Les classes `mora-blue` et `mora-green` du projet ne portent plus une valeur
 * fixe : Tailwind les résout en `rgb(var(--mora-blue) / <alpha-value>)`.
 * Poser ces deux variables sur `<html>` suffit donc à recolorer toute
 * l'application — boutons, onglets actifs, badges, anneaux de focus, dégradés —
 * sans qu'aucun composant n'ait à connaître l'établissement. Les variantes
 * d'opacité déjà utilisées (`bg-mora-green/25`) continuent de fonctionner.
 *
 * Le profil est aussi exposé aux composants : le moteur documentaire en a
 * besoin, et le recharger à chaque impression serait inutile.
 */

interface BrandingContextValue {
  profile: EstablishmentProfile | null;
  /** Identité documentaire de l'éditeur, lisible par tous les comptes. */
  platform: PlatformIdentity;
  /**
   * Émetteur par défaut des documents produits depuis l'espace courant :
   * l'établissement pour un soignant, la plateforme pour le Super Admin.
   *
   * Un document a toujours un émetteur. Faute d'en trouver un, le moteur
   * refusait de produire quoi que ce soit depuis la console de l'éditeur —
   * c'est ce qui empêchait le téléchargement des factures d'abonnement.
   */
  issuer: DocumentIssuer;
  isLoading: boolean;
  /** À appeler après un enregistrement des Paramètres. */
  refresh: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

/** Charte MORACare, appliquée hors établissement (vitrine, Super Admin). */
const DEFAULT_BLUE = '0 51 102';
const DEFAULT_GREEN = '0 168 89';

const applyColors = (primary: string | null, secondary: string | null) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const blue = primary ? hexToRgb(primary) : null;
  const green = secondary ? hexToRgb(secondary) : null;

  root.style.setProperty('--mora-blue', blue ? blue.join(' ') : DEFAULT_BLUE);
  root.style.setProperty('--mora-green', green ? green.join(' ') : DEFAULT_GREEN);
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<EstablishmentProfile | null>(null);
  const [platform, setPlatform] = useState<PlatformIdentity>(FALLBACK_PLATFORM_IDENTITY);
  const [isLoading, setIsLoading] = useState(false);

  const establishmentId = user?.establishment_id ?? null;

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      applyColors(null, null);
      return;
    }

    setIsLoading(true);

    // L'identité de l'éditeur est chargée pour tout le monde : elle habille les
    // documents de plateforme, y compris la facture d'abonnement qu'un
    // responsable télécharge depuis son propre espace.
    try {
      setPlatform(await getPlatformIdentity());
    } catch {
      // Le repli porte l'identité officielle : un document sans émetteur n'a
      // aucune valeur, un en-tête approximatif vaut mieux qu'aucun.
      setPlatform(FALLBACK_PLATFORM_IDENTITY);
    }

    if (!establishmentId) {
      setProfile(null);
      // Retour à la charte de l'éditeur : le Super Admin n'appartient à aucun
      // établissement, et la couleur du dernier consulté ne doit pas rester.
      applyColors(null, null);
      setIsLoading(false);
      return;
    }

    try {
      const loaded = await getEstablishmentProfile(establishmentId);
      setProfile(loaded);
      applyColors(loaded?.primaryColor ?? null, loaded?.secondaryColor ?? null);
    } catch {
      // Une couleur est un confort : son échec de chargement ne doit pas
      // remonter à l'utilisateur ni empêcher l'application de s'afficher.
      setProfile(null);
      applyColors(null, null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, establishmentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      profile,
      platform,
      // Un établissement signe ses documents de soin ; l'éditeur signe les
      // siens. `EstablishmentProfile` et `PlatformIdentity` portent les mêmes
      // champs d'émetteur, ce qui rend la substitution possible sans que le
      // moteur documentaire n'ait à connaître leur nature.
      issuer: (profile as DocumentIssuer | null) ?? platform,
      isLoading,
      refresh,
    }),
    [profile, platform, isLoading, refresh],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = (): BrandingContextValue => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
