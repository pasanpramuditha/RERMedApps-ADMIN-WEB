'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppRevenueBreakdown } from '@/app/(dashboard)/dashboard/actions';
import { BadgeDollarSign, Globe, Smartphone, TrendingDown } from 'lucide-react';

type RevenuePanelKind = 'app' | 'admob' | 'adExpense';

type RevenueQuickPanelProps = {
  children: React.ReactNode;
  kind: RevenuePanelKind;
  rows?: AppRevenueBreakdown[];
  dataReady?: boolean;
};

const panelConfig = {
  app: {
    title: 'App Revenue',
    description: 'iOS and Android app proceeds by product.',
    icon: Smartphone,
    accent: 'border-blue-400/20 bg-blue-500/[0.10] text-blue-100',
  },
  admob: {
    title: 'AdMob Revenue',
    description: 'AdMob earnings grouped by app.',
    icon: Globe,
    accent: 'border-amber-400/20 bg-amber-500/[0.10] text-amber-100',
  },
  adExpense: {
    title: 'Ad Expenses',
    description: 'Google Ads spend matched by app and platform.',
    icon: TrendingDown,
    accent: 'border-rose-400/20 bg-rose-500/[0.10] text-rose-100',
  },
} as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function valueForKind(row: AppRevenueBreakdown, kind: RevenuePanelKind) {
  if (kind === 'app') {
    return row.iosRevenue + row.androidRevenue;
  }

  if (kind === 'admob') {
    return row.admobRevenue;
  }

  return row.iosAdExpense + row.androidAdExpense;
}

export function RevenueQuickPanel({ children, kind, rows: initialRows = [], dataReady = false }: RevenueQuickPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<AppRevenueBreakdown[]>(() => initialRows.filter((row) => valueForKind(row, kind) > 0));
  const config = panelConfig[kind];
  const Icon = config.icon;

  const fetchData = React.useCallback(async () => {
    setLoading(!dataReady);
    setRows(initialRows.filter((row) => valueForKind(row, kind) > 0));
    if (dataReady) setLoading(false);
  }, [dataReady, initialRows, kind]);

  React.useEffect(() => {
    setRows(initialRows.filter((row) => valueForKind(row, kind) > 0));
  }, [initialRows, kind]);

  React.useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  const total = rows.reduce((sum, row) => sum + valueForKind(row, kind), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[86vh] overflow-hidden rounded-3xl border-white/10 bg-[#0D0D11] p-0 text-white shadow-2xl sm:max-w-4xl">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 py-5 pl-6 pr-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.10] to-transparent" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${config.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-black italic tracking-tight">{config.title}</DialogTitle>
                  <Badge variant="outline" className="h-8 rounded-full border-white/10 bg-white/[0.04] px-3 text-white/70">
                    {rows.length} app{rows.length === 1 ? '' : 's'}
                  </Badge>
                  <Badge variant="outline" className={`h-8 rounded-full px-3 ${config.accent}`}>
                    {formatCurrency(total)}
                  </Badge>
                </div>
                <DialogDescription className="mt-1 text-white/45">{config.description}</DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl bg-white/[0.08]" />
              ))}
            </div>
          ) : rows.length ? (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.label} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.06] md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{row.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {kind === 'app' && (
                        <>
                          <Badge variant="outline" className="rounded-full border-sky-400/20 bg-sky-500/[0.10] text-sky-100">iOS {formatCurrency(row.iosRevenue)}</Badge>
                          <Badge variant="outline" className="rounded-full border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-100">Android {formatCurrency(row.androidRevenue)}</Badge>
                        </>
                      )}
                      {kind === 'admob' && (
                        <Badge variant="outline" className="rounded-full border-amber-400/20 bg-amber-500/[0.10] text-amber-100">AdMob {formatCurrency(row.admobRevenue)}</Badge>
                      )}
                      {kind === 'adExpense' && (
                        <>
                          <Badge variant="outline" className="rounded-full border-sky-400/20 bg-sky-500/[0.10] text-sky-100">iOS {formatCurrency(row.iosAdExpense)}</Badge>
                          <Badge variant="outline" className="rounded-full border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-100">Android {formatCurrency(row.androidAdExpense)}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="inline-flex items-center justify-end gap-2 text-lg font-black italic">
                    <BadgeDollarSign className="h-5 w-5 text-white/35" />
                    {formatCurrency(valueForKind(row, kind))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] text-center">
              <div>
                <Icon className="mx-auto mb-3 h-8 w-8 text-white/25" />
                <p className="text-sm font-semibold text-white">No {config.title.toLowerCase()} records found.</p>
                <p className="mt-1 text-xs text-white/40">This panel uses the current year breakdown.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
