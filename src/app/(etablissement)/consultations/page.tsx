'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { ConsultationsModule } from '@/components/modules/ConsultationsModule';

export default function Page() {
  return (
    <ModuleGuard module="consultations">
      <ConsultationsModule />
    </ModuleGuard>
  );
}
