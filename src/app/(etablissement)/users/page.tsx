'use client';

import React from 'react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { UserManagementModule } from '@/components/modules/UserManagementModule';

export default function Page() {
  return (
    <ModuleGuard module="user_management">
      <UserManagementModule />
    </ModuleGuard>
  );
}
