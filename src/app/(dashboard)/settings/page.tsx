
import { getGlobalSettings } from './actions';
import { SettingsForm } from './settings-form';
import { ManagementHelpDialog } from '@/components/dashboard/management-help-dialog';
import { KeyRound, LayoutDashboard, Palette, Settings, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const settings = await getGlobalSettings();

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.12] to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/[0.15] text-blue-100">
              <Settings className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Admin Configuration
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Global Settings</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Manage branding, startup behavior, dashboard visibility, integrations, and operational controls.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Palette className="h-3.5 w-3.5" />
                  Branding
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/[0.10] px-2.5 py-1 text-violet-100">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.10] px-2.5 py-1 text-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Access
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.10] px-2.5 py-1 text-amber-100">
                  <KeyRound className="h-3.5 w-3.5" />
                  Integrations
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            <ManagementHelpDialog page="settings" />
          </div>
        </div>
      </div>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
