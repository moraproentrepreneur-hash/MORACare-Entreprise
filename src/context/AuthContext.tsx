'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { UserProfile } from '@/types';
import {
  fetchCurrentProfile,
  onAuthStateChange,
  signIn,
  signOut,
  type AuthResult,
} from '@/services/auth.service';
import { isSupabaseConfigured } from '@/lib/supabase/config';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  /**
   * Relit le profil.
   *
   * Nécessaire après une activation ou un changement de mot de passe : ces
   * opérations modifient des colonnes de `profiles` sans toucher à la session,
   * donc sans déclencher `onAuthStateChange`.
   */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchCurrentProfile();
    setUser(profile);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshProfile();
    return onAuthStateChange(() => {
      void refreshProfile();
    });
  }, [refreshProfile]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      setIsLoading(true);
      const result = await signIn(email, password);

      if (!result.success) {
        setIsLoading(false);
        return result;
      }

      // Le profil est rechargé par onAuthStateChange, mais on l'attend ici pour
      // que l'appelant dispose d'un état cohérent au retour de la promesse.
      await refreshProfile();
      return result;
    },
    [refreshProfile],
  );

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isConfigured: isSupabaseConfigured(),
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
