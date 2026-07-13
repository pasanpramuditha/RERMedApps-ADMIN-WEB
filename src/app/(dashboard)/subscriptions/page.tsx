'use client';

import * as React from 'react';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Search,
  ChevronDown,
  LayoutGrid,
  CreditCard,
  Apple,
  Zap,
  Clock,
  XCircle,
  Slash,
  RefreshCcw,
  Loader2,
  AlertCircle,
  Activity,
  BellRing,
  Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsHelpDialog } from '@/components/dashboard/analytics-help-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TimeHorizonPicker } from '@/components/home/TimeHorizonPicker';
import { getSubscriptionsDashboard } from './actions';
import { emptySubscriptionSummary, type SubscriptionRecord } from './data';

const summaryCards = [
  { label: 'Yearly', key: 'Yearly', color: '#10B981', icon: CreditCard },
  { label: 'Monthly', key: 'Monthly', color: '#8B5CF6', icon: RefreshCcw },
  { label: 'Trials', key: 'Trials', color: '#F59E0B', icon: Zap },
  { label: 'Expired', key: 'Expired', color: '#64748B', icon: XCircle },
  { label: 'Cancelled', key: 'Cancelled', color: '#F97316', icon: Slash },
  { label: 'Failed', key: 'Failed', color: '#EF4444', icon: AlertCircle },
  { label: 'Refunds', key: 'Refunds', color: '#F43F5E', icon: Clock },
] as const;

const formatLkr = (value: number) => `Rs ${Math.round(value || 0).toLocaleString()} LKR`;

function buildUserActionHref(path: string, row: SubscriptionRecord) {
  const params = new URLSearchParams();
  params.set('email', row.user);
  const appHint = row.appHint || row.appIcon || row.product || row.sku;
  if (appHint) {
    params.set('app', appHint);
  }
  return `${path}?${params.toString()}`;
}

function AndroidLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M7.2 8.7h9.6c.8 0 1.5.7 1.5 1.5v5.8c0 .8-.7 1.5-1.5 1.5h-.6v2.2c0 .5-.4.9-.9.9s-.9-.4-.9-.9v-2.2H9.6v2.2c0 .5-.4.9-.9.9s-.9-.4-.9-.9v-2.2h-.6c-.8 0-1.5-.7-1.5-1.5v-5.8c0-.8.7-1.5 1.5-1.5Zm1.6-3.9L7.5 3.5c-.2-.2-.2-.5 0-.7s.5-.2.7 0l1.5 1.5c.7-.3 1.5-.5 2.3-.5s1.6.2 2.3.5l1.5-1.5c.2-.2.5-.2.7 0s.2.5 0 .7l-1.3 1.3c1 .7 1.7 1.8 1.8 3H7c.1-1.2.8-2.3 1.8-3Zm1 1.8c.3 0 .5-.2.5-.5s-.2-.5-.5-.5-.5.2-.5.5.2.5.5.5Zm4.4 0c.3 0 .5-.2.5-.5s-.2-.5-.5-.5-.5.2-.5.5.2.5.5.5ZM3.9 10c.5 0 .9.4.9.9v4.4c0 .5-.4.9-.9.9s-.9-.4-.9-.9v-4.4c0-.5.4-.9.9-.9Zm16.2 0c.5 0 .9.4.9.9v4.4c0 .5-.4.9-.9.9s-.9-.4-.9-.9v-4.4c0-.5.4-.9.9-.9Z" />
    </svg>
  );
}

export default function SubscriptionsPage() {
  const [selectedFilters, setSelectedFilters] = React.useState<string[]>(['Yearly', 'Monthly']);
  const [selectedEcosystem, setSelectedEcosystem] = React.useState('Unified Feed');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [search, setSearch] = React.useState('');
  const [records, setRecords] = React.useState<SubscriptionRecord[]>([]);
  const [summary, setSummary] = React.useState(emptySubscriptionSummary);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const range =
      dateRange?.from && dateRange?.to
        ? {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd'),
          }
        : undefined;

    getSubscriptionsDashboard('custom', range).then((data) => {
      if (cancelled) return;
      setRecords(data.records || []);
      setSummary(data.summary || emptySubscriptionSummary);
      setError(data.success ? '' : data.error_msg || 'Unable to load subscriptions');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  const toggleFilter = (label: string) => {
    setSelectedFilters((prev) => (prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]));
  };

  const filteredRecords = records.filter((row) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [row.user, row.geo, row.language, row.product, row.sku, row.status, row.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = selectedFilters.length === 0 || selectedFilters.includes(row.tag);
    const matchesPlatform =
      selectedEcosystem === 'Unified Feed' ||
      (selectedEcosystem === 'Apple Platform' && row.platform === 'apple') ||
      (selectedEcosystem === 'Android Platform' && row.platform === 'android');
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  return (
    <div className="w-full max-w-[calc(100vw-2rem)] overflow-x-hidden md:max-w-none space-y-6 text-white font-sans">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_88%_8%,rgba(139,92,246,0.20),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(9,9,13,0.96))] p-5 shadow-2xl shadow-black/25">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.045),transparent_45%,rgba(255,255,255,0.025))]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/15 text-blue-100 shadow-lg shadow-blue-950/20">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.34em] text-blue-200/75">Revenue Intelligence</p>
              <h1 className="text-2xl font-bold tracking-tight text-white">Subscriptions</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/55">Unified Android and iOS subscription activity, renewal state, and recurring revenue.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AnalyticsHelpDialog page="subscriptions" />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-blue-300" />}
            <TimeHorizonPicker
              date={dateRange}
              setDate={setDateRange}
              className="[&_button]:h-10 [&_button]:rounded-full [&_button]:border-white/10 [&_button]:bg-black/25 [&_button]:shadow-none"
            />
            <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 shadow-[0_0_50px_rgba(37,99,235,0.3)]">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-blue-100">Recurring Revenue</p>
              <p className="text-2xl font-black italic leading-none tracking-tighter">{formatLkr(summary.mrr_lkr)}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="bg-[#111116] border border-white/5 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-[#16161D] transition-all">
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em] mb-0.5">Ecosystem</p>
                    <p className="text-xs font-black italic tracking-tight uppercase group-hover:text-blue-400 transition-colors">
                      {selectedEcosystem}
                    </p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-white/20" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] bg-[#111116] border-white/5 text-white/60 p-2 rounded-2xl">
              {['Unified Feed', 'Apple Platform', 'Android Platform'].map((item) => (
                <DropdownMenuItem
                  key={item}
                  onClick={() => setSelectedEcosystem(item)}
                  className="p-3 rounded-xl focus:bg-blue-600/20 focus:text-blue-400 cursor-pointer text-[10px] font-black uppercase tracking-widest"
                >
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="lg:col-span-9 bg-[#111116] border border-white/5 rounded-2xl px-6 py-4 flex items-center gap-4 group focus-within:border-blue-500/40 transition-all">
          <Search className="w-5 h-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="text"
            placeholder="Search email, SKU, purchase key, status, or product..."
            className="min-w-0 bg-transparent border-none outline-none text-xs font-bold tracking-wide w-full placeholder:text-white/10 uppercase"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {summaryCards.map((item) => {
          const isActive = selectedFilters.includes(item.label);
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              onClick={() => toggleFilter(item.label)}
              className={cn(
                'bg-[#111116] border border-white/5 rounded-[1.5rem] p-5 relative overflow-hidden group cursor-pointer transition-all duration-300',
                isActive ? 'border-white/40 shadow-lg ring-1 ring-white/20' : 'hover:bg-[#16161D]'
              )}
              style={isActive ? { backgroundColor: item.color } : {}}
            >
              <div
                className={cn('absolute top-0 right-0 w-24 h-24 blur-[40px] rounded-full transition-opacity duration-500', isActive ? 'opacity-0' : 'opacity-10')}
                style={{ backgroundColor: item.color }}
              />
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 mb-4', isActive ? 'bg-black/20 border-white/40' : 'border-white/5 group-hover:border-white/10')}>
                <Icon className={cn('w-5 h-5 transition-transform', isActive ? 'text-white scale-110' : 'text-white/20 group-hover:scale-110')} />
              </div>
              <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1 transition-colors', isActive ? 'text-black/80' : 'text-white/40')} style={!isActive ? { color: item.color } : {}}>
                {item.label}
              </p>
              <p className="text-3xl font-black italic tracking-tighter text-white">{summary[item.key].toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[#0D0D11] border border-white/5 rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                <th className="pb-6 w-20">App</th>
                <th className="pb-6">User & Geography</th>
                <th className="pb-6">Subscription State</th>
                <th className="pb-6">Amount</th>
                <th className="pb-6">Occurred / Activity</th>
                <th className="pb-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((row) => (
                <tr key={row.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-4">
                    <div className="relative h-10 w-10 rounded-xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center text-base">
                      {row.appIcon ? (
                        <img src={row.appIcon} alt="" className="h-full w-full object-cover" />
                      ) : (
                        row.platform === 'android' ? (
                          <AndroidLogo className="h-5 w-5 text-emerald-300" />
                        ) : (
                          <Apple className="h-5 w-5 text-white/75" />
                        )
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-black tracking-tight">{row.user}</p>
                      <div className="flex items-center gap-2">
                        {row.platform === 'android' ? (
                          <AndroidLogo className="h-3.5 w-3.5 text-emerald-300" />
                        ) : (
                          <Apple className="h-3 w-3 text-white" />
                        )}
                        <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{row.geo}</span>
                        {row.language && (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white/45">
                            {row.language}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-2 max-w-[280px]">
                      <span className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-200">
                        {row.type}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-black tracking-tight text-green-400">
                        {row.amount} <span className="opacity-40 text-[8px] ml-1">{row.amountCurrency || 'USD'}</span>
                      </p>
                      {row.amountLkr && <p className="text-[10px] font-bold text-white/25 tracking-tighter italic">{row.amountLkr} LKR</p>}
                      {row.action && (
                        <span className="inline-flex rounded-full border border-orange-400/20 bg-orange-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-orange-300">
                          {row.action}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-white italic tracking-tight">{row.time || '-'}</p>
                      {row.activity && (
                        <div className="bg-[#16161D] rounded-full px-3 py-1 inline-flex items-center gap-2 border border-white/5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[8px] font-bold text-white/40">{row.activity}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    {row.platform === 'android' && row.user.includes('@') ? (
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                          <Link
                            href={buildUserActionHref('/android-app-promotion', row)}
                            className="inline-flex h-8 whitespace-nowrap items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 text-[8px] font-black uppercase tracking-widest text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15"
                          >
                            <Boxes className="h-3.5 w-3.5" />
                            Send Promotion
                          </Link>
                          <Link
                            href={buildUserActionHref('/push-notifications', row)}
                            className="inline-flex h-8 whitespace-nowrap items-center justify-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 text-[8px] font-black uppercase tracking-widest text-blue-200 transition hover:border-blue-300/50 hover:bg-blue-400/15"
                          >
                            <BellRing className="h-3.5 w-3.5" />
                            Send Push Notification
                          </Link>
                      </div>
                    ) : (
                      <span className="px-5 py-1.5 rounded-full text-[9px] font-black italic uppercase tracking-widest border border-white/5" style={{ color: row.statusColor, backgroundColor: `${row.statusColor}10` }}>
                        {row.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredRecords.length === 0 && (
            <div className="py-16 text-center text-sm text-white/40">No subscription records found for this filter.</div>
          )}
        </div>

        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
          <p className="text-[10px] font-black italic uppercase tracking-[0.3em] text-white/10">
            RER ENGINE CORE • {filteredRecords.length.toLocaleString()} RECORDS VISUALIZED
          </p>
          <div className="flex items-center gap-3 text-[10px] font-black italic uppercase tracking-widest text-white/30">
            {records.length.toLocaleString()} loaded
          </div>
        </div>
      </div>
    </div>
  );
}
