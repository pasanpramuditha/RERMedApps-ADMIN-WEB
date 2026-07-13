
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { AppFamilyForm } from '../../app-family-form';
import { getAppRegistryFamilyById } from '../../actions';
import { AppWindow, Layers3, MonitorSmartphone, Smartphone } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DEFAULT_ICON = "https://placehold.co/128x128.png";

export default async function EditAppPage({ params }: { params: { id: string } }) {
  const family = await getAppRegistryFamilyById(params.id);

  if (!family) {
    notFound();
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-hidden">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.14] via-transparent to-transparent" />
        <div
          className="pointer-events-none absolute -right-16 -top-20 hidden h-48 w-48 rounded-full opacity-20 blur-3xl sm:block"
          style={{ backgroundColor: family.theme_color || "#2f6fed" }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-sm">
              <Image
                src={family.icon_url || DEFAULT_ICON}
                alt={`${family.name} icon`}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.12] px-2.5 py-1 text-xs font-semibold text-blue-100">
                  <AppWindow className="h-3.5 w-3.5" />
                  App Registry
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground">
                  Order #{family.app_order}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Edit App</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Update shared profile, store identifiers, platform settings, and admin metadata for{" "}
                <span className="font-semibold text-foreground">{family.name}</span>.
              </p>
            </div>
          </div>

          <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Layers3 className="h-3.5 w-3.5" />
                Family
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-foreground">{family.db_name}</div>
            </div>
            <div className="min-w-0 rounded-xl border border-green-400/20 bg-green-500/[0.08] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-green-100/75">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                Android
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-green-100">{family.availability.android.label}</div>
            </div>
            <div className="min-w-0 rounded-xl border border-sky-400/20 bg-sky-500/[0.08] p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-sky-100/75">
                <Smartphone className="h-3.5 w-3.5" />
                iOS
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-sky-100">{family.availability.ios.label}</div>
            </div>
          </div>
        </div>
      </div>
      <AppFamilyForm family={family} />
    </div>
  );
}
