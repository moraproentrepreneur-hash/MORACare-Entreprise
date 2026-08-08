'use client';

import React, { useState } from 'react';
import {
  Settings,
  Building2,
  ShieldCheck,
  Boxes,
  Lock,
  Database,
  History,
  CreditCard,
  BedDouble,
  Pill
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ModulesSettings } from '@/components/settings/ModulesSettings';
import { PermissionsMatrix } from '@/components/settings/PermissionsMatrix';
import { AuditLogPanel } from '@/components/settings/AuditLogPanel';
import { EstablishmentSettings } from '@/components/settings/EstablishmentSettings';
import { SubscriptionPanel } from '@/components/settings/SubscriptionPanel';
import { EstablishmentInvoices } from '@/components/settings/EstablishmentInvoices';
import { SecurityPanel } from '@/components/settings/SecurityPanel';
import { ModuleSettingsTab } from '@/components/settings/ModuleSettingsTab';
import { BackupsPanel } from '@/components/settings/BackupsPanel';

/**
 * Module Paramètres — poste de commande de l'application (BP28A).
 *
 * CLAUDE.md : « Le module Paramètres pilote l'application. » Chaque onglet
 * agit sur des données réelles ; aucun n'affiche d'information décorative.
 */

type SettingsTab =
  | 'establishment'
  | 'subscription'
  | 'modules'
  | 'hospitalization'
  | 'pharmacy'
  | 'roles'
  | 'security'
  | 'backups'
  | 'audit';

interface TabDefinition {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  /** Onglets réservés au Super Admin. */
  superAdminOnly?: boolean;
  /**
   * Onglet lié à un module : masqué si ce module est désactivé pour
   * l'établissement. Régler une pharmacie que l'on n'exploite pas n'a pas de
   * sens, et BP28A §12 veut qu'un module désactivé disparaisse partout.
   */
  requiresModule?: string;
}

/**
 * Onglets des Paramètres.
 *
 * « Rôles & Permissions » et « Sécurité » portent la politique de la
 * plateforme, pas celle d'un établissement : la matrice des permissions et la
 * politique des mots de passe s'appliquent à tous les clients à la fois. Les
 * afficher à un responsable laissait croire qu'il pouvait les régler pour sa
 * seule structure, alors que les politiques RLS lui refusaient de toute façon
 * l'écriture. Ils sont désormais réservés au Super Admin.
 */
const TABS: readonly TabDefinition[] = [
  { id: 'establishment', label: 'Établissement', icon: Building2 },
  { id: 'subscription', label: 'Abonnement & Licence', icon: CreditCard },
  { id: 'modules', label: 'Modules Applicatifs', icon: Boxes },
  {
    id: 'hospitalization',
    label: 'Hospitalisation',
    icon: BedDouble,
    requiresModule: 'hospitalizations',
  },
  { id: 'pharmacy', label: 'Pharmacie', icon: Pill, requiresModule: 'pharmacy' },
  { id: 'roles', label: 'Rôles & Permissions', icon: ShieldCheck, superAdminOnly: true },
  { id: 'security', label: 'Sécurité', icon: Lock, superAdminOnly: true },
  { id: 'backups', label: 'Sauvegardes', icon: Database },
  { id: 'audit', label: "Journal d'audit", icon: History },
];

export const SettingsModule: React.FC = () => {
  const { user } = useAuth();
  const { canUpdate, visibleModules } = usePermissions();
  const [activeTab, setActiveTab] = useState<SettingsTab>('establishment');

  const isSuperAdmin = user?.role === 'super_admin';
  const activeModuleCodes = new Set(visibleModules.map((module) => module.code));

  const visibleTabs = TABS.filter((tab) => {
    if (tab.superAdminOnly && !isSuperAdmin) return false;
    // Le Super Admin règle la plateforme, pas les modules d'un établissement
    // dont il n'exploite ni la pharmacie ni les lits.
    if (tab.requiresModule) {
      return !isSuperAdmin && activeModuleCodes.has(tab.requiresModule);
    }
    return true;
  });

  // Un onglet masqué ne doit pas rester affiché parce qu'il était sélectionné.
  const currentTab = visibleTabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : visibleTabs[0].id;

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-mora-green" />
          {isSuperAdmin ? 'Paramètres globaux de la plateforme' : 'Paramètres de l’établissement'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Gouvernance, modules, habilitations, sécurité et traçabilité.
        </p>
        {!canUpdate('settings') && (
          <p className="mt-3 text-[11px] text-amber-400">
            Consultation seule : votre rôle ne permet pas de modifier ces paramètres.
          </p>
        )}
      </div>

      <div className="flex overflow-x-auto gap-2 border-b border-slate-800 pb-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-mora-blue text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {(currentTab === 'hospitalization' || currentTab === 'pharmacy') && (
        <ModuleSettingsTab module={currentTab} editable={canUpdate('settings')} />
      )}

      {currentTab === 'establishment' && <EstablishmentSettings />}

      {currentTab === 'subscription' && (
        <div className="space-y-6">
          <SubscriptionPanel />
          {/* Le contrat sans son historique de facturation ne dit pas ce qui a
              été payé : les deux appartiennent au même onglet. Le Super Admin
              dispose de sa propre console, tous établissements confondus. */}
          {!isSuperAdmin && <EstablishmentInvoices />}
        </div>
      )}
      {currentTab === 'modules' && <ModulesSettings />}
      {currentTab === 'roles' && <PermissionsMatrix />}
      {currentTab === 'security' && <SecurityPanel />}
      {currentTab === 'audit' && <AuditLogPanel />}

      {currentTab === 'backups' && <BackupsPanel />}
    </div>
  );
};
