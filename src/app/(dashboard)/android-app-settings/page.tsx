
import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import { AndroidAppSettingsPageClient } from '@/components/android-app-settings/android-app-settings-page-client';
import { AppManagementHelpDialog } from '@/components/dashboard/app-management-help-dialog';
import { BadgeCheck, Database, Settings2, Smartphone } from 'lucide-react';

export const dynamic = 'force-dynamic';

function supportsAndroid(app: App) {
  const os = app.os.toLowerCase().replace(/\s+/g, '');
  return os.includes('android');
}

export default async function AndroidAppSettingsPage() {
  const allApps = await getApps();
  const apps = allApps.filter((app) => supportsAndroid(app) && app.status === 2);

  return (
    <div className="min-w-0 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/[0.14] via-transparent to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.15] text-emerald-100">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Android Control Center
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Android App Settings</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Load Android apps and manage fnd_settings_tab values for each app database.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.10] px-2.5 py-1 text-emerald-100">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {apps.length} Live
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Database className="h-3.5 w-3.5" />
                  {apps.filter((app) => Boolean(app.db_name)).length} DB mapped
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Settings2 className="h-3.5 w-3.5" />
                  {apps.length} Live Android app(s)
                </span>
              </div>
            </div>
          </div>
          <div className="relative flex shrink-0 justify-start lg:justify-end">
            <AppManagementHelpDialog page="android-app-settings" />
          </div>
        </div>
      </div>
      <AndroidAppSettingsPageClient apps={apps} />
    </div>
  );
}
