'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { GEDModule } from '@/components/modules/GEDModule';

export default function Page() {
  return (
    <ModuleGuard module="ged">
      <GEDModule />
    </ModuleGuard>
  );
}
