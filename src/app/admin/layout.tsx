'use client';

import React from 'react';
import { WorkspaceLayout } from '@/components/layouts/WorkspaceLayout';
import { ADMIN_SECTIONS } from '@/lib/navigation';

/**
 * AdminLayout (TD04 §10) — espace Super Admin (MORA Shawiri).
 *
 * CLAUDE.md : « Son interface est totalement différente des autres. Elle ne
 * doit jamais être partagée avec les établissements. » Aucun module de soins
 * n'y figure (BP06 §10 bis) ; l'accès des autres rôles est refusé par le
 * middleware, avant tout rendu.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceLayout
      workspace="platform"
      spaceLabel="Console SaaS Éditeur"
      extraItems={ADMIN_SECTIONS}
    >
      {children}
    </WorkspaceLayout>
  );
}
