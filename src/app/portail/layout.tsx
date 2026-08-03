'use client';

import React from 'react';
import { Activity, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * PortalLayout (TD04 §10) — espace Patient (BP29, UG10).
 *
 * Volontairement dépouillé : le patient n'est pas un utilisateur interne. Il ne
 * dispose ni de la barre latérale des modules, ni du bandeau de supervision.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-mora-blue border-t-mora-green animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-mora-blue to-mora-green flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white">
              MORA<span className="text-mora-green">Care</span>
            </span>
            <span className="block text-[9px] text-slate-400 uppercase tracking-wider">
              Espace Patient
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-300 hidden sm:inline">
            {user?.first_name} {user?.last_name}
          </span>
          <button
            onClick={() => void logout()}
            title="Se déconnecter"
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-3 sm:p-4 lg:p-6">{children}</main>
    </div>
  );
}
