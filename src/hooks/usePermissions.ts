'use client';

import { useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAccess } from '@/context/AccessContext';

/**
 * Droits de l'utilisateur courant (TD04 §12).
 *
 * Toutes les réponses proviennent de la base : référentiel des modules, matrice
 * des permissions, composition du plan et activation par établissement. Aucune
 * règle n'est écrite dans le code.
 *
 * Trois filtres cumulatifs déterminent l'accès à un module :
 *   1. la matrice rôle × module (BP26A) ;
 *   2. l'inclusion du module dans le plan souscrit (BP09 BR-006) ;
 *   3. l'activation manuelle par l'établissement (BP28A §12, BP12 BR-027).
 *
 * AVERTISSEMENT — ce hook pilote l'interface, pas la sécurité. TD04 §23 : le
 * frontend « ne contient aucune logique d'autorisation ». Le refus qui fait
 * autorité est celui des politiques RLS de PostgreSQL.
 */

export type PermissionAction = 'view' | 'create' | 'update' | 'delete';

export const usePermissions = () => {
  const { user } = useAuth();
  const { snapshot, isLoading } = useAccess();

  const permissionsByModule = useMemo(() => {
    const map = new Map<string, { view: boolean; create: boolean; update: boolean; delete: boolean }>();
    snapshot?.permissions.forEach((p) => {
      map.set(p.moduleCode, {
        view: p.canView,
        create: p.canCreate,
        update: p.canUpdate,
        delete: p.canDelete,
      });
    });
    return map;
  }, [snapshot]);

  const coreModuleCodes = useMemo(
    () => new Set(snapshot?.modules.filter((m) => m.isCore).map((m) => m.code) ?? []),
    [snapshot],
  );

  /**
   * Vrai si le module est disponible pour l'établissement.
   *
   * Les modules « core » échappent aux deux filtres d'activation : ils sont
   * indispensables au fonctionnement et à l'audit de la plateforme.
   */
  const isModuleAvailable = useCallback(
    (moduleCode: string): boolean => {
      if (!snapshot) return false;
      if (coreModuleCodes.has(moduleCode)) return true;

      if (snapshot.disabledModuleCodes.includes(moduleCode)) return false;

      // planModuleCodes vaut null quand BP09 ne définit pas la composition du
      // plan : aucune restriction n'est alors appliquée (voir le seed SQL).
      const planCodes = snapshot.subscription?.planModuleCodes;
      if (planCodes && !planCodes.includes(moduleCode)) return false;

      return true;
    },
    [snapshot, coreModuleCodes],
  );

  const can = useCallback(
    (moduleCode: string, action: PermissionAction = 'view'): boolean => {
      if (!user || !snapshot) return false;
      if (!isModuleAvailable(moduleCode)) return false;
      return permissionsByModule.get(moduleCode)?.[action] ?? false;
    },
    [user, snapshot, isModuleAvailable, permissionsByModule],
  );

  const canView = useCallback((code: string) => can(code, 'view'), [can]);
  const canCreate = useCallback((code: string) => can(code, 'create'), [can]);
  const canUpdate = useCallback((code: string) => can(code, 'update'), [can]);
  const canDelete = useCallback((code: string) => can(code, 'delete'), [can]);

  /** Modules visibles, triés selon le référentiel. */
  const visibleModules = useMemo(
    () => (snapshot?.modules ?? []).filter((m) => canView(m.code)),
    [snapshot, canView],
  );

  return {
    can,
    canView,
    canCreate,
    canUpdate,
    canDelete,
    visibleModules,
    isModuleAvailable,
    isLoading,
    isSuperAdmin: user?.role === 'super_admin',
    role: user?.role,
    subscription: snapshot?.subscription ?? null,
    license: snapshot?.license ?? null,
  };
};
