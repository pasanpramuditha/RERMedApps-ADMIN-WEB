'use client'

import * as React from 'react';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, isSameDay } from 'date-fns';
import { getHomeDashboardStats, getHomePageConfig, saveHomePageConfig } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeHorizonPicker } from '@/components/home/TimeHorizonPicker';
import { NetRevenueCard } from '@/components/home/NetRevenueCard';
import { StatCard } from '@/components/home/StatCard';
import { ActiveFunnelCard } from '@/components/home/ActiveFunnelCard';
import { PurchaseEventsCard } from '@/components/home/PurchaseEventsCard';
import { AdmobStatusCard } from '@/components/home/AdmobStatusCard';
import { DailyIncomeTrendChart } from '@/components/home/DailyIncomeTrendChart';
import { RevenueBreakdownChart } from '@/components/home/RevenueBreakdownChart';
import { ReferralSourceCard } from '@/components/home/ReferralSourceCard';
import { AdExpensesCard } from '@/components/home/AdExpensesCard';
import { RevenueFlowCard } from '@/components/home/RevenueFlowCard';
import { PurchaseEventsLog } from '@/components/home/PurchaseEventsLog';
import { Users, Activity, CreditCard, Wallet, Settings2, Bug, ChevronDown, ChevronUp, RefreshCw, Undo2 } from 'lucide-react';
import { defaultDashboardConfig } from '@/components/settings/dashboard-customization-form';
import { DashboardConfigDialog, ConfigItem } from '@/components/home/DashboardConfigDialog';
import { Button } from '@/components/ui/button';
import { AnalyticsHelpDialog } from '@/components/dashboard/analytics-help-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type HomeStats = Awaited<ReturnType<typeof getHomeDashboardStats>>;

const HOME_DASHBOARD_ITEMS: ConfigItem[] = [
  { key: 'netRevenue', label: 'Net Revenue', description: 'Show top-level net revenue summary' },
  { key: 'appInstalls', label: 'App Installs', description: 'Show total, Android, and iOS app installs' },
  { key: 'activeUsers', label: 'Active Users', description: 'Show current active monthly and yearly subscribers' },
  { key: 'purchaseEvents', label: 'Purchase Events', description: 'Show total purchase count' },
  { key: 'refundEvents', label: 'Refund Amount', description: 'Show refund amount deducted from app revenue' },
  { key: 'appRevenue', label: 'App Revenue', description: 'Show total revenue from app purchases' },
  { key: 'activeFunnel', label: 'Active Funnel', description: 'Show breakdown of active subscriptions' },
  { key: 'purchaseEventsDetails', label: 'Purchase Events Details', description: 'Show detailed recent purchase counts' },
  { key: 'admobStatus', label: 'Admob Status', description: 'Show Admob revenue, impressions, and CTR' },
  { key: 'dailyRevenueTrend', label: 'Daily Income Trend', description: 'Show Android and iOS income over the last 30 or 50 days' },
  { key: 'revenueBreakdown', label: 'Monthly Revenue Chart', description: 'Show Android, iOS, and AdMob monthly revenue chart' },
  { key: 'referralSource', label: 'Installation Referral Source', description: 'Show install acquisition sources by platform' },
  { key: 'adExpenses', label: 'Ad Expenses', description: 'Show ad costs, paid clicks, and paid revenue' },
  { key: 'revenueFlow', label: 'Revenue Flow', description: 'Show app income, AdMob income, ad expenses, and net' },
  { key: 'purchaseEventsLog', label: 'Purchase Events Log', description: 'Show detailed purchase logs table with user identities and revenue' },
];

const INITIAL_HOME_VISIBILITY = HOME_DASHBOARD_ITEMS.reduce<Record<string, boolean>>((config, item) => {
  config[item.key] = false;
  return config;
}, {});

export default function HomePage() {
  const [stats, setStats] = React.useState<HomeStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [platformIcons] = React.useState(defaultDashboardConfig.platformIcons);
  const [visibilityConfig, setVisibilityConfig] = React.useState<Record<string, boolean>>(INITIAL_HOME_VISIBILITY);
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = React.useState(0);
  const [showDebugInfo, setShowDebugInfo] = React.useState(false);
  const [configDialogOpen, setConfigDialogOpen] = React.useState(false);
  const [installDetailsOpen, setInstallDetailsOpen] = React.useState(false);
  const [activeUserDetailsOpen, setActiveUserDetailsOpen] = React.useState(false);
  const [purchaseDetailsOpen, setPurchaseDetailsOpen] = React.useState(false);
  const [refundDetailsOpen, setRefundDetailsOpen] = React.useState(false);
  const [revenueDetailsOpen, setRevenueDetailsOpen] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [configLoaded, setConfigLoaded] = React.useState(false);
  const mountedRef = React.useRef(false);
  const refreshRequestRef = React.useRef(0);
  const intervalRefreshInFlightRef = React.useRef(false);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isTodayActive = React.useMemo(() => {
    if (!date || !date.from || !date.to) return false;
    return isSameDay(date.from, startOfDay(new Date())) && isSameDay(date.to, endOfDay(new Date()));
  }, [date]);
  const appInstallHttpStatus = React.useMemo(() => {
    if (!stats?.appInstallDebug || !('httpStatus' in stats.appInstallDebug)) return undefined;
    return stats.appInstallDebug.httpStatus;
  }, [stats?.appInstallDebug]);
  const activeUsersHttpStatus = React.useMemo(() => {
    if (!stats?.activeUsersDebug || !('httpStatus' in stats.activeUsersDebug)) return undefined;
    return stats.activeUsersDebug.httpStatus;
  }, [stats?.activeUsersDebug]);

  const fetchStats = React.useCallback(async (
    nextDate: DateRange | undefined,
    nextVisibility: Record<string, boolean>,
    options: { showSkeleton: boolean }
  ) => {
    const requestId = ++refreshRequestRef.current;
    if (!mountedRef.current) {
      return;
    }

    if (options.showSkeleton) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await getHomeDashboardStats(nextDate, nextVisibility as any);
      if (mountedRef.current && requestId === refreshRequestRef.current) {
        setStats(data);
      }
    } finally {
      if (mountedRef.current && requestId === refreshRequestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      const config = await getHomePageConfig();
      if (cancelled) {
        return;
      }

      setVisibilityConfig(config.visibility);
      setRefreshIntervalSeconds(config.refreshIntervalSeconds);
      setShowDebugInfo(config.showDebugInfo);
      setConfigLoaded(true);
    }

    fetchConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!configLoaded) return;
    fetchStats(date, visibilityConfig, { showSkeleton: true });
  }, [configLoaded, date, fetchStats, visibilityConfig]);

  React.useEffect(() => {
    if (!refreshIntervalSeconds || refreshIntervalSeconds < 1 || loading) return;

    const intervalId = window.setInterval(async () => {
      if (intervalRefreshInFlightRef.current) return;
      intervalRefreshInFlightRef.current = true;
      try {
        await fetchStats(date, visibilityConfig, { showSkeleton: false });
      } finally {
        intervalRefreshInFlightRef.current = false;
      }
    }, refreshIntervalSeconds * 1000);

    return () => window.clearInterval(intervalId);
  }, [date, fetchStats, loading, refreshIntervalSeconds, visibilityConfig]);

  const handleSaveConfig = async (newConfig: Record<string, boolean>, newRefreshIntervalSeconds = refreshIntervalSeconds) => {
    const result = await saveHomePageConfig(newConfig, newRefreshIntervalSeconds);
    if ('error' in result) {
        throw new Error(result.error);
    }

    if (result.config) {
        setVisibilityConfig(result.config.visibility);
        setRefreshIntervalSeconds(result.config.refreshIntervalSeconds);
        setShowDebugInfo(result.config.showDebugInfo);
    } else {
        setVisibilityConfig(newConfig);
        setRefreshIntervalSeconds(newRefreshIntervalSeconds);
    }
  };

  const StatCardSkeleton = () => <Skeleton className="h-32 rounded-lg" />;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_88%_8%,rgba(16,185,129,0.20),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(4,11,10,0.96))] p-5 shadow-2xl shadow-black/25">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045),transparent_45%,rgba(255,255,255,0.025))]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/15 text-blue-100 shadow-lg shadow-blue-950/20">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.34em] text-blue-200/75">Operations Command</p>
                {isTodayActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300"></span>
                    </span>
                    Live
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Home</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/55">Live operational overview for installs, active users, revenue, and acquisition.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <AnalyticsHelpDialog page="home" />
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 rounded-full border-white/10 bg-black/25 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setConfigDialogOpen(true)}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Configure</span>
          </Button>
          {refreshIntervalSeconds > 0 && (
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-white/55 md:flex">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-400' : 'text-muted-foreground'}`} />
              {refreshing ? 'Updating' : `${refreshIntervalSeconds}s`}
            </div>
          )}
          <TimeHorizonPicker date={date} setDate={setDate} />
          {(visibilityConfig['netRevenue'] ?? true) && (loading ? (
            <Skeleton className="h-16 w-48" />
          ) : (
            <NetRevenueCard netRevenue={stats?.netRevenue} />
          ))}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {loading || !stats ? (
          <>
            {(visibilityConfig['appInstalls'] ?? true) && <StatCardSkeleton />}
            {(visibilityConfig['activeUsers'] ?? true) && <StatCardSkeleton />}
            {(visibilityConfig['purchaseEvents'] ?? true) && <StatCardSkeleton />}
            {(visibilityConfig['refundEvents'] ?? true) && <StatCardSkeleton />}
            {(visibilityConfig['appRevenue'] ?? true) && <StatCardSkeleton />}
          </>
        ) : (
          <>
            {(visibilityConfig['appInstalls'] ?? true) && (
              <StatCard
                title="App Installs"
                value={stats.appInstalls.total}
                androidValue={stats.appInstalls.android}
                iosValue={stats.appInstalls.apple}
                icon={Users}
                color="var(--card-blue)"
                onClick={() => setInstallDetailsOpen(true)}
                platformIcons={platformIcons}
              />
            )}
            {(visibilityConfig['activeUsers'] ?? true) && (
              <StatCard
                title="Active Users"
                value={stats.activeUsers}
                androidValue={stats.activeUsersAndroid}
                iosValue={stats.activeUsersIos}
                icon={Activity}
                color="var(--card-green)"
                onClick={() => setActiveUserDetailsOpen(true)}
                platformIcons={platformIcons}
              />
            )}
            {(visibilityConfig['purchaseEvents'] ?? true) && (
              <StatCard
                title="Purchase Events"
                value={stats.purchaseEvents.total}
                androidValue={stats.purchaseEvents.android}
                iosValue={stats.purchaseEvents.apple}
                icon={CreditCard}
                color="var(--card-orange)"
                onClick={() => setPurchaseDetailsOpen(true)}
                platformIcons={platformIcons}
              />
            )}
            {(visibilityConfig['refundEvents'] ?? true) && (
              <StatCard
                title="Refund Amount"
                value={stats.refundRevenue?.total ?? 0}
                androidValue={stats.refundRevenue?.android ?? 0}
                iosValue={stats.refundRevenue?.apple ?? 0}
                icon={Undo2}
                color="var(--card-red)"
                isCurrency
                onClick={() => setRefundDetailsOpen(true)}
                platformIcons={platformIcons}
              />
            )}
            {(visibilityConfig['appRevenue'] ?? true) && (
              <StatCard
                title="App Revenue"
                value={stats.appRevenue.total}
                androidValue={stats.appRevenue.android}
                iosValue={stats.appRevenue.apple}
                icon={Wallet}
                color="var(--card-purple)"
                isCurrency
                onClick={() => setRevenueDetailsOpen(true)}
                platformIcons={platformIcons}
              />
            )}
          </>
        )}
      </div>

      {/* API Debug Panel */}
      {showDebugInfo && !loading && stats && (visibilityConfig['appInstalls'] ?? true) && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-500/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">API Debug Panel — App Installs</span>
              {stats.appInstallDebug?.error && (
                <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">ERROR</span>
              )}
              {!stats.appInstallDebug?.error && stats.appInstalls.total > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">OK</span>
              )}
              {!stats.appInstallDebug?.error && stats.appInstalls.total === 0 && (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold">ZERO RESULTS</span>
              )}
            </div>
            {showDebug ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
          </button>
          {showDebug && stats.appInstallDebug && (
            <div className="px-4 pb-4 space-y-4 border-t border-amber-500/10">
              {/* Request Params */}
              <div className="mt-3">
                <h4 className="text-xs font-black text-white/60 uppercase tracking-wider mb-2">📤 Request Params Sent</h4>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-all">
{JSON.stringify(stats.appInstallDebug.requestParams, null, 2)}
                  </pre>
                </div>
              </div>

              {/* HTTP Status */}
              {appInstallHttpStatus !== undefined && (
                <div>
                  <h4 className="text-xs font-black text-white/60 uppercase tracking-wider mb-2">🌐 HTTP Status</h4>
                  <span className={`text-sm font-mono font-bold ${appInstallHttpStatus === 200 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {appInstallHttpStatus}
                  </span>
                </div>
              )}

              {/* Error */}
              {stats.appInstallDebug.error && (
                <div>
                  <h4 className="text-xs font-black text-red-400/80 uppercase tracking-wider mb-2">❌ Error</h4>
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <p className="text-xs text-red-300 font-mono">{stats.appInstallDebug.error}</p>
                  </div>
                </div>
              )}

              {/* Raw Response */}
              <div>
                <h4 className="text-xs font-black text-white/60 uppercase tracking-wider mb-2">📥 Raw Response</h4>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5 max-h-[400px] overflow-auto">
                  <pre className="text-xs text-blue-300 font-mono whitespace-pre-wrap break-all">
{typeof stats.appInstallDebug.rawResponse === 'string' 
  ? stats.appInstallDebug.rawResponse 
  : JSON.stringify(stats.appInstallDebug.rawResponse, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Parsed Result */}
              <div>
                <h4 className="text-xs font-black text-white/60 uppercase tracking-wider mb-2">✅ Parsed Install Counts</h4>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <pre className="text-xs text-purple-300 font-mono">
{JSON.stringify(stats.appInstalls, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Active Users Debug */}
              {stats.activeUsersDebug && (
                <div className="pt-4 border-t border-amber-500/10">
                  <h4 className="text-xs font-black text-white/60 uppercase tracking-wider mb-2">👥 Active Users API</h4>
                  {activeUsersHttpStatus !== undefined && (
                    <p className={`mb-2 text-xs font-mono font-bold ${activeUsersHttpStatus === 200 ? 'text-emerald-400' : 'text-red-400'}`}>
                      HTTP {activeUsersHttpStatus}
                    </p>
                  )}
                  {stats.activeUsersDebug.error && (
                    <div className="mb-3 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                      <p className="text-xs text-red-300 font-mono">{stats.activeUsersDebug.error}</p>
                    </div>
                  )}
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5 max-h-[400px] overflow-auto">
                    <pre className="text-xs text-blue-300 font-mono whitespace-pre-wrap break-all">
{typeof stats.activeUsersDebug.rawResponse === 'string'
  ? stats.activeUsersDebug.rawResponse
  : JSON.stringify(stats.activeUsersDebug.rawResponse, null, 2)}
                    </pre>
                  </div>
                  <div className="mt-3 bg-black/40 rounded-lg p-3 border border-white/5">
                    <pre className="text-xs text-purple-300 font-mono">
{JSON.stringify({
  android: stats.activeUsersAndroid,
  apple: stats.activeUsersIos,
  total: stats.activeUsers,
}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {loading || !stats ? (
            <>
                {(visibilityConfig['activeFunnel'] ?? true) && <StatCardSkeleton />}
                {(visibilityConfig['purchaseEventsDetails'] ?? true) && <StatCardSkeleton />}
                {(visibilityConfig['admobStatus'] ?? true) && <StatCardSkeleton />}
                {(visibilityConfig['referralSource'] ?? true) && <StatCardSkeleton />}
                {(visibilityConfig['adExpenses'] ?? true) && <StatCardSkeleton />}
                {(visibilityConfig['revenueFlow'] ?? true) && <StatCardSkeleton />}
            </>
         ) : (
            <>
                {(visibilityConfig['activeFunnel'] ?? true) && <ActiveFunnelCard data={stats.activeFunnel} platformIcons={platformIcons} />}
                {(visibilityConfig['purchaseEventsDetails'] ?? true) && <PurchaseEventsCard data={stats.purchaseStats} />}
                {(visibilityConfig['admobStatus'] ?? true) && <AdmobStatusCard data={stats.admobStatus} platformIcons={platformIcons} />}
                {(visibilityConfig['referralSource'] ?? true) && <ReferralSourceCard data={stats.referralSource} dateRangeLabel={getDateRangeLabel(date)} platformIcons={platformIcons} />}
                {(visibilityConfig['adExpenses'] ?? true) && <AdExpensesCard data={stats.adExpenses} paidRevenue={stats.appRevenue.total} platformIcons={platformIcons} />}
                {(visibilityConfig['revenueFlow'] ?? true) && <RevenueFlowCard data={stats.revenueFlow} />}
            </>
         )}
      </div>

      {(visibilityConfig['dailyRevenueTrend'] ?? true) && (
        <div className="w-full">
          <DailyIncomeTrendChart />
        </div>
      )}

      {(visibilityConfig['revenueBreakdown'] ?? true) && (
        <div className="w-full">
          <RevenueBreakdownChart />
        </div>
      )}

      {(visibilityConfig['purchaseEventsLog'] ?? true) && (
        <div className="w-full">
          <PurchaseEventsLog />
        </div>
      )}

      <DashboardConfigDialog 
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        config={visibilityConfig}
        items={HOME_DASHBOARD_ITEMS}
        onSave={handleSaveConfig}
        showRefreshInterval
        refreshIntervalSeconds={refreshIntervalSeconds}
      />

      <AppInstallDetailsDialog
        open={installDetailsOpen}
        onOpenChange={setInstallDetailsOpen}
        stats={stats}
        date={date}
      />
      <PurchaseDetailsDialog
        open={purchaseDetailsOpen}
        onOpenChange={setPurchaseDetailsOpen}
        stats={stats}
        date={date}
      />
      <RefundDetailsDialog
        open={refundDetailsOpen}
        onOpenChange={setRefundDetailsOpen}
        stats={stats}
        date={date}
      />
      <ActiveUserDetailsDialog
        open={activeUserDetailsOpen}
        onOpenChange={setActiveUserDetailsOpen}
        stats={stats}
        date={date}
      />
      <RevenueDetailsDialog
        open={revenueDetailsOpen}
        onOpenChange={setRevenueDetailsOpen}
        stats={stats}
        date={date}
      />
    </div>
  );
}

function ActiveUserDetailsDialog({
  open,
  onOpenChange,
  stats,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: HomeStats | null;
  date?: DateRange;
}) {
  const total = stats?.activeUsers ?? 0;
  const android = stats?.activeUsersAndroid ?? 0;
  const ios = stats?.activeUsersIos ?? 0;
  const rows = [
    { label: 'iOS Active Users', platform: 'iOS', count: ios },
    { label: 'Android Active Users', platform: 'Android', count: android },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-white/10 bg-[#08090d] p-0 shadow-2xl sm:max-w-3xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
        <DialogHeader className="border-b border-white/10 bg-white/[0.025] px-7 py-6">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight">Active User Details</DialogTitle>
              <DialogDescription className="mt-1">
                Users active during {getDateRangeLabel(date)}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-7 py-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-white/50">Total Active</p>
                <p className="mt-2 text-3xl font-black tabular-nums">{total.toLocaleString()}</p>
              </div>
              <Activity className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-white/[0.07]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-emerald-200/70">Android</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-emerald-100">{android.toLocaleString()}</p>
              </div>
              <AndroidPlatformIcon className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-emerald-200/[0.10]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-sky-400/15 bg-sky-400/[0.06] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-sky-200/70">iOS</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-sky-100">{ios.toLocaleString()}</p>
              </div>
              <ApplePlatformIcon className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-sky-200/[0.10]" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] border-b border-white/10 bg-white/[0.035] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
              <span>Metric</span>
              <span className="text-right">Platform</span>
              <span className="text-right">Users</span>
            </div>
            <div className="divide-y divide-white/10">
              {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_120px_120px] items-center px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.025]">
                  <span className="font-medium">{row.label}</span>
                  <div className="flex justify-end">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      row.platform === 'iOS'
                        ? 'border-sky-400/20 bg-sky-400/10 text-sky-100'
                        : row.platform === 'Android'
                          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                          : 'border-white/10 bg-white/5 text-white/80'
                    }`}>
                      {row.platform === 'iOS' ? (
                        <ApplePlatformIcon className="h-3.5 w-3.5" />
                      ) : row.platform === 'Android' ? (
                        <AndroidPlatformIcon className="h-3.5 w-3.5" />
                      ) : null}
                      {row.platform}
                    </span>
                  </div>
                  <span className="text-right text-xl font-black tabular-nums">{row.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {stats?.activeUsersDebug?.error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {stats.activeUsersDebug.error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AndroidPlatformIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M7.4 8.8h9.2a1.2 1.2 0 0 1 1.2 1.2v6.7a1.2 1.2 0 0 1-1.2 1.2h-.7v2.2a1.1 1.1 0 0 1-2.2 0v-2.2h-3.4v2.2a1.1 1.1 0 0 1-2.2 0v-2.2h-.7a1.2 1.2 0 0 1-1.2-1.2V10a1.2 1.2 0 0 1 1.2-1.2Z" />
      <path d="M4.6 10a1.1 1.1 0 0 1 1.1 1.1v4.7a1.1 1.1 0 0 1-2.2 0v-4.7A1.1 1.1 0 0 1 4.6 10Z" />
      <path d="M19.4 10a1.1 1.1 0 0 1 1.1 1.1v4.7a1.1 1.1 0 0 1-2.2 0v-4.7a1.1 1.1 0 0 1 1.1-1.1Z" />
      <path d="M8.3 4.2a.55.55 0 0 1 .76.17l.85 1.3A5.8 5.8 0 0 1 12 5.3c.74 0 1.45.13 2.1.37l.84-1.3a.55.55 0 1 1 .93.6l-.8 1.24a5.1 5.1 0 0 1 2.3 2.02H6.63a5.1 5.1 0 0 1 2.3-2.02l-.8-1.24a.55.55 0 0 1 .17-.76Z" />
    </svg>
  );
}

function ApplePlatformIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M16.3 2.2c.1 1-.3 2-1 2.8-.7.8-1.8 1.4-2.8 1.3-.1-1 .3-2 1-2.7.8-.8 1.9-1.4 2.8-1.4Z" />
      <path d="M20.2 17.2c-.5 1.1-.8 1.6-1.5 2.6-1 1.5-2.4 3.3-4.1 3.3-1.5 0-1.9-1-3.9-1-2.1 0-2.5 1-3.9 1-1.7 0-3-1.6-4-3.1-2.8-4.2-3.1-9.1-1.4-11.7 1.2-1.8 3.1-2.8 4.9-2.8 1.8 0 3 .9 4.5.9 1.4 0 2.3-.9 4.4-.9 1.6 0 3.2.8 4.4 2.2-3.9 2.1-3.3 7.7.6 9.5Z" />
    </svg>
  );
}

function getPlatformLabel(platform: string) {
  const normalized = platform.toLowerCase();
  if (normalized.includes('android')) return 'Android';
  if (normalized.includes('ios') || normalized.includes('apple')) return 'iOS';
  return platform || 'App';
}

function getDateRangeLabel(date?: DateRange) {
  if (!date?.from) return 'Selected period';
  const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!date.to || isSameDay(date.from, date.to)) {
    return formatter.format(date.from);
  }
  return `${formatter.format(date.from)} - ${formatter.format(date.to)}`;
}

function AppInstallDetailsDialog({
  open,
  onOpenChange,
  stats,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: HomeStats | null;
  date?: DateRange;
}) {
  const [platformFilter, setPlatformFilter] = React.useState<'total' | 'android' | 'ios'>('total');

  React.useEffect(() => {
    if (open) {
      setPlatformFilter('total');
    }
  }, [open]);

  const rows = React.useMemo(() => {
    return [...(stats?.appInstallBreakdown || [])]
      .map((row) => {
        const platformLabel = getPlatformLabel(row.platform);
        const isIos = platformLabel === 'iOS';
        const platformKey = isIos ? 'ios' : 'android';
        const visibleCount = platformFilter === 'total'
          ? row.total
          : platformFilter === 'ios'
            ? row.apple
            : row.android;

        return {
          ...row,
          platformLabel,
          platformKey,
          visibleCount,
        };
      })
      .filter((row) => row.visibleCount > 0 && (platformFilter === 'total' || row.platformKey === platformFilter))
      .sort((a, b) => b.visibleCount - a.visibleCount || a.appName.localeCompare(b.appName));
  }, [platformFilter, stats?.appInstallBreakdown]);

  const filterCards = [
    {
      key: 'total' as const,
      label: 'Total Installs',
      value: stats?.appInstalls.total ?? 0,
      icon: Users,
      className: 'border-white/10 bg-white/[0.035] text-white',
      activeClassName: 'border-blue-300/50 bg-blue-500/15 shadow-[0_0_34px_rgba(59,130,246,0.18)]',
      iconClassName: 'text-white/[0.08]',
    },
    {
      key: 'android' as const,
      label: 'Android',
      value: stats?.appInstalls.android ?? 0,
      icon: AndroidPlatformIcon,
      className: 'border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-100',
      activeClassName: 'border-emerald-300/55 bg-emerald-400/[0.13] shadow-[0_0_34px_rgba(52,211,153,0.16)]',
      iconClassName: 'text-emerald-200/[0.10]',
    },
    {
      key: 'ios' as const,
      label: 'iOS',
      value: stats?.appInstalls.apple ?? 0,
      icon: ApplePlatformIcon,
      className: 'border-sky-400/15 bg-sky-400/[0.06] text-sky-100',
      activeClassName: 'border-sky-300/55 bg-sky-400/[0.13] shadow-[0_0_34px_rgba(56,189,248,0.16)]',
      iconClassName: 'text-sky-200/[0.10]',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-white/10 bg-[#08090d] p-0 shadow-2xl sm:max-w-3xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
        <DialogHeader className="border-b border-white/10 bg-white/[0.025] px-7 py-6">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight">App Install Details</DialogTitle>
              <DialogDescription className="mt-1">
                Installs by app for {getDateRangeLabel(date)}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 px-7 pt-5">
          {filterCards.map((card) => {
            const Icon = card.icon;
            const selected = platformFilter === card.key;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => setPlatformFilter(card.key)}
                className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 ${card.className} ${selected ? card.activeClassName : ''}`}
              >
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-white/55">{card.label}</p>
                    <p className="mt-2 text-3xl font-black tabular-nums">{card.value.toLocaleString()}</p>
                  </div>
                  {selected && (
                    <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/80">
                      Selected
                    </span>
                  )}
                </div>
                <Icon className={`absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 ${card.iconClassName}`} />
              </button>
            );
          })}
        </div>

        <div className="max-h-[62vh] overflow-auto px-7 pb-7 pt-4">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-sm text-muted-foreground">
              No app installs found for this period.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_96px] gap-3 border-b border-white/10 bg-white/[0.035] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
                <span>App</span>
                <span className="text-right">Platform</span>
                <span className="text-right">Installs</span>
              </div>
              <div className="divide-y divide-white/10">
                {rows.map((row) => {
                  const isIos = row.platformLabel === 'iOS';

                  return (
                    <div key={`${row.appId}-${row.appDb}-${row.platform}`} className="grid grid-cols-[minmax(0,1fr)_120px_96px] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025]">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
                          {row.iconUrl ? (
                            <img src={row.iconUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            isIos ? <ApplePlatformIcon className="h-5 w-5" /> : <AndroidPlatformIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{row.appName}</p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isIos ? 'border-sky-400/20 bg-sky-400/10 text-sky-100' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'}`}>
                          {isIos ? <ApplePlatformIcon className="h-3.5 w-3.5" /> : <AndroidPlatformIcon className="h-3.5 w-3.5" />}
                          {row.platformLabel}
                        </span>
                      </div>
                      <p className="text-right text-xl font-black tabular-nums">{row.visibleCount.toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <details className="mt-4 rounded-lg border border-white/10 bg-white/[0.025]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:text-white">
              API Debug Response
            </summary>
            <div className="space-y-3 border-t border-white/10 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request Payload</p>
                <pre className="max-h-40 overflow-auto rounded-md bg-black/50 p-3 text-xs text-emerald-300">
{JSON.stringify(stats?.appInstallDebug?.requestParams ?? null, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raw Response</p>
                <pre className="max-h-72 overflow-auto rounded-md bg-black/50 p-3 text-xs text-blue-300">
{typeof stats?.appInstallDebug?.rawResponse === 'string'
  ? stats.appInstallDebug.rawResponse
  : JSON.stringify(stats?.appInstallDebug?.rawResponse ?? null, null, 2)}
                </pre>
              </div>
              {stats?.appInstallDebug?.error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  {stats.appInstallDebug.error}
                </div>
              )}
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'LKR' ? 0 : 2,
    maximumFractionDigits: currency === 'LKR' ? 0 : 2,
  }).format(value || 0);
}

function PurchaseDetailsDialog({
  open,
  onOpenChange,
  stats,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: HomeStats | null;
  date?: DateRange;
}) {
  const purchaseStats = stats?.purchaseStats;
  type PurchaseBreakdownType = 'monthly' | 'yearly' | 'lifetime' | 'offer';
  const [selectedType, setSelectedType] = React.useState<PurchaseBreakdownType | null>(null);
  const rows = [
    { key: 'monthly' as const, label: 'Monthly Subscriptions', value: purchaseStats?.monthlySubscribers },
    { key: 'yearly' as const, label: 'Yearly Subscriptions', value: purchaseStats?.yearlySubscribers },
    { key: 'lifetime' as const, label: 'Lifetime Purchases', value: purchaseStats?.lifetimePurchases },
    { key: 'offer' as const, label: 'Offer Purchases', value: purchaseStats?.offerPurchases },
  ].filter((row) => row.value);
  const selectedRow = rows.find((row) => row.key === selectedType);
  const selectedApps = selectedType ? (purchaseStats?.appBreakdown?.[selectedType] || []) : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden border-white/10 bg-[#08090d] p-0 shadow-2xl sm:max-w-3xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
        <DialogHeader className="border-b border-white/10 bg-white/[0.025] px-7 py-6">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight">Purchase Event Details</DialogTitle>
              <DialogDescription className="mt-1">
                Android and iOS purchase events for {getDateRangeLabel(date)}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-7 py-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-white/50">Total Events</p>
                <p className="mt-2 text-3xl font-black tabular-nums">{stats?.purchaseEvents.total.toLocaleString() ?? 0}</p>
              </div>
              <CreditCard className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-white/[0.07]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-emerald-200/70">Android</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-emerald-100">{stats?.purchaseEvents.android.toLocaleString() ?? 0}</p>
              </div>
              <AndroidPlatformIcon className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-emerald-200/[0.10]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-sky-400/15 bg-sky-400/[0.06] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-sky-200/70">iOS</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-sky-100">{stats?.purchaseEvents.apple.toLocaleString() ?? 0}</p>
              </div>
              <ApplePlatformIcon className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-sky-200/[0.10]" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
            <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_90px] border-b border-white/10 bg-white/[0.035] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
              <span>Type</span>
              <span className="text-right">iOS</span>
              <span className="text-right">Android</span>
              <span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-white/10">
              {rows.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={() => setSelectedType(row.key)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_90px_90px_90px] px-5 py-3.5 text-left text-sm transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50"
                >
                  <span className="font-medium">{row.label}</span>
                  <span className="text-right font-semibold tabular-nums text-sky-100">{row.value?.apple?.toLocaleString() ?? 0}</span>
                  <span className="text-right font-semibold tabular-nums text-emerald-100">{row.value?.android?.toLocaleString() ?? 0}</span>
                  <span className="text-right text-lg font-black tabular-nums">{row.value?.total?.toLocaleString() ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {stats?.purchaseDebug?.error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {stats.purchaseDebug.error}
            </div>
          )}
        </div>
        </DialogContent>
      </Dialog>

        <PurchaseAppBreakdownDialog
        open={!!selectedType}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedType(null);
        }}
        title={selectedRow?.label || 'Purchase Apps'}
        apps={selectedApps}
        debug={stats?.purchaseDebug?.rawResponse?.purchases?.appBreakdown}
        date={date}
      />
    </>
  );
}

function RefundDetailsDialog({
  open,
  onOpenChange,
  stats,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: HomeStats | null;
  date?: DateRange;
}) {
  const refundRevenue = stats?.refundRevenue || { total: 0, android: 0, apple: 0 };
  const rows = [
    { label: 'iOS Refund Events', platform: 'iOS', value: stats?.refundEvents.apple ?? 0, amount: refundRevenue.apple ?? 0 },
    { label: 'Android Refund Events', platform: 'Android', value: stats?.refundEvents.android ?? 0, amount: refundRevenue.android ?? 0 },
    { label: 'Total Refund Events', platform: 'All', value: stats?.refundEvents.total ?? 0, amount: refundRevenue.total ?? 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-white/10 bg-[#08090d] p-0 shadow-2xl sm:max-w-3xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
        <DialogHeader className="border-b border-white/10 bg-white/[0.025] px-7 py-6">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-300 ring-1 ring-red-400/20">
              <Undo2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight">Refund Amount Details</DialogTitle>
              <DialogDescription className="mt-1">
                Refund amounts deducted from app revenue for {getDateRangeLabel(date)}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-7 py-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-white/50">Total Refunds</p>
                <p className="mt-2 text-3xl font-black tabular-nums">{stats?.refundEvents.total.toLocaleString() ?? 0}</p>
              </div>
              <Undo2 className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-white/[0.07]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-emerald-200/70">Android</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-emerald-100">{formatMoney(refundRevenue.android ?? 0)}</p>
              </div>
              <AndroidPlatformIcon className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-emerald-200/[0.10]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-sky-400/15 bg-sky-400/[0.06] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-sky-200/70">iOS</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-sky-100">{formatMoney(refundRevenue.apple ?? 0)}</p>
              </div>
              <ApplePlatformIcon className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-sky-200/[0.10]" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
            <div className="grid grid-cols-[minmax(0,1fr)_130px_110px_120px] border-b border-white/10 bg-white/[0.035] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
              <span>Metric</span>
              <span className="text-right">Platform</span>
              <span className="text-right">Events</span>
              <span className="text-right">Deduction</span>
            </div>
            <div className="divide-y divide-white/10">
              {rows.map((row) => (
                <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_130px_110px_120px] items-center px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.025]">
                  <span className="font-medium">{row.label}</span>
                  <div className="flex justify-end">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      row.platform === 'iOS'
                        ? 'border-sky-400/20 bg-sky-400/10 text-sky-100'
                        : row.platform === 'Android'
                          ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                          : 'border-white/10 bg-white/[0.06] text-white/70'
                    }`}>
                      {row.platform === 'iOS' ? (
                        <ApplePlatformIcon className="h-3.5 w-3.5" />
                      ) : row.platform === 'Android' ? (
                        <AndroidPlatformIcon className="h-3.5 w-3.5" />
                      ) : (
                        <Undo2 className="h-3.5 w-3.5" />
                      )}
                      {row.platform}
                    </span>
                  </div>
                  <span className="text-right text-lg font-black tabular-nums">{row.value.toLocaleString()}</span>
                  <span className="text-right font-semibold tabular-nums text-red-200">-{formatMoney(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-red-400/15 bg-red-400/[0.055] px-4 py-3 text-sm text-red-100/85">
            Refund deduction {formatMoney(refundRevenue.total ?? 0)} is subtracted from gross app revenue before showing App Revenue and Net Revenue.
          </div>

          {stats?.purchaseDebug?.error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {stats.purchaseDebug.error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseAppBreakdownDialog({
  open,
  onOpenChange,
  title,
  apps,
  debug,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  apps: Array<{
    app_id?: string;
    apple_app_id?: string;
    app_name: string;
    app_key?: string;
    product_id?: string;
    package_name?: string;
    platform: string;
    icon_url?: string;
    count: number;
    revenue_lkr: number;
    revenue_usd: number;
  }>;
  debug?: unknown;
  date?: DateRange;
}) {
  const totalCount = apps.reduce((sum, app) => sum + (Number(app.count) || 0), 0);
  const totalUsd = apps.reduce((sum, app) => sum + (Number(app.revenue_usd) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-white/10 bg-[#08090d] p-0 shadow-2xl sm:max-w-2xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
        <DialogHeader className="border-b border-white/10 bg-white/[0.025] px-7 py-6">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">{title}</DialogTitle>
              <DialogDescription className="mt-1">
                Apps that generated these purchases for {getDateRangeLabel(date)}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-7 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <p className="text-[11px] font-medium text-white/50">Purchase Events</p>
              <p className="mt-2 text-3xl font-black tabular-nums">{totalCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-orange-400/15 bg-orange-400/[0.06] p-4">
              <p className="text-[11px] font-medium text-orange-200/70">Revenue</p>
              <p className="mt-2 text-3xl font-black tabular-nums text-orange-100">{formatMoney(totalUsd)}</p>
            </div>
          </div>

          {apps.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] py-12 text-center text-sm text-muted-foreground">
                No app-level purchases found for this type.
              </div>
              <details className="rounded-lg border border-white/10 bg-white/[0.025]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-white/70 transition-colors hover:text-white">
                  App Breakdown Debug
                </summary>
                <pre className="max-h-56 overflow-auto border-t border-white/10 bg-black/50 p-4 text-xs text-blue-300">
{JSON.stringify(debug ?? null, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
              <div className="grid grid-cols-[minmax(0,1fr)_110px_90px_110px] border-b border-white/10 bg-white/[0.035] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
                <span>App</span>
                <span className="text-right">Platform</span>
                <span className="text-right">Events</span>
                <span className="text-right">Revenue</span>
              </div>
              <div className="max-h-[45vh] divide-y divide-white/10 overflow-auto">
                {apps.map((app) => {
                  const isIos = app.platform === 'apple' || app.platform === 'ios';
                  const isMappedApp = Boolean(app.app_id);
                  const appDetailText = isMappedApp ? '' : app.package_name || app.product_id || app.app_key;
                  return (
                    <div key={`${app.platform}-${app.app_id || app.app_key || app.product_id}`} className="grid grid-cols-[minmax(0,1fr)_110px_90px_110px] items-center gap-3 px-5 py-3.5 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
                          {app.icon_url ? (
                            <img src={app.icon_url} alt="" className="h-full w-full object-cover" />
                          ) : isIos ? (
                            <ApplePlatformIcon className="h-5 w-5 text-sky-100" />
                          ) : (
                            <AndroidPlatformIcon className="h-5 w-5 text-emerald-100" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{app.app_name}</p>
                          {appDetailText ? (
                            <p className="truncate text-xs text-muted-foreground">{appDetailText}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isIos ? 'border-sky-400/20 bg-sky-400/10 text-sky-100' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'}`}>
                          {isIos ? <ApplePlatformIcon className="h-3.5 w-3.5" /> : <AndroidPlatformIcon className="h-3.5 w-3.5" />}
                          {isIos ? 'iOS' : 'Android'}
                        </span>
                      </div>
                      <span className="text-right text-lg font-black tabular-nums">{Number(app.count || 0).toLocaleString()}</span>
                      <span className="text-right font-semibold tabular-nums">{formatMoney(Number(app.revenue_usd || 0))}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RevenueDetailsDialog({
  open,
  onOpenChange,
  stats,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: HomeStats | null;
  date?: DateRange;
}) {
  const grossRevenue = stats?.grossAppRevenue || stats?.appRevenue || { total: 0, android: 0, apple: 0 };
  const grossRevenueLkr = stats?.grossAppRevenueLkr || stats?.appRevenueLkr || { total: 0, android: 0, apple: 0 };
  const refundRevenue = stats?.refundRevenue || { total: 0, android: 0, apple: 0 };
  const refundRevenueLkr = stats?.refundRevenueLkr || { total: 0, android: 0, apple: 0 };
  const netRevenue = stats?.netAppRevenue || {
    android: (grossRevenue.android || 0) - (refundRevenue.android || 0),
    apple: (grossRevenue.apple || 0) - (refundRevenue.apple || 0),
    total: (grossRevenue.total || 0) - (refundRevenue.total || 0),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-white/10 bg-[#08090d] p-0 shadow-2xl sm:max-w-3xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
        <DialogHeader className="border-b border-white/10 bg-white/[0.025] px-7 py-6">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold tracking-tight">App Revenue Details</DialogTitle>
              <DialogDescription className="mt-1">
                Revenue from Android global purchases and iOS subscription events for {getDateRangeLabel(date)}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-7 py-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-white/50">Gross Sales</p>
                <p className="mt-2 text-3xl font-black tabular-nums">{formatMoney(grossRevenue.total ?? 0)}</p>
              </div>
              <Wallet className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-white/[0.07]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-red-400/15 bg-red-400/[0.06] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-red-200/70">Refund Deduction</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-red-100">-{formatMoney(refundRevenue.total ?? 0)}</p>
              </div>
              <Undo2 className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-red-200/[0.10]" />
            </div>
            <div className="relative overflow-hidden rounded-lg border border-purple-400/15 bg-purple-400/[0.08] p-4">
              <div className="relative z-10">
                <p className="text-[11px] font-medium text-purple-200/70">Net App Revenue</p>
                <p className="mt-2 text-3xl font-black tabular-nums text-purple-100">{formatMoney(netRevenue.total ?? 0)}</p>
              </div>
              <Wallet className="absolute right-3 top-1/2 h-16 w-16 -translate-y-1/2 text-purple-200/[0.10]" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-white/10 bg-black/20">
            <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_120px] border-b border-white/10 bg-white/[0.035] px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
              <span>Platform</span>
              <span className="text-right">Gross</span>
              <span className="text-right">Refunds</span>
              <span className="text-right">Net</span>
            </div>
            <div className="divide-y divide-white/10">
              {[
                { label: 'iOS', gross: grossRevenue.apple ?? 0, refunds: refundRevenue.apple ?? 0, net: netRevenue.apple ?? 0 },
                { label: 'Android', gross: grossRevenue.android ?? 0, refunds: refundRevenue.android ?? 0, net: netRevenue.android ?? 0 },
                { label: 'Total', gross: grossRevenue.total ?? 0, refunds: refundRevenue.total ?? 0, net: netRevenue.total ?? 0 },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_120px_120px_120px] items-center px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.025]">
                  <div className="flex items-center gap-2 font-medium">
                    {row.label === 'iOS' ? (
                      <ApplePlatformIcon className="h-4 w-4 text-sky-100" />
                    ) : row.label === 'Android' ? (
                      <AndroidPlatformIcon className="h-4 w-4 text-emerald-100" />
                    ) : (
                      <Wallet className="h-4 w-4 text-white/70" />
                    )}
                    {row.label}
                  </div>
                  <span className="text-right font-semibold tabular-nums text-white/75">{formatMoney(row.gross)}</span>
                  <span className="text-right font-semibold tabular-nums text-red-200">-{formatMoney(row.refunds)}</span>
                  <span className={`text-right text-lg font-black tabular-nums ${row.label === 'iOS' ? 'text-sky-100' : row.label === 'Android' ? 'text-emerald-100' : ''}`}>
                    {formatMoney(row.net)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-purple-400/15 bg-purple-400/[0.055] px-4 py-3 text-sm text-purple-100/85">
            Net App Revenue = Gross Sales {formatMoney(grossRevenue.total ?? 0)} - Refunds {formatMoney(refundRevenue.total ?? 0)} = {formatMoney(netRevenue.total ?? 0)}.
          </div>

          {stats?.purchaseDebug?.error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {stats.purchaseDebug.error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
