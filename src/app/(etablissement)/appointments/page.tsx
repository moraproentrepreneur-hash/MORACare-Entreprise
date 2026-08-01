'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { AppointmentsModule } from '@/components/modules/AppointmentsModule';

export default function Page() {
  return (
    <ModuleGuard module="appointments">
      <AppointmentsModule />
    </ModuleGuard>
  );
}
