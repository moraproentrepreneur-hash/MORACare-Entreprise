'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { PharmacyModule } from '@/components/modules/PharmacyModule';

export default function Page() {
  return (
    <ModuleGuard module="pharmacy">
      <PharmacyModule />
    </ModuleGuard>
  );
}
