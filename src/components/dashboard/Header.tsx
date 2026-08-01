'use client';

import React from 'react';
import { Bell, Search, ShieldCheck, Moon, Sun, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = React.useState(true);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold text-white capitalize">{title}</h1>
        <p className="text-[11px] text-slate-400">MORACare SaaS Medical Platform</p>
      </div>

      <div className="flex items-center space-x-4">
        {/* Global Search Input */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher patient, dossier, référence..."
            className="w-64 pl-9 pr-4 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-mora-blue"
          />
        </div>

        {/* System Health / Status */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Système Actif</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Basculer thème"
        >
          {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-mora-green absolute top-1.5 right-1.5" />
        </button>

        {/* Super Admin Badge */}
        {user?.role === 'super_admin' && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-mora-blue/40 border border-mora-blue/60 text-xs text-blue-200 font-mono font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-mora-green" />
            <span>SuperAdmin</span>
          </div>
        )}
      </div>
    </header>
  );
};
