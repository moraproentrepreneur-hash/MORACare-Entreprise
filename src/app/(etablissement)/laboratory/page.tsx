'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { LabModule } from '@/components/modules/LabModule';

export default function Page() {
  return (
    <ModuleGuard module="laboratory">
      <LabModule />
    </ModuleGuard>
  );
}
