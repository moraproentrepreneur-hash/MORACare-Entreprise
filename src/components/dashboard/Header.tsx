'use client';

import React from 'react';
import { Menu, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from './NotificationBell';

/**
 * Barre supérieure des espaces authentifiés.
 *
 * MORACare est une application sombre : il n'y a plus de bascule de thème. En
 * proposer une n'apportait rien — le thème clair n'a jamais été maquetté pour
 * les écrans métier — et le bouton précédent ne modifiait qu'une classe CSS
 * sans jamais mémoriser le choix.
 */

interface HeaderProps {
  title: string;
  /** Ouvre le menu latéral sur mobile, où il est masqué par défaut. */
  onOpenMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenMenu }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/80 px-3 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Ouvrir le menu"
            className="-ml-1 rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold capitalize text-white sm:text-lg">{title}</h1>
          <p className="hidden text-[11px] text-slate-400 sm:block">
            MORACare — Plateforme médicale
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="relative hidden xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            placeholder="Rechercher patient, dossier, référence…"
            className="w-56 rounded-lg border border-slate-800 bg-slate-950 py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-mora-blue 2xl:w-64"
          />
        </div>

        <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Système actif</span>
        </div>

        <NotificationBell />

        {user?.role === 'super_admin' && (
          <div className="flex items-center gap-1 rounded-md border border-mora-blue/60 bg-mora-blue/40 px-2 py-1 font-mono text-xs font-semibold text-blue-200">
            <ShieldCheck className="h-3.5 w-3.5 text-mora-green" />
            <span className="hidden sm:inline">SuperAdmin</span>
          </div>
        )}
      </div>
    </header>
  );
};
