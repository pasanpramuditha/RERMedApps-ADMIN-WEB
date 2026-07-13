'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { WalletCards } from 'lucide-react';
import { getHomeMonthlyRevenueStats, type HomeMonthlyRevenueRow, type HomeRevenueRange } from '@/app/(dashboard)/home/actions';

const chartConfig = {
  androidRevenue: {
    label: 'Android Revenue',
    color: '#22c55e',
  },
  iosRevenue: {
    label: 'iOS Revenue',
    color: '#3b82f6',
  },
  admobRevenue: {
    label: 'AdMob Revenue',
    color: '#f59e0b',
  },
} satisfies ChartConfig;

const rangeOptions: Array<{ value: HomeRevenueRange; label: string }> = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
];

const formatCurrency = (value: number) => {
  return `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const compactCurrency = (value: number) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }

  return formatCurrency(amount);
};

function SourceBadge({ label, source }: { label: string; source: string }) {
  const isReport = source === 'report';
  return (
    <Badge
      variant="outline"
      className={isReport
        ? 'rounded-full border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
        : 'rounded-full border-amber-400/20 bg-amber-400/10 text-amber-100'}
    >
      {label}: {isReport ? 'Reports' : source === 'events' ? 'Events' : 'No data'}
    </Badge>
  );
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload || {};
  const items = [
    { label: 'Android', value: row.androidRevenue, color: '#22c55e', source: row.sources?.android },
    { label: 'iOS', value: row.iosRevenue, color: '#3b82f6', source: row.sources?.ios },
    { label: 'AdMob', value: row.admobRevenue, color: '#f59e0b', source: row.sources?.admob },
  ];

  return (
    <div className="min-w-[220px] rounded-2xl border border-white/10 bg-black/90 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/70">{label}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs font-semibold">{item.label}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/45">
                {item.source === 'report' ? 'report' : item.source === 'events' ? 'events' : 'none'}
              </span>
            </div>
            <span className="font-mono text-xs font-black">{formatCurrency(Number(item.value || 0))}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Total</span>
        <span className="font-mono text-sm font-black">{formatCurrency(Number(row.total || 0))}</span>
      </div>
    </div>
  );
}

export function RevenueBreakdownChart() {
  const [range, setRange] = React.useState<HomeRevenueRange>(6);
  const [rows, setRows] = React.useState<HomeMonthlyRevenueRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    async function loadRevenue() {
      setLoading(true);
      setError('');
      const result = await getHomeMonthlyRevenueStats(range);
      if (cancelled) return;
      setRows(result.data.rows);
      setError(result.error || '');
      setLoading(false);
    }

    loadRevenue();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totals = React.useMemo(() => rows.reduce((sum, row) => ({
    android: sum.android + row.androidRevenue,
    ios: sum.ios + row.iosRevenue,
    admob: sum.admob + row.admobRevenue,
    total: sum.total + row.total,
  }), { android: 0, ios: 0, admob: 0, total: 0 }), [rows]);

  const latestSources = rows[rows.length - 1]?.sources;

  return (
    <Card className="w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),linear-gradient(145deg,rgba(17,24,39,0.98),rgba(5,7,11,0.98))] shadow-2xl">
      <CardHeader className="flex flex-col gap-4 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white">
            <span className="rounded-xl bg-emerald-400/15 p-2 text-emerald-300 ring-1 ring-emerald-300/20">
              <WalletCards className="h-5 w-5" />
            </span>
            Monthly Revenue Chart
          </CardTitle>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">Reports first, events fallback when report data is missing</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-emerald-100 hover:bg-emerald-400/10">
            {compactCurrency(totals.total)}
          </Badge>
          <Select value={String(range)} onValueChange={(value) => setRange(Number(value) as HomeRevenueRange)}>
            <SelectTrigger className="h-9 w-[156px] rounded-full border-white/10 bg-white/[0.04] text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {error ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <Skeleton className="h-[360px] w-full rounded-2xl" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[360px] w-full">
            <BarChart data={rows} margin={{ top: 22, right: 22, left: 10, bottom: 6 }} barCategoryGap="24%" barGap={2}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.62)', fontSize: 11, fontWeight: 700 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => compactCurrency(Number(value))}
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700 }}
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={<RevenueTooltip />}
              />
              <Bar dataKey="androidRevenue" fill="var(--color-androidRevenue)" radius={[8, 8, 0, 0]} maxBarSize={34} />
              <Bar dataKey="iosRevenue" fill="var(--color-iosRevenue)" radius={[8, 8, 0, 0]} maxBarSize={34} />
              <Bar dataKey="admobRevenue" fill="var(--color-admobRevenue)" radius={[8, 8, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ChartContainer>
        )}

        <div className="grid gap-3 border-t border-white/10 pt-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap gap-2">
            {latestSources ? (
              <>
                <SourceBadge label="Android" source={latestSources.android} />
                <SourceBadge label="iOS" source={latestSources.ios} />
                <SourceBadge label="AdMob" source={latestSources.admob} />
              </>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-3 text-right text-xs">
            <div>
              <div className="font-black text-emerald-300">{compactCurrency(totals.android)}</div>
              <div className="uppercase tracking-widest text-white/35">Android</div>
            </div>
            <div>
              <div className="font-black text-blue-300">{compactCurrency(totals.ios)}</div>
              <div className="uppercase tracking-widest text-white/35">iOS</div>
            </div>
            <div>
              <div className="font-black text-amber-300">{compactCurrency(totals.admob)}</div>
              <div className="uppercase tracking-widest text-white/35">AdMob</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
