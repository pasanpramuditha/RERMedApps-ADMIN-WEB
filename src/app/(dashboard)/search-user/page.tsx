'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AppWindow,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  Gift,
  Mail,
  MapPin,
  MessageSquareText,
  Rows3,
  Search,
  Smartphone,
  UserRoundSearch,
  XCircle,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RegisteredUsersDataTable } from '@/components/register-user/register-user-data-table';
import { columns } from '@/components/register-user/columns';
import type { RegisteredUser } from '../registered-user/data';
import { getSearchUserAnalysis, type SearchUserAnalysis } from './actions';
import { AndroidAnalysisHelpDialog } from '@/components/dashboard/android-analysis-help-dialog';

function DetailPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-zinc-200">
      {children}
    </span>
  );
}

function HeaderDetail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-blue-200">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
        <div className="mt-1 flex min-w-0 flex-wrap gap-1.5 text-xs font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}

function AnalysisTile({
  icon,
  label,
  value,
  children,
  tone = 'blue',
  interactive = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  children: React.ReactNode;
  tone?: 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'cyan';
  interactive?: boolean;
}) {
  const tones = {
    blue: 'from-blue-500/15 to-blue-500/5 text-blue-300 ring-blue-400/20',
    green: 'from-emerald-500/15 to-emerald-500/5 text-emerald-300 ring-emerald-400/20',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-300 ring-amber-400/20',
    purple: 'from-violet-500/15 to-violet-500/5 text-violet-300 ring-violet-400/20',
    rose: 'from-rose-500/15 to-rose-500/5 text-rose-300 ring-rose-400/20',
    cyan: 'from-cyan-500/15 to-cyan-500/5 text-cyan-300 ring-cyan-400/20',
  };

  return (
    <div className={`min-h-[132px] rounded-[18px] border bg-[#0d0e12] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.24)] transition-all duration-200 ${
      interactive
        ? 'cursor-pointer border-violet-300/25 hover:-translate-y-0.5 hover:border-violet-300/55 hover:bg-violet-500/[0.07] hover:shadow-[0_18px_46px_rgba(139,92,246,0.22)]'
        : 'border-white/10'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${tones[tone]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500">{label}</p>
          <div className="mt-1 text-xl font-black tracking-tight text-white">{value}</div>
        </div>
      </div>
      <div className="mt-4 border-t border-white/10 pt-3 text-xs text-zinc-300">{children}</div>
    </div>
  );
}

function UserAnalysisPanel({ email, analysis }: { email: string; analysis: SearchUserAnalysis }) {
  const penetrationTotal = analysis.totalApps || 0;
  const penetrationCount = analysis.appNames.length;
  const hasFeedback = analysis.feedbackAppNames.length > 0;
  const hasOffers = analysis.activeOffers.length > 0;

  return (
    <section className="overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_32%),#08090b] shadow-2xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/25">
              <UserRoundSearch className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-blue-300">360 User Analysis</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-white">User profile summary</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                <span className="font-medium text-white">{email}</span>
              </div>
            </div>
          </div>
          <div className="grid min-w-0 gap-2 md:grid-cols-3 xl:w-[530px]">
              <HeaderDetail
                icon={<AppWindow className="h-4 w-4" />}
                label={`Apps ${penetrationCount}/${penetrationTotal || '-'}`}
                value={
                  analysis.appNames.length > 0
                    ? analysis.appNames.map((app) => <DetailPill key={app}>{app}</DetailPill>)
                    : <span className="text-zinc-400">No apps found</span>
                }
              />
              <HeaderDetail
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={
                  (analysis.countries.length ? analysis.countries : ['Not available']).map((country) => (
                    <DetailPill key={country}>{country}</DetailPill>
                  ))
                }
              />
              <HeaderDetail
                icon={<Smartphone className="h-4 w-4" />}
                label="Device"
                value={
                  (analysis.devices.length ? analysis.devices : ['Not available']).map((device) => (
                    <DetailPill key={device}>{device}</DetailPill>
                  ))
                }
              />
          </div>
        </div>
        <div className="flex w-fit shrink-0 items-center gap-3 rounded-2xl border border-blue-300/15 bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(255,255,255,0.035))] px-4 py-3 shadow-[0_12px_34px_rgba(37,99,235,0.12)]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-300/20">
            <Rows3 className="h-4 w-4" />
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-blue-200/65">Records</p>
            <p className="text-2xl font-black leading-none text-white">{analysis.users.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3.5 p-4 md:grid-cols-2 xl:grid-cols-3">
        <AnalysisTile
          icon={<BadgeDollarSign className="h-4 w-4" />}
          label="Monetization"
          value={analysis.isPaidUser ? 'Paid' : 'Free'}
          tone={analysis.isPaidUser ? 'green' : 'rose'}
        >
          <div className="flex items-center gap-1.5">
            {analysis.isPaidUser ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-rose-300" />
            )}
            <span>
              {analysis.isPaidUser
                ? `${analysis.purchaseCount} purchase record(s) found`
                : 'Free User (No purchases found)'}
            </span>
          </div>
        </AnalysisTile>

        <AnalysisTile
          icon={<Gift className="h-4 w-4" />}
          label="Active Offers"
          value={hasOffers ? analysis.activeOffers.length : 'No'}
          tone="amber"
        >
          <div className="flex flex-wrap gap-1.5">
            {(hasOffers ? analysis.activeOffers : ['No active offers']).map((offer) => (
              <DetailPill key={offer}>{offer}</DetailPill>
            ))}
          </div>
        </AnalysisTile>

        {hasFeedback ? (
          <Link href={`/user-feedbacks?email=${encodeURIComponent(email)}`} className="group block">
            <AnalysisTile
              icon={<MessageSquareText className="h-4 w-4" />}
              label="Feedbacks"
              value={
                <span className="inline-flex items-center gap-1 transition-colors group-hover:text-violet-200">
                  Yes
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              }
              tone="purple"
              interactive
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-1.5 text-zinc-300 transition-colors group-hover:text-white">
                    Gave feedback in
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-300/25 bg-violet-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-100 transition-colors group-hover:border-violet-200/60 group-hover:bg-violet-500/25">
                    Open
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.feedbackAppNames.map((app) => <DetailPill key={app}>{app}</DetailPill>)}
                </div>
              </div>
            </AnalysisTile>
          </Link>
        ) : (
          <AnalysisTile
            icon={<MessageSquareText className="h-4 w-4" />}
            label="Feedbacks"
            value="No"
            tone="purple"
          >
            <p>No user feedback found.</p>
          </AnalysisTile>
        )}
      </div>
    </section>
  );
}

export default function SearchUserPage() {
  const [emailSearch, setEmailSearch] = React.useState('');
  const [loadedEmail, setLoadedEmail] = React.useState('');
  const [users, setUsers] = React.useState<RegisteredUser[]>([]);
  const [analysis, setAnalysis] = React.useState<SearchUserAnalysis | null>(null);
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSearch = React.useCallback(async () => {
    const email = emailSearch.trim();
    if (!email) return;
    setLoadingUsers(true);
    setError(null);
    setHasSearched(true);

    const result = await getSearchUserAnalysis(email);
    if (result.error) setError(result.error);
    if (!result.error && result.users.length > 0) {
      setLoadedEmail(email);
      setAnalysis(result);
      setUsers(result.users);
    } else {
      setLoadedEmail('');
      setAnalysis(null);
      setUsers([]);
    }
    setLoadingUsers(false);
  }, [emailSearch]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(56,189,248,0.34),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(124,58,237,0.3),transparent_32%),linear-gradient(135deg,#08111f_0%,#0b1020_48%,#140b20_100%)] px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-12 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-200 drop-shadow-[0_0_18px_rgba(103,232,249,0.55)]">User Intelligence</p>
            <h1 className="mt-2 bg-gradient-to-r from-white via-cyan-50 to-blue-100 bg-clip-text text-3xl font-black tracking-tight text-transparent">Search User</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300/85">
              Find one user by email and review app penetration, device profile, purchases, offers, feedback, and editable records.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:max-w-xl">
            <AndroidAnalysisHelpDialog page="search-user" className="self-start lg:self-end" />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSearch();
              }}
              className="flex w-full flex-col gap-3 rounded-2xl border border-white/15 bg-black/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_42px_rgba(0,0,0,0.25)] backdrop-blur sm:flex-row"
            >
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/65" />
                <Input
                  placeholder="user@example.com"
                  value={emailSearch}
                  onChange={(event) => setEmailSearch(event.target.value)}
                  className="h-11 rounded-xl border-white/15 bg-slate-950/55 pl-10 text-white shadow-inner placeholder:text-slate-400/75 focus-visible:ring-cyan-300/50"
                  type="email"
                  required
                />
              </div>
              <Button type="submit" disabled={loadingUsers} className="h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white shadow-[0_12px_26px_rgba(37,99,235,0.34)] transition-all hover:from-cyan-400 hover:to-blue-500">
                <Search className="mr-2 h-4 w-4" />
                {loadingUsers ? 'Searching...' : 'Search'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasSearched && analysis && loadedEmail && !loadingUsers && (
        <UserAnalysisPanel email={loadedEmail} analysis={analysis} />
      )}

      {hasSearched && (
        <RegisteredUsersDataTable
          columns={columns({ isReturningUser: () => false, activeTab: 'today' })}
          data={users}
          isLoading={loadingUsers}
          meta={{ onAction: handleSearch }}
        />
      )}
    </div>
  );
}
