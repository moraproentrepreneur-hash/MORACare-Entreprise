import { failIf, getClient } from './base.service';
import type { UserRole } from '@/types';
import type {
  ModuleRow,
  ModuleWorkspace,
  SubscriptionState,
  LicenseState,
  RolePermissionRow,
} from '@/types/database';

/**
 * Chargement du contrôle d'accès depuis la base (BP26A, BP09, BP28A §12).
 *
 * Rien n'est codé en dur ici : le référentiel des modules, la matrice des
 * permissions, la composition des plans et l'activation par établissement
 * proviennent tous de PostgreSQL.
 */

export interface ModuleDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  blueprintReference: string | null;
  isCore: boolean;
  workspace: ModuleWorkspace;
  displayOrder: number;
}

export interface ModulePermission {
  moduleCode: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface EstablishmentSubscription {
  planCode: string;
  planName: string;
  status: SubscriptionState;
  startDate: string;
  endDate: string | null;
  /**
   * Codes des modules inclus dans le plan.
   *
   * `null` signifie « composition non définie » : BP09 §4 ne précise le
   * contenu que des plans Essai et VIP. Dans ce cas l'application n'applique
   * aucune restriction de plan et le signale dans les Paramètres.
   */
  planModuleCodes: string[] | null;
}

export interface EstablishmentLicense {
  licenseNumber: string;
  status: LicenseState;
  expiresAt: string | null;
  maxUsers: number | null;
  storageMb: number | null;
}

export interface AccessSnapshot {
  modules: ModuleDefinition[];
  permissions: ModulePermission[];
  /** Codes des modules désactivés manuellement pour l'établissement. */
  disabledModuleCodes: string[];
  subscription: EstablishmentSubscription | null;
  license: EstablishmentLicense | null;
}

const WORKSPACES: readonly ModuleWorkspace[] = ['establishment', 'platform', 'portal'];

/**
 * `modules.workspace` est une colonne texte : PostgreSQL n'en contraint pas les
 * valeurs, seul le seed le fait. On valide donc à la lecture plutôt que de
 * forcer le type — une valeur inconnue rattachée à l'espace établissement
 * apparaîtrait dans les menus de tous les utilisateurs.
 */
const toWorkspace = (value: string): ModuleWorkspace =>
  WORKSPACES.includes(value as ModuleWorkspace) ? (value as ModuleWorkspace) : 'platform';

const toModule = (row: ModuleRow): ModuleDefinition => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  blueprintReference: row.blueprint_reference,
  isCore: row.is_core,
  workspace: toWorkspace(row.workspace),
  displayOrder: row.display_order,
});

export const listModules = async (): Promise<ModuleDefinition[]> => {
  const { data, error } = await getClient()
    .from('modules')
    .select('*')
    .order('display_order');

  failIf(error, 'Chargement du référentiel des modules');
  return (data ?? []).map(toModule);
};

/**
 * Charge tout ce qui détermine les droits de l'utilisateur courant.
 *
 * Une seule fonction, pour que l'interface ne puisse jamais se retrouver avec
 * un référentiel chargé mais des permissions manquantes — état dans lequel
 * elle afficherait des modules sans savoir s'ils sont autorisés.
 */
export const loadAccessSnapshot = async (
  role: UserRole,
  establishmentId: string | null,
): Promise<AccessSnapshot> => {
  const client = getClient();

  const [modules, permissionRows] = await Promise.all([
    listModules(),
    client
      .from('role_permissions')
      .select('module_id, can_view, can_create, can_update, can_delete')
      .eq('role', role)
      .then((res) => {
        failIf(res.error, 'Chargement des permissions');
        return res.data ?? [];
      }),
  ]);

  const moduleById = new Map(modules.map((m) => [m.id, m]));

  const permissions: ModulePermission[] = permissionRows.flatMap((row) => {
    const moduleDef = moduleById.get(row.module_id);
    if (!moduleDef) return [];
    return [
      {
        moduleCode: moduleDef.code,
        canView: row.can_view,
        canCreate: row.can_create,
        canUpdate: row.can_update,
        canDelete: row.can_delete,
      },
    ];
  });

  // Le Super Admin n'est rattaché à aucun établissement : ni abonnement,
  // ni activation de modules ne le concernent.
  if (!establishmentId) {
    return { modules, permissions, disabledModuleCodes: [], subscription: null, license: null };
  }

  const [activationRes, subscriptionRes, licenseRes] = await Promise.all([
    client
      .from('establishment_modules')
      .select('module_id, is_enabled')
      .eq('establishment_id', establishmentId),
    client
      .from('subscriptions')
      .select('plan_id, status, start_date, end_date, plan:subscription_plans(code, name)')
      .eq('establishment_id', establishmentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from('licenses')
      .select('license_number, status, expires_at, max_users, storage_mb')
      .eq('establishment_id', establishmentId)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);

  failIf(activationRes.error, "Chargement de l'activation des modules");
  failIf(subscriptionRes.error, "Chargement de l'abonnement");
  failIf(licenseRes.error, 'Chargement de la licence');

  const disabledModuleCodes = (activationRes.data ?? [])
    .filter((row) => row.is_enabled === false)
    .flatMap((row) => {
      const moduleDef = moduleById.get(row.module_id);
      return moduleDef ? [moduleDef.code] : [];
    });

  let subscription: EstablishmentSubscription | null = null;

  if (subscriptionRes.data) {
    const raw = subscriptionRes.data as unknown as {
      plan_id: string;
      status: SubscriptionState;
      start_date: string;
      end_date: string | null;
      plan?: { code: string; name: string } | null;
    };

    const { data: planModules, error: planError } = await client
      .from('plan_modules')
      .select('module_id')
      .eq('plan_id', raw.plan_id);

    failIf(planError, 'Chargement de la composition du plan');

    const codes = (planModules ?? []).flatMap((row) => {
      const moduleDef = moduleById.get(row.module_id);
      return moduleDef ? [moduleDef.code] : [];
    });

    subscription = {
      planCode: raw.plan?.code ?? '',
      planName: raw.plan?.name ?? '',
      status: raw.status,
      startDate: raw.start_date,
      endDate: raw.end_date,
      // Aucune ligne = composition non définie par BP09 (voir le seed).
      planModuleCodes: codes.length > 0 ? codes : null,
    };
  }

  const license: EstablishmentLicense | null = licenseRes.data
    ? {
        licenseNumber: licenseRes.data.license_number,
        status: licenseRes.data.status,
        expiresAt: licenseRes.data.expires_at,
        maxUsers: licenseRes.data.max_users,
        storageMb: licenseRes.data.storage_mb,
      }
    : null;

  return { modules, permissions, disabledModuleCodes, subscription, license };
};

/** Active ou désactive un module pour un établissement (BP28A §12). */
export const setModuleEnabled = async (
  establishmentId: string,
  moduleId: string,
  isEnabled: boolean,
  userId: string,
): Promise<void> => {
  const { error } = await getClient()
    .from('establishment_modules')
    .upsert(
      {
        establishment_id: establishmentId,
        module_id: moduleId,
        is_enabled: isEnabled,
        updated_by: userId,
      },
      { onConflict: 'establishment_id,module_id' },
    );

  failIf(error, "Mise à jour de l'activation du module");
};

/** Matrice complète des permissions, pour l'écran Rôles & Permissions. */
export const listAllRolePermissions = async (): Promise<
  Array<{ role: UserRole; moduleId: string; canView: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>
> => {
  const { data, error } = await getClient()
    .from('role_permissions')
    .select('role, module_id, can_view, can_create, can_update, can_delete');

  failIf(error, 'Chargement de la matrice des permissions');

  return (data ?? []).map((row) => ({
    role: row.role,
    moduleId: row.module_id,
    canView: row.can_view,
    canCreate: row.can_create,
    canUpdate: row.can_update,
    canDelete: row.can_delete,
  }));
};

/** Modifie une case de la matrice (BP26A : permissions administrables). */
export const updateRolePermission = async (
  role: UserRole,
  moduleId: string,
  changes: Partial<{ canView: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>,
): Promise<void> => {
  const payload: Partial<RolePermissionRow> = {};
  if (changes.canView !== undefined) payload.can_view = changes.canView;
  if (changes.canCreate !== undefined) payload.can_create = changes.canCreate;
  if (changes.canUpdate !== undefined) payload.can_update = changes.canUpdate;
  if (changes.canDelete !== undefined) payload.can_delete = changes.canDelete;

  const { error } = await getClient()
    .from('role_permissions')
    .update(payload)
    .eq('role', role)
    .eq('module_id', moduleId);

  failIf(error, 'Mise à jour de la permission');
};
