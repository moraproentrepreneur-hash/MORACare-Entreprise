'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { RoleDashboard } from '@/components/dashboard/RoleDashboard';

/**
 * Tableau de bord de l'espace Établissement.
 *
 * Son contenu dépend du rôle : chaque guide utilisateur (UG02 §4 à UG09 §4)
 * définit ses propres indicateurs.
 */
export default function DashboardPage() {
  return (
    <ModuleGuard module="dashboard">
      <RoleDashboard />
    </ModuleGuard>
  );
}
