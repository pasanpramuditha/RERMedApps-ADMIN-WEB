
import { AppWindow, Layers3, PlusCircle, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppsDataTable } from './data-table';
import { getAppRegistryFamilies } from './actions';
import { ManagementHelpDialog } from '@/components/dashboard/management-help-dialog';

export const dynamic = 'force-dynamic';


export default async function AppsPage() {
  const apps = await getAppRegistryFamilies();
  const androidActiveCount = apps.filter((app) => app.availability.android.exists && app.availability.android.status !== 4).length;
  const iosActiveCount = apps.filter((app) => app.availability.ios.exists && app.availability.ios.status !== 4).length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.12] to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/[0.15] text-blue-100">
              <AppWindow className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                App Registry
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Apps</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Manage app profiles, store identifiers, platform settings, and active availability in one place.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Layers3 className="h-3.5 w-3.5" />
                  {apps.length} total app(s)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-400/20 bg-green-500/[0.10] px-2.5 py-1 text-green-100">
                  <Smartphone className="h-3.5 w-3.5" />
                  Android {androidActiveCount} Active apps
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/[0.10] px-2.5 py-1 text-sky-100">
                  <Smartphone className="h-3.5 w-3.5" />
                  iOS {iosActiveCount} Active apps
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <ManagementHelpDialog page="apps" />
            <Button asChild>
              <Link href="/apps/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add App
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <AppsDataTable data={apps} />
    </div>
  );
}
