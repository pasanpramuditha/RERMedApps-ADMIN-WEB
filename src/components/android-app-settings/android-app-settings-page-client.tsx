'use client';

import * as React from 'react';
import type { App } from '@/app/(dashboard)/apps/data';
import { AndroidAppsDataTable } from '@/components/android-app-settings/android-apps-data-table';
import { columns } from '@/components/android-app-settings/columns';

interface AndroidAppSettingsPageClientProps {
  apps: App[];
}

export function AndroidAppSettingsPageClient({ apps }: AndroidAppSettingsPageClientProps) {
  const [data] = React.useState(apps);

  return (
    <AndroidAppsDataTable
      columns={columns({ onAction: () => window.location.reload() })}
      data={data}
      isLoading={false}
    />
  );
}
