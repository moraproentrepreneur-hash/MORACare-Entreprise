'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Activity, BellRing, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getModuleRoute } from '@/lib/navigation';

interface SidebarProps {
  /** Espace dont on affiche les modules : filtre du référentiel. */
  workspace: 'establishment' | 'platform' | 'portal';
  spaceLabel: string;
  /** Entrées supplémentaires propres à l'espace (sous-sections). */
  extraItems?: readonly { label: string; href: string; icon: React.ElementType }[];
  /** Ferme le tiroir sur mobile — sans effet sur grand écran. */
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  spaceLabel,
  extraItems,
  onNavigate,
}) => {
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

  /*
   * Centre de notifications de l'établissement.
   *
   * Réservé au responsable : les échéances d'abonnement, les incidents et les
   * alertes système relèvent de la gestion de la structure, pas du soin. Ce
   * n'est pas un module du référentiel — l'y ajouter obligerait à lui inventer
   * des permissions pour tous les rôles — mais une entrée propre à l'espace.
   */
  const establishmentExtras =
    workspace === 'establishment' && user?.role === 'establishment_admin'
      ? [{ label: 'Notifications', href: '/notifications', icon: BellRing }]
      : [];

  const menu =
    extraItems && extraItems.length > 0 ? extraItems : [...items, ...establishmentExtras];

  const isActive = (href: string): boolean =>
    pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 p-5 sm:p-6">
        <div className="flex min-w-0 items-center space-x-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green shadow-lg shadow-mora-blue/20">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-xl font-black tracking-tight text-white">
              MORA<span className="text-mora-green">Care</span>
            </span>
            <span className="block truncate text-[9px] font-medium uppercase tracking-wider text-slate-400">
              {spaceLabel}
            </span>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Fermer le menu"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {isLoading && (
          <div className="space-y-2 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-800/60" />
            ))}
          </div>
        )}

        {!isLoading && menu.length === 0 && (
          <p className="px-3 py-4 text-[11px] leading-relaxed text-slate-500">
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
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-mora-blue text-white shadow-md shadow-mora-blue/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center space-x-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs font-bold text-mora-green">
              {user?.first_name?.[0] ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate font-mono text-[10px] capitalize text-slate-400">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
