'use client';

import * as React from 'react';
import type { App } from '@/app/(dashboard)/apps/data';
import { IosAppsDataTable } from '@/components/ios-app-settings/ios-apps-data-table';
import { columns } from '@/components/ios-app-settings/columns';

interface IosAppSettingsPageClientProps {
  apps: App[];
}

export function IosAppSettingsPageClient({ apps }: IosAppSettingsPageClientProps) {
  const [data] = React.useState(apps);

  return (
    <IosAppsDataTable
      columns={columns({ onAction: () => window.location.reload() })}
      data={data}
      isLoading={false}
    />
  );
}
