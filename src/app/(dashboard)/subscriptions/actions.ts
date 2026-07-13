'use server';

import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import type { SubscriptionsDashboardData, SubscriptionPeriod, SubscriptionRecord } from './data';
import { emptySubscriptionSummary } from './data';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

function addLookupValue(lookup: Map<string, string>, value: unknown, iconUrl: string) {
  const key = String(value || '').trim().toLowerCase();
  if (key && iconUrl) {
    lookup.set(key, iconUrl);
  }
}

function buildAppIconLookup(apps: App[]) {
  const lookup = new Map<string, string>();

  apps.forEach((app) => {
    const iconUrl = String(app.icon_url || '').trim();
    if (!iconUrl) return;

    addLookupValue(lookup, app.app_id, iconUrl);
    addLookupValue(lookup, app.package_name, iconUrl);
    addLookupValue(lookup, app.db_name, iconUrl);
    addLookupValue(lookup, app.name, iconUrl);
  });

  return lookup;
}

function findAppIcon(lookup: Map<string, string>, row: SubscriptionRecord) {
  const terms = [row.appHint, row.product, row.sku].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);

  for (const term of terms) {
    const exact = lookup.get(term);
    if (exact) return exact;
  }

  for (const term of terms) {
    for (const [key, icon] of lookup.entries()) {
      if (key && (term.includes(key) || key.includes(term))) {
        return icon;
      }
    }
  }

  return '';
}

function parseLkrAmount(row: SubscriptionRecord) {
  const raw = Number(row.amountLkrRaw || 0);
  if (Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  const parsed = Number(String(row.amountLkr || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveLocalAmountFromLkr(row: SubscriptionRecord, rates: Record<string, number>) {
  const currentAmount = Number(row.amount || 0);
  const currency = String(row.amountCurrency || 'USD').trim().toUpperCase();
  const lkrAmount = parseLkrAmount(row);
  const lkrRate = Number(rates.LKR || 0);
  const currencyRate = currency === 'USD' ? 1 : Number(rates[currency] || 0);

  if (currentAmount > 0 || !lkrAmount || !lkrRate || !currencyRate) {
    return row;
  }

  const amount = lkrAmount * (currencyRate / lkrRate);
  if (!Number.isFinite(amount) || amount <= 0) {
    return row;
  }

  const amountLabel = amount.toFixed(2);

  return {
    ...row,
    amount: amountLabel,
    totalSpent: amountLabel,
    amountUsdRaw: currency === 'USD' ? amount : amount / currencyRate,
  };
}

async function getCurrencyRates(): Promise<Record<string, number>> {
  try {
    const response = await fetch(phpApiUrl, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(await getAuthHeaders()),
      },
      body: new URLSearchParams({
        tag: 'GET_CURRENCY_RATES',
        db: 'MAIN',
      }),
    });
    const payload = (await response.json()) as { success?: boolean; rates?: Record<string, number> };
    if (payload.success && payload.rates) {
      return { USD: 1, ...payload.rates };
    }
  } catch (error) {
    console.error('Error fetching currency rates for subscriptions:', error);
  }

  return { USD: 1, LKR: 300 };
}

async function normalizeSubscriptionRecords(records: SubscriptionRecord[]) {
  if (!records.length) {
    return records;
  }

  const [apps, rates] = await Promise.all([
    getApps().catch(() => [] as App[]),
    getCurrencyRates(),
  ]);
  const appIconLookup = buildAppIconLookup(apps);

  return records.map((record) => {
    const appIcon = record.appIcon || findAppIcon(appIconLookup, record);
    const withIcon = appIcon ? { ...record, appIcon } : record;
    return withIcon.platform === 'apple' ? deriveLocalAmountFromLkr(withIcon, rates) : withIcon;
  });
}

export async function getSubscriptionsDashboard(
  period: SubscriptionPeriod | 'custom' = 'today',
  range?: { from?: string; to?: string }
): Promise<SubscriptionsDashboardData> {
  await requireAdminAuth();
  try {
    const body = new URLSearchParams({
      tag: 'GET_SUBSCRIPTIONS_DASHBOARD',
      db: '0',
      period,
      limit: '800',
    });

    if (range?.from && range?.to) {
      body.set('from_date', range.from);
      body.set('to_date', range.to);
    }

    const response = await fetch(phpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(await getAuthHeaders()),
      },
      body,
      cache: 'no-store',
    });

    const text = await response.text();
    let data: SubscriptionsDashboardData;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Backend returned invalid JSON: ${text.slice(0, 180)}`);
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.error_msg || `API request failed with status ${response.status}`);
    }

    return {
      ...data,
      summary: { ...emptySubscriptionSummary, ...(data.summary || {}) },
      records: await normalizeSubscriptionRecords(Array.isArray(data.records) ? data.records : []),
    };
  } catch (error) {
    return {
      success: false,
      period,
      from: '',
      to: '',
      summary: emptySubscriptionSummary,
      records: [],
      error_msg: error instanceof Error ? error.message : 'Unable to load subscriptions',
    };
  }
}
