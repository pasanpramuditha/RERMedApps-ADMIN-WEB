'use server';

import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';
export type AppTrendPeriod = 'today' | 'last7days' | 'this_month' | 'last3months' | 'last6months' | 'last_year';
export type AppTrendStatus = 'Robust' | 'Watch' | 'Alarm';

export type AppTrendSummary = {
  registrations: number;
  returning: number;
  premium: number;
  activeSubs: number;
  installs: number;
  purchases: number;
  refunds: number;
};

export type AppTrendDailyRow = AppTrendSummary & {
  date: string;
};

export type AppTrendRow = {
  appId: string;
  name: string;
  packageName: string;
  dbName: string;
  iconUrl: string;
  version: string;
  installs: number;
  purchases: number;
  refunds: number;
  returning: number;
  registrations: number;
  premium: number;
  activeSubs: number;
  installDelta: number;
  purchaseDelta: number;
  refundDelta: number;
  loginDelta: number;
  subsDelta: number;
  status: AppTrendStatus;
  daily: AppTrendDailyRow[];
};

export type AppTrendTelemetry = {
  periodDays: number;
  latestDataDate?: string;
  fromDate: string;
  toDate: string;
  summary: AppTrendSummary;
  daily: AppTrendDailyRow[];
  apps: AppTrendRow[];
  sources?: Record<string, string>;
};

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const emptyTelemetry: AppTrendTelemetry = {
  periodDays: 0,
  fromDate: '',
  toDate: '',
  summary: {
    registrations: 0,
    returning: 0,
    premium: 0,
    activeSubs: 0,
    installs: 0,
    purchases: 0,
    refunds: 0,
  },
  daily: [],
  apps: [],
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSummary(row: any): AppTrendSummary {
  return {
    registrations: toNumber(row?.registrations),
    returning: toNumber(row?.returning),
    premium: toNumber(row?.premium),
    activeSubs: toNumber(row?.activeSubs),
    installs: toNumber(row?.installs),
    purchases: toNumber(row?.purchases),
    refunds: toNumber(row?.refunds),
  };
}

function normalizeStatus(value: unknown): AppTrendStatus {
  return value === 'Alarm' || value === 'Watch' || value === 'Robust' ? value : 'Robust';
}

export async function getAppTrendTelemetry(period: AppTrendPeriod): Promise<{ data: AppTrendTelemetry | null; error?: string }> {
  await requireAdminAuth();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(phpApiUrl, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        ...getPhpBackendAuthHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        tag: 'GET_APP_TREND_TELEMETRY',
        db: '0',
        period,
      }),
    });

    const text = await response.text();
    let payload: any;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return { data: null, error: 'Trend telemetry backend returned invalid JSON.' };
    }

    if (!response.ok || !payload.success) {
      return { data: null, error: payload.error_msg || `Trend telemetry request failed (${response.status}).` };
    }

    return {
      data: {
        periodDays: toNumber(payload.periodDays),
        latestDataDate: payload.latestDataDate ? String(payload.latestDataDate) : undefined,
        fromDate: String(payload.fromDate || ''),
        toDate: String(payload.toDate || ''),
        summary: normalizeSummary(payload.summary),
        daily: Array.isArray(payload.daily)
          ? payload.daily.map((row: any) => ({ date: String(row.date || ''), ...normalizeSummary(row) }))
          : [],
        apps: Array.isArray(payload.apps)
          ? payload.apps.map((row: any): AppTrendRow => ({
              appId: String(row.appId || ''),
              name: String(row.name || 'Unknown App'),
              packageName: String(row.packageName || ''),
              dbName: String(row.dbName || ''),
              iconUrl: String(row.iconUrl || 'https://placehold.co/128x128.png'),
              version: String(row.version || ''),
              installs: toNumber(row.installs),
              purchases: toNumber(row.purchases),
              refunds: toNumber(row.refunds),
              returning: toNumber(row.returning),
              registrations: toNumber(row.registrations),
              premium: toNumber(row.premium),
              activeSubs: toNumber(row.activeSubs),
              installDelta: toNumber(row.installDelta),
              purchaseDelta: toNumber(row.purchaseDelta),
              refundDelta: toNumber(row.refundDelta),
              loginDelta: toNumber(row.loginDelta),
              subsDelta: toNumber(row.subsDelta),
              status: normalizeStatus(row.status),
              daily: Array.isArray(row.daily)
                ? row.daily.map((dailyRow: any) => ({ date: String(dailyRow.date || ''), ...normalizeSummary(dailyRow) }))
                : [],
            }))
          : [],
        sources: payload.sources && typeof payload.sources === 'object' ? payload.sources : undefined,
      },
    };
  } catch (error: any) {
    const timeoutMessage = error?.name === 'AbortError'
      ? 'Trend telemetry backend timed out. Deploy the new PHP endpoint to the backend server or check API connectivity.'
      : error?.message || 'Failed to load app trend telemetry.';
    return { data: emptyTelemetry, error: timeoutMessage };
  } finally {
    clearTimeout(timeoutId);
  }
}
