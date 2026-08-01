'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { PatientsModule } from '@/components/modules/PatientsModule';

export default function Page() {
  return (
    <ModuleGuard module="patients">
      <PatientsModule />
    </ModuleGuard>
  );
}
