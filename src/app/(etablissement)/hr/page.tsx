'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { HRModule } from '@/components/modules/HRModule';

export default function Page() {
  return (
    <ModuleGuard module="hr">
      <HRModule />
    </ModuleGuard>
  );
}
