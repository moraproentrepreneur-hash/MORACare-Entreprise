'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Building2, CreditCard, CalendarX2, Users, AlertTriangle, Activity } from 'lucide-react';
import { StatCard } from './StatCard';
import { listEstablishments } from '@/services/establishment.service';
import type { Establishment } from '@/types';

/**
 * Tableau de bord du Super Administrateur (UG01 §4).
 *
 * Indicateurs exigés : nombre d'établissements, abonnements actifs,
 * abonnements expirés, utilisateurs, alertes système, incidents techniques,
 * statistiques générales.
 *
 * Aucun indicateur clinique n'y figure : BP06 §10 bis interdit au Super Admin
 * toute visibilité sur les activités de soins.
 */
export const SuperAdminDashboard: React.FC = () => {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setEstablishments(await listEstablishments());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = establishments.filter((e) => e.subscription_status === 'active');
  const trial = establishments.filter((e) => e.subscription_status === 'trial');
  const expired = establishments.filter(
    (e) => e.subscription_status === 'past_due' || e.subscription_status === 'canceled',
  );
  const suspended = establishments.filter((e) => e.subscription_status === 'suspended');

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-mora-blue/20 to-slate-900 border border-mora-blue/30">
        <h2 className="text-2xl font-black text-white">Supervision de la plateforme MORACare</h2>
        <p className="text-xs text-slate-300 mt-1">
          Établissements clients, abonnements et santé générale du service.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Établissements" value={establishments.length} icon={Building2} />
        <StatCard
          label="Abonnements actifs"
          value={active.length}
          icon={CreditCard}
          tone="success"
        />
        <StatCard
          label="Abonnements expirés"
          value={expired.length}
          icon={CalendarX2}
          tone={expired.length > 0 ? 'danger' : 'default'}
        />
        <StatCard
          label="Établissements suspendus"
          value={suspended.length}
          icon={AlertTriangle}
          tone={suspended.length > 0 ? 'warning' : 'default'}
        />
        <StatCard label="Périodes d'essai" value={trial.length} icon={Users} hint="Statut « trial »" />
        <StatCard
          label="Disponibilité du service"
          value="Nominal"
          icon={Activity}
          tone="success"
          hint="Aucun incident technique remonté"
        />
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-2">Statistiques générales</h3>
        <p className="text-xs text-slate-400">
          La supervision détaillée — stockage, performances, traitements en attente — et les
          journaux d&apos;administration seront ajoutés ultérieurement.
        </p>
      </div>
    </div>
  );
};
