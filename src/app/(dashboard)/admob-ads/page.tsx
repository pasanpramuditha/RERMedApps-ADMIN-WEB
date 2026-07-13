
'use client';

import * as React from 'react';
import { getAdSettings } from "./actions";
import { AdSettingsDataTable } from "@/components/admob-ads/ad-settings-data-table";
import { columns } from "./columns";
import { Skeleton } from '@/components/ui/skeleton';
import type { AdSettings } from './data';
import { AlertCircle, BadgeCheck, BarChart3, Megaphone, MonitorSmartphone, RefreshCw, ShieldCheck, Smartphone, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getGlobalSettings } from '../settings/actions';
import { AppManagementHelpDialog } from '@/components/dashboard/app-management-help-dialog';

export default function AdmobAdsPage() {
  const [platform, setPlatform] = React.useState<'android' | 'ios'>('android');
  const [adSettings, setAdSettings] = React.useState<AdSettings[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorCount, setErrorCount] = React.useState(0);
  const [debugResponses, setDebugResponses] = React.useState<unknown[]>([]);
  const [showDebugInfo, setShowDebugInfo] = React.useState(false);

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    const [globalSettings, adSettingsResult] = await Promise.all([
      getGlobalSettings(),
      getAdSettings(platform),
    ]);
    const { settings, errorCount, debugResponses } = adSettingsResult;
    setShowDebugInfo(globalSettings.debug_info_visibility || false);
    setAdSettings(settings);
    setErrorCount(errorCount);
    setDebugResponses(debugResponses);
    setLoading(false);
  }, [platform]);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const platformColumns = columns({ platform });
  const enabledCounts = React.useMemo(() => {
    return adSettings.reduce(
      (acc, row) => {
        const values = [row.settings.appOpen, row.settings.banner, row.settings.interstitial, row.settings.nativeAd];
        acc.enabled += values.filter((value) => value === true).length;
        acc.disabled += values.filter((value) => value === false).length;
        acc.notImplemented += values.filter((value) => value === undefined).length;
        return acc;
      },
      { enabled: 0, disabled: 0, notImplemented: 0 }
    );
  }, [adSettings]);

  const adTypeCounts = React.useMemo(() => {
    return adSettings.reduce(
      (acc, row) => {
        acc.banner += row.settings.banner === true ? 1 : 0;
        acc.interstitial += row.settings.interstitial === true ? 1 : 0;
        acc.nativeAd += row.settings.nativeAd === true ? 1 : 0;
        acc.appOpen += row.settings.appOpen === true ? 1 : 0;
        return acc;
      },
      { banner: 0, interstitial: 0, nativeAd: 0, appOpen: 0 }
    );
  }, [adSettings]);

  const platformOptions = [
    { value: 'android' as const, label: 'Android Apps', icon: MonitorSmartphone },
    { value: 'ios' as const, label: 'iOS Apps', icon: Smartphone },
  ];

  const totalPlacements = enabledCounts.enabled + enabledCounts.disabled + enabledCounts.notImplemented;

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <section className="relative min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_34%),#0b0d12] p-5 shadow-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-500/15 text-emerald-100 shadow-[0_12px_34px_rgba(16,185,129,0.15)]">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-300">Monetization Controls</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">AdMob Ads Management</h1>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                Monitor and update ad availability across app databases.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
            <AppManagementHelpDialog page="admob-ads" className="self-start sm:self-auto" />
            <div className="grid w-full grid-cols-2 gap-1.5 rounded-2xl border border-white/10 bg-black/25 p-1.5 sm:w-auto">
              {platformOptions.map((option) => {
                const Icon = option.icon;
                return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPlatform(option.value)}
                  className={cn(
                    'flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white',
                    platform === option.value && 'bg-blue-600 text-white shadow-[0_10px_28px_rgba(37,99,235,0.24)] hover:bg-blue-600 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              )})}
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="min-w-0 overflow-hidden rounded-2xl border-white/10 bg-card/75 shadow-sm">
          <CardContent className="flex min-h-[86px] items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/20 bg-sky-500/10 text-sky-200">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Apps Loaded</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? '-' : adSettings.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden rounded-2xl border-white/10 bg-card/75 shadow-sm">
          <CardContent className="flex min-h-[86px] items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10 text-emerald-200">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Enabled Placements</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? '-' : enabledCounts.enabled}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden rounded-2xl border-white/10 bg-card/75 shadow-sm">
          <CardContent className="flex min-h-[86px] items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Running Ad Summary</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Banner</span>
                  <span className="text-xl font-black text-white">{loading ? '-' : adTypeCounts.banner}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Init</span>
                  <span className="text-xl font-black text-white">{loading ? '-' : adTypeCounts.interstitial}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Native</span>
                  <span className="text-xl font-black text-white">{loading ? '-' : adTypeCounts.nativeAd}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">App Open</span>
                  <span className="text-xl font-black text-white">{loading ? '-' : adTypeCounts.appOpen}</span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{ width: loading || totalPlacements === 0 ? '0%' : `${Math.round((enabledCounts.enabled / totalPlacements) * 100)}%` }}
                />
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={fetchSettings} disabled={loading} className="rounded-xl border-white/10 bg-white/[0.04]">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </CardContent>
        </Card>
      </div>

      {errorCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Some app settings could not be loaded</AlertTitle>
          <AlertDescription>
            {errorCount} app{errorCount === 1 ? '' : 's'} returned backend errors. Open the table rows for details.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-card/75 p-4 shadow-sm">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-40 w-full" />
            <div className="flex justify-between">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-8 w-1/4" />
            </div>
        </div>
      ) : (
         <AdSettingsDataTable columns={platformColumns} data={adSettings} meta={{ platform, refreshData: fetchSettings }} />
      )}

      {!loading && showDebugInfo && (
        <div className="min-w-0 rounded-2xl border border-white/10 bg-card/75 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 className="h-4 w-4 text-blue-300" />
                Backend JSON Response Debug
              </h2>
              <p className="text-sm text-muted-foreground">
                Showing raw responses from {platform === 'ios' ? 'GET_IOS_ADMOBADS_SETTINGS' : 'GET_ANDROID_ADMOBADS_SETTINGS'}.
              </p>
            </div>
            <span className="text-sm text-muted-foreground">{debugResponses.length} responses</span>
          </div>
          <pre className="max-h-[420px] max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-muted-foreground">
            {JSON.stringify(debugResponses.slice(0, 10), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
