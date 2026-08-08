'use client';

import React from 'react';

/**
 * Éléments partagés par les écrans du module Hospitalisation.
 *
 * Ils existent pour que les six panneaux du module aient exactement la même
 * apparence et le même comportement : une carte d'indicateur ou un champ de
 * formulaire qui divergerait d'un onglet à l'autre donnerait l'impression de
 * deux applications cousues ensemble.
 */

export const FIELD =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-mora-green disabled:opacity-60';

export const Field: React.FC<{
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}> = ({ label, hint, htmlFor, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-300">
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
  </div>
);

export const Metric: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}> = ({ label, value, hint, tone = 'neutral' }) => {
  const tones = {
    neutral: 'text-white',
    good: 'text-mora-green',
    warn: 'text-amber-400',
    bad: 'text-red-400',
  } as const;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
};

export const Badge: React.FC<{
  label: string;
  tone: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
}> = ({ label, tone }) => {
  const tones = {
    neutral: 'bg-slate-800 text-slate-300',
    good: 'bg-emerald-500/15 text-emerald-400',
    warn: 'bg-amber-500/15 text-amber-400',
    bad: 'bg-red-500/15 text-red-400',
    info: 'bg-sky-500/15 text-sky-400',
  } as const;

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {label}
    </span>
  );
};

export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="space-y-3 p-10 text-center sm:p-12">
    <Icon className="mx-auto h-10 w-10 text-slate-700" />
    <h4 className="text-sm font-bold text-slate-300">{title}</h4>
    <p className="mx-auto max-w-sm text-xs text-slate-500">{description}</p>
    {action}
  </div>
);

export const Notice: React.FC<{ tone: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({
  tone,
  children,
}) => {
  const tones = {
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  } as const;

  return <div className={`rounded-xl border p-4 text-xs ${tones[tone]}`}>{children}</div>;
};

/**
 * Tableau défilant horizontalement.
 *
 * Le débordement est confiné au tableau : sans cela, une colonne de trop
 * ferait défiler la page entière sur téléphone, et l'en-tête du module
 * disparaîtrait sur le côté.
 */
export const ScrollTable: React.FC<{ minWidth: string; children: React.ReactNode }> = ({
  minWidth,
  children,
}) => (
  <div className="overflow-x-auto">
    <table className={`w-full ${minWidth} text-left text-xs text-slate-300`}>{children}</table>
  </div>
);
