'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getModuleRoute } from '@/lib/navigation';

interface SidebarProps {
  /** Espace dont on affiche les modules : filtre du référentiel. */
  workspace: 'establishment' | 'platform' | 'portal';
  spaceLabel: string;
  /** Entrées supplémentaires propres à l'espace (sous-sections). */
  extraItems?: readonly { label: string; href: string; icon: React.ElementType }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ workspace, spaceLabel, extraItems }) => {
  const { user, logout } = useAuth();
  const { visibleModules, isLoading } = usePermissions();
  const pathname = usePathname();

  // Menu entièrement dérivé du référentiel et des permissions en base
  // (BP06 §8). Aucune entrée statique.
  const items = visibleModules
    .filter((module) => module.workspace === workspace)
    .flatMap((module) => {
      const route = getModuleRoute(module.code);
      return route ? [{ label: module.name, href: route.href, icon: route.icon }] : [];
    });

  const menu = extraItems && extraItems.length > 0 ? extraItems : items;

  const isActive = (href: string): boolean =>
    pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen shrink-0">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green flex items-center justify-center shadow-lg shadow-mora-blue/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-xl font-black tracking-tight text-white">
            MORA<span className="text-mora-green">Care</span>
          </span>
          <span className="block text-[9px] text-slate-400 font-medium tracking-wider uppercase">
            {spaceLabel}
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-2 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 rounded-xl bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && menu.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-slate-500 leading-relaxed">
            Aucun module accessible. Votre rôle ne dispose d&apos;aucune autorisation, ou tous les
            modules sont désactivés pour cet établissement.
          </p>
        )}

        {!isLoading &&
          menu.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-mora-blue text-white shadow-md shadow-mora-blue/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-mora-green font-bold text-xs shrink-0">
              {user?.first_name?.[0] ?? 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[10px] text-slate-400 capitalize truncate font-mono">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            title="Se déconnecter"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
