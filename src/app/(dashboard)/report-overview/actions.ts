'use server';

import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';
const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

export type ReportStatus = {
  key: string;
  name: string;
  uploaded: boolean;
  href: string;
  daysCount: number;
  rowCount: number;
  totalValue: number;
  totalLabel: string;
  format: 'currency' | 'number';
  tableExists: boolean;
};

export type MonthlyReportStatus = {
  month: string;
  monthKey: string;
  sections: {
    android: ReportSectionStatus;
    apple: ReportSectionStatus;
  };
};

export type ReportSectionStatus = {
  title: string;
  uploadedCount: number;
  reportCount: number;
  allUploaded: boolean;
  reports: ReportStatus[];
};

export type ReportCronRun = {
  jobKey: string;
  jobName: string;
  platform: string;
  script: string;
  status: 'success' | 'failed' | 'never';
  mode: string | null;
  reportType: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number;
  rowsSaved: number;
  reportRange: string | null;
  errorMessage: string | null;
  triggerSource: string | null;
  hasHistory: boolean;
  historyTableExists: boolean;
};

export type ReportOverviewData = {
  statuses: MonthlyReportStatus[];
  cronJobs: ReportCronRun[];
};

type ReportOverviewResponse = {
  success?: boolean;
  error_msg?: string;
  statuses?: MonthlyReportStatus[];
  cronJobs?: Partial<ReportCronRun>[];
};

const defaultCronRuns: ReportCronRun[] = [
  {
    jobKey: 'sync_admob_daily_standalone',
    jobName: 'AdMob Daily Sync',
    platform: 'AdMob',
    script: 'sync_admob_daily_standalone.php',
    status: 'never',
    mode: null,
    reportType: null,
    startedAt: null,
    finishedAt: null,
    durationSeconds: 0,
    rowsSaved: 0,
    reportRange: null,
    errorMessage: null,
    triggerSource: null,
    hasHistory: false,
    historyTableExists: false,
  },
  {
    jobKey: 'sync_android_reports_standalone',
    jobName: 'Android Reports Sync',
    platform: 'Android',
    script: 'sync_android_reports_standalone.php',
    status: 'never',
    mode: null,
    reportType: null,
    startedAt: null,
    finishedAt: null,
    durationSeconds: 0,
    rowsSaved: 0,
    reportRange: null,
    errorMessage: null,
    triggerSource: null,
    hasHistory: false,
    historyTableExists: false,
  },
  {
    jobKey: 'sync_apple_reports_standalone',
    jobName: 'Apple Reports Sync',
    platform: 'Apple',
    script: 'sync_apple_reports_standalone.php',
    status: 'never',
    mode: null,
    reportType: null,
    startedAt: null,
    finishedAt: null,
    durationSeconds: 0,
    rowsSaved: 0,
    reportRange: null,
    errorMessage: null,
    triggerSource: null,
    hasHistory: false,
    historyTableExists: false,
  },
];

function normalizeReport(report: Partial<ReportStatus>): ReportStatus {
  return {
    key: String(report.key || report.name || ''),
    name: String(report.name || 'Report'),
    uploaded: Boolean(report.uploaded),
    href: String(report.href || '#'),
    daysCount: Number(report.daysCount || 0),
    rowCount: Number(report.rowCount || 0),
    totalValue: Number(report.totalValue || 0),
    totalLabel: String(report.totalLabel || 'total'),
    format: report.format === 'number' ? 'number' : 'currency',
    tableExists: report.tableExists !== false,
  };
}

function normalizeSection(section: Partial<ReportSectionStatus> | undefined, title: string): ReportSectionStatus {
  const reports = Array.isArray(section?.reports) ? section.reports.map(normalizeReport) : [];
  const uploadedCount = reports.filter((report) => report.uploaded).length;

  return {
    title: String(section?.title || title),
    uploadedCount,
    reportCount: reports.length,
    allUploaded: reports.length > 0 && uploadedCount === reports.length,
    reports,
  };
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function normalizeCronRun(run: Partial<ReportCronRun>): ReportCronRun {
  const status = run.status === 'success' || run.status === 'failed' ? run.status : 'never';
  const fallback = defaultCronRuns.find((job) => job.jobKey === run.jobKey);

  return {
    jobKey: String(run.jobKey || fallback?.jobKey || ''),
    jobName: String(run.jobName || fallback?.jobName || 'Cron Job'),
    platform: String(run.platform || fallback?.platform || 'Reports'),
    script: String(run.script || fallback?.script || ''),
    status,
    mode: nullableString(run.mode),
    reportType: nullableString(run.reportType),
    startedAt: nullableString(run.startedAt),
    finishedAt: nullableString(run.finishedAt),
    durationSeconds: Number(run.durationSeconds || 0),
    rowsSaved: Number(run.rowsSaved || 0),
    reportRange: nullableString(run.reportRange),
    errorMessage: nullableString(run.errorMessage),
    triggerSource: nullableString(run.triggerSource),
    hasHistory: Boolean(run.hasHistory),
    historyTableExists: run.historyTableExists !== false,
  };
}

function normalizeCronRuns(runs: Partial<ReportCronRun>[] | undefined): ReportCronRun[] {
  if (!Array.isArray(runs) || runs.length === 0) {
    return defaultCronRuns;
  }

  const byKey = new Map(runs.map((run) => [String(run.jobKey || ''), normalizeCronRun(run)]));
  return defaultCronRuns.map((defaultRun) => byKey.get(defaultRun.jobKey) || defaultRun);
}

export async function getReportOverview(year: number): Promise<ReportOverviewData> {
  await requireAdminAuth();
  try {
    const response = await fetch(phpApiUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        ...getPhpBackendAuthHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        tag: 'GET_REPORT_OVERVIEW',
        year: String(year),
      }),
    });

    const payload = (await response.json()) as ReportOverviewResponse;
    if (!payload.success || !Array.isArray(payload.statuses)) {
      console.error('Report overview request failed:', payload.error_msg || payload);
      return { statuses: [], cronJobs: [] };
    }

    const statuses = payload.statuses.map((month) => ({
      month: String(month.month || ''),
      monthKey: String(month.monthKey || ''),
      sections: {
        android: normalizeSection(month.sections?.android, 'Android'),
        apple: normalizeSection(month.sections?.apple, 'Apple'),
      },
    }));

    return {
      statuses,
      cronJobs: normalizeCronRuns(payload.cronJobs),
    };
  } catch (error) {
    console.error('Error fetching report overview:', error);
    return { statuses: [], cronJobs: [] };
  }
}

export async function getReportStatuses(year: number): Promise<MonthlyReportStatus[]> {
  const overview = await getReportOverview(year);
  return overview.statuses;
}
