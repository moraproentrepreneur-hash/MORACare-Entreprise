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
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ModulesSettings } from '@/components/settings/ModulesSettings';
import { PermissionsMatrix } from '@/components/settings/PermissionsMatrix';
import { AuditLogPanel } from '@/components/settings/AuditLogPanel';
import { EstablishmentSettings } from '@/components/settings/EstablishmentSettings';
import { SubscriptionPanel } from '@/components/settings/SubscriptionPanel';
import { SecurityPanel } from '@/components/settings/SecurityPanel';
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
}

const TABS: readonly TabDefinition[] = [
  { id: 'establishment', label: 'Établissement', icon: Building2 },
  { id: 'subscription', label: 'Abonnement & Licence', icon: CreditCard },
  { id: 'modules', label: 'Modules Applicatifs', icon: Boxes },
  { id: 'roles', label: 'Rôles & Permissions', icon: ShieldCheck },
  { id: 'security', label: 'Sécurité', icon: Lock },
  { id: 'backups', label: 'Sauvegardes', icon: Database },
  { id: 'audit', label: "Journal d'audit", icon: History },
];

export const SettingsModule: React.FC = () => {
  const { user } = useAuth();
  const { canUpdate } = usePermissions();
  const [activeTab, setActiveTab] = useState<SettingsTab>('establishment');

  const isSuperAdmin = user?.role === 'super_admin';
  const visibleTabs = TABS.filter((tab) => !tab.superAdminOnly || isSuperAdmin);

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
          const isActive = activeTab === tab.id;
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

      {activeTab === 'establishment' && <EstablishmentSettings />}
      {activeTab === 'subscription' && <SubscriptionPanel />}
      {activeTab === 'modules' && <ModulesSettings />}
      {activeTab === 'roles' && <PermissionsMatrix />}
      {activeTab === 'security' && <SecurityPanel />}
      {activeTab === 'audit' && <AuditLogPanel />}

      {activeTab === 'backups' && <BackupsPanel />}
    </div>
  );
};
