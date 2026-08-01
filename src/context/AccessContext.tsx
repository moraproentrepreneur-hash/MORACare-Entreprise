'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  loadAccessSnapshot,
  type AccessSnapshot,
  type ModuleDefinition,
} from '@/services/access.service';

/**
 * Contrôle d'accès de l'utilisateur courant, chargé depuis la base.
 *
 * Séparé de DataContext à dessein : les droits doivent être connus AVANT toute
 * lecture métier, et un échec de chargement des droits ne doit pas être
 * confondu avec un échec de chargement des données.
 *
 * Comportement en cas d'échec : aucun droit. Le défaut est le refus, jamais
 * l'autorisation — une erreur réseau ne doit pas ouvrir l'application.
 */

interface AccessContextType {
  snapshot: AccessSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  modules: ModuleDefinition[];
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

const EMPTY_SNAPSHOT: AccessSnapshot = {
  modules: [],
  permissions: [],
  disabledModuleCodes: [],
  subscription: null,
  license: null,
};

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [snapshot, setSnapshot] = useState<AccessSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSnapshot(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      setSnapshot(await loadAccessSnapshot(user.role, user.establishment_id ?? null));
      setError(null);
    } catch (err) {
      // Fail closed : un snapshot vide n'accorde aucun droit.
      setSnapshot(EMPTY_SNAPSHOT);
      setError(
        err instanceof Error
          ? `Impossible de charger vos droits d'accès : ${err.message}`
          : "Impossible de charger vos droits d'accès.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AccessContextType>(
    () => ({
      snapshot,
      isLoading,
      error,
      refresh,
      modules: snapshot?.modules ?? [],
    }),
    [snapshot, isLoading, error, refresh],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
};

export const useAccess = () => {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
};
