'use client';

import React from 'react';
import { WorkspaceLayout } from '@/components/layouts/WorkspaceLayout';

/**
 * DashboardLayout (TD04 §10) — espace Établissement.
 *
 * Le groupe de routes `(etablissement)` n'apparaît pas dans l'URL : les chemins
 * restent `/dashboard`, `/patients`, `/consultations`… conformément à TD04 §9.
 */
export default function EstablishmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceLayout workspace="establishment" spaceLabel="Espace Établissement">
      {children}
    </WorkspaceLayout>
  );
}
