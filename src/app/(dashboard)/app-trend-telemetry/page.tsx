'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Activity,
  AlertTriangle,
  AppWindow,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Gauge,
  LineChart as LineChartIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  getAppTrendTelemetry,
  type AppTrendPeriod,
  type AppTrendRow,
  type AppTrendStatus,
  type AppTrendTelemetry,
} from './actions';

type MetricKey = 'registrations' | 'returning' | 'premium' | 'activeSubs' | 'installs' | 'purchases' | 'refunds';

const pageSize = 5;

const periodOptions: Array<{ key: AppTrendPeriod; label: string; days: number }> = [
  { key: 'today', label: 'Today', days: 1 },
  { key: 'last7days', label: '7 Days', days: 7 },
  { key: 'this_month', label: 'This Month', days: 30 },
  { key: 'last3months', label: '3 Months', days: 90 },
  { key: 'last6months', label: '6 Months', days: 180 },
  { key: 'last_year', label: 'Last Year', days: 365 },
];

const metricOptions: Array<{ value: MetricKey; label: string }> = [
  { value: 'installs', label: 'Installs Daily Trend' },
  { value: 'purchases', label: 'Purchases Daily Trend' },
  { value: 'refunds', label: 'Refunds Rate Trend' },
  { value: 'returning', label: 'User Logins Trend' },
  { value: 'activeSubs', label: 'Active Subscribers Trend' },
  { value: 'registrations', label: 'Registrations Daily Trend' },
];

const metricLabels: Record<MetricKey, string> = {
  registrations: 'Registrations',
  returning: 'Returning Users',
  premium: 'Premium Flags',
  activeSubs: 'Active Subs',
  installs: 'Installs',
  purchases: 'Purchases',
  refunds: 'Refunds',
};

export default function AppTrendTelemetryPage() {
  const [telemetry, setTelemetry] = React.useState<AppTrendTelemetry | null>(null);
  const [selectedPeriod, setSelectedPeriod] = React.useState<AppTrendPeriod>('last7days');
  const [selectedAppId, setSelectedAppId] = React.useState('all');
  const [selectedMetric, setSelectedMetric] = React.useState<MetricKey>('registrations');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [pushAlarms, setPushAlarms] = React.useState(true);
  const [installLimit, setInstallLimit] = React.useState(-20);
  const [refundLimit, setRefundLimit] = React.useState(20);
  const [purchaseLimit, setPurchaseLimit] = React.useState(-20);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const activePeriod = periodOptions.find((period) => period.key === selectedPeriod) || periodOptions[1];

  React.useEffect(() => {
    let mounted = true;

    async function loadTelemetry() {
      setLoading(true);
      setError(null);
      const result = await getAppTrendTelemetry(selectedPeriod);
      if (!mounted) return;
      setTelemetry(result.data);
      setError(result.error || null);
      setLoading(false);
    }

    loadTelemetry();
    return () => {
      mounted = false;
    };
  }, [selectedPeriod, refreshKey]);

  const allRows = telemetry?.apps || [];
  const summary = telemetry?.summary || {
    registrations: 0,
    returning: 0,
    premium: 0,
    activeSubs: 0,
    installs: 0,
    purchases: 0,
    refunds: 0,
  };
  const selectedApp = selectedAppId === 'all' ? null : allRows.find((row) => row.appId === selectedAppId) || null;
  const chartRows = selectedApp?.daily?.length ? selectedApp.daily : telemetry?.daily || [];
  const chartSummary = selectedApp
    ? {
        registrations: selectedApp.registrations,
        premium: selectedApp.premium,
        purchases: selectedApp.purchases,
        refunds: selectedApp.refunds,
      }
    : {
        registrations: summary.registrations,
        premium: summary.premium,
        purchases: summary.purchases,
        refunds: summary.refunds,
      };

  const filteredRows = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allRows
      .filter((row) => !query || row.name.toLowerCase().includes(query) || row.packageName.toLowerCase().includes(query))
      .map((row) => ({
        ...row,
        status: statusFromThresholds(row, installLimit, refundLimit, purchaseLimit),
      }));
  }, [allRows, installLimit, purchaseLimit, refundLimit, searchQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedPeriod]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const alarmCount = filteredRows.filter((row) => row.status === 'Alarm').length;
  const rangeLabel = telemetry?.fromDate && telemetry?.toDate
    ? `${telemetry.fromDate} to ${telemetry.toDate}`
    : activePeriod.label;

  const incidents = React.useMemo(() => {
    return filteredRows
      .filter((row) => row.status !== 'Robust')
      .slice(0, 10)
      .map((row, index) => ({
        id: `${row.appId}-${index}`,
        time: new Date(Date.now() - index * 1000 * 60 * 18).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        appName: row.name,
        severity: row.status,
        message: incidentMessage(row, installLimit, refundLimit, purchaseLimit),
      }));
  }, [filteredRows, installLimit, purchaseLimit, refundLimit]);

  return (
    <div className="min-h-screen space-y-5 bg-black pb-10 text-white">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/30">
        <div className="relative px-5 py-5 lg:px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.12),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-200">
                <LineChartIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-blue-200/70">Android registrations and telemetry monitoring</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">App Trend Telemetry Analyzer</h1>
                <p className="mt-1 text-sm leading-5 text-white/50">
                  Real registration, Google Play install, purchase, refund, and subscription signals from backend telemetry.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 text-xs text-white/70">
                <RefreshCw className={cn('h-4 w-4 text-blue-300', autoRefresh && loading && 'animate-spin')} />
                <span>Auto-refresh stream</span>
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>
              <Button onClick={() => setRefreshKey((key) => key + 1)} className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500">
                <Zap className="mr-2 h-4 w-4" />
                Refresh Real Telemetry
              </Button>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive" className="border-red-500/30 bg-red-950/30 text-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Telemetry warning</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Returning Users', value: summary.returning, helper: 'From app registration tables', icon: RefreshCw, tone: 'text-emerald-300' },
          { label: 'Total Registered', value: summary.registrations, helper: rangeLabel, icon: Users, tone: 'text-blue-300' },
          { label: 'Premium Flags', value: summary.premium, helper: 'Premium or ads-free flags', icon: ShieldCheck, tone: 'text-amber-300' },
          { label: 'Active Subs', value: summary.activeSubs, helper: `${alarmCount} apps need review`, icon: CalendarDays, tone: 'text-violet-300' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#0b0c11] p-4 shadow-xl shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Icon className={cn('h-4 w-4', stat.tone)} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/55">{stat.label}</p>
                    <p className="mt-1 text-[11px] text-white/35">{stat.helper}</p>
                  </div>
                </div>
                <div className="text-right text-2xl font-semibold tabular-nums text-white">{loading ? '--' : stat.value.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#0b0c11] p-4 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
            <Filter className="h-4 w-4 text-blue-300" />
            Telemetry Filters
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-3 xl:max-w-4xl xl:grid-cols-6">
            {periodOptions.map((period) => (
              <Button
                key={period.key}
                type="button"
                variant="outline"
                onClick={() => setSelectedPeriod(period.key)}
                className={cn(
                  'h-10 justify-between rounded-xl border-white/10 bg-black/30 px-3 text-xs text-white/65 shadow-none hover:bg-white/[0.06] hover:text-white',
                  selectedPeriod === period.key && 'border-blue-500/60 bg-blue-600 text-white hover:bg-blue-500'
                )}
              >
                <span>{period.label}</span>
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">{period.days}d</span>
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={selectedAppId} onValueChange={setSelectedAppId}>
              <SelectTrigger className="h-10 min-w-[220px] rounded-xl border-white/10 bg-black/30 text-white shadow-none">
                <SelectValue placeholder="Application" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#101116] text-white">
                <SelectItem value="all">All Android Apps</SelectItem>
                {allRows.map((row) => (
                  <SelectItem key={row.appId} value={row.appId}>{row.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search apps"
                className="h-10 rounded-xl border-white/10 bg-black/30 pl-9 text-white placeholder:text-white/35"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AppWindow className="h-4 w-4 text-emerald-300" />
                <h2 className="text-lg font-semibold text-white">Application Directory and Trend Matrix</h2>
              </div>
              <p className="mt-1 text-sm text-white/45">
                All live Android apps across {rangeLabel}. Showing {paginatedRows.length} of {filteredRows.length}.
              </p>
            </div>
            <Badge className="w-fit rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/10">
              {pushAlarms ? 'Push alarms enabled' : 'Push alarms paused'}
            </Badge>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-14 rounded-xl bg-white/[0.06]" />)}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.18em] text-white/45">
                      <th className="px-5 py-4 font-semibold">Application</th>
                      <th className="px-4 py-4 font-semibold">Installs</th>
                      <th className="px-4 py-4 font-semibold">Purchases</th>
                      <th className="px-4 py-4 font-semibold">Refund Risk</th>
                      <th className="px-4 py-4 font-semibold">User Logins</th>
                      <th className="px-4 py-4 font-semibold">Active Subs</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr
                        key={row.appId}
                        onClick={() => setSelectedAppId(row.appId)}
                        className={cn(
                          'cursor-pointer border-b border-white/[0.06] text-sm outline-none last:border-0 hover:bg-white/[0.035]',
                          selectedAppId === row.appId && 'bg-blue-500/[0.08] shadow-[inset_3px_0_0_rgba(59,130,246,0.9)]'
                        )}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Image src={row.iconUrl} alt={row.name} width={34} height={34} className="h-8 w-8 rounded-xl object-cover" />
                            <div className="min-w-0">
                              <div className="max-w-[220px] truncate font-semibold text-white">{row.name}</div>
                              <div className="max-w-[260px] truncate text-xs text-white/35">{row.packageName || row.dbName || 'Identifier not set'}</div>
                            </div>
                          </div>
                        </td>
                        <MetricCell value={row.installDelta} count={row.installs} />
                        <MetricCell value={row.purchaseDelta} count={row.purchases} />
                        <MetricCell value={row.refundDelta} count={row.refunds} reverse />
                        <MetricCell value={row.loginDelta} count={row.returning} />
                        <MetricCell value={row.subsDelta} count={row.activeSubs} />
                        <td className="px-5 py-3">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                    {paginatedRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-white/45">No applications match the selected filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-white/45">
                  Page {safePage} of {totalPages} • 5 rows per page
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="h-9 rounded-xl border-white/10 bg-black/30 text-white hover:bg-white/[0.06]">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="h-9 rounded-xl border-white/10 bg-black/30 text-white hover:bg-white/[0.06]">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-300" />
                <h2 className="text-lg font-semibold text-white">{selectedApp ? selectedApp.name : 'Android App Fleet'}</h2>
              </div>
              <p className="mt-1 text-sm text-white/45">
                {selectedApp ? selectedApp.packageName || selectedApp.dbName : 'All apps'} daily values from {rangeLabel}
              </p>
            </div>
            <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricKey)}>
              <SelectTrigger className="h-9 w-[190px] rounded-xl border-white/10 bg-black/30 text-xs text-white shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-[#101116] text-white">
                {metricOptions.map((metric) => <SelectItem key={metric.value} value={metric.value}>{metric.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="p-5">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendMetricFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#111217', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, color: '#fff' }} />
                  <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.58)', fontSize: 12 }} />
                  <Area type="monotone" name={metricLabels[selectedMetric]} dataKey={selectedMetric} stroke="#3b82f6" strokeWidth={3} fill="url(#trendMetricFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'Registrations', value: chartSummary.registrations },
                { label: 'Premium', value: chartSummary.premium },
                { label: 'Purchases', value: chartSummary.purchases },
                { label: 'Refunds', value: chartSummary.refunds },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35">{item.label}</div>
                  <div className="mt-1 text-base font-semibold tabular-nums text-white">{item.value.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-[#0b0c11] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-blue-300" />
                <h2 className="text-lg font-semibold text-white">Custom Alarm and Dynamic Threshold Triggers</h2>
              </div>
              <p className="mt-1 text-sm text-white/45">Adjust local rules for trend warnings and app-level alert badges.</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span>Push Alarms</span>
              <Switch checked={pushAlarms} onCheckedChange={setPushAlarms} />
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ThresholdCard label="Installs Alarm Limit" value={installLimit} min={-40} max={0} onChange={setInstallLimit} suffix="%" />
            <ThresholdCard label="Refund Ratio Trigger" value={refundLimit} min={0} max={50} onChange={setRefundLimit} suffix="%" />
            <ThresholdCard label="Purchases Fall Limit" value={purchaseLimit} min={-40} max={0} onChange={setPurchaseLimit} suffix="%" />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-red-300" />
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Telemetry System Incident Logs</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setRefreshKey((key) => key + 1)} className="h-8 text-xs text-white/45 hover:bg-white/[0.06] hover:text-white">
              Refresh
            </Button>
          </div>
          <div className="max-h-[300px] space-y-2 overflow-y-auto p-4 [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin]">
            {incidents.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45">
                No threshold incidents in this filter.
              </div>
            ) : incidents.map((incident) => (
              <div key={incident.id} className="rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-white/35">{incident.time}</span>
                  <Badge className={cn('rounded-md px-1.5 py-0 text-[9px]', incident.severity === 'Alarm' ? 'bg-red-500/15 text-red-200' : 'bg-amber-500/15 text-amber-200')}>
                    {incident.severity.toUpperCase()}
                  </Badge>
                  <span className="truncate font-semibold text-white">{incident.appName}</span>
                </div>
                <p className="mt-2 text-white/60">{incident.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function statusFromThresholds(row: AppTrendRow, installLimit: number, refundLimit: number, purchaseLimit: number): AppTrendStatus {
  if (row.installDelta <= installLimit || row.refundDelta >= refundLimit || row.purchaseDelta <= purchaseLimit) {
    return 'Alarm';
  }
  if (row.installDelta < 0 || row.refundDelta > 0 || row.purchaseDelta < 0) {
    return 'Watch';
  }
  return 'Robust';
}

function incidentMessage(row: AppTrendRow, installLimit: number, refundLimit: number, purchaseLimit: number) {
  if (row.installDelta <= installLimit) return `Installs changed ${row.installDelta}% below threshold ${installLimit}%.`;
  if (row.refundDelta >= refundLimit) return `Refund risk changed +${row.refundDelta}% above threshold +${refundLimit}%.`;
  if (row.purchaseDelta <= purchaseLimit) return `Purchases changed ${row.purchaseDelta}% below threshold ${purchaseLimit}%.`;
  return 'Trend moved into watch range.';
}

function MetricCell({ value, count, reverse = false }: { value: number; count: number; reverse?: boolean }) {
  const isPositive = value >= 0;
  const good = reverse ? !isPositive : isPositive;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <td className="px-4 py-3">
      <div className={cn('flex items-center gap-1.5 font-mono text-xs font-bold', good ? 'text-emerald-300' : 'text-red-300')}>
        <Icon className="h-3.5 w-3.5" />
        <span>{isPositive ? '+' : ''}{value}%</span>
      </div>
      <div className="mt-1 text-[11px] text-white/35">{count.toLocaleString()} events</div>
    </td>
  );
}

function StatusBadge({ status }: { status: AppTrendStatus }) {
  const config = {
    Robust: { icon: CheckCircle2, className: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' },
    Watch: { icon: Bell, className: 'border-amber-400/20 bg-amber-500/10 text-amber-200' },
    Alarm: { icon: AlertTriangle, className: 'border-red-400/20 bg-red-500/10 text-red-200' },
  }[status];
  const Icon = config.icon;

  return (
    <Badge className={cn('gap-1 rounded-lg border px-2 py-1 text-[11px] hover:bg-transparent', config.className)}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

function ThresholdCard({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white/70">{label}</div>
        <div className="font-mono text-xs font-bold text-blue-200">{value}{suffix}</div>
      </div>
      <Slider className="mt-4" value={[value]} min={min} max={max} step={1} onValueChange={([next]) => onChange(next)} />
      <p className="mt-3 text-xs leading-5 text-white/35">
        Updates status and incident feed without changing backend values.
      </p>
    </div>
  );
}
