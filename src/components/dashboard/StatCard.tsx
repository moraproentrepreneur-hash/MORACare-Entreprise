'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const TONES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-mora-green bg-mora-green/10',
  warning: 'text-amber-400 bg-amber-400/10',
  danger: 'text-red-400 bg-red-400/10',
  success: 'text-emerald-400 bg-emerald-400/10',
};

/** Indicateur de tableau de bord. Composant réutilisable par tous les rôles. */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'default',
}) => (
  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500 truncate">{hint}</p>}
    </div>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone]}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);
