'use client';

import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { useAuth } from '@/context/AuthContext';

/**
 * Centre de notifications de l'établissement.
 *
 * Réservé au responsable (UG02 §15). Les autres rôles ne voient pas l'entrée
 * dans le menu ; ce contrôle-ci couvre l'accès direct par l'URL.
 *
 * Le composant est celui de la console éditeur : la portée n'est pas décidée
 * par lui mais par les politiques RLS, qui ne laissent lire à un responsable
 * que les notifications de son établissement et les siennes.
 */
export default function EstablishmentNotificationsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900" />;
  }

  if (user?.role !== 'establishment_admin') {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-xs text-amber-300">
        Cet écran est réservé au responsable de l&apos;établissement.
      </div>
    );
  }

  return <NotificationCenter />;
}
