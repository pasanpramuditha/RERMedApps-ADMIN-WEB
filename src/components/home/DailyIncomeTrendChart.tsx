'use client';

import * as React from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import {
  getHomeDailyIncomeStats,
  type HomeDailyIncomeRange,
  type HomeDailyIncomeRow,
} from '@/app/(dashboard)/home/actions';

const chartConfig = {
  androidRevenue: {
    label: 'Android Income',
    color: '#22c55e',
  },
  iosRevenue: {
    label: 'iOS Income',
    color: '#3b82f6',
  },
} satisfies ChartConfig;

const rangeOptions: Array<{ value: HomeDailyIncomeRange; label: string }> = [
  { value: 30, label: 'Last 30 days' },
  { value: 50, label: 'Last 50 days' },
];

const formatCurrency = (value: number) =>
  `$${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const compactCurrency = (value: number) => {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }

  return formatCurrency(amount);
};

function DailyIncomeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload || {};
  const total = Number(row.total || 0);

  return (
    <div className="min-w-[220px] rounded-2xl border border-white/10 bg-black/90 p-3 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
      <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-white/70">{label}</div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            <span className="text-xs font-semibold">Android</span>
          </div>
          <span className="font-mono text-xs font-black">{formatCurrency(Number(row.androidRevenue || 0))}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-xs font-semibold">iOS</span>
          </div>
          <span className="font-mono text-xs font-black">{formatCurrency(Number(row.iosRevenue || 0))}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Total</span>
        <span className="font-mono text-sm font-black">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export function DailyIncomeTrendChart() {
  const [range, setRange] = React.useState<HomeDailyIncomeRange>(30);
  const [rows, setRows] = React.useState<HomeDailyIncomeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    async function loadDailyIncome() {
      setLoading(true);
      setError('');
      const result = await getHomeDailyIncomeStats(range);
      if (cancelled) return;

      setRows(result.data.rows);
      setError(result.error || '');
      setLoading(false);
    }

    loadDailyIncome();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totals = React.useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          android: sum.android + row.androidRevenue,
          ios: sum.ios + row.iosRevenue,
          total: sum.total + row.total,
        }),
        { android: 0, ios: 0, total: 0 },
      ),
    [rows],
  );

  return (
    <Card className="w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_34%),linear-gradient(145deg,rgba(17,24,39,0.98),rgba(5,7,11,0.98))] shadow-2xl">
      <CardHeader className="flex flex-col gap-4 pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white">
            <span className="rounded-xl bg-cyan-400/15 p-2 text-cyan-300 ring-1 ring-cyan-300/20">
              <TrendingUp className="h-5 w-5" />
            </span>
            Daily Income Trend
          </CardTitle>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/35">
            Android and iOS app income over the last 30 or 50 days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-cyan-100 hover:bg-cyan-400/10">
            {compactCurrency(totals.total)}
          </Badge>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
            {rangeOptions.map((option) => {
              const active = range === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'ghost'}
                  onClick={() => setRange(option.value)}
                  className={[
                    'h-8 rounded-full px-4 text-xs font-semibold',
                    active
                      ? 'bg-white/15 text-white hover:bg-white/20'
                      : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {error ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <Skeleton className="h-[340px] w-full rounded-2xl" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[340px] w-full">
            <LineChart data={rows} margin={{ top: 20, right: 20, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(255,255,255,0.62)', fontSize: 11, fontWeight: 700 }}
                minTickGap={24}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => compactCurrency(Number(value))}
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700 }}
              />
              <ChartTooltip cursor={{ stroke: 'rgba(255,255,255,0.10)' }} content={<DailyIncomeTooltip />} />
              <Line
                type="monotone"
                dataKey="androidRevenue"
                stroke="var(--color-androidRevenue)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="iosRevenue"
                stroke="var(--color-iosRevenue)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}

        <div className="grid gap-3 border-t border-white/10 pt-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-widest">
            <Badge className="rounded-full border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-emerald-100 hover:bg-emerald-400/10">
              Android Income
            </Badge>
            <Badge className="rounded-full border-blue-300/20 bg-blue-400/10 px-3 py-1 text-blue-100 hover:bg-blue-400/10">
              iOS Income
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-right text-xs md:grid-cols-3">
            <div>
              <div className="font-black text-emerald-300">{compactCurrency(totals.android)}</div>
              <div className="uppercase tracking-widest text-white/35">Android</div>
            </div>
            <div>
              <div className="font-black text-blue-300">{compactCurrency(totals.ios)}</div>
              <div className="uppercase tracking-widest text-white/35">iOS</div>
            </div>
            <div className="md:col-span-1">
              <div className="font-black text-cyan-300">{compactCurrency(totals.total)}</div>
              <div className="uppercase tracking-widest text-white/35">Total</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
