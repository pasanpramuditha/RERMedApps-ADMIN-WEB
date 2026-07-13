import { NextResponse } from 'next/server';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

type FinanceHubRevenueSummary = {
  iosRevenueUsd: number;
  androidRevenueUsd: number;
  admobRevenueUsd: number;
};

export async function GET(request: Request) {
  try {
    await requireAdminAuth();
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || from;
  const fromMonth = from.slice(0, 7);
  const toMonth = to.slice(0, 7) || fromMonth;
  const months = searchParams.get('months') || monthsBackFromCurrent(fromMonth);

  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      ...getPhpBackendAuthHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      tag: 'GET_HOME_MONTHLY_REVENUE_STATS',
      db: '0',
      months: String(months),
    }),
  });

  const raw = await response.text();
  let payload: any;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json(
      { success: false, error: 'PHP returned a non-JSON response.' },
      { status: 502 }
    );
  }

  const rows: any[] = payload.success && Array.isArray(payload.revenue?.rows) ? payload.revenue.rows : [];
  const filteredRows = rows.filter((row: any) => {
    const month = String(row.month || '');
    if (!fromMonth || !toMonth) return true;
    return month >= fromMonth && month <= toMonth;
  });
  const summary = filteredRows.reduce<FinanceHubRevenueSummary>(
    (result, row) => ({
      iosRevenueUsd: result.iosRevenueUsd + Number(row.iosRevenue || 0),
      androidRevenueUsd: result.androidRevenueUsd + Number(row.androidRevenue || 0),
      admobRevenueUsd: result.admobRevenueUsd + Number(row.admobRevenue || 0),
    }),
    { iosRevenueUsd: 0, androidRevenueUsd: 0, admobRevenueUsd: 0 }
  );

  return NextResponse.json({ success: true, summary, range: { from, to, fromMonth, toMonth } });
}

function monthsBackFromCurrent(fromMonth: string) {
  const fromParts = fromMonth.split('-').map(Number);
  if (fromParts.length !== 2 || fromParts.some(Number.isNaN)) {
    return '12';
  }

  const [fromYear, fromMonthNumber] = fromParts;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNumber = now.getMonth() + 1;
  const monthCount = (currentYear - fromYear) * 12 + (currentMonthNumber - fromMonthNumber) + 1;
  return String(Math.min(12, Math.max(1, monthCount)));
}
