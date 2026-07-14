'use client'

import * as React from 'react';
import { 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Bar,
  ComposedChart,
  Line,
  Legend,
  ReferenceLine
} from 'recharts';
import { 
  Smartphone, 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Briefcase, 
  CreditCard,
  LayoutDashboard,
  Wallet,
  Landmark,
  CircleHelp,
  CalendarDays,
  BarChart3,
  ReceiptText,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  HandCoins,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TemporalFilter } from '@/components/finance-hub/temporal-filter';
import { DateRange } from 'react-day-picker';
import { OtherIncomeQuickPanel } from '@/components/finance-hub/other-income-quick-panel';
import { ExpenseQuickPanel } from '@/components/finance-hub/expense-quick-panel';
import { RevenueQuickPanel } from '@/components/finance-hub/revenue-quick-panel';
import { PayoutsQuickPanel } from '@/components/finance-hub/payouts-quick-panel';
import { CreateInvoiceDialog } from '@/components/finance-hub/create-invoice-dialog';
import { differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval, endOfDay, format, startOfMonth, startOfYear } from 'date-fns';
import type { AppRevenueBreakdown } from '@/app/(dashboard)/dashboard/actions';
import { listCurrencyRates, listOtherIncomes } from '@/app/(dashboard)/other-income/actions';
import { getTaxWorkspace, type TaxLedgerEntry } from '@/app/(dashboard)/tax-returns/actions';
import type { OtherIncome } from '@/app/(dashboard)/other-income/data';
import { deleteFinanceFixedDeposit, listFinanceFixedDeposits, listFinancePayouts, saveFinanceFixedDeposit, type FinanceExpense, type FinanceFixedDeposit, type FinancePayout } from './actions';

type FinanceTotals = {
  appRevenueLkr: number;
  iosRevenueLkr: number;
  androidRevenueLkr: number;
  unattributedAppRevenueLkr: number;
  taxLedgerAppRevenueLkr: number;
  admobRevenueLkr: number;
  otherIncomeLkr: number;
  adExpensesLkr: number;
  businessExpensesLkr: number;
  otherCostsLkr: number;
  payoutsLkr: number;
  fixedDepositLkr: number;
  liquidCashLkr: number;
  grossRevenueLkr: number;
  taxableIncomeLkr: number;
  taxPayableLkr: number;
  totalExpensesLkr: number;
  netLiquidLkr: number;
};

type TaxLedgerRevenueKind = 'ios' | 'android' | 'admob' | 'other_app';
type TaxLedgerExpenseKind = 'ad' | 'business' | 'other';

type TaxLedgerRevenueItem = {
  id: string;
  date: string;
  title: string;
  category: string;
  amount: number;
  currency: 'USD' | 'LKR';
  kind: TaxLedgerRevenueKind;
};

type TaxLedgerExpenseItem = {
  id: string;
  date: string;
  title: string;
  category: string;
  subCategory?: string;
  amount: number;
  currency: 'USD' | 'LKR';
  kind: TaxLedgerExpenseKind;
};

type TaxLedgerFinanceItems = {
  revenueItems: TaxLedgerRevenueItem[];
  expenseItems: TaxLedgerExpenseItem[];
};

const financeHelpQuickTips = [
  'Date range filter එකෙන් chart, revenue, expenses, tax values calculate වෙන period එක මාරු වෙනවා.',
  'Summary cards click කළාම ඒ amount එක build වෙලා තියෙන rows/details dialog එකකින් බලන්න පුළුවන්.',
  'Create Invoice flow එකේ Send Invoice click කළාම confirm screen එකක් එනවා; Confirm & Send කලොත් විතරයි Gmail යන්නේ.',
];

const financeHelpSections = [
  {
    title: 'Header & Date Range',
    eyebrow: 'Page control',
    icon: CalendarDays,
    iconClassName: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200',
    description: 'Finance Hub එකේ top area එකෙන් period එක තෝරලා page එකේ financial snapshot එක refresh කරනවා.',
    points: [
      'Date filter එක current year range එකෙන් start වෙනවා.',
      'Range එක change කරලා commit කළාම tax ledger income/expense rows නැවත load වෙනවා.',
      'Question mark button එකෙන් මේ help dialog එක open වෙනවා.',
      'Create Invoice button එකෙන් tax mailbox එකට invoice email එකක් prepare කරන්න පුළුවන්.',
    ],
    actions: [
      { label: 'Date Filter', detail: 'Calendar range එක choose කරලා visible revenue, expenses, chart, and tax values period-specific කරයි.' },
      { label: 'Create Invoice', detail: 'Invoice no, vendor, line items, tag, remark දාලා confirmation screen එකෙන් verify කරලා Gmail එකට send කරන flow එක.' },
    ],
  },
  {
    title: 'Top Summary Cards',
    eyebrow: 'Key finance totals',
    icon: LayoutDashboard,
    iconClassName: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-200',
    description: 'උඩ card row එකෙන් selected range එකේ ප්‍රධාන income and cost buckets ඉක්මනින් බලන්න පුළුවන්.',
    points: [
      'App Revenue, AdMob Revenue, Other Income, Ad Expenses, Business Ops, Other Costs කියන buckets පෙන්වනවා.',
      'App/AdMob/Ad Expenses cards tax ledger source rows වලින් build වෙනවා.',
      'Other Income card එකෙන් other income records view/add/edit කරන්න පුළුවන්.',
      'Business Ops and Other Costs cards expense ledger details read-only ලෙස පෙන්වනවා.',
    ],
    actions: [
      { label: 'Arrow cards', detail: 'Card එක click කළාම ඒ card total එකට අදාළ detail panel එක open වෙනවා.' },
      { label: 'Loading shimmer', detail: 'Date range එක refresh වෙන අතර value shimmer animation එකක් පෙන්වයි.' },
    ],
  },
  {
    title: 'Income vs Expenses Chart',
    eyebrow: 'Trend view',
    icon: BarChart3,
    iconClassName: 'border-blue-300/25 bg-blue-400/10 text-blue-200',
    description: 'මෙම chart එක selected range එකේ income streams, expenses, and net profit trend එක visually පෙන්වනවා.',
    points: [
      'Google Play, Google AdMob, Apple income separate bars ලෙස පෙන්වනවා.',
      'Expenses red bar එකක් ලෙස පෙන්වනවා.',
      'Net Profit line එක income minus expenses trend එක පෙන්වනවා.',
      'Range එක දින 45කට අඩු නම් daily view; එයට වැඩි නම් monthly view ලෙස aggregate වෙනවා.',
    ],
    actions: [
      { label: 'Hover tooltip', detail: 'Chart point/bar එක hover කළාම actual row value පෙන්වනවා.' },
      { label: 'Legend', detail: 'Series color එක identify කරන්න chart top legend එක භාවිතා කරන්න.' },
    ],
  },
  {
    title: 'Savings, Payouts & Fixed Deposits',
    eyebrow: 'Cash movement',
    icon: Wallet,
    iconClassName: 'border-violet-300/25 bg-violet-400/10 text-violet-200',
    description: 'Business savings pool, withdrawn payouts, and invested fixed deposits එකම area එකක track කරනවා.',
    points: [
      'Business Savings Pool = liquid cash + fixed deposit value ලෙස පෙන්වනවා.',
      'Payouts card එක click කළාම employee/business withdrawals list එක open වෙනවා.',
      'Fixed Deposits table එක bank entity, capital asset, APY, maturity, status පෙන්වනවා.',
      'Add FD button එකෙන් fixed deposit එකක් finance hub table එකට save කරන්න පුළුවන්.',
    ],
    actions: [
      { label: 'Payouts', detail: 'Payment history view/add/edit/delete කරන්න Payouts card එක භාවිතා කරනවා.' },
      { label: 'Add FD', detail: 'Bank name, asset, APY, maturity date, Active/Pending status දාලා fixed deposit save කරනවා.' },
    ],
  },
  {
    title: 'Revenue, Tax & Expenses Breakdown',
    eyebrow: 'Bottom analysis cards',
    icon: ShieldCheck,
    iconClassName: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
    description: 'Bottom cards තුනෙන් gross revenue split, estimated corporate tax, and expenditure split summarize කරනවා.',
    points: [
      'Revenue card එක iOS, Android, Tax Mail App Income, AdMob income split පෙන්වනවා.',
      'Tax card එක gross revenue, deductible business expenses, taxable income, 15% corporate tax payable පෙන්වනවා.',
      'Expenses card එක marketing ads, business expenses, other costs percentage split පෙන්වනවා.',
      'Progress bars percentages total value එකට relative ලෙස calculate වෙනවා.',
    ],
    actions: [
      { label: 'Tax estimate', detail: 'Corporate Tax Payable value එක taxable income x 15% ලෙස estimate වෙනවා.' },
      { label: 'Expense split', detail: 'Total expenditure drain එක ad + business + other cost totals එකතුවයි.' },
    ],
  },
  {
    title: 'Invoice Email Flow',
    eyebrow: 'Tax Gmail preparation',
    icon: ReceiptText,
    iconClassName: 'border-rose-300/25 bg-rose-400/10 text-rose-200',
    description: 'Create Invoice dialog එකෙන් tax return evidence සඳහා formatted invoice email එකක් prepare කරලා configured Gmail OAuth හරහා send කරනවා.',
    points: [
      'Line items එකින් එක add/remove කරන්න පුළුවන්; qty, rate, line total, final total auto calculate වෙනවා.',
      'Expenses සහ Other Expenses tag දෙකෙන් tax classification signal එක email body එකට යනවා.',
      'Remark field එක tax note, payment method, approval note වගේ context එකට භාවිතා කරන්න.',
      'Send Invoice click කළාම details okkoma confirm dialog එකේ පෙන්වනවා; Confirm & Send click කළොත් විතරයි email send වෙනවා.',
    ],
    actions: [
      { label: 'Back to Edit', detail: 'Confirmation screen එකෙන් ආපසු form එකට ගිහින් entered data නැති නොකර edit කරන්න පුළුවන්.' },
      { label: 'Confirm & Send', detail: 'Review කරපු invoice එක tax@rermedapps.com server mailbox එකට send කරන final action එක.' },
    ],
  },
];

function buildPerformanceData(
  range: DateRange | undefined,
  revenueItems: TaxLedgerRevenueItem[],
  expenseItems: TaxLedgerExpenseItem[]
) {
  const to = range?.to || range?.from || endOfDay(new Date());
  const from = range?.from || startOfYear(to);
  const daySpan = Math.max(0, differenceInCalendarDays(to, from));
  const useDaily = daySpan <= 45;
  const points = useDaily
    ? eachDayOfInterval({ start: from, end: to })
    : eachMonthOfInterval({ start: startOfMonth(from), end: startOfMonth(to) });
  const periodKey = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(`${normalizeTaxDate(value) || value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return format(useDaily ? date : startOfMonth(date), useDaily ? 'yyyy-MM-dd' : 'yyyy-MM');
  };
  const rowsByKey = new Map<string, { googlePlayIncome: number; googleAdmobIncome: number; appleIncome: number; expenses: number }>();
  points.forEach((date) => rowsByKey.set(periodKey(date), { googlePlayIncome: 0, googleAdmobIncome: 0, appleIncome: 0, expenses: 0 }));

  revenueItems.forEach((item) => {
    const key = periodKey(item.date);
    const row = rowsByKey.get(key);
    if (!row) return;
    const amount = Math.max(0, Number(item.amount || 0));
    if (item.kind === 'ios') row.appleIncome += amount;
    if (item.kind === 'admob') row.googleAdmobIncome += amount;
    if (item.kind === 'android' || item.kind === 'other_app') row.googlePlayIncome += amount;
  });

  expenseItems.forEach((item) => {
    const key = periodKey(item.date);
    const row = rowsByKey.get(key);
    if (row) row.expenses += Math.abs(Number(item.amount || 0));
  });

  return points.map((date) => {
    const row = rowsByKey.get(periodKey(date)) || { googlePlayIncome: 0, googleAdmobIncome: 0, appleIncome: 0, expenses: 0 };
    const googlePlayIncome = Math.max(0, row.googlePlayIncome);
    const googleAdmobIncome = Math.max(0, row.googleAdmobIncome);
    const appleIncome = Math.max(0, row.appleIncome);
    const expenses = Math.max(0, row.expenses);
    const income = googlePlayIncome + googleAdmobIncome + appleIncome;
    return {
      name: format(date, useDaily ? 'MMM dd' : 'MMM yy').toUpperCase(),
      googlePlayIncome,
      googleAdmobIncome,
      appleIncome,
      expenses,
      netProfit: income - expenses,
    };
  });
}

type FixedDepositStatus = 'Active' | 'Pending';
type FixedDepositCurrency = 'LKR' | 'USD';

const fixedDepositPageSize = 4;

function fixedDepositStatusColor(status: FixedDepositStatus) {
  return status === 'Active' ? '#00BA88' : '#F59E0B';
}

function formatLkr(amount: number) {
  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `Rs ${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: millions >= 10 ? 1 : 2,
      minimumFractionDigits: 0,
    }).format(millions)}M`;
  }

  return `Rs ${Math.round(amount).toLocaleString('en-US')}`;
}

function formatChartActualAmount(amount: number) {
  if (!Number.isFinite(amount)) return '0';
  const normalizedAmount = Object.is(amount, -0) ? 0 : amount;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 20,
    useGrouping: true,
  }).format(normalizedAmount);
}

function safePercent(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function convertedToLkr(amount: number, currency: string, usdToLkrRate: number) {
  return currency === 'USD' ? amount * usdToLkrRate : amount;
}

function otherIncomeToLkr(income: OtherIncome, usdToLkrRate: number) {
  if (income.convertedAmount !== undefined) return income.convertedAmount * usdToLkrRate;
  return convertedToLkr(income.amount, income.currency, usdToLkrRate);
}

function payoutToLkr(payout: FinancePayout, usdToLkrRate: number) {
  return convertedToLkr(payout.amount, payout.currency, usdToLkrRate);
}

function taxIncomeToLkr(item: TaxLedgerRevenueItem, usdToLkrRate: number) {
  return convertedToLkr(item.amount, item.currency, usdToLkrRate);
}

function taxIncomeToUsd(item: TaxLedgerRevenueItem, usdToLkrRate: number) {
  if (item.currency === 'USD') return item.amount;
  return usdToLkrRate > 0 ? item.amount / usdToLkrRate : item.amount;
}

function taxExpenseToLkr(item: TaxLedgerExpenseItem, usdToLkrRate: number) {
  return convertedToLkr(Math.abs(item.amount), item.currency, usdToLkrRate);
}

function taxExpenseToUsd(item: TaxLedgerExpenseItem, usdToLkrRate: number) {
  const amount = Math.abs(item.amount);
  if (item.currency === 'USD') return amount;
  return usdToLkrRate > 0 ? amount / usdToLkrRate : amount;
}

function emptyRevenueBreakdownRow(label: string): AppRevenueBreakdown {
  return {
    label,
    iosRevenue: 0,
    androidRevenue: 0,
    admobRevenue: 0,
    iosAdExpense: 0,
    androidAdExpense: 0,
    total: 0,
    debug: {
      ios: { docId: '', values: '' },
      android: { docId: '', values: '' },
      admob: { docId: '', values: '' },
      adExpense: { docId: '', values: '', logs: [] },
    },
  };
}

function buildTaxLedgerRevenuePanelRows(items: TaxLedgerRevenueItem[], usdToLkrRate: number) {
  const rows = new Map<string, AppRevenueBreakdown>();
  items.forEach((item) => {
    const label = item.title || item.category || 'Tax Ledger Revenue';
    const row = rows.get(label) || emptyRevenueBreakdownRow(label);
    const amountUsd = taxIncomeToUsd(item, usdToLkrRate);
    if (item.kind === 'ios') row.iosRevenue += amountUsd;
    if (item.kind === 'android' || item.kind === 'other_app') row.androidRevenue += amountUsd;
    if (item.kind === 'admob') row.admobRevenue += amountUsd;
    row.total = row.iosRevenue + row.androidRevenue + row.admobRevenue;
    rows.set(label, row);
  });
  return Array.from(rows.values()).filter((row) => row.total > 0);
}

function buildTaxLedgerAdExpensePanelRows(items: TaxLedgerExpenseItem[], usdToLkrRate: number) {
  const rows = new Map<string, AppRevenueBreakdown>();
  items
    .filter((item) => item.kind === 'ad')
    .forEach((item) => {
      const label = item.title || item.category || 'Tax Ledger Ad Expense';
      const row = rows.get(label) || emptyRevenueBreakdownRow(label);
      row.androidAdExpense += taxExpenseToUsd(item, usdToLkrRate);
      row.total = row.iosAdExpense + row.androidAdExpense;
      rows.set(label, row);
    });
  return Array.from(rows.values()).filter((row) => row.iosAdExpense + row.androidAdExpense > 0);
}

function taxLedgerExpenseToFinanceExpense(item: TaxLedgerExpenseItem, usdToLkrRate: number): FinanceExpense {
  const category = item.kind === 'business' ? 'Business' : 'Other';
  const sourceCategory = [item.category, item.subCategory].filter(Boolean).join(' / ');

  return {
    id: item.id,
    category,
    subCategory: sourceCategory || undefined,
    description: item.title || item.category || 'Tax ledger expense',
    amount: Math.abs(item.amount),
    currency: item.currency,
    date: item.date,
    recurrence: 'One-Time',
    convertedAmount: taxExpenseToUsd(item, usdToLkrRate),
    isGenerated: true,
  };
}

function buildTaxLedgerFinanceExpenses(items: TaxLedgerExpenseItem[], usdToLkrRate: number) {
  return items
    .filter((item) => item.kind === 'business' || item.kind === 'other')
    .map((item) => taxLedgerExpenseToFinanceExpense(item, usdToLkrRate));
}

function parseLkrAsset(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, '').trim();
  const match = normalized.match(/([\d.]+)/);
  if (!match) return 0;
  const numericValue = Number(match[1]);
  if (!Number.isFinite(numericValue)) return 0;
  if (normalized.includes('m')) return numericValue * 1_000_000;
  if (normalized.includes('k')) return numericValue * 1_000;
  return numericValue;
}

function inferFixedDepositCurrency(deposit: Pick<FinanceFixedDeposit, 'capitalAsset' | 'currency'>): FixedDepositCurrency {
  if (deposit.currency === 'USD' || /^\s*(usd|\$)/i.test(deposit.capitalAsset)) {
    return 'USD';
  }
  return 'LKR';
}

function stripFixedDepositCurrencyPrefix(value: string) {
  return value
    .replace(/^\s*(rs\.?|lkr|usd|\$)\s*/i, '')
    .trim();
}

function buildFixedDepositAssetValue(value: string, currency: FixedDepositCurrency) {
  const cleanValue = stripFixedDepositCurrencyPrefix(value);
  return currency === 'USD' ? `USD ${cleanValue}` : `Rs ${cleanValue}`;
}

function fixedDepositToLkr(deposit: FinanceFixedDeposit, usdToLkrRate: number) {
  const amount = parseLkrAsset(deposit.capitalAsset);
  return inferFixedDepositCurrency(deposit) === 'USD' ? amount * usdToLkrRate : amount;
}

function displayFixedDepositAsset(deposit: FinanceFixedDeposit) {
  const value = deposit.capitalAsset.trim();
  if (/^(rs|lkr|usd|\$)/i.test(value)) {
    return value;
  }
  return inferFixedDepositCurrency(deposit) === 'USD' ? `USD ${value}` : `Rs ${value}`;
}

function normalizeTaxDate(value: string | undefined) {
  const text = String(value || '').trim();
  const isoDate = text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, 'yyyy-MM-dd');
  }

  return '';
}

function isTaxDateInRange(value: string | undefined, range?: DateRange) {
  const date = normalizeTaxDate(value);
  if (!date) return false;

  const from = range?.from ? format(range.from, 'yyyy-MM-dd') : '';
  const to = range?.to || range?.from ? format(range.to || range.from!, 'yyyy-MM-dd') : '';

  return (!from || date >= from) && (!to || date <= to);
}

function getFiscalPeriodForDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
}

function getTaxPeriodsForRange(range?: DateRange) {
  const end = range?.to || range?.from || endOfDay(new Date());
  const start = range?.from || startOfYear(end);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const finalMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  const periods = new Set<string>();

  while (cursor <= finalMonth) {
    periods.add(getFiscalPeriodForDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return Array.from(periods);
}

function classifyTaxLedgerRevenueKind(row: TaxLedgerEntry): TaxLedgerRevenueKind | null {
  if (row.entryType !== 'Income') return null;
  const searchText = [
    row.title,
    row.category,
    row.subcategory,
    row.source,
    row.notes,
    row.parsedVendor,
    row.parsedPaymentDetails,
  ].join(' ').toLowerCase();

  if (/\b(admob|ad mob|adsense|advertising payment|advertising income|ad revenue|ad network)\b/.test(searchText)) {
    return 'admob';
  }
  if (/\b(google play|play store|play console|merchant\s*\/\s*partner payment|android)\b/.test(searchText)) {
    return 'android';
  }
  if (/\b(apple|app store|itunes|ios|appstoreconnect|app store connect|apple developer)\b/.test(searchText)) {
    return 'ios';
  }
  if (/\b(app revenue|app proceeds|store proceeds|subscription proceeds|in-app purchase|iap revenue)\b/.test(searchText)) {
    return 'other_app';
  }

  return null;
}

function classifyTaxLedgerExpenseKind(row: TaxLedgerEntry): TaxLedgerExpenseKind | null {
  if (row.entryType !== 'Expense') return null;
  const searchText = [
    row.title,
    row.category,
    row.subcategory,
    row.source,
    row.notes,
    row.parsedVendor,
    row.parsedPaymentDetails,
  ].join(' ').toLowerCase();

  if (/\b(google ads|google advertising|adwords|meta ads|facebook ads|apple search ads|advertising|marketing|promotion|campaign|ad expense|paid clicks?)\b/.test(searchText)) {
    return 'ad';
  }
  if (/\b(business|ops|operations?|office|saas|licen[cs]es?|subscription|hosting|cloud|server|domain|software|tooling|openai|chatgpt|google workspace|firebase|accounting|legal|tax filing|bank charge|bank fee)\b/.test(searchText)) {
    return 'business';
  }

  return 'other';
}

function taxLedgerToRevenueItem(row: TaxLedgerEntry): TaxLedgerRevenueItem | null {
  const kind = classifyTaxLedgerRevenueKind(row);
  if (!kind) return null;
  const amount = Number(row.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return {
    id: `ledger-${row.id}`,
    date: normalizeTaxDate(row.transactionDate),
    title: row.title,
    category: row.category,
    amount,
    currency: row.currency,
    kind,
  };
}

function taxLedgerToExpenseItem(row: TaxLedgerEntry): TaxLedgerExpenseItem | null {
  const kind = classifyTaxLedgerExpenseKind(row);
  if (!kind) return null;
  const amount = Number(row.amount || 0);
  if (!Number.isFinite(amount) || amount === 0) return null;

  return {
    id: `tax-ledger-${row.id}`,
    date: normalizeTaxDate(row.transactionDate),
    title: row.title,
    category: row.category,
    subCategory: row.subcategory || undefined,
    amount,
    currency: row.currency,
    kind,
  };
}

function uniqueTaxRevenueItems(items: TaxLedgerRevenueItem[]) {
  const rows = new Map<string, TaxLedgerRevenueItem>();
  items.forEach((item) => {
    const key = `${item.id}:${item.date}:${item.amount}:${item.currency}:${item.kind}`;
    if (!rows.has(key)) {
      rows.set(key, item);
    }
  });
  return Array.from(rows.values());
}

function uniqueTaxExpenseItems(items: TaxLedgerExpenseItem[]) {
  const rows = new Map<string, TaxLedgerExpenseItem>();
  items.forEach((item) => {
    const key = `${item.id}:${item.date}:${item.amount}:${item.currency}:${item.kind}`;
    if (!rows.has(key)) {
      rows.set(key, item);
    }
  });
  return Array.from(rows.values());
}

async function loadTaxLedgerFinanceItems(range?: DateRange): Promise<TaxLedgerFinanceItems> {
  const workspaces = await Promise.all(getTaxPeriodsForRange(range).map((period) => getTaxWorkspace(period)));
  const revenueItems = workspaces.flatMap((workspace) =>
    workspace.ledger
      .map(taxLedgerToRevenueItem)
      .filter((item): item is TaxLedgerRevenueItem => Boolean(item))
      .filter((item) => isTaxDateInRange(item.date, range))
  );
  const expenseItems = workspaces.flatMap((workspace) =>
    workspace.ledger
      .map(taxLedgerToExpenseItem)
      .filter((item): item is TaxLedgerExpenseItem => Boolean(item))
      .filter((item) => isTaxDateInRange(item.date, range))
  );

  return {
    revenueItems: uniqueTaxRevenueItems(revenueItems),
    expenseItems: uniqueTaxExpenseItems(expenseItems),
  };
}

async function safeFinanceLoad<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.error('Finance Hub data load failed:', error);
    return fallback;
  }
}

function getCurrentYearRange(): DateRange {
  const today = new Date();
  return {
    from: startOfYear(today),
    to: endOfDay(today),
  };
}

export default function FinanceHubPage() {
  const initialRange = React.useMemo<DateRange>(() => getCurrentYearRange(), []);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: initialRange.from,
    to: initialRange.to
  });
  const [committedRange, setCommittedRange] = React.useState<DateRange | undefined>(initialRange);
  const [fixedDeposits, setFixedDeposits] = React.useState<FinanceFixedDeposit[]>([]);
  const [fixedDepositPage, setFixedDepositPage] = React.useState(0);
  const [isFixedDepositDialogOpen, setIsFixedDepositDialogOpen] = React.useState(false);
  const [editingFixedDeposit, setEditingFixedDeposit] = React.useState<FinanceFixedDeposit | null>(null);
  const [fixedDepositStatus, setFixedDepositStatus] = React.useState<FixedDepositStatus>('Active');
  const [fixedDepositCurrency, setFixedDepositCurrency] = React.useState<FixedDepositCurrency>('LKR');
  const [isSavingFixedDeposit, setIsSavingFixedDeposit] = React.useState(false);
  const [otherIncomes, setOtherIncomes] = React.useState<OtherIncome[]>([]);
  const [financePayouts, setFinancePayouts] = React.useState<FinancePayout[]>([]);
  const [taxLedgerRevenueItems, setTaxLedgerRevenueItems] = React.useState<TaxLedgerRevenueItem[]>([]);
  const [taxLedgerExpenseItems, setTaxLedgerExpenseItems] = React.useState<TaxLedgerExpenseItem[]>([]);
  const [usdToLkrRate, setUsdToLkrRate] = React.useState(300);
  const [isTemporalValueLoading, setIsTemporalValueLoading] = React.useState(false);
  const [isFinanceSnapshotLoaded, setIsFinanceSnapshotLoaded] = React.useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = React.useState(false);

  const handleCommit = (range: DateRange | undefined = dateRange) => {
    setCommittedRange(range);
  };

  const fetchFinanceSnapshot = React.useCallback(async (range?: DateRange) => {
    setIsFinanceSnapshotLoaded(false);
    setIsTemporalValueLoading(true);
    const [fixedDepositRows, fetchedOtherIncomes, fetchedPayouts, rates, fetchedTaxLedgerFinanceItems] = await Promise.all([
      safeFinanceLoad(() => listFinanceFixedDeposits(), []),
      safeFinanceLoad(() => listOtherIncomes(), []),
      safeFinanceLoad(() => listFinancePayouts(), []),
      safeFinanceLoad(() => listCurrencyRates(), { LKR: 300 }),
      safeFinanceLoad(() => loadTaxLedgerFinanceItems(range), { revenueItems: [], expenseItems: [] }),
    ]);
    setFixedDeposits(fixedDepositRows);
    setOtherIncomes(fetchedOtherIncomes);
    setFinancePayouts(fetchedPayouts);
    setTaxLedgerRevenueItems(fetchedTaxLedgerFinanceItems.revenueItems);
    setTaxLedgerExpenseItems(fetchedTaxLedgerFinanceItems.expenseItems);
    setUsdToLkrRate(rates.LKR && rates.LKR > 0 ? rates.LKR : 300);
    setIsTemporalValueLoading(false);
    setIsFinanceSnapshotLoaded(true);
  }, []);

  React.useEffect(() => {
    fetchFinanceSnapshot(committedRange);
  }, [committedRange, fetchFinanceSnapshot]);

  React.useEffect(() => {
    const handleRefresh = () => {
      fetchFinanceSnapshot(committedRange);
    };
    window.addEventListener('finance-hub:refresh', handleRefresh);
    return () => window.removeEventListener('finance-hub:refresh', handleRefresh);
  }, [committedRange, fetchFinanceSnapshot]);

  const totals = React.useMemo<FinanceTotals>(() => {
    const taxLedgerAppItems = taxLedgerRevenueItems.filter((item) => item.kind !== 'admob');
    const taxLedgerAdmobItems = taxLedgerRevenueItems.filter((item) => item.kind === 'admob');
    const taxLedgerAdExpenseItems = taxLedgerExpenseItems.filter((item) => item.kind === 'ad');
    const taxLedgerBusinessExpenseItems = taxLedgerExpenseItems.filter((item) => item.kind === 'business');
    const taxLedgerOtherExpenseItems = taxLedgerExpenseItems.filter((item) => item.kind === 'other');
    const taxLedgerAppRevenueLkr = taxLedgerAppItems.reduce((sum, item) => sum + taxIncomeToLkr(item, usdToLkrRate), 0);
    const taxLedgerIosRevenueLkr = taxLedgerRevenueItems
      .filter((item) => item.kind === 'ios')
      .reduce((sum, item) => sum + taxIncomeToLkr(item, usdToLkrRate), 0);
    const taxLedgerAndroidRevenueLkr = taxLedgerRevenueItems
      .filter((item) => item.kind === 'android')
      .reduce((sum, item) => sum + taxIncomeToLkr(item, usdToLkrRate), 0);
    const unattributedAppRevenueLkr = taxLedgerRevenueItems
      .filter((item) => item.kind === 'other_app')
      .reduce((sum, item) => sum + taxIncomeToLkr(item, usdToLkrRate), 0);
    const taxLedgerAdmobRevenueLkr = taxLedgerAdmobItems.reduce((sum, item) => sum + taxIncomeToLkr(item, usdToLkrRate), 0);
    const taxLedgerAdExpensesLkr = taxLedgerAdExpenseItems.reduce((sum, item) => sum + taxExpenseToLkr(item, usdToLkrRate), 0);
    const taxLedgerBusinessExpensesLkr = taxLedgerBusinessExpenseItems.reduce((sum, item) => sum + taxExpenseToLkr(item, usdToLkrRate), 0);
    const taxLedgerOtherExpensesLkr = taxLedgerOtherExpenseItems.reduce((sum, item) => sum + taxExpenseToLkr(item, usdToLkrRate), 0);
    const iosRevenueLkr = taxLedgerIosRevenueLkr;
    const androidRevenueLkr = taxLedgerAndroidRevenueLkr;
    const admobRevenueLkr = taxLedgerAdmobRevenueLkr;
    const adExpensesLkr = taxLedgerAdExpensesLkr;
    const otherIncomeLkr = otherIncomes.reduce((sum, income) => sum + otherIncomeToLkr(income, usdToLkrRate), 0);
    const businessExpensesLkr = taxLedgerBusinessExpensesLkr;
    const otherCostsLkr = taxLedgerOtherExpensesLkr;
    const payoutsLkr = financePayouts.reduce((sum, payout) => sum + payoutToLkr(payout, usdToLkrRate), 0);
    const fixedDepositLkr = fixedDeposits.reduce((sum, deposit) => sum + fixedDepositToLkr(deposit, usdToLkrRate), 0);
    const appRevenueLkr = taxLedgerAppRevenueLkr;
    const grossRevenueLkr = appRevenueLkr + admobRevenueLkr + otherIncomeLkr;
    const totalExpensesLkr = adExpensesLkr + businessExpensesLkr + otherCostsLkr;
    const taxableIncomeLkr = Math.max(0, grossRevenueLkr - adExpensesLkr - businessExpensesLkr);
    const taxPayableLkr = taxableIncomeLkr * 0.15;
    const cashAfterExpensesLkr = grossRevenueLkr - totalExpensesLkr;
    const liquidCashLkr = Math.max(0, cashAfterExpensesLkr - fixedDepositLkr - payoutsLkr);
    const netLiquidLkr = Math.max(0, liquidCashLkr + fixedDepositLkr);

    return {
      appRevenueLkr,
      iosRevenueLkr,
      androidRevenueLkr,
      unattributedAppRevenueLkr,
      taxLedgerAppRevenueLkr,
      admobRevenueLkr,
      otherIncomeLkr,
      adExpensesLkr,
      businessExpensesLkr,
      otherCostsLkr,
      payoutsLkr,
      fixedDepositLkr,
      liquidCashLkr,
      grossRevenueLkr,
      taxableIncomeLkr,
      taxPayableLkr,
      totalExpensesLkr,
      netLiquidLkr,
    };
  }, [financePayouts, fixedDeposits, otherIncomes, taxLedgerExpenseItems, taxLedgerRevenueItems, usdToLkrRate]);

  const taxLedgerRevenuePanelRows = React.useMemo(
    () => buildTaxLedgerRevenuePanelRows(taxLedgerRevenueItems, usdToLkrRate),
    [taxLedgerRevenueItems, usdToLkrRate]
  );
  const taxLedgerAdExpensePanelRows = React.useMemo(
    () => buildTaxLedgerAdExpensePanelRows(taxLedgerExpenseItems, usdToLkrRate),
    [taxLedgerExpenseItems, usdToLkrRate]
  );
  const taxLedgerFinanceExpenses = React.useMemo(
    () => buildTaxLedgerFinanceExpenses(taxLedgerExpenseItems, usdToLkrRate),
    [taxLedgerExpenseItems, usdToLkrRate]
  );

  const chartData = React.useMemo(
    () => buildPerformanceData(committedRange, taxLedgerRevenueItems, taxLedgerExpenseItems),
    [committedRange, taxLedgerExpenseItems, taxLedgerRevenueItems]
  );
  const chartRangeLabel = React.useMemo(() => {
    if (!committedRange?.from) return 'Selected range';
    const to = committedRange.to || committedRange.from;
    return `${format(committedRange.from, 'MMM dd, yyyy')} - ${format(to, 'MMM dd, yyyy')}`;
  }, [committedRange]);

  const fixedDepositPageCount = Math.max(1, Math.ceil(fixedDeposits.length / fixedDepositPageSize));
  const fixedDepositRows = fixedDeposits.slice(
    fixedDepositPage * fixedDepositPageSize,
    fixedDepositPage * fixedDepositPageSize + fixedDepositPageSize
  );

  const handleAddFixedDeposit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const asset = String(formData.get('asset') || '').trim();
    const apyValue = String(formData.get('apy') || '').trim();
    const maturity = String(formData.get('maturity') || '').trim();

    if (!name || !asset || !apyValue || !maturity) {
      return;
    }

    const apyPercent = Number(apyValue.replace('%', ''));
    setIsSavingFixedDeposit(true);
    const result = await saveFinanceFixedDeposit({
      ...(editingFixedDeposit ? { id: editingFixedDeposit.id } : {}),
      bankEntity: name,
      capitalAsset: buildFixedDepositAssetValue(asset, fixedDepositCurrency),
      currency: fixedDepositCurrency,
      apyPercent,
      maturityDate: maturity,
      status: fixedDepositStatus,
    });
    setIsSavingFixedDeposit(false);
    if (result.error) {
      return;
    }
    await fetchFinanceSnapshot(committedRange);
    setFixedDepositPage(0);
    setFixedDepositStatus('Active');
    setFixedDepositCurrency('LKR');
    setEditingFixedDeposit(null);
    setIsFixedDepositDialogOpen(false);
    form.reset();
  };

  const summaryStats = [
    { label: 'App Revenue', value: formatLkr(totals.appRevenueLkr), icon: Smartphone, color: '#3B82F6', revenuePanel: 'app', isValueLoading: isTemporalValueLoading },
    { label: 'AdMob Revenue', value: formatLkr(totals.admobRevenueLkr), icon: Globe, color: '#F59E0B', revenuePanel: 'admob', isValueLoading: isTemporalValueLoading },
    { label: 'Other Income', value: formatLkr(totals.otherIncomeLkr), icon: Zap, color: '#8B5CF6', canAdd: true },
    { label: 'Ad Expenses', value: formatLkr(totals.adExpensesLkr), icon: TrendingDown, color: '#EF4444', revenuePanel: 'adExpense', isValueLoading: isTemporalValueLoading },
    { label: 'Business Ops', value: formatLkr(totals.businessExpensesLkr), icon: Briefcase, color: '#10B981', panel: 'business' },
    { label: 'Other Costs', value: formatLkr(totals.otherCostsLkr), icon: CreditCard, color: '#6B7280', panel: 'other' },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 space-y-8 font-sans">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0D0D11] px-5 py-4 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_38%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.14)]">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300/70">RER MedApps</p>
                <h1 className="mt-1 text-2xl font-black italic tracking-tight text-white md:text-3xl">Finance Hub</h1>
                <p className="mt-1 text-sm font-medium text-white/45">Revenue, expenses, payouts, and deposits in one view.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsHelpDialogOpen(true)}
                className="h-11 w-11 rounded-2xl border-emerald-300/20 bg-emerald-400/10 px-0 text-emerald-100 hover:bg-emerald-400/15 hover:text-white"
                aria-label="Open finance hub help"
                title="Finance Hub Help"
              >
                <CircleHelp className="h-5 w-5" />
              </Button>
              <CreateInvoiceDialog />
              <TemporalFilter 
                dateRange={dateRange} 
                onDateRangeChange={setDateRange} 
                onCommit={handleCommit} 
              />
            </div>
          </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {summaryStats.map((stat, i) => {
          const isClickable = stat.canAdd || stat.panel || stat.revenuePanel;
          const card = (
          <div
            tabIndex={isClickable ? 0 : undefined}
            className={cn(
              "group relative overflow-hidden bg-[#0D0D11] border border-white/5 rounded-2xl p-5 transition-all duration-300",
              isClickable && "cursor-pointer hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045] hover:shadow-[0_18px_55px_rgba(0,0,0,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            )}
          >
            {isClickable && (
              <>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(circle at top right, ${stat.color}24, transparent 42%)` }} />
                <div
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border bg-white/[0.06] text-white/65 shadow-[0_0_18px_rgba(255,255,255,0.08)] transition-all duration-300 group-hover:scale-105 group-hover:bg-white/[0.12] group-hover:text-white group-focus-visible:bg-white/[0.12]"
                  style={{ borderColor: `${stat.color}66` }}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </>
            )}
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-lg")} style={{ backgroundColor: stat.color }}>
              <stat.icon className="text-black w-5 h-5" />
            </div>
            <p className="relative text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="relative h-6 overflow-hidden">
              <p className="whitespace-nowrap text-lg font-black italic tracking-tighter transition-all duration-300 ease-out">
                {stat.value}
              </p>
              {stat.isValueLoading && (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-full overflow-hidden rounded-md">
                  <div className="finance-value-shimmer h-full w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
                </div>
              )}
            </div>
          </div>
          );

          if (stat.canAdd) {
            return (
              <OtherIncomeQuickPanel key={i} incomes={otherIncomes} dataReady={isFinanceSnapshotLoaded}>
                {card}
              </OtherIncomeQuickPanel>
            );
          }

          if (stat.revenuePanel) {
            return (
              <RevenueQuickPanel
                key={i}
                kind={stat.revenuePanel as 'app' | 'admob' | 'adExpense'}
                rows={stat.revenuePanel === 'adExpense' ? taxLedgerAdExpensePanelRows : taxLedgerRevenuePanelRows}
                dataReady={isFinanceSnapshotLoaded}
              >
                {card}
              </RevenueQuickPanel>
            );
          }

          if (stat.panel) {
            return (
              <ExpenseQuickPanel key={i} kind={stat.panel as 'business' | 'other'} expenses={taxLedgerFinanceExpenses} dataReady={isFinanceSnapshotLoaded} readOnly>
                {card}
              </ExpenseQuickPanel>
            );
          }

          return <React.Fragment key={i}>{card}</React.Fragment>;
        })}
      </div>

      {/* Main Performance Chart */}
      <div data-finance-performance-chart className="bg-[#0D0D11] border border-white/5 rounded-[2.5rem] p-8 space-y-8">
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <TrendingUp className="text-[#22D3EE] w-6 h-6" />
                <h2 className="text-xl font-black italic tracking-tighter uppercase">Income vs Expenses</h2>
            </div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
              Calendar range: {chartRangeLabel} - actual row values
            </p>
        </div>

        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} barCategoryGap="28%" barGap={8} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.055)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={58}
                tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 800 }}
                tickFormatter={(value) => formatChartActualAmount(Number(value))}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.035)' }}
                contentStyle={{ backgroundColor: '#16161D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 18px 45px rgba(0,0,0,0.35)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                labelStyle={{ color: 'rgba(255,255,255,0.72)', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em' }}
                formatter={(value, name) => [formatChartActualAmount(Number(value)), name]}
              />
              <Legend verticalAlign="top" align="left" iconType="circle" content={({ payload }) => (
                <div className="mb-8 flex flex-wrap gap-6">
                    {payload?.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full', entry.dataKey === 'netProfit' && 'h-1.5 w-4 rounded-none')} style={{ backgroundColor: entry.color }} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{entry.value}</span>
                        </div>
                    ))}
                </div>
              )} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
              <Bar
                dataKey="googlePlayIncome"
                name="Google Play"
                stackId="income"
                fill="#22D3EE"
                stroke="#0891B2"
                strokeWidth={1}
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="googleAdmobIncome"
                name="Google AdMob"
                stackId="income"
                fill="#F59E0B"
                stroke="#B45309"
                strokeWidth={1}
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="appleIncome"
                name="Apple"
                stackId="income"
                fill="#A78BFA"
                stroke="#7C3AED"
                strokeWidth={1}
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="#FF4D74"
                stroke="#B42348"
                strokeWidth={1}
                radius={[8, 8, 0, 0]}
              />
              <Line 
                type="monotone" 
                dataKey="netProfit" 
                name="Net Profit" 
                stroke="#60A5FA" 
                strokeWidth={3} 
                dot={{ r: 4, strokeWidth: 2, fill: '#0D0D11', stroke: '#60A5FA' }}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#0D0D11', stroke: '#60A5FA' }} 
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Middle Section: Savings & Fixed Deposits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Business Savings & Payouts */}
        <div className="lg:col-span-4 grid gap-6">
            <div className="min-h-[235px] bg-gradient-to-br from-[#1A1A24] to-[#0D0D11] border border-white/10 rounded-[2rem] p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                <div>
                    <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                        <Wallet className="text-blue-400 w-6 h-6" />
                    </div>
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Business Savings Pool</p>
                    <p className="text-4xl font-black italic tracking-tighter">{formatLkr(totals.netLiquidLkr)}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-6">
                    <div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Liquid Cash</p>
                        <p className="text-base font-black italic tracking-tighter text-white">{formatLkr(totals.liquidCashLkr)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1 text-right">Invested FD</p>
                        <p className="text-base font-black italic tracking-tighter text-blue-400 text-right">{formatLkr(totals.fixedDepositLkr)}</p>
                    </div>
                </div>
            </div>

            <PayoutsQuickPanel payments={financePayouts} dataReady={isFinanceSnapshotLoaded}>
            <div className="group min-h-[235px] cursor-pointer bg-[#0D0D11] border border-white/5 rounded-[2rem] p-7 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-rose-300/25 hover:bg-white/[0.035] hover:shadow-[0_18px_55px_rgba(0,0,0,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/25">
                <div className="absolute -bottom-16 -right-10 w-56 h-56 bg-rose-500/10 rounded-full blur-[90px] pointer-events-none" />
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.18),transparent_42%)]" />
                <div className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/40 bg-white/[0.06] text-white/65 shadow-[0_0_18px_rgba(255,255,255,0.08)] transition-all duration-300 group-hover:scale-105 group-hover:bg-white/[0.12] group-hover:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                </div>
                <div>
                    <div className="w-12 h-12 bg-rose-500/15 border border-rose-500/25 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                        <HandCoins className="text-rose-300 w-6 h-6" />
                    </div>
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">Payouts</p>
                    <p className="text-4xl font-black italic tracking-tighter text-rose-100">{formatLkr(totals.payoutsLkr)}</p>
                </div>
                <div className="border-t border-white/5 pt-6">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Business withdrawals</p>
                    <p className="text-sm font-semibold text-white/55">Money already taken out from business cashflow.</p>
                </div>
            </div>
            </PayoutsQuickPanel>
        </div>

        {/* Bank Fixed Deposits Table */}
        <div className="lg:col-span-8 bg-[#0D0D11] border border-white/5 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Landmark className="text-blue-400 w-5 h-5" />
                    <h2 className="text-lg font-black italic tracking-tighter uppercase">Bank Fixed Deposits</h2>
                </div>
                <Dialog
                    open={isFixedDepositDialogOpen}
                    onOpenChange={(open) => {
                      setIsFixedDepositDialogOpen(open);
                      if (!open) {
                        setEditingFixedDeposit(null);
                        setFixedDepositStatus('Active');
                        setFixedDepositCurrency('LKR');
                      }
                    }}
                >
                    <DialogTrigger asChild>
                        <Button
                          className="h-10 rounded-full bg-blue-600 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-500"
                          onClick={() => {
                            setEditingFixedDeposit(null);
                            setFixedDepositStatus('Active');
                            setFixedDepositCurrency('LKR');
                          }}
                        >
                            <Plus className="h-4 w-4" />
                            Add FD
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="overflow-hidden rounded-3xl border-white/10 bg-[#0D0D11] p-0 text-white sm:max-w-lg">
                        <DialogHeader className="border-b border-white/10 bg-blue-500/[0.08] px-6 py-5">
                            <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/[0.15] text-blue-100">
                                    <Landmark className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="font-black italic tracking-tight">{editingFixedDeposit ? 'Edit Fixed Deposit' : 'Add Fixed Deposit'}</DialogTitle>
                                    <DialogDescription className="mt-1 text-white/45">
                                        {editingFixedDeposit ? 'Update the selected fixed deposit.' : 'Insert a bank fixed deposit into the finance hub table.'}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <form onSubmit={handleAddFixedDeposit} className="space-y-4 px-6 py-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-widest text-white/45">Bank Entity</label>
                                <Input name="name" placeholder="Commercial Bank" defaultValue={editingFixedDeposit?.bankEntity || ''} className="h-11 rounded-xl border-white/10 bg-white/[0.04]" required />
                            </div>
                            <div className="grid grid-cols-[1fr_110px] gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/45">Capital Asset</label>
                                    <Input name="asset" placeholder={fixedDepositCurrency === 'USD' ? '5,000.00' : '5.0M'} defaultValue={editingFixedDeposit ? stripFixedDepositCurrencyPrefix(editingFixedDeposit.capitalAsset) : ''} className="h-11 rounded-xl border-white/10 bg-white/[0.04]" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/45">Currency</label>
                                    <Select value={fixedDepositCurrency} onValueChange={(value) => setFixedDepositCurrency(value as FixedDepositCurrency)}>
                                        <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LKR">LKR</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/45">APY</label>
                                    <Input name="apy" placeholder="12.5" defaultValue={editingFixedDeposit?.apyPercent ?? ''} className="h-11 rounded-xl border-white/10 bg-white/[0.04]" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/45">Maturity</label>
                                    <Input name="maturity" type="date" defaultValue={editingFixedDeposit?.maturityDate || ''} className="h-11 rounded-xl border-white/10 bg-white/[0.04]" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-widest text-white/45">Status</label>
                                    <Select value={fixedDepositStatus} onValueChange={(value) => setFixedDepositStatus(value as FixedDepositStatus)}>
                                        <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">Active</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" className="rounded-xl border-white/10" onClick={() => setIsFixedDepositDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSavingFixedDeposit} className="rounded-xl bg-blue-600 text-white hover:bg-blue-500">
                                    {isSavingFixedDeposit ? 'Saving...' : editingFixedDeposit ? 'Update FD' : 'Save FD'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Bank Entity</th>
                            <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-center">Capital Asset</th>
                            <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-center">APY</th>
                            <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-center">Maturity</th>
                            <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Status</th>
                            <th className="pb-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {fixedDepositRows.map((fd) => {
                          const statusColor = fixedDepositStatusColor(fd.status);
                          return (
                            <tr key={fd.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-6 flex items-center gap-3 font-bold text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                        <Landmark className="w-4 h-4 text-white/40" />
                                    </div>
                                    {fd.bankEntity}
                                </td>
                                <td className="py-6 text-center italic font-black text-sm">{displayFixedDepositAsset(fd)}</td>
                                <td className="py-6 text-center font-bold text-blue-400 text-sm">{fd.apyPercent}%</td>
                                <td className="py-6 text-center text-white/40 font-medium text-xs tracking-tighter">{fd.maturityDate.replaceAll('-', '.')}</td>
                                <td className="py-6 text-right">
                                    <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border" style={{ color: statusColor, borderColor: statusColor + '40', backgroundColor: statusColor + '10' }}>
                                        {fd.status}
                                    </span>
                                </td>
                                <td className="py-6">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-blue-400/40 hover:text-blue-200"
                                            onClick={() => {
                                              setEditingFixedDeposit(fd);
                                              setFixedDepositStatus(fd.status);
                                              setFixedDepositCurrency(inferFixedDepositCurrency(fd));
                                              setIsFixedDepositDialogOpen(true);
                                            }}
                                            aria-label={`Edit ${fd.bankEntity} fixed deposit`}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-rose-400/40 hover:text-rose-200"
                                                    aria-label={`Delete ${fd.bankEntity} fixed deposit`}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="overflow-hidden rounded-3xl border-rose-400/20 bg-[#101014] p-0 text-white shadow-2xl">
                                                <AlertDialogHeader className="border-b border-white/10 bg-rose-500/[0.08] px-6 py-5">
                                                    <div className="flex items-start gap-3">
                                                        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/[0.16] text-rose-100">
                                                            <Trash2 className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <AlertDialogTitle className="font-black italic tracking-tight text-white">
                                                                Delete Fixed Deposit?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription className="mt-1 text-sm font-medium text-white/50">
                                                                This will remove the selected FD from the finance hub list.
                                                            </AlertDialogDescription>
                                                        </div>
                                                    </div>
                                                </AlertDialogHeader>
                                                <div className="space-y-4 px-6 py-5">
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/30">Bank Entity</p>
                                                        <p className="mt-2 text-base font-black text-white">{fd.bankEntity}</p>
                                                        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                                                            <span className="font-bold text-white/45">Capital Asset</span>
                                                            <span className="font-black italic text-rose-100">{displayFixedDepositAsset(fd)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <AlertDialogFooter className="border-t border-white/10 px-6 py-5">
                                                    <AlertDialogCancel className="mt-0 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                                                        Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="rounded-xl bg-rose-600 text-white hover:bg-rose-500"
                                                        onClick={async () => {
                                                          const result = await deleteFinanceFixedDeposit(fd.id);
                                                          if (!result.error) {
                                                            await fetchFinanceSnapshot(committedRange);
                                                            setFixedDepositPage(0);
                                                          }
                                                        }}
                                                    >
                                                        Delete FD
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </td>
                            </tr>
                          );
                        })}
                        {fixedDepositRows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-16 text-center text-sm font-semibold text-white/35">
                                    No fixed deposits saved yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-8 flex items-center justify-end gap-2 border-t border-white/5 pt-5">
                <span className="mr-4 text-[10px] font-bold uppercase tracking-widest text-white/20">
                    Page {fixedDepositPage + 1} of {fixedDepositPageCount}
                </span>
                <button
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 transition-colors"
                    disabled={fixedDepositPage === 0}
                    onClick={() => setFixedDepositPage((page) => Math.max(0, page - 1))}
                >
                    <ChevronLeft className="w-5 h-5 text-white/60" />
                </button>
                <button
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35 transition-colors"
                    disabled={fixedDepositPage >= fixedDepositPageCount - 1}
                    onClick={() => setFixedDepositPage((page) => Math.min(fixedDepositPageCount - 1, page + 1))}
                >
                    <ChevronRight className="w-5 h-5 text-white" />
                </button>
            </div>
        </div>
      </div>

      {/* Bottom Section: Revenue, Tax, Expenses Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <div className="bg-[#0D0D11] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="bg-[#00BA88] px-8 py-6 flex items-center justify-between">
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-black">Revenue</h3>
            <ArrowUpRight className="text-black w-6 h-6" />
          </div>
          <div className="p-8 flex-1 space-y-8">
            <div className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 flex items-center gap-2"><Smartphone className="w-3 h-3" /> iOS App Store</span>
                   <span className="text-sm italic font-black">{formatLkr(totals.iosRevenueLkr)} <span className="text-white/20">({safePercent(totals.iosRevenueLkr, totals.grossRevenueLkr)}%)</span></span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${safePercent(totals.iosRevenueLkr, totals.grossRevenueLkr)}%` }} />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 flex items-center gap-2"><Smartphone className="w-3 h-3" /> Android Store</span>
                   <span className="text-sm italic font-black">{formatLkr(totals.androidRevenueLkr)} <span className="text-white/20">({safePercent(totals.androidRevenueLkr, totals.grossRevenueLkr)}%)</span></span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${safePercent(totals.androidRevenueLkr, totals.grossRevenueLkr)}%` }} />
                 </div>
               </div>
               {totals.unattributedAppRevenueLkr > 0 && (
                 <div className="space-y-2">
                   <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
                     <span className="text-white/40 flex items-center gap-2"><Smartphone className="w-3 h-3" /> Tax Mail App Income</span>
                     <span className="text-sm italic font-black">{formatLkr(totals.unattributedAppRevenueLkr)} <span className="text-white/20">({safePercent(totals.unattributedAppRevenueLkr, totals.grossRevenueLkr)}%)</span></span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${safePercent(totals.unattributedAppRevenueLkr, totals.grossRevenueLkr)}%` }} />
                   </div>
                 </div>
               )}
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 flex items-center gap-2"><Zap className="w-3 h-3" /> AdMob Network</span>
                   <span className="text-sm italic font-black">{formatLkr(totals.admobRevenueLkr)} <span className="text-white/20">({safePercent(totals.admobRevenueLkr, totals.grossRevenueLkr)}%)</span></span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${safePercent(totals.admobRevenueLkr, totals.grossRevenueLkr)}%` }} />
                 </div>
               </div>
            </div>
            <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-bold text-[#00BA88] uppercase tracking-[0.2em] mb-2">Total Revenue Realized</p>
                <p className="text-4xl font-black italic tracking-tighter text-[#00BA88]">{formatLkr(totals.grossRevenueLkr)}</p>
            </div>
          </div>
        </div>

        {/* Tax Card */}
        <div className="bg-[#0D0D11] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="bg-[#8B5CF6] px-8 py-6 flex items-center justify-between">
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Tax</h3>
            <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
              <span className="text-white text-[14px] font-bold">$</span>
            </div>
          </div>
          <div className="p-8 flex-1 space-y-8">
            <div className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 italic">Gross Revenue</span>
                   <span className="text-sm italic font-black">{formatLkr(totals.grossRevenueLkr)}</span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#8B5CF6]" style={{ width: `${totals.grossRevenueLkr > 0 ? 100 : 0}%` }} />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 italic">Business Expenses</span>
                   <span className="text-sm italic font-black text-red-500">({formatLkr(totals.adExpensesLkr + totals.businessExpensesLkr)})</span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${safePercent(totals.adExpensesLkr + totals.businessExpensesLkr, totals.grossRevenueLkr)}%` }} />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 italic">Taxable Income</span>
                   <span className="text-sm italic font-black text-blue-400">{formatLkr(totals.taxableIncomeLkr)}</span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${safePercent(totals.taxableIncomeLkr, totals.grossRevenueLkr)}%` }} />
                 </div>
               </div>
            </div>
            <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-[0.2em] mb-2">Corporate Tax Payable (15%)</p>
                <p className="text-4xl font-black italic tracking-tighter text-[#8B5CF6]">{formatLkr(totals.taxPayableLkr)}</p>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-[#0D0D11] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="bg-[#EF4444] px-8 py-6 flex items-center justify-between">
            <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Expenses</h3>
            <ArrowDownRight className="text-white w-6 h-6" />
          </div>
          <div className="p-8 flex-1 space-y-8">
            <div className="space-y-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 flex items-center gap-2"><Zap className="w-3 h-3" /> Marketing & Ads</span>
                   <span className="text-sm italic font-black">{formatLkr(totals.adExpensesLkr)} <span className="text-white/20">({safePercent(totals.adExpensesLkr, totals.totalExpensesLkr)}%)</span></span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${safePercent(totals.adExpensesLkr, totals.totalExpensesLkr)}%` }} />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 flex items-center gap-2"><Briefcase className="w-3 h-3" /> Business Expenses</span>
                   <span className="text-sm italic font-black">{formatLkr(totals.businessExpensesLkr)} <span className="text-white/20">({safePercent(totals.businessExpensesLkr, totals.totalExpensesLkr)}%)</span></span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${safePercent(totals.businessExpensesLkr, totals.totalExpensesLkr)}%` }} />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
                   <span className="text-white/40 flex items-center gap-2"><Smartphone className="w-3 h-3" /> Other Costs</span>
                   <span className="text-sm italic font-black">{formatLkr(totals.otherCostsLkr)} <span className="text-white/20">({safePercent(totals.otherCostsLkr, totals.totalExpensesLkr)}%)</span></span>
                 </div>
                 <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500" style={{ width: `${safePercent(totals.otherCostsLkr, totals.totalExpensesLkr)}%` }} />
                 </div>
               </div>
            </div>
            <div className="pt-8 border-t border-white/5">
                <p className="text-[10px] font-bold text-[#EF4444] uppercase tracking-[0.2em] mb-2">Total Expenditure Drain</p>
                <p className="text-4xl font-black italic tracking-tighter text-[#EF4444]">{formatLkr(totals.totalExpensesLkr)}</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden rounded-3xl border-emerald-300/20 bg-[#0D0D11] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_36%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
                <CircleHelp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80">Finance Hub Help</p>
                <DialogTitle className="mt-1 text-lg font-black tracking-tight text-white">මෙම Finance Hub එකේ පෙන්වන දේවල්</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-white/45">
                  Revenue, expenses, tax estimate, payouts, fixed deposits, invoice flow වගේ ප්‍රධාන දේවල් සරලව පැහැදිලි කර ඇත.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto p-5 md:p-6">
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4">
              <p className="text-sm font-semibold leading-6 text-emerald-50/85">
                Finance Hub එකෙන් selected period එකේ app/ad revenue, tax ledger expenses, other income, payouts, cash pool, fixed deposits, and invoice evidence එකම dashboard එකක බලනවා.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {financeHelpQuickTips.map((tip) => (
                  <div key={tip} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold leading-5 text-white/55">
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {financeHelpSections.map((section) => {
                const HelpSectionIcon = section.icon;
                return (
                  <section key={section.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl border', section.iconClassName)}>
                        <HelpSectionIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{section.eyebrow}</p>
                        <h3 className="mt-1 text-sm font-black text-white">{section.title}</h3>
                        <p className="mt-2 text-xs font-semibold leading-5 text-white/50">{section.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {section.points.map((point) => (
                        <div key={point} className="flex gap-2 text-xs font-semibold leading-5 text-white/60">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/70" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {section.actions.map((action) => (
                        <div key={`${section.title}-${action.label}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">{action.label}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-white/55">{action.detail}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
