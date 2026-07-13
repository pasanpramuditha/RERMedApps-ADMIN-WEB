'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Database,
  ExternalLink,
  Info,
  RefreshCw,
  Server,
} from 'lucide-react';

import { getReportOverview, type MonthlyReportStatus, type ReportCronRun, type ReportStatus } from './actions';
import { Button } from '@/components/ui/button';
import { AnalyticsHelpDialog } from '@/components/dashboard/analytics-help-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

function formatValue(report: ReportStatus) {
  if (report.format === 'currency') {
    return `$${Number(report.totalValue || 0).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: report.totalValue > 0 && report.totalValue < 1 ? 2 : 0,
    })}`;
  }

  return Number(report.totalValue || 0).toLocaleString();
}

function getMonthProgress(status: MonthlyReportStatus) {
  const reports = Object.values(status.sections).flatMap((section) => section.reports);
  const uploaded = reports.filter((report) => report.uploaded).length;
  return {
    uploaded,
    total: reports.length,
    percent: reports.length > 0 ? Math.round((uploaded / reports.length) * 100) : 0,
  };
}

function getOverviewStats(statuses: MonthlyReportStatus[]) {
  const reports = statuses.flatMap((month) => Object.values(month.sections).flatMap((section) => section.reports));
  const uploaded = reports.filter((report) => report.uploaded).length;
  const missingTables = reports.filter((report) => !report.tableExists).length;
  const completeMonths = statuses.filter((month) => getMonthProgress(month).percent === 100).length;

  return {
    uploaded,
    total: reports.length,
    missing: Math.max(0, reports.length - uploaded),
    missingTables,
    completeMonths,
    percent: reports.length > 0 ? Math.round((uploaded / reports.length) * 100) : 0,
  };
}

const sectionStyles: Record<string, { badge: string; dot: string }> = {
  android: {
    badge: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
    dot: 'bg-emerald-400',
  },
  apple: {
    badge: 'border-sky-400/20 bg-sky-500/10 text-sky-200',
    dot: 'bg-sky-400',
  },
};

const cronStatusStyles: Record<ReportCronRun['status'], string> = {
  success: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  failed: 'border-red-400/20 bg-red-500/10 text-red-100',
  never: 'border-white/10 bg-white/[0.05] text-white/55',
};

function formatCronDateTime(value: string | null) {
  if (!value) {
    return 'Not recorded';
  }

  return value.replace('T', ' ').slice(0, 19);
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '-';
  }

  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function CronRunInfo({ jobs, loading }: { jobs: ReportCronRun[]; loading: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="View cron job last run times"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55 transition-colors hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-blue-100"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(calc(100vw-2rem),38rem)] overflow-hidden border-white/10 bg-[#090a0f] p-0 text-white shadow-2xl shadow-black/40">
        <div className="border-b border-white/10 bg-white/[0.035] px-4 py-3">
          <div className="text-sm font-semibold">Cron job last runs</div>
          <div className="mt-0.5 text-xs text-white/45">Asia/Colombo time from fnd_report_cron_run_history.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/35">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Job</th>
                <th className="px-4 py-2.5 font-semibold">Last run</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.07]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-white/45">
                    Loading cron history...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-5 text-center text-white/45">
                    No cron history returned.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.jobKey} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{job.jobName}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-white/35">{job.script}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white/75">{formatCronDateTime(job.finishedAt)}</div>
                      <div className="mt-0.5 text-[10px] text-white/35">
                        {job.hasHistory ? `${job.mode || 'run'} / ${formatDuration(job.durationSeconds)}` : job.historyTableExists ? 'No run recorded yet' : 'History table missing'}
                      </div>
                      {job.reportRange && <div className="mt-1 text-[10px] text-white/35">{job.reportRange}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize', cronStatusStyles[job.status])}>
                        {job.status}
                      </span>
                      {job.errorMessage && <div className="mt-1 max-w-[14rem] truncate text-[10px] text-red-200/70">{job.errorMessage}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white/75">{job.rowsSaved.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ReportRow({ report, monthKey }: { report: ReportStatus; monthKey: string }) {
  const ready = report.uploaded && report.tableExists;
  const [linkYear, linkMonth] = monthKey.split('-');
  const reportHref =
    linkYear && linkMonth
      ? `${report.href}?year=${encodeURIComponent(linkYear)}&month=${encodeURIComponent(linkMonth)}&autofetch=1`
      : report.href;

  return (
    <div
      className={cn(
        'group rounded-xl border px-2.5 py-2 transition-colors',
        ready
          ? 'border-white/10 bg-white/[0.035] hover:border-emerald-400/25 hover:bg-white/[0.055]'
          : 'border-white/[0.07] bg-black/20 hover:bg-white/[0.035]'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border',
              ready
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                : report.tableExists
                  ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
                  : 'border-red-400/20 bg-red-500/10 text-red-200'
            )}
          >
            {ready ? <CheckCircle2 className="h-3 w-3" /> : report.tableExists ? <CircleDashed className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">{report.name}</div>
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] text-white/42">
              <span className="truncate">
                {report.tableExists ? `${report.daysCount}d / ${report.rowCount}r` : 'SQL table missing'}
              </span>
              <span className="text-white/18">|</span>
              <span className={cn('shrink-0 font-semibold', ready ? 'text-white/70' : 'text-white/30')}>
                {formatValue(report)}
              </span>
            </div>
          </div>
        </div>

        <Link
          href={reportHref}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition-colors hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-blue-200"
        >
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}

function MonthCard({ status }: { status: MonthlyReportStatus }) {
  const progress = getMonthProgress(status);
  const complete = progress.percent === 100;

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c11] shadow-xl shadow-black/15">
      <div className="border-b border-white/10 bg-white/[0.035] px-3.5 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-white">{status.month}</div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">{status.monthKey}</div>
          </div>
          <div
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              complete
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-400/20 bg-amber-500/10 text-amber-200'
            )}
          >
            {progress.percent}%
          </div>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className={cn('h-full rounded-full', complete ? 'bg-emerald-400' : 'bg-amber-400')}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        {Object.entries(status.sections).map(([sectionKey, section]) => (
          <section key={sectionKey} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', sectionStyles[sectionKey]?.dot || 'bg-white/40')} />
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">{section.title}</h3>
              </div>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', sectionStyles[sectionKey]?.badge || 'border-white/10 bg-white/5 text-white/50')}>
                {section.uploadedCount}/{section.reportCount}
              </span>
            </div>
            <div className="space-y-1">
              {section.reports.map((report) => (
                <ReportRow key={report.key} report={report} monthKey={status.monthKey} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-[300px] rounded-2xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

export default function ReportOverviewPage() {
  const [year, setYear] = React.useState<string>(String(currentYear));
  const [statuses, setStatuses] = React.useState<MonthlyReportStatus[]>([]);
  const [cronRuns, setCronRuns] = React.useState<ReportCronRun[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchStatuses = React.useCallback(async () => {
    setLoading(true);
    const data = await getReportOverview(parseInt(year, 10));
    setStatuses(data.statuses);
    setCronRuns(data.cronJobs);
    setLoading(false);
  }, [year]);

  React.useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const stats = React.useMemo(() => getOverviewStats(statuses), [statuses]);

  return (
    <div className="min-h-screen space-y-5 bg-black pb-10 text-white">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/30">
        <div className="relative px-5 py-5 lg:px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_90%_5%,rgba(16,185,129,0.13),transparent_32%)]" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-200">
                <Database className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-blue-200/70">SQL Report Monitor</p>
                <div className="mt-1 flex items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-white">Report Overview</h1>
                  <CronRunInfo jobs={cronRuns} loading={loading} />
                </div>
                <p className="mt-1 text-sm leading-5 text-white/50">
                  Monthly report coverage loaded from MySQL tables.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {[
                    { label: 'Coverage', value: `${stats.percent}%`, tone: 'blue' },
                    { label: 'Reports uploaded', value: `${stats.uploaded}/${stats.total}`, tone: 'emerald' },
                    { label: 'Reports missing', value: stats.missing.toLocaleString(), tone: 'amber' },
                    { label: 'Months completed', value: `${stats.completeMonths}/12`, tone: 'slate' },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium',
                        item.tone === 'blue' && 'border-blue-400/20 bg-blue-500/10 text-blue-100',
                        item.tone === 'emerald' && 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
                        item.tone === 'amber' && 'border-amber-400/20 bg-amber-500/10 text-amber-100',
                        item.tone === 'slate' && 'border-white/10 bg-white/[0.05] text-white/70'
                      )}
                    >
                      <span className="font-semibold">{loading ? '--' : item.value}</span>
                      <span className="ml-1 text-white/45">{item.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <AnalyticsHelpDialog page="report-overview" />
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-10 w-full rounded-full border-white/10 bg-black/30 px-4 text-white shadow-none sm:w-36">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#101116] text-white">
                  {years.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={fetchStatuses}
                disabled={loading}
                className="h-10 rounded-full bg-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </section>

      {stats.missingTables > 0 && !loading && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100">
          <Server className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="text-sm font-semibold">Some SQL tables are missing</div>
            <div className="mt-1 text-sm text-amber-100/70">
              {stats.missingTables} report source(s) could not be found on the selected MySQL database.
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <OverviewSkeleton />
      ) : statuses.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-[#0b0c11] p-10 text-center">
          <CircleDashed className="mx-auto h-10 w-10 text-white/35" />
          <h2 className="mt-4 text-lg font-semibold">No report data returned</h2>
          <p className="mt-2 text-sm text-white/45">The PHP backend did not return SQL report status rows for {year}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {statuses.map((monthlyStatus) => (
            <MonthCard key={monthlyStatus.monthKey} status={monthlyStatus} />
          ))}
        </div>
      )}
    </div>
  );
}
