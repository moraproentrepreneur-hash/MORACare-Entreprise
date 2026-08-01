'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { SettingsModule } from '@/components/modules/SettingsModule';

export default function Page() {
  return (
    <ModuleGuard module="settings">
      <SettingsModule />
    </ModuleGuard>
  );
}
