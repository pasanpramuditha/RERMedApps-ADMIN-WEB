
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { BadgeCheck, FilePlus, Megaphone, PlusCircle, RadioTower, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { InAppAdsDataTable } from "@/components/in-app-ads/in-app-ads-data-table";
import { columns } from "./columns";
import { getInAppAds } from "./actions";
import type { InAppAd } from './data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getGlobalSettings } from '../settings/actions';

export default function InAppAdsPage() {
  const [ads, setAds] = React.useState<InAppAd[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastApiResponse, setLastApiResponse] = React.useState<any>(null);
  const [showDebugInfo, setShowDebugInfo] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const [settings, fetchedAds] = await Promise.all([getGlobalSettings(), getInAppAds()]);
    setShowDebugInfo(settings.debug_info_visibility || false);
    setAds(fetchedAds);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const tableMeta = {
    setLastApiResponse,
    refreshData: fetchData,
  };

  const summary = React.useMemo(() => {
    return ads.reduce(
      (acc, ad) => {
        if (ad.status === 'Active') acc.active += 1;
        if (ad.status === 'Internal Testing') acc.testing += 1;
        if (ad.status === 'Paused') acc.paused += 1;
        if (ad.status === 'Pending') acc.pending += 1;
        return acc;
      },
      { active: 0, testing: 0, paused: 0, pending: 0 }
    );
  }, [ads]);

  const campaignProgress = ads.length > 0 ? Math.round(((summary.active + summary.testing) / ads.length) * 100) : 0;

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <section className="relative min-w-0 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_88%_8%,rgba(139,92,246,0.20),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(9,9,13,0.96))] p-5 shadow-2xl shadow-black/25">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045),transparent_45%,rgba(255,255,255,0.025))]" />
        <div className="relative flex min-w-0 items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/15 text-blue-100 shadow-lg shadow-blue-950/20">
            <Megaphone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.34em] text-blue-200/75">Promotion Studio</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">In-App Ads</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/55">Create, test, and publish reusable promotional ads from server-backed templates.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className="h-10 rounded-full border-white/10 bg-black/25 px-5 font-semibold text-white shadow-none hover:bg-white/[0.06]">
          <Link href="/in-app-ads/templates">
            <FilePlus className="mr-2 h-4 w-4" />
            Manage Templates
          </Link>
        </Button>
        <Button asChild className="h-10 rounded-full bg-blue-600 px-5 font-semibold text-white shadow-[0_10px_28px_rgba(37,99,235,0.24)] hover:bg-blue-500">
          <Link href="/in-app-ads/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create In-App Ad
          </Link>
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="min-w-0 overflow-hidden rounded-2xl border-white/10 bg-card/75 shadow-sm">
          <CardContent className="flex min-h-[86px] items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10 text-emerald-200">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Active Campaigns</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? '-' : summary.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden rounded-2xl border-white/10 bg-card/75 shadow-sm">
          <CardContent className="flex min-h-[86px] items-center gap-3 p-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/20 bg-amber-500/10 text-amber-200">
              <RadioTower className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Internal Testing</p>
              <p className="mt-1 text-2xl font-black text-white">{loading ? '-' : summary.testing}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden rounded-2xl border-white/10 bg-card/75 shadow-sm">
          <CardContent className="flex min-h-[86px] items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-300" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Campaign Pipeline</p>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Paused</span>
                  <span className="text-xl font-black text-white">{loading ? '-' : summary.paused}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="text-xl font-black text-white">{loading ? '-' : summary.pending}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground">Loaded</span>
                  <span className="text-xl font-black text-white">{loading ? '-' : ads.length}</span>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-400"
                  style={{ width: loading ? '0%' : `${campaignProgress}%` }}
                />
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} className="rounded-xl border-white/10 bg-white/[0.04]">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {showDebugInfo && lastApiResponse && (
         <Alert variant={lastApiResponse.error ? "destructive" : "default"}>
            <Megaphone className="h-4 w-4" />
            <AlertTitle>{lastApiResponse.error ? "API Error" : "API Response"}</AlertTitle>
            <AlertDescription>
                <ScrollArea className="h-32 w-full">
                    <pre className="whitespace-pre-wrap break-words text-xs">
                        {JSON.stringify(lastApiResponse, null, 2)}
                    </pre>
                </ScrollArea>
            </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-card/75 p-4 shadow-sm">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
         <InAppAdsDataTable columns={columns} data={ads} meta={tableMeta} />
      )}
    </div>
  );
}
