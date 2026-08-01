'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { HospitalizationsModule } from '@/components/modules/HospitalizationsModule';

export default function Page() {
  return (
    <ModuleGuard module="hospitalizations">
      <HospitalizationsModule />
    </ModuleGuard>
  );
}
