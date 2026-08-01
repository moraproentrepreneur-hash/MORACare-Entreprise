'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { FinanceModule } from '@/components/modules/FinanceModule';

export default function Page() {
  return (
    <ModuleGuard module="finance">
      <FinanceModule />
    </ModuleGuard>
  );
}
