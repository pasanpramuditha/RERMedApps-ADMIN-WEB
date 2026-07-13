'use client';

import * as React from 'react';
import JSZip from 'jszip';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  Eye,
  FileSearch,
  Inbox,
  FileText,
  Landmark,
  Mail,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CreateInvoiceDialog } from '@/components/finance-hub/create-invoice-dialog';
import { cn } from '@/lib/utils';
import {
  approveTaxEmailGroup,
  deleteTaxCategory,
  deleteTaxEmail,
  deleteTaxLedgerEntry,
  extractTaxEmailInvoiceWithDocumentAi,
  getTaxEmailAttachment,
  getTaxLedgerAttachment,
  getTaxWorkspace,
  markTaxEmailDuplicate,
  saveTaxCategory,
  saveTaxLedgerEntry,
  syncTaxGmailEmails,
  updateTaxEmail,
  type TaxCategory,
  type TaxEmailQueueItem,
  type TaxLedgerEntry,
  type TaxAttachmentPreview,
} from './actions';

type WorkspaceTab = 'ledger' | 'email' | 'categories' | 'reportManager' | 'reportOverview';
type TaxStatus = 'Ready' | 'Review' | 'Pending';
type GmailSyncStatus = {
  tone: 'success' | 'error' | 'info';
  text: string;
  searched?: string[];
  errors?: string[];
};
type DuplicateLedgerMatch = {
  ledgerId: string;
  title: string;
  invoiceNo: string;
  invoiceDate: string;
  vendor: string;
  amount: number;
  currency: string;
  reason: string;
};
type SubjectDuplicateFlag = {
  label: string;
  count: number;
  subject: string;
};
type TaxReportCadence = 'Monthly' | 'Annual' | 'One Time';
type TaxReportSource = {
  id: string;
  type: 'Income' | 'Expense';
  name: string;
  category: string;
  keywords: string;
  cadence: TaxReportCadence;
  purchaseDate: string;
  hasEndDate: boolean;
  endDate: string;
};
type TaxReportMonth = {
  label: string;
  key: string;
  startDate: string;
  endDate: string;
};
type TaxReportSourceStatus = {
  source: TaxReportSource;
  expected: boolean;
  uploaded: boolean;
  rowCount: number;
  amount: number;
  rows: TaxLedgerEntry[];
};
type IncomePaymentSource = 'Google AdMob' | 'Google Play Console' | 'Apple Developer';

const taxPeriods = ['2025/2026', '2024/2025', '2023/2024'];
const EMAIL_GROUPS_PER_PAGE = 10;
const DEFAULT_LEDGER_TAX_ITEM_HEADER = 'Tax Item';
const LEDGER_TAX_ITEM_HEADER_STORAGE_KEY = 'taxReturns.ledgerTaxItemHeader';
const TAX_REPORT_MANAGER_STORAGE_KEY = 'taxReturns.reportManagerSources';
const DELETE_LEDGER_ROW_ANIMATION_MS = 520;
const DEFAULT_TAX_REPORT_SOURCES: TaxReportSource[] = [
  {
    id: 'income-google-play-console',
    type: 'Income',
    name: 'Google Play Console',
    category: '',
    keywords: 'google play, play console, google payment',
    cadence: 'Monthly',
    purchaseDate: '',
    hasEndDate: false,
    endDate: '',
  },
  {
    id: 'income-google-admob',
    type: 'Income',
    name: 'Google AdMob',
    category: '',
    keywords: 'admob, adsense, advertising income',
    cadence: 'Monthly',
    purchaseDate: '',
    hasEndDate: false,
    endDate: '',
  },
  {
    id: 'income-apple-app-store',
    type: 'Income',
    name: 'Apple App Store',
    category: '',
    keywords: 'apple, app store, app store connect',
    cadence: 'Monthly',
    purchaseDate: '',
    hasEndDate: false,
    endDate: '',
  },
  {
    id: 'expense-chatgpt-openai',
    type: 'Expense',
    name: 'ChatGPT / OpenAI Renewal',
    category: '',
    keywords: 'chatgpt, openai',
    cadence: 'Monthly',
    purchaseDate: '',
    hasEndDate: false,
    endDate: '',
  },
];

const taxHelpQuickTips = [
  'උඩ තියෙන financial year selector එකෙන් වැඩ කරන tax year එක මාරු වෙනවා.',
  'Green amount income, red amount expense විදියට ledger එකේ පෙන්වනවා.',
  'Export Return වලින් PDF summary එකත් income/expenses evidence ZIP files දෙකත් download වෙනවා.',
];

const taxHelpSections = [
  {
    title: 'Active Tax Ledger',
    eyebrow: 'Approved ledger rows',
    icon: Database,
    iconClassName: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-200',
    description: 'මෙහි පෙන්වන්නේ තෝරාගෙන ඇති financial year එකට අදාළ approved tax rows සහ manually add කරපු income/expense rows.',
    points: [
      'Tax item column එකේ description, transaction date, source, attachment name පෙන්වනවා.',
      'Invoice ID column එකේ invoice number තිබුණොත් පෙන්වනවා; නැත්නම් blank ලෙස පෙන්වනවා.',
      'Ledger Amount column එකේ income positive/green, expense negative/red ලෙස පෙන්වනවා.',
      'Search, transaction type, currency, category filters වලින් rows ඉක්මනින් filter කරන්න පුළුවන්.',
    ],
    actions: [
      { label: 'View', detail: 'Eye icon එකෙන් PDF/attachment preview එක open වෙනවා. Evidence නැති row එකක මේ button එක disabled වෙනවා.' },
      { label: 'Edit', detail: 'Pencil icon එකෙන් subject, category, attachment display name update කරන්න පුළුවන්.' },
      { label: 'Delete', detail: 'Trash icon එකෙන් ledger row එක valid list එකෙන් ඉවත් වෙනවා. Email row එකක් නම් next sync එකේ pending ලෙස නැවත පෙන්වන්න පුළුවන්.' },
      { label: 'Add Entry', detail: 'Manual income හෝ deductible expense row එකක් ledger එකට add කරනවා.' },
    ],
  },
  {
    title: 'Email Desk',
    eyebrow: 'Server email approval queue',
    icon: Inbox,
    iconClassName: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200',
    description: 'Server mailbox එකට forward වෙන tax emails මෙහි approval queue එකක් ලෙස පෙන්වනවා. Ledger එකට යවන්න කලින් parsed values verify කරන්න මේ tab එක භාවිතා කරනවා.',
    points: [
      'Sync Email button එකෙන් server IMAP inbox එක read කරලා pending approvals queue කරනවා.',
      'Email group එක expand කළාම attachment/child rows, parsed amount, invoice date, vendor, category පෙන්වනවා.',
      'Extract button එකෙන් server IMAP attachment/body text read කරලා invoice values suggest කරනවා.',
      'Approve කරන විට bill/receipt file එක server evidence folder එකට copy වෙනවා.',
    ],
    actions: [
      { label: 'Approve', detail: 'Child row එක approve කළාම select වෙනවා. Parent Approve Email button එක click කළාට පස්සේ selected rows ledger එකට insert වෙනවා.' },
      { label: 'View', detail: 'Attachment preview එක open කරනවා.' },
      { label: 'Edit', detail: 'Parsed amount/currency වගේ approval values correct කරන්න භාවිතා කරනවා.' },
      { label: 'Delete', detail: 'Email approval queue එකෙන් ඉවත් කරලා future sync වලින් ඒ email එක exclude කරනවා.' },
      { label: 'Duplicate', detail: 'Existing ledger row එකකට match වෙන forwarded/copy email එකක් නම් duplicate ලෙස mark කරලා future sync වලින් exclude කරනවා.' },
    ],
  },
  {
    title: 'Category Manager',
    eyebrow: 'Ledger category rules',
    icon: Settings,
    iconClassName: 'border-blue-300/25 bg-blue-400/10 text-blue-200',
    description: 'Income සහ Expense categories මෙහි manage කරනවා. මේ categories Add/Edit forms වල dropdown වලටත් email auto categorization rules වලටත් භාවිතා වෙනවා.',
    points: [
      'Income Classifications යටතේ app/ad/service income වගේ categories තබන්න පුළුවන්.',
      'Expense Classifications යටතේ SaaS, office, ad expense වගේ deductible categories තබන්න පුළුවන්.',
      'Keywords field එකෙන් email subject/body/attachment details match වෙලා suggested category තෝරාගන්න උදව් වෙනවා.',
    ],
    actions: [
      { label: 'Add', detail: 'නව category title එකක් සහ optional keywords add කරනවා.' },
      { label: 'Edit', detail: 'Category name හෝ keywords update කරනවා.' },
      { label: 'Delete', detail: 'Category configuration එක valid list එකෙන් ඉවත් වෙනවා. Existing ledger rows වල saved category text එක මෙතැනින් rewrite වෙන්නේ නැහැ.' },
    ],
  },
  {
    title: 'Report Manager',
    eyebrow: 'Expected evidence setup',
    icon: WalletCards,
    iconClassName: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
    description: 'Tax return එකට අවශ්‍ය expected income sources සහ recurring expense renewals මෙහි define කරනවා. Overview tab එක monthly coverage calculate කරන්නේ මේ rules මත.',
    points: [
      'Income Sources යටතේ Google Play, AdMob, Apple App Store වගේ expected income reports add කරනවා.',
      'Expense Sources & Renewals යටතේ ChatGPT/OpenAI වගේ monthly, annual, one-time renewals add කරනවා.',
      'Category, keywords, buy date, cadence, optional end date fields overview matching වලට භාවිතා වෙනවා.',
    ],
    actions: [
      { label: 'Add Source', detail: 'නව income හෝ expense evidence rule එකක් add කරනවා.' },
      { label: 'Delete Source', detail: 'Overview monitoring rule එකෙන් ඒ source එක ඉවත් කරනවා. Ledger rows හෝ emails delete වෙන්නේ නැහැ.' },
      { label: 'Reset Defaults', detail: 'Default income/expense source rules නැවත load කරනවා.' },
    ],
  },
  {
    title: 'Report Overview',
    eyebrow: 'Monthly evidence monitor',
    icon: FileSearch,
    iconClassName: 'border-violet-300/25 bg-violet-400/10 text-violet-200',
    description: 'Report Manager rules අනුව financial year එකේ මාස 12ට evidence coverage status මෙහි read-only monitor එකක් ලෙස පෙන්වනවා.',
    points: [
      'Coverage card එක uploaded evidence count සහ total expected evidence count වල percentage එක පෙන්වනවා.',
      'Missing Uploads card එක expected නමුත් ledger/evidence match නොවූ items ගණන පෙන්වනවා.',
      'මාස card එකක Income සහ Expenses sections වල Uploaded/Missing status, row count, amount පෙන්වනවා.',
    ],
    actions: [
      { label: 'Manage Sources', detail: 'Report Manager tab එකට යවලා monitoring rules update කරන්න පුළුවන්.' },
    ],
  },
  {
    title: 'Export Return',
    eyebrow: 'Filing package',
    icon: Download,
    iconClassName: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200',
    description: 'Tax return submit/review කිරීමට අවශ්‍ය summary සහ evidence files එක package එකක් ලෙස download කරන area එක.',
    points: [
      'Start date සහ end date තෝරලා ඒ range එකේ ledger rows package එකට include කරනවා.',
      'Final ZIP එකේ tax return PDF එක, income.zip, expenses.zip, README file එක ඇතුළත් වෙනවා.',
      'Evidence download/upload configuration හරි නැත්නම් package එකේ download-errors files මඟින් ඒ errors record කරනවා.',
    ],
    actions: [
      { label: 'Download Package', detail: 'Selected date range එකට අදාළ filing package එක browser download එකක් ලෙස සාදනවා.' },
    ],
  },
];

const taxRows = [
  {
    item: 'iOS App Store proceeds',
    category: 'App revenue',
    amount: 1485000,
    taxable: 1485000,
    status: 'Ready' as TaxStatus,
  },
  {
    item: 'Google Play proceeds',
    category: 'App revenue',
    amount: 722000,
    taxable: 722000,
    status: 'Ready' as TaxStatus,
  },
  {
    item: 'AdMob advertising income',
    category: 'Ad revenue',
    amount: 384000,
    taxable: 384000,
    status: 'Review' as TaxStatus,
  },
  {
    item: 'Cloud hosting and tooling',
    category: 'Deductible expense',
    amount: -186500,
    taxable: -186500,
    status: 'Ready' as TaxStatus,
  },
  {
    item: 'Marketing and promotions',
    category: 'Deductible expense',
    amount: -214000,
    taxable: -214000,
    status: 'Pending' as TaxStatus,
  },
  {
    item: 'Professional fees',
    category: 'Deductible expense',
    amount: -92500,
    taxable: -92500,
    status: 'Ready' as TaxStatus,
  },
];

const filingTasks = [
  { label: 'Revenue ledgers reconciled', complete: true },
  { label: 'Business expenses classified', complete: true },
  { label: 'Bank statement attachments mapped', complete: true },
  { label: 'Ad network withholding reviewed', complete: false },
  { label: 'Final return PDF exported', complete: false },
];

const emailApprovals = [
  {
    from: 'billing@zoom.us',
    date: '2026-06-22 14:32',
    type: 'Expense',
    title: 'Zoom Pro Subscription Invoice #ZM-90214',
    body: 'Tax Agent Zoom Account Subscription USD 149.90. Paid via Commercial Bank of Ceylon card.',
    category: 'SaaS & Licenses',
    subcategory: 'General Office Apps',
    destination: 'ComBank',
    amount: '$ 149.90',
  },
  {
    from: 'perera.clients@gmail.com',
    date: '2026-06-21 09:15',
    type: 'Income',
    title: 'Payment Receipt: Individual VAT Filings June 2026',
    body: 'Please find transferred Rs. 75,000 for individual tax filings to Sampath Bank account.',
    category: 'Tax Filing Fees',
    subcategory: 'Individual Tax',
    destination: 'Sampath Bank',
    amount: 'Rs. 75,000.00',
  },
  {
    from: 'keells.super@johnkeells.com',
    date: '2026-06-20 18:40',
    type: 'Expense',
    title: 'E-Receipt: Office Pantry Refresh & Supplies',
    body: 'Thank you for shopping at Keells. Total LKR 12,450. Paid by Cash.',
    category: 'Office Operations',
    subcategory: 'Stationery Products',
    destination: 'Cash Registry',
    amount: 'Rs. 12,450.00',
  },
];

const categoryGroups = {
  income: [
    {
      title: 'Tax Filing Fees',
      subcategories: ['Corporate Tax', 'Individual Tax', 'VAT Filing', 'Withholding Tax'],
    },
    {
      title: 'Consulting Services',
      subcategories: ['Retainer Advisory', 'Ad-hoc Audit Advisory', 'Estate Tax Planning'],
    },
  ],
  expenses: [
    {
      title: 'SaaS & Licenses',
      subcategories: ['Tax Software', 'Cloud Storage Systems', 'General Office Apps'],
    },
    {
      title: 'Office Operations',
      subcategories: ['Rent', 'Utilities', 'Stationery Products', 'Courier Services'],
    },
  ],
};

function formatLkr(value: number) {
  const sign = value < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
}

function formatCurrencyAmount(value: number, currency?: string) {
  const normalizedCurrency = String(currency || 'LKR').toUpperCase();
  const sign = value < 0 ? '-' : '';
  const absoluteValue = Math.abs(value);
  if (normalizedCurrency === 'USD') {
    return `${sign}$ ${absoluteValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (normalizedCurrency === 'LKR') {
    return formatLkr(value);
  }
  return `${sign}${normalizedCurrency} ${absoluteValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function normalizeDateInputValue(value?: string | null) {
  const match = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
  if (!match || match[0] === '0000-00-00') {
    return '';
  }
  return match[0];
}

function emailLedgerKey(title?: string, type?: string) {
  return `${String(type || '').trim().toLowerCase()}|${cleanInboxSubject(title).toLowerCase()}`;
}

function formatAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

type TaxChartTooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
};

function getChartMetricLabel(name?: string | number) {
  const key = String(name || '').toLowerCase();
  if (key === 'revenue') return 'Revenue';
  if (key === 'deductions') return 'Deductions';
  if (key === 'liability') return 'Tax Liability';
  return String(name || '');
}

function TaxChartTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TaxChartTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-2xl border border-white/15 bg-[#101827] px-3.5 py-3 text-white shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
      <p className="font-mono text-xs font-black text-white">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => {
          const value = Number(item.value || 0);
          const labelText = getChartMetricLabel(item.name || item.dataKey);
          return (
            <div key={`${labelText}-${item.dataKey || item.name}`} className="flex items-center justify-between gap-4 text-xs font-bold">
              <span className="inline-flex min-w-0 items-center gap-2 text-white/65">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color || '#94a3b8' }} />
                <span className="truncate">{labelText}</span>
              </span>
              <span className="font-mono font-black text-white">{formatLkr(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatIstDateTime(value?: string) {
  if (!value) return '';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(`${normalized}${/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? '' : 'Z'}`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);
}

function getFiscalQuarter(dateValue?: string) {
  const month = Number(String(dateValue || '').slice(5, 7));
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

function getStatusStyles(status: TaxStatus) {
  if (status === 'Ready') return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200';
  if (status === 'Review') return 'border-amber-400/25 bg-amber-400/10 text-amber-200';
  return 'border-sky-400/25 bg-sky-400/10 text-sky-200';
}

function cleanInboxSubject(value?: string) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/^\s*((fwd?|fw|re)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim() || '(No subject)';
}

function detectIncomePaymentSource(value?: string): IncomePaymentSource | '' {
  const normalized = String(value || '').replace(/\s+/g, ' ').toUpperCase();
  if (!normalized) return '';
  if (/GOOGLE\s+ADVERTISING\s+PAYMENT|ADMOB|ADSENSE|ADVERTISING\s+PAYMENT/.test(normalized)) return 'Google AdMob';
  if (/GOOGLE\s+MERCHANT\s*\/\s*PARTNER\s+PAYMENT|MERCHANT\s*\/\s*PARTNER\s+PAYMENT|GOOGLE\s+PLAY/.test(normalized)) return 'Google Play Console';
  if (/PURP\s*:\s*DEVELOPER|\bCCI\s*:|APPLE\s+DEVELOPER|APP\s+STORE\s+CONNECT|APPLE/.test(normalized)) return 'Apple Developer';
  return '';
}

function getIncomePaymentSource(mail: TaxEmailQueueItem, extractedSource = ''): IncomePaymentSource | '' {
  const directSource = detectIncomePaymentSource(extractedSource);
  if (directSource) return directSource;
  return detectIncomePaymentSource([
    mail.parsedPaymentDetails || '',
    mail.parsedVendor || '',
    mail.subject || '',
    mail.bodyPreview || '',
    mail.senderEmail || '',
    mail.attachmentName || '',
  ].join('\n'));
}

function getCorrectedIncomePaymentVendor(mail: TaxEmailQueueItem) {
  const vendor = String(mail.parsedVendor || '').trim();
  const paymentSource = getIncomePaymentSource(mail);
  if (paymentSource === 'Apple Developer' && !/\bapple\b/i.test(vendor)) {
    return 'Apple Inc';
  }
  return vendor;
}

function resolveIncomePaymentCategory(source: IncomePaymentSource, incomeCategories: TaxCategory[], fallback: string) {
  const preferredNames: Record<IncomePaymentSource, string[]> = {
    'Google AdMob': ['Google AdMob', 'AdMob Advertising Income', 'Advertising Income', 'App Revenue', 'Tax Filing Fees'],
    'Google Play Console': ['Google Play Console', 'Google Play Income', 'App Revenue', 'Tax Filing Fees'],
    'Apple Developer': ['Apple Developer', 'Apple App Store', 'App Store Income', 'App Revenue', 'Tax Filing Fees'],
  };
  const currentIncomeCategory = incomeCategories.find((category) => category.name === fallback);
  if (currentIncomeCategory) return currentIncomeCategory.name;
  for (const name of preferredNames[source]) {
    const match = incomeCategories.find((category) => category.name.toLowerCase() === name.toLowerCase());
    if (match) return match.name;
  }
  return incomeCategories[0]?.name || fallback;
}

function getIncomePaymentSourceStyles(source: IncomePaymentSource) {
  if (source === 'Google AdMob') return 'border-sky-300/25 bg-sky-400/10 text-sky-100';
  if (source === 'Google Play Console') return 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100';
  return 'border-zinc-300/25 bg-zinc-400/10 text-zinc-100';
}

function getFiscalYearRange(period: string) {
  const [startYearText, endYearText] = period.split('/');
  const startYear = Number(startYearText);
  const endYear = Number(endYearText);
  if (!startYear || !endYear) {
    const year = new Date().getFullYear();
    return { startDate: `${year}-04-01`, endDate: `${year + 1}-03-31` };
  }
  return { startDate: `${startYear}-04-01`, endDate: `${endYear}-03-31` };
}

function isDateInRange(value: string | undefined, startDate: string, endDate: string) {
  const date = String(value || '').slice(0, 10);
  return Boolean(date) && date >= startDate && date <= endDate;
}

function createTaxReportSourceId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTaxReportSources(value: unknown): TaxReportSource[] {
  if (!Array.isArray(value)) return DEFAULT_TAX_REPORT_SOURCES;
  const rows = value
    .map((item): TaxReportSource | null => {
      const row = item as Partial<TaxReportSource>;
      const type = row.type === 'Expense' ? 'Expense' : row.type === 'Income' ? 'Income' : null;
      if (!type || !String(row.name || '').trim()) return null;
      const cadence: TaxReportCadence = row.cadence === 'Annual' || row.cadence === 'One Time' ? row.cadence : 'Monthly';
      return {
        id: String(row.id || createTaxReportSourceId(type.toLowerCase())),
        type,
        name: String(row.name || '').trim(),
        category: String(row.category || '').trim(),
        keywords: String(row.keywords || '').trim(),
        cadence,
        purchaseDate: String(row.purchaseDate || '').slice(0, 10),
        hasEndDate: Boolean(row.hasEndDate),
        endDate: String(row.endDate || '').slice(0, 10),
      };
    })
    .filter((item): item is TaxReportSource => Boolean(item));
  return rows.length ? rows : DEFAULT_TAX_REPORT_SOURCES;
}

function splitReportKeywords(value: string) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getTaxReportMonths(period: string): TaxReportMonth[] {
  const { startDate } = getFiscalYearRange(period);
  const startYear = Number(startDate.slice(0, 4));
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
  return Array.from({ length: 12 }, (_, index) => {
    const monthDate = new Date(startYear, 3 + index, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, month + 1, 0);
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    return {
      label: formatter.format(monthDate),
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      startDate: start,
      endDate: end,
    };
  });
}

function isReportSourceActiveInMonth(source: TaxReportSource, month: TaxReportMonth) {
  const purchaseDate = source.purchaseDate || month.startDate;
  if (purchaseDate > month.endDate) return false;
  if (source.hasEndDate && source.endDate && source.endDate < month.startDate) return false;
  return true;
}

function isReportSourceExpectedInMonth(source: TaxReportSource, month: TaxReportMonth) {
  if (!isReportSourceActiveInMonth(source, month)) return false;
  if (source.cadence === 'Monthly') return true;
  if (!source.purchaseDate) return true;
  const purchaseMonth = source.purchaseDate.slice(5, 7);
  if (source.cadence === 'Annual') return month.key.slice(5, 7) === purchaseMonth;
  return isDateInRange(source.purchaseDate, month.startDate, month.endDate);
}

function hasTaxLedgerEvidence(row: TaxLedgerEntry) {
  return Boolean(row.attachmentUrl || (row.gmailMessageId && row.gmailAttachmentId));
}

function getTaxLedgerSearchText(row: TaxLedgerEntry) {
  return [
    cleanInboxSubject(row.title),
    row.category,
    row.subcategory || '',
    row.source,
    row.notes || '',
    row.attachmentName || '',
    row.parsedInvoiceNo || '',
    row.parsedVendor || '',
    row.parsedPaymentDetails || '',
  ]
    .join(' ')
    .toLowerCase();
}

function getLedgerInvoiceId(row: TaxLedgerEntry) {
  const parsedInvoiceNo = String(row.parsedInvoiceNo || '').trim();
  if (parsedInvoiceNo) return parsedInvoiceNo;
  const title = cleanInboxSubject(row.title);
  const inwardReference = title.match(/\bIR-[A-Z]{3}\d+\b/i)?.[0];
  if (inwardReference) return inwardReference.toUpperCase();
  const invoiceReference = title.match(/\b(?:INV|INVOICE|REF|REFERENCE)\s*[:#-]?\s*([A-Z0-9-]{4,})\b/i)?.[1];
  return invoiceReference ? invoiceReference.toUpperCase() : '';
}

function getLedgerVendorName(row: TaxLedgerEntry) {
  return String(row.parsedVendor || '').trim();
}

function normalizeDuplicateToken(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeDuplicateSubject(value?: string | null) {
  return cleanInboxSubject(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getEmailDuplicateAmount(mail: TaxEmailQueueItem) {
  const parsedAmount = Number(mail.parsedInvoiceAmount || 0);
  return {
    amount: parsedAmount > 0 ? parsedAmount : Number(mail.amount || 0),
    currency: String(mail.parsedCurrency || mail.currency || 'LKR').toUpperCase(),
  };
}

function getLedgerDuplicateAmount(row: TaxLedgerEntry) {
  const parsedAmount = Number(row.parsedInvoiceAmount || 0);
  return {
    amount: parsedAmount > 0 ? parsedAmount : Number(row.amount || 0),
    currency: String(row.parsedCurrency || row.currency || 'LKR').toUpperCase(),
  };
}

function amountsMatch(left: number, right: number) {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 0.01;
}

function findDuplicateLedgerMatch(
  mail: TaxEmailQueueItem,
  ledgerRows: TaxLedgerEntry[],
  selectedInvoiceDate = '',
): DuplicateLedgerMatch | null {
  const invoiceNo = normalizeDuplicateToken(mail.parsedInvoiceNo);
  const invoiceDate = normalizeDateInputValue(selectedInvoiceDate) || normalizeDateInputValue(mail.parsedInvoiceDate);
  const vendor = normalizeDuplicateToken(getCorrectedIncomePaymentVendor(mail) || mail.parsedVendor);
  const category = String(mail.suggestedCategory || '').trim().toLowerCase();
  const mailAmount = getEmailDuplicateAmount(mail);

  for (const row of ledgerRows) {
    if (row.entryType !== mail.suggestedType) continue;
    if (row.gmailMessageId && row.gmailMessageId === mail.gmailMessageId && (!mail.gmailAttachmentId || row.gmailAttachmentId === mail.gmailAttachmentId)) continue;

    const rowInvoiceNo = normalizeDuplicateToken(getLedgerInvoiceId(row));
    const rowInvoiceDate = normalizeDateInputValue(row.parsedInvoiceDate) || normalizeDateInputValue(row.transactionDate);
    const rowVendor = normalizeDuplicateToken(getLedgerVendorName(row));
    const rowCategory = String(row.category || '').trim().toLowerCase();
    const rowAmount = getLedgerDuplicateAmount(row);
    const sameCurrency = mailAmount.currency === rowAmount.currency;
    const sameAmount = sameCurrency && amountsMatch(mailAmount.amount, rowAmount.amount);
    const sameInvoice = Boolean(invoiceNo && rowInvoiceNo && invoiceNo === rowInvoiceNo);
    const sameDate = Boolean(invoiceDate && rowInvoiceDate && invoiceDate === rowInvoiceDate);
    const sameVendor = Boolean(vendor && rowVendor && vendor === rowVendor);
    const sameCategory = Boolean(category && rowCategory && category === rowCategory);

    let reason = '';
    if (sameInvoice && (sameDate || sameAmount || sameVendor)) {
      reason = [
        'invoice ID',
        sameDate ? 'invoice date' : '',
        sameAmount ? 'amount' : '',
        sameVendor ? 'vendor' : '',
      ].filter(Boolean).join(' + ');
    } else if (!invoiceNo && sameDate && sameAmount && (sameVendor || sameCategory)) {
      reason = [
        'invoice date',
        'amount',
        sameVendor ? 'vendor' : 'category',
      ].join(' + ');
    }

    if (reason) {
      return {
        ledgerId: row.id,
        title: cleanInboxSubject(row.title),
        invoiceNo: getLedgerInvoiceId(row),
        invoiceDate: rowInvoiceDate,
        vendor: getLedgerVendorName(row),
        amount: rowAmount.amount,
        currency: rowAmount.currency,
        reason,
      };
    }
  }

  return null;
}

function matchesTaxReportSource(row: TaxLedgerEntry, source: TaxReportSource) {
  if (row.entryType !== source.type) return false;
  const sourceCategory = source.category.trim().toLowerCase();
  if (sourceCategory && row.category.trim().toLowerCase() === sourceCategory) return true;
  const searchText = getTaxLedgerSearchText(row);
  const keywords = splitReportKeywords(`${source.name},${source.keywords}`);
  return keywords.some((keyword) => keyword.length >= 2 && searchText.includes(keyword));
}

function getTaxReportSourceStatus(source: TaxReportSource, month: TaxReportMonth, rows: TaxLedgerEntry[]): TaxReportSourceStatus {
  const expected = isReportSourceExpectedInMonth(source, month);
  const matchingRows = expected
    ? rows.filter((row) => isDateInRange(row.transactionDate, month.startDate, month.endDate) && matchesTaxReportSource(row, source))
    : [];
  const evidenceRows = matchingRows.filter(hasTaxLedgerEvidence);
  return {
    source,
    expected,
    uploaded: evidenceRows.length > 0,
    rowCount: matchingRows.length,
    amount: matchingRows.reduce((sum, row) => sum + row.amount, 0),
    rows: matchingRows,
  };
}

function sanitizeFileName(value: string, fallback = 'file') {
  const cleaned = String(value || fallback)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || fallback).slice(0, 140);
}

function getExtensionFromMime(mimeType?: string, fallbackName?: string) {
  const existing = fallbackName?.match(/\.([a-z0-9]{2,8})$/i)?.[1];
  if (existing) return existing.toLowerCase();
  if (!mimeType) return 'bin';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('plain')) return 'txt';
  if (mimeType.includes('rfc822')) return 'eml';
  return 'bin';
}

function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function dataUrlToObjectUrl(dataUrl: string) {
  if (!dataUrl.startsWith('data:')) return '';
  const [header, base64 = ''] = dataUrl.split(',');
  const mimeType = header.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const bytes = dataUrlToUint8Array(`data:${mimeType};base64,${base64}`);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrapPdfText(value: string, maxLength = 92) {
  const words = String(value || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
}

function createTaxReturnPdfBlob({
  period,
  startDate,
  endDate,
  rows,
  evidenceCounts,
}: {
  period: string;
  startDate: string;
  endDate: string;
  rows: TaxLedgerEntry[];
  evidenceCounts: { income: number; expenses: number };
}) {
  const incomeRows = rows.filter((row) => row.entryType === 'Income');
  const expenseRows = rows.filter((row) => row.entryType === 'Expense');
  const gross = incomeRows.reduce((sum, row) => sum + row.amount, 0);
  const expenses = expenseRows.reduce((sum, row) => sum + row.amount, 0);
  const taxable = Math.max(0, gross - expenses);
  const lines: Array<{ text: string; size?: number; x?: number; gap?: number }> = [
    { text: 'RERMed Apps - Tax Return Export', size: 20, x: 54, gap: 22 },
    { text: `Financial Year: ${period}`, size: 12, x: 54, gap: 14 },
    { text: `Date Range: ${startDate} to ${endDate}`, size: 12, x: 54, gap: 22 },
    { text: 'Executive Summary', size: 15, x: 54, gap: 16 },
    { text: `Gross Taxable Income: ${formatLkr(gross)}`, size: 11, x: 70, gap: 13 },
    { text: `Claimed Deductions: ${formatLkr(expenses)}`, size: 11, x: 70, gap: 13 },
    { text: `Estimated Taxable Income: ${formatLkr(taxable)}`, size: 11, x: 70, gap: 13 },
    { text: `Income Evidence Files: ${evidenceCounts.income}`, size: 11, x: 70, gap: 13 },
    { text: `Expense Evidence Files: ${evidenceCounts.expenses}`, size: 11, x: 70, gap: 22 },
    { text: 'Income Ledger', size: 15, x: 54, gap: 16 },
  ];

  const addRows = (items: TaxLedgerEntry[]) => {
    if (!items.length) {
      lines.push({ text: 'No entries in selected range.', size: 10, x: 70, gap: 16 });
      return;
    }
    items.forEach((row) => {
      const amount = row.currency === 'LKR' ? formatLkr(row.amount) : `$ ${row.amount.toLocaleString('en-US')}`;
      wrapPdfText(`${row.transactionDate} | ${row.category} | ${amount} | ${cleanInboxSubject(row.title)}`, 96).forEach((text, index) => {
        lines.push({ text, size: 9, x: index === 0 ? 70 : 82, gap: 11 });
      });
      if (row.notes) {
        wrapPdfText(`Notes: ${row.notes}`, 96).forEach((text) => lines.push({ text, size: 8, x: 82, gap: 10 }));
      }
      lines.push({ text: '', size: 8, x: 70, gap: 4 });
    });
  };

  addRows(incomeRows);
  lines.push({ text: 'Expense Ledger', size: 15, x: 54, gap: 16 });
  addRows(expenseRows);

  const pages: string[][] = [[]];
  let y = 760;
  lines.forEach((line) => {
    const gap = line.gap || 12;
    if (y - gap < 54) {
      pages.push([]);
      y = 760;
    }
    pages[pages.length - 1].push(`BT /F1 ${line.size || 10} Tf ${line.x || 54} ${y} Td (${pdfEscape(line.text)}) Tj ET`);
    y -= gap;
  });

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const content = pageLines.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const chunks = ['%PDF-1.4\n'];
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(chunks.join('').length);
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xrefOffset = chunks.join('').length;
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => chunks.push(`${String(offset).padStart(10, '0')} 00000 n \n`));
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

function createTaxReportOverviewPdfBlob({
  period,
  stats,
  months,
}: {
  period: string;
  stats: { uploaded: number; total: number; missing: number; completeMonths: number; percent: number; activeRecurring: number };
  months: Array<TaxReportMonth & {
    income: TaxReportSourceStatus[];
    expenses: TaxReportSourceStatus[];
    expectedCount: number;
    uploadedCount: number;
    percent: number;
    incomeAmount: number;
    expenseAmount: number;
  }>;
}) {
  const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  const missingStatuses = months.flatMap((month) => (
    [...month.income, ...month.expenses]
      .filter((status) => status.expected && !status.uploaded)
      .map((status) => ({
        month: month.label,
        type: status.source.type,
        name: status.source.name,
        cadence: status.source.cadence,
        category: status.source.category || 'Any category',
      }))
  ));

  const lines: Array<{ text: string; size?: number; x?: number; gap?: number }> = [
    { text: 'RERMed Apps - Tax Report Overview', size: 20, x: 54, gap: 22 },
    { text: `Financial Year: ${period}`, size: 12, x: 54, gap: 14 },
    { text: `Generated: ${generatedAt}`, size: 10, x: 54, gap: 22 },
    { text: 'Owner Summary', size: 15, x: 54, gap: 16 },
    { text: `Coverage: ${stats.percent}% (${stats.uploaded}/${stats.total} uploaded)`, size: 11, x: 70, gap: 13 },
    { text: `Missing Uploads: ${stats.missing}`, size: 11, x: 70, gap: 13 },
    { text: `Complete Months: ${stats.completeMonths}/12`, size: 11, x: 70, gap: 13 },
    { text: `Recurring Expense Rules: ${stats.activeRecurring}`, size: 11, x: 70, gap: 22 },
    { text: 'Priority Missing Reports', size: 15, x: 54, gap: 16 },
  ];

  if (!missingStatuses.length) {
    lines.push({ text: 'No missing reports. All expected evidence is uploaded.', size: 10, x: 70, gap: 18 });
  } else {
    missingStatuses.slice(0, 80).forEach((item) => {
      wrapPdfText(`${item.month} | ${item.type} | ${item.name} | ${item.category} | ${item.cadence}`, 96).forEach((text, index) => {
        lines.push({ text, size: 9, x: index === 0 ? 70 : 82, gap: 11 });
      });
    });
    if (missingStatuses.length > 80) {
      lines.push({ text: `Plus ${missingStatuses.length - 80} more missing items.`, size: 9, x: 70, gap: 16 });
    }
  }

  lines.push({ text: '', size: 8, x: 54, gap: 8 });
  lines.push({ text: 'Monthly Coverage', size: 15, x: 54, gap: 16 });
  months.forEach((month) => {
    lines.push({
      text: `${month.label} (${month.key}) - ${month.percent}% complete - ${month.uploadedCount}/${month.expectedCount} uploaded - Income ${formatLkr(month.incomeAmount)} - Expenses ${formatLkr(month.expenseAmount)}`,
      size: 10,
      x: 70,
      gap: 13,
    });
    [...month.income, ...month.expenses]
      .filter((status) => status.expected)
      .forEach((status) => {
        const marker = status.uploaded ? 'UPLOADED' : 'MISSING';
        wrapPdfText(`${marker} | ${status.source.type} | ${status.source.name} | ${status.rowCount} rows | ${formatLkr(status.amount)}`, 96).forEach((text, index) => {
          lines.push({ text, size: 8, x: index === 0 ? 84 : 96, gap: 10 });
        });
      });
    lines.push({ text: '', size: 8, x: 70, gap: 5 });
  });

  const pages: string[][] = [[]];
  let y = 760;
  lines.forEach((line) => {
    const gap = line.gap || 12;
    if (y - gap < 54) {
      pages.push([]);
      y = 760;
    }
    pages[pages.length - 1].push(`BT /F1 ${line.size || 10} Tf ${line.x || 54} ${y} Td (${pdfEscape(line.text)}) Tj ET`);
    y -= gap;
  });

  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  objects.push(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const content = pageLines.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const chunks = ['%PDF-1.4\n'];
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(chunks.join('').length);
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });
  const xrefOffset = chunks.join('').length;
  chunks.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => chunks.push(`${String(offset).padStart(10, '0')} 00000 n \n`));
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(chunks, { type: 'application/pdf' });
}

export default function TaxReturnsPage() {
  const [activePeriod, setActivePeriod] = React.useState(taxPeriods[0]);
  const [selectedRate] = React.useState(15);
  const [search, setSearch] = React.useState('');
  const [emailSearch, setEmailSearch] = React.useState('');
  const [emailStatusFilter, setEmailStatusFilter] = React.useState<'All' | 'Pending' | 'Approved'>('All');
  const [emailPage, setEmailPage] = React.useState(1);
  const [typeFilter, setTypeFilter] = React.useState('All Transactions');
  const [currencyFilter, setCurrencyFilter] = React.useState('All Currencies');
  const [categoryFilter, setCategoryFilter] = React.useState('All Categories');
  const [activeWorkspace, setActiveWorkspace] = React.useState<WorkspaceTab>('ledger');
  const [isHelpDialogOpen, setIsHelpDialogOpen] = React.useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = React.useState(false);
  const [ledgerRows, setLedgerRows] = React.useState<TaxLedgerEntry[]>([]);
  const [categories, setCategories] = React.useState<TaxCategory[]>([]);
  const [emailQueue, setEmailQueue] = React.useState<TaxEmailQueueItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [message, setMessage] = React.useState<string>('');
  const [gmailSyncStatus, setGmailSyncStatus] = React.useState<GmailSyncStatus | null>(null);
  const [isSyncingEmail, setIsSyncingEmail] = React.useState(false);
  const [entryType, setEntryType] = React.useState<'Income' | 'Expense'>('Income');
  const [editingLedgerEntry, setEditingLedgerEntry] = React.useState<TaxLedgerEntry | null>(null);
  const [deleteLedgerEntryTarget, setDeleteLedgerEntryTarget] = React.useState<TaxLedgerEntry | null>(null);
  const [isDeletingLedgerEntry, setIsDeletingLedgerEntry] = React.useState(false);
  const [deletingLedgerRowStates, setDeletingLedgerRowStates] = React.useState<Record<string, 'pending' | 'leaving'>>({});
  const [editingEmail, setEditingEmail] = React.useState<TaxEmailQueueItem | null>(null);
  const [editingCategoryId, setEditingCategoryId] = React.useState('');
  const [approvingEmailId, setApprovingEmailId] = React.useState('');
  const [extractingEmailId, setExtractingEmailId] = React.useState('');
  const [childApprovals, setChildApprovals] = React.useState<Record<string, boolean>>({});
  const [ignoredChildRows, setIgnoredChildRows] = React.useState<Record<string, boolean>>({});
  const [invoiceDateSelections, setInvoiceDateSelections] = React.useState<Record<string, string>>({});
  const [emailCategorySelections, setEmailCategorySelections] = React.useState<Record<string, string>>({});
  const [attachmentPreview, setAttachmentPreview] = React.useState<TaxAttachmentPreview | null>(null);
  const [attachmentPreviewObjectUrl, setAttachmentPreviewObjectUrl] = React.useState('');
  const [isAttachmentLoading, setIsAttachmentLoading] = React.useState(false);
  const [attachmentPreviewError, setAttachmentPreviewError] = React.useState('');
  const [expandedEmailGroups, setExpandedEmailGroups] = React.useState<Record<string, boolean>>({});
  const [emailApprovalStatus, setEmailApprovalStatus] = React.useState<Record<string, string>>({});
  const [approvedEmailAnimations, setApprovedEmailAnimations] = React.useState<Record<string, 'settling' | 'leaving'>>({});
  const [hiddenApprovedEmailIds, setHiddenApprovedEmailIds] = React.useState<Record<string, true>>({});
  const [duplicateEmailMatches, setDuplicateEmailMatches] = React.useState<Record<string, DuplicateLedgerMatch>>({});
  const [duplicateEmailTarget, setDuplicateEmailTarget] = React.useState<TaxEmailQueueItem | null>(null);
  const [isMarkingDuplicateEmail, setIsMarkingDuplicateEmail] = React.useState(false);
  const [deleteEmailTarget, setDeleteEmailTarget] = React.useState<TaxEmailQueueItem | null>(null);
  const [isDeletingEmail, setIsDeletingEmail] = React.useState(false);
  const defaultExportRange = React.useMemo(() => getFiscalYearRange(activePeriod), [activePeriod]);
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);
  const [exportStartDate, setExportStartDate] = React.useState(defaultExportRange.startDate);
  const [exportEndDate, setExportEndDate] = React.useState(defaultExportRange.endDate);
  const [isExportingReturn, setIsExportingReturn] = React.useState(false);
  const [exportStatus, setExportStatus] = React.useState('');
  const [ledgerTaxItemHeader, setLedgerTaxItemHeader] = React.useState(DEFAULT_LEDGER_TAX_ITEM_HEADER);
  const [ledgerTaxItemHeaderDraft, setLedgerTaxItemHeaderDraft] = React.useState(DEFAULT_LEDGER_TAX_ITEM_HEADER);
  const [isEditingLedgerTaxItemHeader, setIsEditingLedgerTaxItemHeader] = React.useState(false);
  const [taxReportSources, setTaxReportSources] = React.useState<TaxReportSource[]>(DEFAULT_TAX_REPORT_SOURCES);
  const [isTaxReportSourceStoreReady, setIsTaxReportSourceStoreReady] = React.useState(false);

  React.useEffect(() => {
    setExportStartDate(defaultExportRange.startDate);
    setExportEndDate(defaultExportRange.endDate);
  }, [defaultExportRange.endDate, defaultExportRange.startDate]);

  React.useEffect(() => {
    const savedHeader = window.localStorage.getItem(LEDGER_TAX_ITEM_HEADER_STORAGE_KEY)?.trim();
    if (savedHeader) {
      setLedgerTaxItemHeader(savedHeader);
      setLedgerTaxItemHeaderDraft(savedHeader);
    }
  }, []);

  React.useEffect(() => {
    try {
      const savedSources = window.localStorage.getItem(TAX_REPORT_MANAGER_STORAGE_KEY);
      if (savedSources) {
        setTaxReportSources(normalizeTaxReportSources(JSON.parse(savedSources)));
      }
    } catch {
      setTaxReportSources(DEFAULT_TAX_REPORT_SOURCES);
    } finally {
      setIsTaxReportSourceStoreReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!isTaxReportSourceStoreReady) return;
    window.localStorage.setItem(TAX_REPORT_MANAGER_STORAGE_KEY, JSON.stringify(taxReportSources));
  }, [isTaxReportSourceStoreReady, taxReportSources]);

  const refreshWorkspace = React.useCallback(async () => {
    setIsLoading(true);
    const workspace = await getTaxWorkspace(activePeriod);
    setLedgerRows(workspace.ledger);
    setCategories(workspace.categories);
    setEmailQueue(workspace.emailQueue);
    setIsLoading(false);
  }, [activePeriod]);

  React.useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  React.useEffect(() => {
    if (!attachmentPreview?.dataUrl?.startsWith('data:')) {
      setAttachmentPreviewObjectUrl('');
      return;
    }
    const url = dataUrlToObjectUrl(attachmentPreview.dataUrl);
    setAttachmentPreviewObjectUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachmentPreview?.dataUrl]);

  async function handleSyncEmailInbox() {
    setIsSyncingEmail(true);
    setGmailSyncStatus({ tone: 'info', text: 'Syncing tax email inbox...' });
    const result = await syncTaxGmailEmails(100);
    setIsSyncingEmail(false);
    if (result.error) {
      setGmailSyncStatus({ tone: 'error', text: result.error, searched: result.searched, errors: result.errors });
      return;
    }
    if (result.emailQueue) {
      setEmailQueue(result.emailQueue);
    }
    setIgnoredChildRows({});
    setChildApprovals({});
    const clearedCount = (result.reset?.queueCleared || 0) + (result.reset?.messagesCleared || 0);
    const syncErrors = [...(result.errors || []), ...(result.reset?.errors || [])];
    setGmailSyncStatus({
      tone: syncErrors.length ? 'info' : 'success',
      text: `Email sync complete. ${clearedCount} old DB rows cleared, ${result.inserted || 0} queued, ${result.skipped || 0} skipped, ${result.found || 0} found.`,
      searched: result.searched,
      errors: syncErrors,
    });
  }

  const emailLedgerBySubject = React.useMemo(() => {
    const ledgerMap = new Map<string, TaxLedgerEntry>();
    ledgerRows
      .filter((row) => row.source === 'Email')
      .forEach((row) => {
        const key = emailLedgerKey(row.title, row.entryType);
        if (key !== '|' && !ledgerMap.has(key)) {
          ledgerMap.set(key, row);
        }
      });
    return ledgerMap;
  }, [ledgerRows]);

  const emailLedgerByGmailKey = React.useMemo(() => {
    const ledgerMap = new Map<string, TaxLedgerEntry>();
    ledgerRows
      .filter((row) => row.source === 'Email' && row.gmailMessageId)
      .forEach((row) => {
        const messageKey = String(row.gmailMessageId);
        const attachmentKey = `${row.gmailMessageId}|${row.gmailAttachmentId || ''}|${row.gmailPartId || ''}`;
        if (!ledgerMap.has(messageKey)) ledgerMap.set(messageKey, row);
        if (!ledgerMap.has(attachmentKey)) ledgerMap.set(attachmentKey, row);
      });
    return ledgerMap;
  }, [ledgerRows]);

  const getExactEmailLedgerRow = React.useCallback((mail: TaxEmailQueueItem) => {
    const messageKey = mail.gmailMessageId || '';
    if (!messageKey) return null;
    const attachmentKey = `${mail.gmailMessageId || ''}|${mail.gmailAttachmentId || ''}|${mail.gmailPartId || ''}`;
    return emailLedgerByGmailKey.get(attachmentKey) || emailLedgerByGmailKey.get(messageKey) || null;
  }, [emailLedgerByGmailKey]);

  const getEmailLedgerRow = React.useCallback((mail: TaxEmailQueueItem) => {
    const gmailMatch = getExactEmailLedgerRow(mail);
    if (gmailMatch) return gmailMatch;
    if (mail.status !== 'Approved') {
      return null;
    }
    const subjectMatch = emailLedgerBySubject.get(emailLedgerKey(mail.subject, mail.suggestedType));
    if (subjectMatch) return subjectMatch;
    const normalizedSubject = cleanInboxSubject(mail.subject).toLowerCase();
    return ledgerRows.find((row) => {
      if (row.source !== 'Email' || row.entryType !== mail.suggestedType) return false;
      const ledgerTitle = cleanInboxSubject(row.title).toLowerCase();
      return ledgerTitle.startsWith(normalizedSubject) || normalizedSubject.startsWith(ledgerTitle);
    }) || null;
  }, [emailLedgerBySubject, getExactEmailLedgerRow, ledgerRows]);

  const isEmailRowApproved = React.useCallback((mail: TaxEmailQueueItem) => {
    return mail.status === 'Approved' || Boolean(getExactEmailLedgerRow(mail));
  }, [getExactEmailLedgerRow]);

  const getEmailResolvedAmount = React.useCallback((mail: TaxEmailQueueItem) => {
    const ledgerRow = getEmailLedgerRow(mail);
    if (ledgerRow) {
      return {
        amount: ledgerRow.parsedInvoiceAmount && ledgerRow.parsedInvoiceAmount > 0 ? ledgerRow.parsedInvoiceAmount : ledgerRow.amount,
        currency: ledgerRow.parsedCurrency || ledgerRow.currency,
      };
    }
    if (mail.parsedInvoiceAmount && mail.parsedInvoiceAmount > 0) {
      return {
        amount: mail.parsedInvoiceAmount,
        currency: mail.parsedCurrency || mail.currency,
      };
    }
    return null;
  }, [getEmailLedgerRow]);

  const filteredRows = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return ledgerRows.filter((row) => {
      const matchesSearch = !needle || `${cleanInboxSubject(row.title)} ${row.category} ${row.status} ${row.source}`.toLowerCase().includes(needle);
      const matchesType = typeFilter === 'All Transactions' || row.entryType === typeFilter;
      const matchesCurrency = currencyFilter === 'All Currencies' || row.currency === currencyFilter;
      const matchesCategory = categoryFilter === 'All Categories' || row.category === categoryFilter;
      return matchesSearch && matchesType && matchesCurrency && matchesCategory;
    });
  }, [categoryFilter, currencyFilter, ledgerRows, search, typeFilter]);

  const visibleEmailQueue = React.useMemo(() => {
    if (emailStatusFilter === 'All') return emailQueue;
    if (emailStatusFilter === 'Approved') return emailQueue;
    return emailQueue.filter((mail) => !hiddenApprovedEmailIds[mail.id]);
  }, [emailQueue, emailStatusFilter, hiddenApprovedEmailIds]);

  const filteredEmailQueue = React.useMemo(() => {
    const needle = emailSearch.trim().toLowerCase();
    if (!needle) return visibleEmailQueue;
    return visibleEmailQueue.filter((mail) => {
      return [
        mail.senderEmail,
        mail.emailSubject || '',
        mail.subject,
        mail.bodyPreview || '',
        mail.suggestedType,
        mail.suggestedCategory,
        mail.registryDestination || '',
        mail.attachmentName || '',
        mail.attachmentMime || '',
        mail.parsedVendor || '',
        mail.parsedPaymentDetails || '',
        getIncomePaymentSource(mail),
        mail.currency,
        String(mail.amount),
      ].join(' ').toLowerCase().includes(needle);
    });
  }, [emailSearch, visibleEmailQueue]);

  const groupedEmailQueue = React.useMemo(() => {
    const groups = new Map<string, { key: string; senderEmail: string; subject: string; receivedAt: string; bodyPreview: string; rows: TaxEmailQueueItem[] }>();
    filteredEmailQueue.forEach((mail) => {
      const emailSubject = cleanInboxSubject(mail.emailSubject || mail.subject);
      const key = mail.gmailMessageId || `${mail.senderEmail}|${emailSubject}|${mail.receivedAt}`;
      const current = groups.get(key);
      if (current) {
        current.rows.push(mail);
        return;
      }
      groups.set(key, {
        key,
        senderEmail: mail.senderEmail,
        subject: emailSubject,
        receivedAt: mail.receivedAt,
        bodyPreview: mail.bodyPreview || '',
        rows: [mail],
      });
    });
    return Array.from(groups.values());
  }, [filteredEmailQueue]);

  const statusFilteredEmailGroups = React.useMemo(() => {
    if (emailStatusFilter === 'All') return groupedEmailQueue;
    return groupedEmailQueue.filter((group) => {
      if (emailStatusFilter === 'Pending') return group.rows.some((row) => !isEmailRowApproved(row)) || !!approvedEmailAnimations[group.key];
      return group.rows.some((row) => isEmailRowApproved(row));
    });
  }, [approvedEmailAnimations, emailStatusFilter, groupedEmailQueue, isEmailRowApproved]);

  React.useEffect(() => {
    setEmailPage(1);
  }, [emailSearch, emailQueue.length, emailStatusFilter]);

  const emailPageCount = Math.max(1, Math.ceil(statusFilteredEmailGroups.length / EMAIL_GROUPS_PER_PAGE));
  const safeEmailPage = Math.min(emailPage, emailPageCount);
  const pagedEmailGroups = React.useMemo(() => {
    const start = (safeEmailPage - 1) * EMAIL_GROUPS_PER_PAGE;
    return statusFilteredEmailGroups.slice(start, start + EMAIL_GROUPS_PER_PAGE);
  }, [safeEmailPage, statusFilteredEmailGroups]);
  const emailPageStart = statusFilteredEmailGroups.length === 0 ? 0 : (safeEmailPage - 1) * EMAIL_GROUPS_PER_PAGE + 1;
  const emailPageEnd = Math.min(statusFilteredEmailGroups.length, safeEmailPage * EMAIL_GROUPS_PER_PAGE);

  const subjectDuplicateFlags = React.useMemo<Record<string, SubjectDuplicateFlag>>(() => {
    const emailGroupsBySubject = new Map<string, Array<{ key: string; rows: TaxEmailQueueItem[] }>>();
    const emailGroups = new Map<string, { subject: string; rows: TaxEmailQueueItem[] }>();
    emailQueue.forEach((mail) => {
      if (isEmailRowApproved(mail)) return;
      const subject = normalizeDuplicateSubject(mail.emailSubject || mail.subject);
      if (!subject) return;
      const emailKey = mail.gmailMessageId || `${mail.senderEmail}|${subject}|${mail.receivedAt}`;
      const current = emailGroups.get(emailKey);
      if (current) {
        current.rows.push(mail);
        return;
      }
      emailGroups.set(emailKey, { subject, rows: [mail] });
    });
    emailGroups.forEach((group, key) => {
      emailGroupsBySubject.set(group.subject, [...(emailGroupsBySubject.get(group.subject) || []), { key, rows: group.rows }]);
    });

    const flags: Record<string, SubjectDuplicateFlag> = {};
    let groupIndex = 1;
    Array.from(emailGroupsBySubject.entries())
      .filter(([, groups]) => groups.length > 1)
      .sort(([left], [right]) => left.localeCompare(right))
      .forEach(([subject, groups]) => {
        const label = `Duplicate-${groupIndex}`;
        groupIndex += 1;
        groups.forEach((group) => {
          group.rows.forEach((mail) => {
            flags[mail.id] = { label, count: groups.length, subject };
          });
        });
      });
    return flags;
  }, [emailQueue, isEmailRowApproved]);

  const approvedSubjectFlags = React.useMemo<Record<string, true>>(() => {
    const approvedSubjects = new Set<string>();
    ledgerRows.forEach((row) => {
      const subject = normalizeDuplicateSubject(row.title);
      if (subject) approvedSubjects.add(subject);
    });
    emailQueue.forEach((mail) => {
      if (!isEmailRowApproved(mail)) return;
      const subject = normalizeDuplicateSubject(mail.emailSubject || mail.subject);
      if (subject) approvedSubjects.add(subject);
    });

    const flags: Record<string, true> = {};
    emailQueue.forEach((mail) => {
      if (isEmailRowApproved(mail)) return;
      const subject = normalizeDuplicateSubject(mail.emailSubject || mail.subject);
      if (subject && approvedSubjects.has(subject)) flags[mail.id] = true;
    });
    return flags;
  }, [emailQueue, isEmailRowApproved, ledgerRows]);

  const allEmailGroups = React.useMemo(() => {
    const groups = new Map<string, TaxEmailQueueItem[]>();
    emailQueue.forEach((mail) => {
      const emailSubject = cleanInboxSubject(mail.emailSubject || mail.subject);
      const key = mail.gmailMessageId || `${mail.senderEmail}|${emailSubject}|${mail.receivedAt}`;
      groups.set(key, [...(groups.get(key) || []), mail]);
    });
    return Array.from(groups.values());
  }, [emailQueue]);

  const pendingEmailCount = allEmailGroups.filter((rows) => rows.some((mail) => !isEmailRowApproved(mail))).length;
  const approvedEmailCount = allEmailGroups.filter((rows) => rows.some((mail) => isEmailRowApproved(mail))).length;
  const syncedEmailCount = allEmailGroups.length;
  const emailStatusFilterOptions = [
    { label: 'All' as const, count: syncedEmailCount },
    { label: 'Pending' as const, count: pendingEmailCount },
    { label: 'Approved' as const, count: approvedEmailCount },
  ];
  const grossIncome = ledgerRows.filter((row) => row.entryType === 'Income').reduce((sum, row) => sum + row.amount, 0);
  const deductions = ledgerRows.filter((row) => row.entryType === 'Expense').reduce((sum, row) => sum + row.amount, 0);
  const taxableIncome = Math.max(0, grossIncome - deductions);
  const estimatedTax = taxableIncome * (selectedRate / 100);
  const effectiveRate = grossIncome ? Math.round((estimatedTax / grossIncome) * 1000) / 10 : 0;
  const completeTasks = filingTasks.filter((task) => task.complete).length;
  const filingProgress = Math.round((completeTasks / filingTasks.length) * 100);
  const realQuarterlyData = React.useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter) => ({
      quarter,
      revenue: 0,
      deductions: 0,
      tax: 0,
    }));

    ledgerRows.forEach((row) => {
      const quarterIndex = Math.max(0, ['Q1', 'Q2', 'Q3', 'Q4'].indexOf(getFiscalQuarter(row.transactionDate)));
      if (row.entryType === 'Income') {
        quarters[quarterIndex].revenue += row.amount;
      } else {
        quarters[quarterIndex].deductions += row.amount;
      }
    });

    return quarters.map((quarter) => ({
      ...quarter,
      tax: Math.max(0, quarter.revenue - quarter.deductions) * (selectedRate / 100),
    }));
  }, [ledgerRows, selectedRate]);

  const summaryCards = [
    {
      label: 'Gross Taxable Income',
      value: formatLkr(grossIncome),
      caption: 'App, ad, and service income',
      icon: ArrowUpRight,
      color: 'text-emerald-300',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-300/20',
    },
    {
      label: 'Claimed Deductions',
      value: formatLkr(deductions),
      caption: 'Operational tax relief',
      icon: ArrowDownRight,
      color: 'text-rose-300',
      bg: 'bg-rose-400/10',
      border: 'border-rose-300/20',
    },
    {
      label: 'Estimated Tax Payable',
      value: formatLkr(estimatedTax),
      caption: `${effectiveRate}% effective rate`,
      icon: Landmark,
      color: 'text-cyan-300',
      bg: 'bg-cyan-400/10',
      border: 'border-cyan-300/20',
    },
    {
      label: 'Filing Readiness',
      value: `${filingProgress}%`,
      caption: `${completeTasks} of ${filingTasks.length} controls passed`,
      icon: ShieldCheck,
      color: 'text-blue-300',
      bg: 'bg-blue-400/10',
      border: 'border-blue-300/20',
    },
  ];

  const incomeCategories = categories.filter((category) => category.type === 'Income');
  const expenseCategories = categories.filter((category) => category.type === 'Expense');
  const formCategories = entryType === 'Income' ? incomeCategories : expenseCategories;
  const allCategoryNames = React.useMemo(() => Array.from(new Set(categories.map((category) => category.name))).sort(), [categories]);
  const reportManagerIncomeSources = taxReportSources.filter((source) => source.type === 'Income');
  const reportManagerExpenseSources = taxReportSources.filter((source) => source.type === 'Expense');
  const taxReportMonths = React.useMemo(() => getTaxReportMonths(activePeriod), [activePeriod]);
  const taxReportMonthStatuses = React.useMemo(() => taxReportMonths.map((month) => {
    const income = reportManagerIncomeSources.map((source) => getTaxReportSourceStatus(source, month, ledgerRows));
    const expenses = reportManagerExpenseSources.map((source) => getTaxReportSourceStatus(source, month, ledgerRows));
    const expected = [...income, ...expenses].filter((status) => status.expected);
    const uploadedCount = expected.filter((status) => status.uploaded).length;
    return {
      ...month,
      income,
      expenses,
      expectedCount: expected.length,
      uploadedCount,
      percent: expected.length ? Math.round((uploadedCount / expected.length) * 100) : 100,
      incomeAmount: income.reduce((sum, status) => sum + status.amount, 0),
      expenseAmount: expenses.reduce((sum, status) => sum + status.amount, 0),
    };
  }), [activePeriod, ledgerRows, reportManagerExpenseSources, reportManagerIncomeSources, taxReportMonths]);
  const taxReportOverviewStats = React.useMemo(() => {
    const expectedStatuses = taxReportMonthStatuses.flatMap((month) => [...month.income, ...month.expenses]).filter((status) => status.expected);
    const uploaded = expectedStatuses.filter((status) => status.uploaded).length;
    const completeMonths = taxReportMonthStatuses.filter((month) => month.expectedCount > 0 && month.percent === 100).length;
    return {
      uploaded,
      total: expectedStatuses.length,
      missing: Math.max(0, expectedStatuses.length - uploaded),
      completeMonths,
      percent: expectedStatuses.length ? Math.round((uploaded / expectedStatuses.length) * 100) : 100,
      activeRecurring: reportManagerExpenseSources.filter((source) => source.cadence !== 'One Time').length,
    };
  }, [reportManagerExpenseSources, taxReportMonthStatuses]);

  function resetFilters() {
    setSearch('');
    setTypeFilter('All Transactions');
    setCurrencyFilter('All Currencies');
    setCategoryFilter('All Categories');
  }

  function handleAddReportSource(event: React.FormEvent<HTMLFormElement>, type: 'Income' | 'Expense') {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    const cadence = String(formData.get('cadence') || 'Monthly') as TaxReportCadence;
    const hasEndDate = formData.get('hasEndDate') === 'on';
    const nextSource: TaxReportSource = {
      id: createTaxReportSourceId(type.toLowerCase()),
      type,
      name,
      category: String(formData.get('category') || '').trim(),
      keywords: String(formData.get('keywords') || '').trim(),
      cadence: cadence === 'Annual' || cadence === 'One Time' ? cadence : 'Monthly',
      purchaseDate: String(formData.get('purchaseDate') || '').slice(0, 10),
      hasEndDate,
      endDate: hasEndDate ? String(formData.get('endDate') || '').slice(0, 10) : '',
    };
    setTaxReportSources((sources) => [...sources, nextSource]);
    event.currentTarget.reset();
    setMessage(`${type} report source added.`);
  }

  function deleteReportSource(id: string) {
    setTaxReportSources((sources) => sources.filter((source) => source.id !== id));
    setMessage('Report source removed.');
  }

  function resetReportSources() {
    setTaxReportSources(DEFAULT_TAX_REPORT_SOURCES);
    setMessage('Report manager reset to default tax sources.');
  }

  function startEditingLedgerTaxItemHeader() {
    setLedgerTaxItemHeaderDraft(ledgerTaxItemHeader);
    setIsEditingLedgerTaxItemHeader(true);
  }

  function saveLedgerTaxItemHeader() {
    const nextHeader = ledgerTaxItemHeaderDraft.trim() || DEFAULT_LEDGER_TAX_ITEM_HEADER;
    setLedgerTaxItemHeader(nextHeader);
    setLedgerTaxItemHeaderDraft(nextHeader);
    window.localStorage.setItem(LEDGER_TAX_ITEM_HEADER_STORAGE_KEY, nextHeader);
    setIsEditingLedgerTaxItemHeader(false);
  }

  function cancelLedgerTaxItemHeaderEdit() {
    setLedgerTaxItemHeaderDraft(ledgerTaxItemHeader);
    setIsEditingLedgerTaxItemHeader(false);
  }

  async function handleSaveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await saveTaxLedgerEntry({
      taxYear: activePeriod,
      transactionDate: String(formData.get('transactionDate') || ''),
      title: String(formData.get('title') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      subcategory: '',
      amount: Number(formData.get('amount') || 0),
      currency: String(formData.get('currency') || 'LKR') as 'LKR' | 'USD',
      entryType,
      status: String(formData.get('status') || 'Ready') as 'Ready' | 'Review' | 'Pending',
      notes: String(formData.get('notes') || '').trim(),
    });
    setMessage(result.error || 'Tax ledger entry saved.');
    if (!result.error) {
      event.currentTarget.reset();
      setIsEntryDialogOpen(false);
      await refreshWorkspace();
    }
  }

  async function handleUpdateLedgerMetadata(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLedgerEntry) return;
    const formData = new FormData(event.currentTarget);
    const nextTitle = String(formData.get('title') || '').trim();
    const nextCategory = String(formData.get('category') || '').trim();
    const nextAttachmentName = String(formData.get('attachmentName') || '').trim();
    if (!nextTitle || !nextCategory) {
      setMessage('Subject and category are required.');
      return;
    }
    const result = await saveTaxLedgerEntry({
      ...editingLedgerEntry,
      title: nextTitle,
      category: nextCategory,
      attachmentName: nextAttachmentName,
    });
    setMessage(result.error || 'Tax ledger details updated.');
    if (!result.error) {
      setEditingLedgerEntry(null);
      await refreshWorkspace();
    }
  }

  async function runAction(action: () => Promise<{ success?: boolean; error?: string }>, successMessage: string) {
    const result = await action();
    setMessage(result.error || successMessage);
    if (!result.error) await refreshWorkspace();
  }

  function handleDownloadReportOverviewPdf() {
    const pdfBlob = createTaxReportOverviewPdfBlob({
      period: activePeriod,
      stats: taxReportOverviewStats,
      months: taxReportMonthStatuses,
    });
    downloadBlob(pdfBlob, `tax-report-overview-${activePeriod.replace('/', '-')}.pdf`);
    setMessage('Tax report overview PDF generated.');
  }

  async function handleDeleteLedgerEntry(row: TaxLedgerEntry) {
    const rowId = row.id;
    setIsDeletingLedgerEntry(true);
    setDeletingLedgerRowStates((state) => ({ ...state, [rowId]: 'pending' }));
    try {
      const result = await deleteTaxLedgerEntry(row);
      if (result.error) {
        setMessage(result.error);
        setDeletingLedgerRowStates((state) => {
          const next = { ...state };
          delete next[rowId];
          return next;
        });
        return;
      }
      setDeleteLedgerEntryTarget(null);
      setDeletingLedgerRowStates((state) => ({ ...state, [rowId]: 'leaving' }));
      const gmailMessage = result.gmailLabelError
        ? ` Email source update failed: ${result.gmailLabelError}`
        : result.gmailLabelName
          ? ` Email source ${result.gmailLabelName} marker removed.`
          : row.gmailMessageId
            ? ''
            : '';
      const imapMessage = result.imapMoveError
        ? ` Email restore failed: ${result.imapMoveError}`
        : result.imapMoveStatus?.startsWith('moved-')
          ? ' Email moved back to the approval folder.'
          : '';
      const uploadcareMessage = result.uploadcareDeleteError
        ? ` Uploadcare file delete failed: ${result.uploadcareDeleteError}`
        : result.uploadcareDeleteStatus === 'uploadcare-deleted'
          ? ' Uploadcare file deleted.'
          : result.uploadcareDeleteStatus === 'uploadcare-file-already-missing'
            ? ' Uploadcare file was already missing.'
            : '';
      setMessage(`Tax ledger entry deleted.${gmailMessage}${imapMessage}${uploadcareMessage}`);
      await new Promise((resolve) => window.setTimeout(resolve, DELETE_LEDGER_ROW_ANIMATION_MS));
      setLedgerRows((rows) => rows.filter((item) => item.id !== rowId));
      await refreshWorkspace();
      setDeletingLedgerRowStates((state) => {
        const next = { ...state };
        delete next[rowId];
        return next;
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete tax ledger entry.';
      setMessage(errorMessage);
      setDeletingLedgerRowStates((state) => {
        const next = { ...state };
        delete next[rowId];
        return next;
      });
    } finally {
      setIsDeletingLedgerEntry(false);
    }
  }

  async function handleApproveEmail(mail: TaxEmailQueueItem) {
    if (isEmailRowApproved(mail)) {
      setMessage('This email item is already linked to the tax ledger.');
      return;
    }
    if (ignoredChildRows[mail.id]) {
      setMessage('This child item is ignored. Unignore it before selecting it for approval.');
      return;
    }
    if (duplicateEmailMatches[mail.id]) {
      setMessage('This extracted item matches an existing ledger row. Use the 3-dot menu to mark it as duplicate, or edit the extracted values first.');
      return;
    }
    setChildApprovals((state) => ({ ...state, [mail.id]: !state[mail.id] }));
    setMessage('Child item marked for parent approval. Ledger is not updated until the email group is approved.');
  }

  async function handleExtractEmail(mail: TaxEmailQueueItem) {
    if (isEmailRowApproved(mail)) {
      setMessage('This email item is already linked to the tax ledger.');
      return;
    }
    if (ignoredChildRows[mail.id]) {
      setMessage('This child item is ignored. Unignore it before extracting values.');
      return;
    }
    setExtractingEmailId(mail.id);
    setEmailApprovalStatus((state) => ({ ...state, [mail.gmailMessageId || mail.id]: 'Reading document and extracting values...' }));
    try {
      const result = await extractTaxEmailInvoiceWithDocumentAi(mail);
      if (result.error) {
        setMessage(result.error);
        setEmailApprovalStatus((state) => ({ ...state, [mail.gmailMessageId || mail.id]: result.error || 'Extraction failed.' }));
        return;
      }
      if (result.emailQueue) {
        setEmailQueue(result.emailQueue);
      } else if (result.email) {
        setEmailQueue((rows) => rows.map((row) => row.id === mail.id ? { ...row, ...result.email } : row));
      }
      const updatedEmail = result.emailQueue?.find((row) => row.id === mail.id) || result.email;
      if (updatedEmail?.parsedInvoiceDate) {
        setInvoiceDateSelections((state) => ({ ...state, [mail.id]: normalizeDateInputValue(updatedEmail.parsedInvoiceDate) }));
      }
      if (updatedEmail?.suggestedCategory) {
        setEmailCategorySelections((state) => ({ ...state, [mail.id]: updatedEmail.suggestedCategory }));
      }
      const parsedAmount = Number(result.parsed?.amount ?? updatedEmail?.parsedInvoiceAmount ?? updatedEmail?.amount ?? 0);
      if (parsedAmount > 0) {
        setMessage('Document values extracted. Review the row before approval.');
        setEmailApprovalStatus((state) => ({ ...state, [mail.gmailMessageId || mail.id]: `Extracted values are ready for review. Engine: ${result.parsed?.engine || 'server'}.` }));
      } else {
        const providerStatus = [result.parsed?.veryfiStatus, result.parsed?.ocrSpaceStatus].filter(Boolean).join(' / ');
        const statusMessage = providerStatus ? `Extract ran, but amount was not found. ${providerStatus}` : 'Extract ran, but amount was not found.';
        setMessage(statusMessage);
        setEmailApprovalStatus((state) => ({ ...state, [mail.gmailMessageId || mail.id]: statusMessage }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract tax document values.';
      setMessage(errorMessage);
      setEmailApprovalStatus((state) => ({ ...state, [mail.gmailMessageId || mail.id]: errorMessage }));
    } finally {
      setExtractingEmailId('');
    }
  }

  async function handleApproveEmailGroup(group: { key: string; rows: TaxEmailQueueItem[] }) {
    const pendingRows = group.rows.filter((row) => !isEmailRowApproved(row) && !ignoredChildRows[row.id]);
    const approvedRows = pendingRows.filter((row) => childApprovals[row.id]);
    const approvedIds = approvedRows.map((row) => row.id);
    const gmailMessageId = group.rows[0]?.gmailMessageId || '';
    if (!gmailMessageId || approvedIds.length !== pendingRows.length) {
      setMessage('Approve every child item before approving the parent email.');
      setEmailApprovalStatus((state) => ({ ...state, [group.key]: 'Approve every child item before approving the parent email.' }));
      return;
    }
    const duplicateRow = approvedRows.find((row) => duplicateEmailMatches[row.id]);
    if (duplicateRow) {
      const errorMessage = 'A selected child item is marked as a duplicate. Mark it duplicate from the 3-dot menu before approving the parent email.';
      setMessage(errorMessage);
      setEmailApprovalStatus((state) => ({ ...state, [group.key]: errorMessage }));
      return;
    }
    setApprovingEmailId(group.key);
    setEmailApprovalStatus((state) => ({ ...state, [group.key]: 'Approving email and inserting ledger rows...' }));
    const rowsForApproval = approvedRows.map((row) => ({
      ...row,
      uploadEvidence: true,
      parsedInvoiceDate: normalizeDateInputValue(invoiceDateSelections[row.id]) || normalizeDateInputValue(row.parsedInvoiceDate) || normalizeDateInputValue(row.receivedAt),
      parsedVendor: getCorrectedIncomePaymentVendor(row) || row.parsedVendor,
      suggestedCategory: emailCategorySelections[row.id] || row.suggestedCategory,
      suggestedSubcategory: '',
    }));
    const result = await approveTaxEmailGroup(gmailMessageId, approvedIds, activePeriod, rowsForApproval);
    setApprovingEmailId('');
    if (result.error) {
      setMessage(result.error);
      setEmailApprovalStatus((state) => ({ ...state, [group.key]: result.error || 'Approval failed.' }));
      return;
    }
    const evidenceMessage = result.driveErrors?.length
      ? ` Evidence upload failed: ${result.driveErrors.join(' | ')}`
      : result.driveUploadedCount && result.driveUploadedCount > 0
        ? ` Evidence uploaded to server: ${result.driveUploadedCount} file${result.driveUploadedCount === 1 ? '' : 's'}.`
        : result.driveStatuses?.includes('disabled')
          ? ' Evidence upload is disabled in Settings.'
          : result.driveStatuses?.includes('skipped')
            ? ' Evidence upload skipped.'
            : result.driveStatuses?.includes('duplicate')
              ? ' Evidence upload skipped because this ledger entry already existed.'
              : ' Evidence upload completed with no file.';
    const gmailLabelMessage = result.gmailLabelError
      ? ` Email source update failed: ${result.gmailLabelError}`
      : result.gmailLabelName
        ? ` Email source updated to ${result.gmailLabelName}.`
        : '';
    const approvalMessage = `Email approved and inserted into tax ledger. ${evidenceMessage}${gmailLabelMessage}`;
    setMessage(approvalMessage);
    setEmailApprovalStatus((state) => ({ ...state, [group.key]: approvalMessage }));
    setChildApprovals((state) => {
      const next = { ...state };
      approvedIds.forEach((id) => delete next[id]);
      return next;
    });
    setIgnoredChildRows((state) => {
      const next = { ...state };
      group.rows.forEach((row) => delete next[row.id]);
      return next;
    });
    setInvoiceDateSelections((state) => {
      const next = { ...state };
      approvedIds.forEach((id) => delete next[id]);
      return next;
    });
    setEmailCategorySelections((state) => {
      const next = { ...state };
      approvedIds.forEach((id) => delete next[id]);
      return next;
    });
    const approvedSet = new Set(approvedIds);
    const approvedRowsById = new Map(rowsForApproval.map((row) => [row.id, row]));
    const markApprovedRow = (row: TaxEmailQueueItem) => approvedSet.has(row.id)
      ? { ...row, ...approvedRowsById.get(row.id), status: 'Approved' as const }
      : row;
    if (result.ledger) {
      setLedgerRows(result.ledger);
    }
    setApprovedEmailAnimations((state) => ({ ...state, [group.key]: 'settling' }));
    if (result.emailQueue) {
      setEmailQueue(result.emailQueue.map(markApprovedRow));
    } else {
      setEmailQueue((rows) => rows.map(markApprovedRow));
    }
    window.setTimeout(() => {
      setApprovedEmailAnimations((state) => state[group.key] ? { ...state, [group.key]: 'leaving' } : state);
    }, 900);
    window.setTimeout(() => {
      setHiddenApprovedEmailIds((state) => {
        const next = { ...state };
        approvedIds.forEach((id) => {
          next[id] = true;
        });
        return next;
      });
      setApprovedEmailAnimations((state) => {
        const next = { ...state };
        delete next[group.key];
        return next;
      });
      setExpandedEmailGroups((state) => {
        const next = { ...state };
        delete next[group.key];
        return next;
      });
    }, 1600);
  }

  async function handleDeleteEmail(mail: TaxEmailQueueItem) {
    setIsDeletingEmail(true);
    try {
      const result = await deleteTaxEmail(mail);
      if (result.error) {
        setMessage(result.error);
        return;
      }

      const removeRow = (row: TaxEmailQueueItem) => {
        if (row.id === mail.id) return false;
        if (mail.gmailMessageId && row.gmailMessageId === mail.gmailMessageId) return false;
        return true;
      };
      setEmailQueue((rows) => rows.filter(removeRow));
      setChildApprovals((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setIgnoredChildRows((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setInvoiceDateSelections((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setEmailCategorySelections((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setDuplicateEmailMatches((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setDeleteEmailTarget(null);
      const gmailLabelMessage = result.gmailLabelName
        ? ` Email source marked ${result.gmailLabelName}.`
        : mail.gmailMessageId
          ? ''
          : ' No email message id was available.';
      const imapMoveMessage = result.imapMoveError
        ? ` IMAP delete move failed: ${result.imapMoveError}`
        : result.imapMoveStatus
          ? ` Email moved to Delete folder (${result.imapMoveStatus}).`
          : '';
      setMessage(`Email deleted from approval queue.${gmailLabelMessage}${imapMoveMessage} It will be ignored by future email syncs.`);
    } finally {
      setIsDeletingEmail(false);
    }
  }

  async function handleMarkDuplicateEmail(mail: TaxEmailQueueItem) {
    setIsMarkingDuplicateEmail(true);
    try {
      const result = await markTaxEmailDuplicate(mail);
      if (result.error) {
        setMessage(result.error);
        return;
      }

      const gmailLabelMessage = result.gmailLabelName
        ? ` Email source marked ${result.gmailLabelName}.`
        : '';
      const removeRow = (row: TaxEmailQueueItem) => {
        if (row.id === mail.id) return false;
        if (mail.gmailMessageId && row.gmailMessageId === mail.gmailMessageId) return false;
        return true;
      };
      setEmailQueue((rows) => rows.filter(removeRow));
      setChildApprovals((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setIgnoredChildRows((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setInvoiceDateSelections((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setEmailCategorySelections((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setDuplicateEmailMatches((state) => {
        const next = { ...state };
        delete next[mail.id];
        return next;
      });
      setDuplicateEmailTarget(null);
      const imapMoveMessage = result.imapMoveError
        ? ` IMAP duplicate move failed: ${result.imapMoveError}`
        : result.imapMoveStatus
          ? ` Email moved to Duplicate folder (${result.imapMoveStatus}).`
          : '';
      setMessage(`Email marked as duplicate.${gmailLabelMessage}${imapMoveMessage} It will be ignored by future email syncs.`);
    } finally {
      setIsMarkingDuplicateEmail(false);
    }
  }

  async function handleUpdateEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEmail) return;

    const formData = new FormData(event.currentTarget);
    const nextEmail = {
      id: editingEmail.id,
      subject: editingEmail.subject,
      bodyPreview: editingEmail.bodyPreview || '',
      suggestedType: editingEmail.suggestedType,
      suggestedCategory: editingEmail.suggestedCategory,
      suggestedSubcategory: editingEmail.suggestedSubcategory || '',
      amount: Number(formData.get('amount') || 0),
      currency: String(formData.get('currency') || 'LKR') as 'LKR' | 'USD',
      registryDestination: editingEmail.registryDestination || '',
    };

    if (!/^\d+$/.test(editingEmail.id)) {
      setEmailQueue((rows) => rows.map((row) => row.id === editingEmail.id ? { ...row, ...nextEmail } : row));
      setEditingEmail(null);
      setMessage('Email approval updated.');
      return;
    }

    const result = await updateTaxEmail(nextEmail);

    setMessage(result.error || 'Email approval updated.');
    if (!result.error) {
      setEditingEmail(null);
      await refreshWorkspace();
    }
  }

  async function handleViewAttachment(mail: TaxEmailQueueItem) {
    setIsAttachmentLoading(true);
    setAttachmentPreviewError('');
    setAttachmentPreview({ fileName: mail.attachmentName || cleanInboxSubject(mail.subject) || 'Email Body', mimeType: mail.attachmentMime || 'text/html', dataUrl: '' });
    try {
      const result = await Promise.race<TaxAttachmentPreview>([
        getTaxEmailAttachment(mail),
        new Promise((resolve) => {
          window.setTimeout(() => resolve({ error: 'Attachment preview timed out. This file may be too large or the email server did not return the content fast enough.' }), 25000);
        }),
      ]);
      if (result.error) {
        setMessage(result.error);
        setAttachmentPreviewError(result.error);
        return;
      }
      setAttachmentPreview(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load attachment preview.';
      setMessage(errorMessage);
      setAttachmentPreviewError(errorMessage);
    } finally {
      setIsAttachmentLoading(false);
    }
  }

  async function handleViewLedgerAttachment(row: TaxLedgerEntry) {
    if (!(row.gmailMessageId && row.gmailAttachmentId) && !row.attachmentUrl) {
      setMessage('No PDF attachment is available for this ledger row.');
      return;
    }

    const fileName = row.attachmentName || `${cleanInboxSubject(row.title)}.pdf`;
    setIsAttachmentLoading(true);
    setAttachmentPreviewError('');
    setAttachmentPreview({ fileName, mimeType: 'application/pdf', dataUrl: '' });
    try {
      const result = await Promise.race<TaxAttachmentPreview>([
        getTaxLedgerAttachment({
          id: row.id,
          title: row.title,
          attachmentUrl: row.attachmentUrl,
          attachmentName: row.attachmentName,
          gmailMessageId: row.gmailMessageId,
          gmailAttachmentId: row.gmailAttachmentId,
        }),
        new Promise((resolve) => {
          window.setTimeout(() => resolve({ error: 'Attachment preview timed out. This file may be too large or the server did not return the content fast enough.' }), 25000);
        }),
      ]);
      if (result.error) {
        setMessage(result.error);
        setAttachmentPreviewError(result.error);
        return;
      }
      setAttachmentPreview(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ledger attachment preview.';
      setMessage(errorMessage);
      setAttachmentPreviewError(errorMessage);
    } finally {
      setIsAttachmentLoading(false);
    }
  }

  async function addRemoteAttachment(zip: JSZip, folderName: string, row: TaxLedgerEntry) {
    if (!row.attachmentUrl) return 0;
    try {
      const response = await fetch(row.attachmentUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const extension = getExtensionFromMime(blob.type, row.attachmentUrl);
      const fileName = `${row.transactionDate}-${sanitizeFileName(cleanInboxSubject(row.title))}.${extension}`;
      zip.file(`${folderName}/${fileName}`, await blob.arrayBuffer());
      return 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      zip.file(`${folderName}/download-errors/${sanitizeFileName(cleanInboxSubject(row.title))}.txt`, `Could not download attachment URL:\n${row.attachmentUrl}\n\nReason: ${reason}`);
      return 0;
    }
  }

  async function addEmailEvidence(zip: JSZip, folderName: string, mail: TaxEmailQueueItem) {
    if (!mail.gmailMessageId || !mail.gmailAttachmentId) return 0;
    const result = await getTaxEmailAttachment(mail);
    if (result.error) {
      zip.file(`${folderName}/download-errors/${sanitizeFileName(cleanInboxSubject(mail.subject))}.txt`, `Could not download email attachment.\n\n${result.error}`);
      return 0;
    }

    const baseName = sanitizeFileName(`${String(mail.receivedAt).slice(0, 10)}-${mail.suggestedCategory}-${mail.attachmentName || cleanInboxSubject(mail.subject)}`);
    let added = 0;
    if (result.nestedAttachments?.length) {
      result.nestedAttachments.forEach((nested, index) => {
        if (!nested.dataUrl) return;
        const extension = getExtensionFromMime(nested.mimeType, nested.fileName);
        zip.file(`${folderName}/${baseName}/${String(index + 1).padStart(2, '0')}-${sanitizeFileName(nested.fileName)}.${extension}`, dataUrlToUint8Array(nested.dataUrl));
        added += 1;
      });
    }
    if (!added && result.dataUrl) {
      const extension = getExtensionFromMime(result.mimeType, result.fileName);
      zip.file(`${folderName}/${baseName}.${extension}`, dataUrlToUint8Array(result.dataUrl));
      added += 1;
    }
    if (!added && (result.htmlPreview || result.textPreview)) {
      const isHtml = Boolean(result.htmlPreview);
      zip.file(`${folderName}/${baseName}.${isHtml ? 'html' : 'txt'}`, result.htmlPreview || result.textPreview || '');
      added += 1;
    }
    return added;
  }

  async function handleExportReturn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exportStartDate || !exportEndDate || exportStartDate > exportEndDate) {
      setExportStatus('Select a valid date range before exporting.');
      return;
    }

    const rowsInRange = ledgerRows.filter((row) => isDateInRange(row.transactionDate, exportStartDate, exportEndDate));
    const approvedEvidenceRows = emailQueue.filter((mail) => {
      const evidenceDate = mail.parsedInvoiceDate || mail.receivedAt;
      return isEmailRowApproved(mail) && isDateInRange(evidenceDate, exportStartDate, exportEndDate);
    });

    setIsExportingReturn(true);
    setExportStatus('Preparing return PDF and evidence folders...');
    try {
      const incomeZip = new JSZip();
      const expenseZip = new JSZip();
      incomeZip.folder('income');
      expenseZip.folder('expenses');

      let incomeEvidenceCount = 0;
      let expenseEvidenceCount = 0;

      for (const row of rowsInRange) {
        if (row.entryType === 'Income') {
          incomeEvidenceCount += await addRemoteAttachment(incomeZip, 'income', row);
        } else {
          expenseEvidenceCount += await addRemoteAttachment(expenseZip, 'expenses', row);
        }
      }

      for (const mail of approvedEvidenceRows) {
        if (mail.suggestedType === 'Income') {
          incomeEvidenceCount += await addEmailEvidence(incomeZip, 'income', mail);
        } else {
          expenseEvidenceCount += await addEmailEvidence(expenseZip, 'expenses', mail);
        }
      }

      const pdfBlob = createTaxReturnPdfBlob({
        period: activePeriod,
        startDate: exportStartDate,
        endDate: exportEndDate,
        rows: rowsInRange,
        evidenceCounts: { income: incomeEvidenceCount, expenses: expenseEvidenceCount },
      });

      const incomeManifest = approvedEvidenceRows
        .filter((mail) => mail.suggestedType === 'Income')
        .map((mail) => `${mail.receivedAt}\t${mail.senderEmail}\t${cleanInboxSubject(mail.subject)}\t${mail.currency} ${mail.amount}`)
        .join('\n');
      const expenseManifest = approvedEvidenceRows
        .filter((mail) => mail.suggestedType === 'Expense')
        .map((mail) => `${mail.receivedAt}\t${mail.senderEmail}\t${cleanInboxSubject(mail.subject)}\t${mail.currency} ${mail.amount}`)
        .join('\n');
      incomeZip.file('income-manifest.tsv', `Date\tSender\tSubject\tAmount\n${incomeManifest}`);
      expenseZip.file('expenses-manifest.tsv', `Date\tSender\tSubject\tAmount\n${expenseManifest}`);

      const parentZip = new JSZip();
      const packageName = `tax-return-${activePeriod.replace('/', '-')}-${exportStartDate}-to-${exportEndDate}`;
      parentZip.file(`${packageName}.pdf`, pdfBlob);
      parentZip.file('income.zip', await incomeZip.generateAsync({ type: 'blob' }));
      parentZip.file('expenses.zip', await expenseZip.generateAsync({ type: 'blob' }));
      parentZip.file('README.txt', [
        `Tax return package for ${activePeriod}`,
        `Date range: ${exportStartDate} to ${exportEndDate}`,
        `Ledger rows: ${rowsInRange.length}`,
        `Income evidence files: ${incomeEvidenceCount}`,
        `Expense evidence files: ${expenseEvidenceCount}`,
        '',
        'Open the PDF for the summarized return. Evidence files are split into income.zip and expenses.zip.',
      ].join('\n'));

      setExportStatus('Compressing final package...');
      const finalZip = await parentZip.generateAsync({ type: 'blob' });
      downloadBlob(finalZip, `${packageName}.zip`);
      setMessage(`Export package created for ${exportStartDate} to ${exportEndDate}. Included ${rowsInRange.length} ledger rows, ${incomeEvidenceCount} income evidence files, and ${expenseEvidenceCount} expense evidence files.`);
      setExportStatus('');
      setIsExportDialogOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed.';
      setExportStatus(errorMessage);
      setMessage(errorMessage);
    } finally {
      setIsExportingReturn(false);
    }
  }

  function renderEmailApprovalRow(mail: TaxEmailQueueItem) {
    const approvedLedgerRow = getEmailLedgerRow(mail);
    const isApproved = mail.status === 'Approved' || Boolean(approvedLedgerRow);
    const isSelectedForApproval = isApproved || !!childApprovals[mail.id];
    const isApproving = approvingEmailId === mail.id;
    const isExtracting = extractingEmailId === mail.id;
    const resolvedInvoiceNo = approvedLedgerRow?.parsedInvoiceNo || mail.parsedInvoiceNo || '';
    const resolvedVendor = approvedLedgerRow?.parsedVendor || getCorrectedIncomePaymentVendor(mail) || '';
    const selectedInvoiceDate = normalizeDateInputValue(invoiceDateSelections[mail.id])
      || normalizeDateInputValue(approvedLedgerRow?.parsedInvoiceDate)
      || normalizeDateInputValue(mail.parsedInvoiceDate)
      || (isApproved ? normalizeDateInputValue(approvedLedgerRow?.transactionDate) || normalizeDateInputValue(mail.receivedAt) : '');
    const categoryOptions = mail.suggestedType === 'Income' ? incomeCategories : expenseCategories;
    const selectedCategory = emailCategorySelections[mail.id] || mail.suggestedCategory || approvedLedgerRow?.category || '';
    const originalChildTitle = mail.attachmentName || cleanInboxSubject(mail.subject) || 'Email Body';
    const editedAttachmentName = approvedLedgerRow?.attachmentName?.trim() || '';
    const shouldShowEditedAttachmentName = Boolean(
      editedAttachmentName &&
      mail.attachmentName &&
      editedAttachmentName.toLowerCase() !== mail.attachmentName.toLowerCase()
    );
    const isNestedContainer = /message\/rfc822/i.test(mail.attachmentMime || '') || /\.eml$/i.test(mail.attachmentName || '');
    const resolvedAmount = getEmailResolvedAmount(mail);
    const parsedAmountLabel = resolvedAmount ? formatCurrencyAmount(resolvedAmount.amount, resolvedAmount.currency) : '--';
    const paymentSource = getIncomePaymentSource(mail);
    const duplicateMatch = duplicateEmailMatches[mail.id] || null;
    const isAlreadyApprovedSubject = Boolean(approvedSubjectFlags[mail.id] && !isApproved);
    const duplicateBadgeLabel = isAlreadyApprovedSubject ? 'Already Approved' : duplicateMatch ? 'Duplicate' : '';
    const isDuplicateCandidate = Boolean(!isApproved && duplicateBadgeLabel);
    const isIgnored = Boolean(!isApproved && ignoredChildRows[mail.id]);
    return (
      <article
        key={mail.id}
        className={cn(
          'group overflow-hidden rounded-lg border bg-[#08111F] transition',
          isIgnored
            ? 'border-slate-300/30 bg-slate-700/10 shadow-[inset_3px_0_0_rgba(148,163,184,0.85)] opacity-75 hover:border-slate-300/45 hover:bg-slate-700/15'
            : isDuplicateCandidate
            ? 'border-rose-300/45 bg-rose-950/20 shadow-[inset_3px_0_0_rgba(244,63,94,0.95)] hover:border-rose-300/60 hover:bg-rose-950/25'
            : isSelectedForApproval
              ? 'border-emerald-300/25 shadow-[inset_3px_0_0_rgba(16,185,129,0.85)] hover:border-cyan-300/25 hover:bg-[#0A1424]'
              : 'border-white/10 shadow-[inset_3px_0_0_rgba(34,211,238,0.22)] hover:border-cyan-300/25 hover:bg-[#0A1424]'
        )}
      >
        <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_252px] xl:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-2.5">
              <div className={cn(
                'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
                isIgnored
                  ? 'border-slate-300/25 bg-slate-400/10 text-slate-200'
                  : isDuplicateCandidate
                  ? 'border-rose-300/25 bg-rose-500/10 text-rose-200'
                  : isSelectedForApproval ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200'
              )}>
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn(
                    'rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]',
                    isIgnored
                      ? 'border-slate-300/25 bg-slate-400/10 text-slate-200'
                      : isDuplicateCandidate
                      ? 'border-rose-300/30 bg-rose-500/10 text-rose-100'
                      : isSelectedForApproval ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/25 bg-amber-400/10 text-amber-200'
                  )}>
                    {isIgnored ? 'Ignored' : isDuplicateCandidate ? duplicateBadgeLabel : isApproved ? 'Approved' : isSelectedForApproval ? 'Selected' : 'Pending'}
                  </span>
                  {paymentSource ? (
                    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em]', getIncomePaymentSourceStyles(paymentSource))}>
                      <WalletCards className="h-3 w-3" />
                      {paymentSource}
                    </span>
                  ) : null}
                  {isNestedContainer && (mail.attachmentCount || 0) > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-300/15 bg-blue-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-blue-200">
                      <Paperclip className="h-3 w-3" />
                      {mail.attachmentCount} Nested {(mail.attachmentCount || 0) === 1 ? 'Attachment' : 'Attachments'}
                    </span>
                  ) : null}
                </div>
                {shouldShowEditedAttachmentName ? (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.08em] text-white/35">{editedAttachmentName}</p>
                ) : null}
                <h3 className={cn('truncate text-xs font-black text-white', shouldShowEditedAttachmentName ? 'mt-1' : 'mt-2')}>{originalChildTitle}</h3>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[9px] font-bold">
              <label className="inline-flex h-7 items-center gap-1 rounded-md bg-white/[0.04] px-2 text-white/45">
                <span className="font-black uppercase tracking-[0.08em]">Category</span>
                <select
                  value={selectedCategory}
                  disabled={isApproved || isIgnored}
                  onChange={(event) => {
                    const nextCategory = event.target.value;
                    setEmailCategorySelections((state) => ({ ...state, [mail.id]: nextCategory }));
                  }}
                  className="h-5 min-w-[118px] rounded-md border border-cyan-300/10 bg-black/20 px-1.5 text-[9px] font-black text-cyan-300 outline-none [color-scheme:dark] focus:border-cyan-300/40"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                  {!categoryOptions.some((category) => category.name === selectedCategory) ? (
                    <option value={selectedCategory}>{selectedCategory}</option>
                  ) : null}
                </select>
              </label>
              <span className="inline-flex h-7 items-center whitespace-nowrap rounded-md bg-white/[0.04] px-2 text-white/45">
                Invoice No: <span className="ml-1 font-mono font-black text-emerald-300">{resolvedInvoiceNo || '--'}</span>
              </span>
              <span className="inline-flex h-7 max-w-[190px] items-center rounded-md bg-white/[0.04] px-2 text-white/45">
                Vendor: <span className="ml-1 truncate font-black text-white/70">{resolvedVendor || '--'}</span>
              </span>
              <span className="inline-flex h-7 items-center whitespace-nowrap rounded-md bg-white/[0.04] px-2 text-white/45">
                AI Amount: <span className="ml-1 font-mono font-black text-cyan-200">{parsedAmountLabel}</span>
              </span>
              <label className={cn('inline-flex h-7 items-center gap-1.5 rounded-md bg-white/[0.04] px-2 text-white/45 transition', isApproved || isIgnored ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-white/[0.08] hover:text-white/65')}>
                <span className="flex items-center gap-1 font-black uppercase tracking-[0.08em]">
                  <CalendarClock className="h-3 w-3 text-emerald-300" />
                  Invoice Date
                </span>
                <input
                  type="date"
                  value={selectedInvoiceDate}
                  disabled={isApproved || isIgnored}
                  onChange={(event) => setInvoiceDateSelections((state) => ({ ...state, [mail.id]: event.target.value }))}
                  className="h-5 w-[116px] rounded-md border border-emerald-300/15 bg-black/20 px-1.5 text-[9px] font-black text-emerald-300 outline-none transition [color-scheme:dark] focus:border-emerald-300/50 disabled:opacity-80"
                />
              </label>
              <label className="inline-flex h-7 cursor-not-allowed items-center gap-1.5 rounded-md bg-cyan-400/10 px-2 font-black uppercase tracking-[0.08em] text-cyan-200">
                <input
                  type="checkbox"
                  checked
                  disabled
                  onChange={() => {}}
                  className="h-3 w-3 rounded border-white/20 bg-black/30 accent-cyan-500"
                />
                Server upload
              </label>
            </div>

            {isDuplicateCandidate ? (
              <div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs font-bold leading-5 text-rose-100">
                <span className="font-black uppercase tracking-[0.12em] text-rose-200">{duplicateBadgeLabel}</span>
                {isAlreadyApprovedSubject ? (
                  <span className="ml-2 text-rose-100/80">Same subject already exists in the approved tax ledger.</span>
                ) : duplicateMatch ? (
                  <span className="ml-2 text-rose-100/80">
                    {duplicateMatch.invoiceNo || duplicateMatch.ledgerId} · {duplicateMatch.invoiceDate || '--'} · {formatCurrencyAmount(duplicateMatch.amount, duplicateMatch.currency)} · {duplicateMatch.vendor || 'vendor unknown'} ({duplicateMatch.reason})
                  </span>
                ) : null}
              </div>
            ) : null}

            {isIgnored ? (
              <div className="mt-3 rounded-lg border border-slate-300/20 bg-slate-400/10 px-3 py-2 text-xs font-bold leading-5 text-slate-100">
                <span className="font-black uppercase tracking-[0.12em] text-slate-200">Ignored</span>
                <span className="ml-2 text-slate-100/80">This attachment will not be approved, inserted into the ledger, or uploaded.</span>
              </div>
            ) : null}

            {mail.parsedPaymentDetails ? (
              <pre className="mt-2 max-w-4xl whitespace-pre-wrap rounded-lg border border-white/10 bg-black/25 p-2 text-[10px] font-semibold leading-4 text-white/55">
                {mail.parsedPaymentDetails}
              </pre>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col items-end justify-center gap-2 self-stretch">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Parsed Amount</p>
              <p className="mt-0.5 font-mono text-lg font-black text-white">{parsedAmountLabel}</p>
            </div>
            <div className="flex flex-nowrap items-center justify-end gap-1.5">
              <Button type="button" onClick={() => handleApproveEmail(mail)} disabled={isApproved || isApproving || isDuplicateCandidate || isIgnored} title={isIgnored ? 'This row is ignored.' : isDuplicateCandidate ? 'This row is tagged as a duplicate.' : undefined} className={cn('h-8 shrink-0 rounded-lg px-2.5 text-[10px] font-black disabled:opacity-45', isSelectedForApproval ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-500')}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                {isApproved ? 'Approved' : isSelectedForApproval ? 'Selected' : isApproving ? 'Approving...' : 'Approve'}
              </Button>
              {!isApproved ? (
                <Button type="button" onClick={() => handleExtractEmail(mail)} disabled={isExtracting || isIgnored || !mail.gmailMessageId} title={isIgnored ? 'This row is ignored.' : !mail.gmailMessageId ? 'Email source is missing.' : 'Read this document and extract invoice values.'} className="h-8 shrink-0 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-2.5 text-[10px] font-black text-cyan-100 hover:bg-cyan-400/15 disabled:opacity-45">
                  <FileSearch className="mr-1 h-3.5 w-3.5" />
                  {isExtracting ? 'Extracting...' : 'Extract'}
                </Button>
              ) : null}
              <button type="button" onClick={() => handleViewAttachment(mail)} disabled={!mail.gmailMessageId || !mail.gmailAttachmentId} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="View attachment">
                <Eye className="h-3.5 w-3.5" />
              </button>
              {!isApproved ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white" aria-label="More approval actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 border-white/10 bg-[#091221] text-white shadow-2xl">
                    <DropdownMenuItem
                      onClick={() => {
                        setIgnoredChildRows((state) => ({ ...state, [mail.id]: !state[mail.id] }));
                        setChildApprovals((state) => {
                          const next = { ...state };
                          delete next[mail.id];
                          return next;
                        });
                        setMessage(ignoredChildRows[mail.id] ? 'Child item returned to approval review.' : 'Child item ignored. It will not be uploaded or inserted into the ledger.');
                      }}
                      className="cursor-pointer text-xs font-bold text-slate-200 focus:bg-slate-500/10 focus:text-slate-100"
                    >
                      <Ban className="mr-2 h-3.5 w-3.5" />
                      {isIgnored ? 'Unignore' : 'Ignore'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDuplicateEmailTarget(mail)} className="cursor-pointer text-xs font-bold text-rose-200 focus:bg-rose-500/10 focus:text-rose-100">
                      <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditingEmail(mail)} className="cursor-pointer text-xs font-bold focus:bg-white/10 focus:text-white">
                      <Pencil className="mr-2 h-3.5 w-3.5 text-white/55" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteEmailTarget(mail)} className="cursor-pointer text-xs font-bold text-rose-300 focus:bg-rose-500/10 focus:text-rose-200">
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    );
  }

  const ledgerEditCategoryOptions = editingLedgerEntry?.entryType === 'Income' ? incomeCategories : expenseCategories;
  const showLedgerAttachmentNameEdit = Boolean(editingLedgerEntry && (editingLedgerEntry.source === 'Email' || editingLedgerEntry.attachmentName || editingLedgerEntry.attachmentUrl));
  const reportSourceRow = (status: TaxReportSourceStatus) => {
    if (!status.expected) return null;
    const ready = status.uploaded;
    return (
      <div
        key={`${status.source.id}-${status.source.type}`}
        className={cn(
          'rounded-xl border px-3 py-2 transition',
          ready
            ? 'border-emerald-400/20 bg-emerald-500/10'
            : 'border-amber-400/20 bg-amber-500/10'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <div className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border', ready ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/20 bg-amber-400/10 text-amber-200')}>
              {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CalendarClock className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-white">{status.source.name}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-white/40">
                {status.source.category || 'Any category'} · {status.source.cadence}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn('font-mono text-[10px] font-black uppercase tracking-[0.12em]', ready ? 'text-emerald-200' : 'text-amber-200')}>
              {ready ? 'Uploaded' : 'Missing'}
            </p>
            <p className="mt-0.5 text-[10px] font-bold text-white/45">
              {status.rowCount} row{status.rowCount === 1 ? '' : 's'} · {formatLkr(status.amount)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const sourceManagerList = (type: 'Income' | 'Expense') => {
    const sources = type === 'Income' ? reportManagerIncomeSources : reportManagerExpenseSources;
    return (
      <div className="space-y-2">
        {sources.map((source) => (
          <div key={source.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">{source.name}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  {source.category || 'Any category'} · {source.cadence}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-white/45">
                  {source.keywords || 'No keywords configured'}
                </p>
                {type === 'Expense' ? (
                  <p className="mt-2 text-[11px] font-bold text-cyan-200/75">
                    Buy: {source.purchaseDate || '--'} · End: {source.hasEndDate && source.endDate ? source.endDate : 'No end date'}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => deleteReportSource(source.id)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-black/25 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={`Delete ${source.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {!sources.length ? (
          <div className="rounded-2xl border border-white/10 bg-black/15 p-5 text-center text-xs font-bold text-white/40">
            No {type.toLowerCase()} report sources configured.
          </div>
        ) : null}
      </div>
    );
  };

  const sourceManagerForm = (type: 'Income' | 'Expense') => {
    const isExpense = type === 'Expense';
    const categoryOptions = isExpense ? expenseCategories : incomeCategories;
    return (
      <form onSubmit={(event) => handleAddReportSource(event, type)} className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="grid gap-3 xl:grid-cols-6">
          <label className="space-y-1 xl:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Source Name</span>
            <input name="name" required placeholder={isExpense ? 'ChatGPT Renewal' : 'Google Play Console'} className="h-10 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-xs font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40" />
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Category</span>
            <select name="category" className="h-10 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-xs font-bold text-white outline-none focus:border-cyan-300/40">
              <option value="">Any category</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 xl:col-span-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Keywords</span>
            <input name="keywords" placeholder="comma separated" className="h-10 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-xs font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40" />
          </label>
          {isExpense ? (
            <>
              <label className="space-y-1 xl:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Buy Date</span>
                <input name="purchaseDate" type="date" className="h-10 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-xs font-bold text-white outline-none [color-scheme:dark] focus:border-cyan-300/40" />
              </label>
              <label className="space-y-1 xl:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">Cadence</span>
                <select name="cadence" defaultValue="Monthly" className="h-10 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-xs font-bold text-white outline-none focus:border-cyan-300/40">
                  <option>Monthly</option>
                  <option>Annual</option>
                  <option>One Time</option>
                </select>
              </label>
              <div className="space-y-1 xl:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">End Date</span>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#080D18] px-3">
                  <label className="flex shrink-0 items-center gap-2 text-[11px] font-black text-white/55">
                    <input name="hasEndDate" type="checkbox" className="accent-cyan-400" />
                    Has end
                  </label>
                  <input name="endDate" type="date" className="min-w-0 flex-1 bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]" />
                </div>
              </div>
            </>
          ) : (
            <input type="hidden" name="cadence" value="Monthly" />
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" className={cn('h-9 rounded-xl px-4 text-xs font-black', isExpense ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500')}>
            <Plus className="mr-2 h-4 w-4" />
            Add {type} Source
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#070A12] text-white">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0D1322] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_32%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_30px_rgba(6,182,212,0.16)]">
              <ReceiptText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-300">Tax Intelligence Workspace</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">Tax Returns & Liability Control</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-white/50">
                Prepare annual returns, reconcile taxable income, track deductions, and export the filing package for the active financial year.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHelpDialogOpen(true)}
              className="h-11 w-11 rounded-2xl border-cyan-300/20 bg-cyan-400/10 px-0 text-cyan-100 hover:bg-cyan-400/15 hover:text-white"
              aria-label="Open tax returns help"
              title="Tax Returns Help"
            >
              <CircleHelp className="h-5 w-5" />
            </Button>
            <div className="flex rounded-2xl border border-white/10 bg-black/25 p-1">
              {taxPeriods.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => {
                    setActivePeriod(period);
                    setMessage('');
                  }}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-black tracking-wide transition',
                    activePeriod === period ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-white/45 hover:text-white'
                  )}
                >
                  {period}
                </button>
              ))}
            </div>
            <CreateInvoiceDialog
              trigger={(
                <Button type="button" className="h-11 rounded-2xl bg-blue-600 px-4 text-xs font-black hover:bg-blue-500">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tax Entry
                </Button>
              )}
            />
            <Button type="button" onClick={() => setIsExportDialogOpen(true)} className="h-11 rounded-2xl bg-emerald-600 px-4 text-xs font-black hover:bg-emerald-500">
              <Download className="mr-2 h-4 w-4" />
              Export Return
            </Button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-100">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D1322] p-5">
            <div className={cn('mb-4 grid h-10 w-10 place-items-center rounded-xl border', card.bg, card.border, card.color)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{card.label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-white">{card.value}</p>
            <p className="mt-1 text-xs font-semibold text-white/40">{card.caption}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0D1322] p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ledger' as WorkspaceTab, label: 'Active Tax Ledger', icon: Database },
            { id: 'email' as WorkspaceTab, label: 'Email Desk', icon: Mail, meta: 'tax@rermedapps.com', count: syncedEmailCount },
            { id: 'categories' as WorkspaceTab, label: 'Category Manager', icon: Settings },
            { id: 'reportManager' as WorkspaceTab, label: 'Report Manager', icon: WalletCards },
            { id: 'reportOverview' as WorkspaceTab, label: 'Report Overview', icon: FileSearch },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveWorkspace(tab.id)}
              className={cn(
                'relative flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition',
                activeWorkspace === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'bg-black/25 text-white/55 hover:bg-white/[0.06] hover:text-white'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.meta ? <span className="hidden font-mono text-[10px] text-white/55 sm:inline">{tab.meta}</span> : null}
              {tab.count ? (
                <span className="absolute -right-1 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
                  {tab.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="px-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
          System Status: <span className="text-cyan-300">Live Synchronized</span>
        </p>
      </section>

      {activeWorkspace === 'ledger' ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0D1322] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
            <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-white/50 md:w-[300px]">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search description, category"
                className="w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/35"
              />
            </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-semibold text-white outline-none md:w-[170px]"
            >
              <option>All Transactions</option>
              <option>Income</option>
              <option>Expense</option>
            </select>
            <select
              value={currencyFilter}
              onChange={(event) => setCurrencyFilter(event.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-semibold text-white outline-none md:w-[155px]"
            >
              <option>All Currencies</option>
              <option>LKR</option>
              <option>USD</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-semibold text-white outline-none md:w-[190px]"
            >
              <option>All Categories</option>
              {allCategoryNames.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={resetFilters}
              className="flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-bold text-white/45 transition hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Filters
            </button>
          </div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            Ledger online <span className="text-white/35">•</span>{' '}
            <span className="text-cyan-300">Displaying {filteredRows.length} matching transaction entries</span>
          </p>
        </section>
      ) : null}

      <section className="space-y-6">
        {activeWorkspace === 'ledger' ? (
        <div className="overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#0D1322] shadow-[0_0_0_1px_rgba(6,182,212,0.04)]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-300" />
                <h2 className="text-base font-black tracking-tight">Tax Return Ledger</h2>
              </div>
              <p className="mt-1 text-xs font-medium text-white/40">Review taxable rows for FY {activePeriod} before export.</p>
            </div>
            <CreateInvoiceDialog
              trigger={(
                <Button type="button" className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black hover:bg-emerald-500">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Entry
                </Button>
              )}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead className="border-b border-white/10 bg-black/20 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                <tr>
                  <th className="px-5 py-4">
                    {isEditingLedgerTaxItemHeader ? (
                      <div className="flex max-w-[260px] items-center gap-1 normal-case tracking-normal">
                        <input
                          value={ledgerTaxItemHeaderDraft}
                          onChange={(event) => setLedgerTaxItemHeaderDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') saveLedgerTaxItemHeader();
                            if (event.key === 'Escape') cancelLedgerTaxItemHeaderEdit();
                          }}
                          autoFocus
                          className="h-8 min-w-0 flex-1 rounded-lg border border-cyan-300/20 bg-black/35 px-2 text-xs font-black text-white outline-none focus:border-cyan-300/45"
                        />
                        <button type="button" onClick={saveLedgerTaxItemHeader} className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-400/10 text-emerald-200 transition hover:bg-emerald-400/15" aria-label="Save tax item header">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={cancelLedgerTaxItemHeaderEdit} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/55 transition hover:bg-white/10 hover:text-white" aria-label="Cancel tax item header edit">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={startEditingLedgerTaxItemHeader} className="inline-flex items-center gap-2 text-left uppercase tracking-[0.18em] transition hover:text-cyan-200" aria-label="Edit tax item header">
                        {ledgerTaxItemHeader}
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </th>
	                  <th className="px-5 py-4">Invoice ID</th>
	                  <th className="px-5 py-4 text-right">Ledger Amount</th>
	                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm font-bold text-white/45">Loading tax ledger...</td></tr>
                ) : null}
                {!isLoading && filteredRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm font-bold text-white/45">No tax ledger entries found.</td></tr>
                ) : null}
	                {filteredRows.map((row) => {
	                  const deleteAnimationState = deletingLedgerRowStates[row.id];
	                  const isDeletingThisLedgerRow = Boolean(deleteAnimationState);
	                  const ledgerInvoiceId = getLedgerInvoiceId(row);
	                  const ledgerVendorName = getLedgerVendorName(row);
	                  return (
                  <tr
                    key={row.id}
                    aria-busy={isDeletingThisLedgerRow}
                    className={cn(
                      'transition-[opacity,transform,filter,background-color,box-shadow] duration-500 ease-out hover:bg-white/[0.03] motion-reduce:transform-none motion-reduce:transition-none',
                      deleteAnimationState === 'pending' && 'bg-rose-500/5 shadow-[inset_3px_0_0_rgba(244,63,94,0.7)]',
                      deleteAnimationState === 'leaving' && 'translate-x-8 scale-[0.985] bg-rose-500/10 opacity-0 blur-[2px] shadow-[inset_6px_0_0_rgba(244,63,94,0.95),0_18px_42px_rgba(244,63,94,0.16)]'
                    )}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-white">{cleanInboxSubject(row.title)}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300/70">{row.transactionDate} · {row.source}</p>
                      {row.attachmentName ? (
                        <p className="mt-1 text-[10px] font-bold text-white/35">{row.attachmentName}</p>
                      ) : null}
                    </td>
	                    <td className="px-5 py-4">
	                      {ledgerInvoiceId ? (
	                        <span className="inline-flex rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.08em] text-cyan-100">
	                          {ledgerInvoiceId}
	                        </span>
	                      ) : (
	                        <span className="text-xs font-bold text-white/30">--</span>
	                      )}
	                    </td>
	                    <td className={cn('px-5 py-4 text-right text-sm font-black', row.entryType === 'Income' ? 'text-emerald-300' : 'text-rose-300')}>
	                      {row.currency === 'LKR' ? formatLkr(row.entryType === 'Income' ? row.amount : -row.amount) : `${row.entryType === 'Income' ? '' : '-'}$ ${row.amount.toLocaleString('en-US')}`}
	                    </td>
	                    <td className="px-5 py-4">
	                      <p className="max-w-[220px] truncate text-xs font-semibold text-white/55" title={ledgerVendorName || undefined}>{ledgerVendorName || '--'}</p>
	                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewLedgerAttachment(row)}
                        disabled={isDeletingThisLedgerRow || (!(row.gmailMessageId && row.gmailAttachmentId) && !row.attachmentUrl)}
                        className="mr-2 inline-grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 transition hover:bg-cyan-400/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="View ledger PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={isDeletingThisLedgerRow} onClick={() => setEditingLedgerEntry(row)} className="mr-2 inline-grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/65 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" aria-label="Edit ledger row">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={isDeletingThisLedgerRow} onClick={() => setDeleteLedgerEntryTarget(row)} className="inline-grid h-9 w-9 place-items-center rounded-xl bg-black/25 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Delete ledger row">
                        {deleteAnimationState === 'pending' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        ) : null}

        {activeWorkspace === 'email' ? (
        <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#0D1322] shadow-[0_0_0_1px_rgba(6,182,212,0.04)]">
          <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-cyan-300" />
                <h2 className="text-base font-black tracking-tight">Incoming Email Monitor & AI Queue</h2>
              </div>
              <p className="mt-1 text-xs font-medium text-white/40">
                Monitoring active stream: <span className="font-black text-cyan-300">tax@rermedapps.com</span>. Confirm or modify suggested categories before ledger insertion.
              </p>
            </div>
            <Button type="button" onClick={handleSyncEmailInbox} disabled={isSyncingEmail} className="h-10 rounded-xl bg-cyan-600 px-4 text-xs font-black hover:bg-cyan-500 disabled:opacity-60">
              <RefreshCw className={cn('mr-2 h-4 w-4', isSyncingEmail && 'animate-spin')} />
              {isSyncingEmail ? 'Syncing...' : 'Sync Email'}
            </Button>
          </div>
          <div className="border-b border-white/10 bg-black/10 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-[#080D18] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Mailbox</p>
                  <p className="mt-1 text-xs font-bold text-white">tax@rermedapps.com</p>
                </div>
                <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Protocol</p>
                  <p className="mt-1 text-xs font-bold text-emerald-200">IMAP SSL</p>
                </div>
                <div className="rounded-xl border border-rose-300/15 bg-rose-400/10 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Extract</p>
                  <p className="mt-1 text-xs font-bold text-rose-200">Manual for now</p>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-white/40">
              Sync reads forwarded tax mail from the server inbox. Extract reads server mail attachments and suggests invoice values for review.
            </p>
            {gmailSyncStatus ? (
              <div
                className={cn(
                  'mt-3 rounded-xl border px-3 py-2 text-xs font-bold',
                  gmailSyncStatus.tone === 'error'
                    ? 'border-rose-300/25 bg-rose-500/10 text-rose-100'
                    : gmailSyncStatus.tone === 'success'
                      ? 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
                      : 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100'
                )}
              >
                <p>{gmailSyncStatus.text}</p>
                {gmailSyncStatus.searched?.length ? (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                    Searched: {gmailSyncStatus.searched.join(', ')}
                  </p>
                ) : null}
                {gmailSyncStatus.errors?.length ? (
                  <div className="mt-2 space-y-1 text-[11px] opacity-90">
                    {gmailSyncStatus.errors.map((error, index) => (
                      <p key={`${error}-${index}`}>{error}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="p-5">
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black text-white/65">Pending Automated Approvals</p>
                <p className="mt-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                  {pendingEmailCount} pending / {approvedEmailCount} approved / {syncedEmailCount} synced
                </p>
                {statusFilteredEmailGroups.length > 0 ? (
                  <p className="mt-1 text-[11px] font-bold text-white/35">
                    Showing {emailPageStart}-{emailPageEnd} of {statusFilteredEmailGroups.length} emails
                    {statusFilteredEmailGroups.length !== groupedEmailQueue.length ? ` filtered from ${groupedEmailQueue.length}` : ''}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <div className="flex h-10 items-center rounded-xl border border-white/10 bg-black/25 p-1">
                  {emailStatusFilterOptions.map((option) => {
                    const isActive = emailStatusFilter === option.label;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setEmailStatusFilter(option.label)}
                        className={cn(
                          'flex h-8 items-center gap-2 rounded-lg px-3 text-[11px] font-black transition',
                          isActive
                            ? 'bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]'
                            : 'text-white/45 hover:bg-white/[0.06] hover:text-white/80'
                        )}
                      >
                        {option.label}
                        <span className={cn('rounded-md px-1.5 py-0.5 font-mono text-[10px]', isActive ? 'bg-cyan-300/15 text-cyan-100' : 'bg-white/10 text-white/45')}>
                          {option.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-white/50 sm:w-[360px]">
                  <Search className="h-4 w-4 shrink-0" />
                  <input
                    value={emailSearch}
                    onChange={(event) => setEmailSearch(event.target.value)}
                    placeholder="Search sender, subject, category, file"
                    className="w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/35"
                  />
                </label>
                {emailSearch ? (
                  <button
                    type="button"
                    onClick={() => setEmailSearch('')}
                    className="flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-bold text-white/45 transition hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                ) : null}
                {statusFilteredEmailGroups.length > EMAIL_GROUPS_PER_PAGE ? (
                  <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-2">
                    <button
                      type="button"
                      onClick={() => setEmailPage((page) => Math.max(1, page - 1))}
                      disabled={safeEmailPage <= 1}
                      className="grid h-7 w-7 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Previous email page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="min-w-[58px] text-center font-mono text-[11px] font-black text-cyan-200">
                      {safeEmailPage} / {emailPageCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmailPage((page) => Math.min(emailPageCount, page + 1))}
                      disabled={safeEmailPage >= emailPageCount}
                      className="grid h-7 w-7 place-items-center rounded-lg text-white/55 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label="Next email page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="space-y-4">
              {emailQueue.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/15 p-8 text-center text-sm font-bold text-white/45">No pending email approvals.</div>
              ) : null}
              {emailQueue.length > 0 && statusFilteredEmailGroups.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/15 p-8 text-center text-sm font-bold text-white/45">
                  No email approvals match this filter.
                </div>
              ) : null}
              {pagedEmailGroups.map((group) => {
                const isExpanded = expandedEmailGroups[group.key] ?? false;
                const ignoredCount = group.rows.filter((row) => !isEmailRowApproved(row) && ignoredChildRows[row.id]).length;
                const pendingCount = group.rows.filter((row) => !isEmailRowApproved(row) && !ignoredChildRows[row.id]).length;
                const approvedCount = group.rows.filter((row) => isEmailRowApproved(row)).length;
                const selectedChildCount = group.rows.filter((row) => !isEmailRowApproved(row) && !ignoredChildRows[row.id] && childApprovals[row.id]).length;
                const isApprovingParent = approvingEmailId === group.key;
                const parsedAmounts = group.rows
                  .map((row) => getEmailResolvedAmount(row))
                  .filter((amount): amount is { amount: number; currency: string } => Boolean(amount));
                const canApproveParent = pendingCount > 0 && selectedChildCount === pendingCount;
                const totalsByCurrency = parsedAmounts.reduce((totals, item) => {
                  const currency = String(item.currency || 'LKR').toUpperCase();
                  totals.set(currency, (totals.get(currency) || 0) + item.amount);
                  return totals;
                }, new Map<string, number>());
                const totalAmountLabel = parsedAmounts.length
                  ? Array.from(totalsByCurrency.entries()).map(([currency, amount]) => formatCurrencyAmount(amount, currency)).join(' / ')
                  : '--';
                const attachmentCount = new Set(group.rows.map((row) => `${row.gmailAttachmentId || row.attachmentName || row.id}`)).size;
                const groupType = group.rows[0]?.suggestedType || 'Expense';
                const isIncomeGroup = groupType === 'Income';
                const groupApprovalStatus = pendingCount > 0 ? 'Pending' : 'Approved';
                const isGroupPending = groupApprovalStatus === 'Pending';
                const groupStatus = emailApprovalStatus[group.key] || '';
                const approvalAnimation = approvedEmailAnimations[group.key];
                const groupSubject = cleanInboxSubject(group.subject);
                const groupSubjectDuplicate = group.rows.map((row) => subjectDuplicateFlags[row.id]).find(Boolean) || null;
                const isGroupAlreadyApprovedSubject = group.rows.some((row) => approvedSubjectFlags[row.id] && !isEmailRowApproved(row));
                const groupDuplicateLabel = isGroupAlreadyApprovedSubject ? 'Already Approved' : groupSubjectDuplicate?.label || '';
                const isGroupDuplicate = Boolean(groupDuplicateLabel);
                const canApproveVisibleParent = canApproveParent && !isGroupDuplicate;
                const editedGroupSubject = group.rows
                  .map((row) => cleanInboxSubject(getEmailLedgerRow(row)?.title || row.subject))
                  .find((subject) => subject.toLowerCase() !== groupSubject.toLowerCase());
                return (
                  <div
                    key={group.key}
                    className={cn(
                      'overflow-hidden rounded-xl border border-cyan-300/15 bg-[#071120] transition-all duration-700 ease-out shadow-xl shadow-black/10',
                      isGroupDuplicate && 'border-rose-300/35 bg-rose-950/10 shadow-[inset_3px_0_0_rgba(244,63,94,0.9)]',
                      approvalAnimation === 'settling' && 'border-emerald-300/45 bg-emerald-500/[0.07] shadow-[0_0_34px_rgba(16,185,129,0.14)] motion-safe:animate-pulse',
                      approvalAnimation === 'leaving' && 'pointer-events-none -translate-y-2 scale-[0.99] opacity-0'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedEmailGroups((state) => ({ ...state, [group.key]: !isExpanded }))}
                      className={cn(
                        'flex w-full flex-col gap-3 p-4 text-left transition hover:bg-white/[0.025] lg:flex-row lg:items-center lg:justify-between',
                        isExpanded && 'bg-cyan-400/[0.025]'
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={cn('mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border', isExpanded ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-200' : 'border-white/10 bg-white/[0.03] text-white/45')}>
                          <Inbox className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/45">{group.senderEmail}</span>
                            <span className="font-mono text-[10px] text-white/30">{formatIstDateTime(group.receivedAt)}</span>
                            <span className={cn('rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]', isIncomeGroup ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/25 bg-rose-400/10 text-rose-300')}>
                              {groupType}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-cyan-300/15 bg-cyan-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
                              <Paperclip className="h-3 w-3" />
                              {attachmentCount} {attachmentCount === 1 ? 'Attachment' : 'Attachments'}
                            </span>
                            <span className={cn('rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]', isGroupPending ? 'border-amber-300/25 bg-amber-400/10 text-amber-200' : 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200')}>
                              {groupApprovalStatus}
                            </span>
                            {isGroupDuplicate ? (
                              <span className="rounded-md border border-rose-300/30 bg-rose-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-100">
                                {groupDuplicateLabel}
                              </span>
                            ) : null}
                          </div>
                          {editedGroupSubject ? (
                            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.08em] text-white/35">{editedGroupSubject}</p>
                          ) : null}
                          <h3 className={cn('text-sm font-black text-white', editedGroupSubject ? 'mt-1' : 'mt-3')}>{group.subject}</h3>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-4 lg:min-w-[220px]">
                        <div className="text-left lg:text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Total Parsed</p>
                          <p className="mt-1 font-mono text-lg font-black text-white">{totalAmountLabel}</p>
                        </div>
                        <ChevronDown className={cn('h-5 w-5 text-cyan-200 transition', isExpanded && 'rotate-180')} />
                      </div>
                    </button>
                    {groupStatus ? (
                      <div className={cn(
                        'border-t px-4 py-3 text-xs font-black',
                        /failed|not uploaded|error/i.test(groupStatus)
                          ? 'border-amber-300/20 bg-amber-400/10 text-amber-100'
                          : /uploaded|approved|inserted/i.test(groupStatus)
                            ? 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100'
                            : 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100'
                      )}>
                        {groupStatus}
                      </div>
                    ) : null}
                    {isGroupDuplicate ? (
                      <div className="border-t border-rose-300/20 bg-rose-500/10 px-4 py-3 text-xs font-black text-rose-100">
                        <span className="uppercase tracking-[0.12em] text-rose-200">{groupDuplicateLabel}</span>
                        <span className="ml-2 text-rose-100/80">
                          {isGroupAlreadyApprovedSubject
                            ? 'Same email subject already exists in the approved tax ledger.'
                            : `Same email subject appears ${groupSubjectDuplicate?.count || 2} times in the current email sync set.`}
                        </span>
                      </div>
                    ) : null}
                    {isExpanded ? (
                      <div className="border-t border-cyan-300/10 bg-[#050B14]">
                        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white">Parent Email Approval</p>
                              <p className="mt-1 text-[11px] font-semibold text-white/45">
                                {selectedChildCount} of {pendingCount} child items selected{ignoredCount > 0 ? ` · ${ignoredCount} ignored` : ''} · server bill upload on
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleApproveEmailGroup(group)}
                            disabled={!canApproveVisibleParent || isApprovingParent}
                            title={isGroupDuplicate ? 'This parent email is tagged as duplicate.' : undefined}
                            className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-black hover:bg-emerald-500 disabled:opacity-45"
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            {isApprovingParent ? 'Approving...' : 'Approve Email'}
                          </Button>
                        </div>
                        <div className="p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Attachment Rows</p>
                            <p className="font-mono text-[10px] font-black text-cyan-200">{group.rows.length} item{group.rows.length === 1 ? '' : 's'}</p>
                          </div>
                          <div className="space-y-3">
                            {group.rows.map((mail) => renderEmailApprovalRow(mail))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        ) : null}

        {activeWorkspace === 'reportOverview' ? (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#0D1322] shadow-[0_0_0_1px_rgba(6,182,212,0.04)]">
            <div className="relative p-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_92%_5%,rgba(16,185,129,0.12),transparent_32%)]" />
              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200">
                    <FileSearch className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Tax Report Monitor</p>
                    <h2 className="mt-1 text-xl font-black tracking-tight text-white">Tax Report Overview</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-white/45">
                      Checks monthly evidence coverage from configured income sources and recurring expense renewals for FY {activePeriod}.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" onClick={handleDownloadReportOverviewPdf} className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black hover:bg-emerald-500">
                    <Download className="mr-2 h-4 w-4" />
                    Generate PDF
                  </Button>
                  <Button type="button" onClick={() => setActiveWorkspace('reportManager')} className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-black hover:bg-blue-500">
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Sources
                  </Button>
                </div>
              </div>
              <div className="relative mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Coverage', value: `${taxReportOverviewStats.percent}%`, caption: `${taxReportOverviewStats.uploaded}/${taxReportOverviewStats.total} uploaded`, tone: 'cyan' },
                  { label: 'Missing Uploads', value: taxReportOverviewStats.missing.toLocaleString(), caption: 'Expected evidence gaps', tone: 'amber' },
                  { label: 'Complete Months', value: `${taxReportOverviewStats.completeMonths}/12`, caption: 'Financial year months', tone: 'emerald' },
                  { label: 'Recurring Expenses', value: taxReportOverviewStats.activeRecurring.toLocaleString(), caption: 'Managed renewal rules', tone: 'rose' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">{item.label}</p>
                    <p className={cn(
                      'mt-2 text-2xl font-black tracking-tight',
                      item.tone === 'cyan' && 'text-cyan-200',
                      item.tone === 'amber' && 'text-amber-200',
                      item.tone === 'emerald' && 'text-emerald-200',
                      item.tone === 'rose' && 'text-rose-200'
                    )}>{item.value}</p>
                    <p className="mt-1 text-xs font-semibold text-white/40">{item.caption}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {taxReportMonthStatuses.map((month) => {
              const complete = month.percent === 100;
              const expectedIncome = month.income.filter((status) => status.expected);
              const expectedExpenses = month.expenses.filter((status) => status.expected);
              return (
                <article key={month.key} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220] shadow-xl shadow-black/15">
                  <div className="border-b border-white/10 bg-white/[0.035] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{month.label}</p>
                        <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{month.key}</p>
                      </div>
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', complete ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : 'border-amber-400/20 bg-amber-500/10 text-amber-200')}>
                        {month.percent}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className={cn('h-full rounded-full', complete ? 'bg-emerald-400' : 'bg-amber-400')} style={{ width: `${month.percent}%` }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-white/40">
                      <span>Income {formatLkr(month.incomeAmount)}</span>
                      <span>Expenses {formatLkr(month.expenseAmount)}</span>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <section className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Income</h3>
                        </div>
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                          {expectedIncome.filter((status) => status.uploaded).length}/{expectedIncome.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {expectedIncome.length ? expectedIncome.map(reportSourceRow) : (
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-bold text-white/35">No income sources expected.</div>
                        )}
                      </div>
                    </section>
                    <section className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Expenses</h3>
                        </div>
                        <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-black text-rose-200">
                          {expectedExpenses.filter((status) => status.uploaded).length}/{expectedExpenses.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {expectedExpenses.length ? expectedExpenses.map(reportSourceRow) : (
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs font-bold text-white/35">No recurring expenses expected.</div>
                        )}
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        ) : null}

        {activeWorkspace === 'reportManager' ? (
        <div className="rounded-3xl border border-cyan-300/20 bg-[#0D1322] p-5 shadow-[0_0_0_1px_rgba(6,182,212,0.04)]">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-cyan-300" />
                <h2 className="text-base font-black tracking-tight">Tax Report Manager</h2>
              </div>
              <p className="mt-1 text-xs font-medium text-white/40">
                Define expected tax evidence sources. The overview uses these rules to mark monthly uploads as complete or missing.
              </p>
            </div>
            <Button type="button" onClick={resetReportSources} variant="outline" className="h-10 rounded-xl border-white/10 bg-white/[0.03] px-4 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Defaults
            </Button>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-4">
              <div className="mb-4">
                <h3 className="text-sm font-black text-emerald-300">Income Sources</h3>
                <p className="mt-1 text-xs font-semibold text-white/40">Google Play Console, Google AdMob, Apple App Store, or any future income stream.</p>
              </div>
              {sourceManagerForm('Income')}
              <div className="mt-4">
                {sourceManagerList('Income')}
              </div>
            </section>
            <section className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.04] p-4">
              <div className="mb-4">
                <h3 className="text-sm font-black text-rose-300">Expense Sources & Renewals</h3>
                <p className="mt-1 text-xs font-semibold text-white/40">Add SaaS renewals like ChatGPT with buy date, cadence, and optional end date.</p>
              </div>
              {sourceManagerForm('Expense')}
              <div className="mt-4">
                {sourceManagerList('Expense')}
              </div>
            </section>
          </div>
        </div>
        ) : null}

        {activeWorkspace === 'categories' ? (
        <div className="rounded-3xl border border-cyan-300/20 bg-[#0D1322] p-5 shadow-[0_0_0_1px_rgba(6,182,212,0.04)]">
          <div>
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-cyan-300" />
              <h2 className="text-base font-black tracking-tight">Ledgers Category Configurator</h2>
            </div>
            <p className="mt-1 text-xs font-medium text-white/40">Configure structural categories. Modifications update form selector items and automated email categorization instantly.</p>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {[
              { title: 'Income Classifications', type: 'Income' as const, rows: incomeCategories, color: 'emerald' },
              { title: 'Expense Classifications', type: 'Expense' as const, rows: expenseCategories, color: 'rose' },
            ].map((group) => (
              <div key={group.title} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <h3 className={cn('text-sm font-black', group.color === 'emerald' ? 'text-emerald-300' : 'text-rose-300')}>{group.title}</h3>
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const formData = new FormData(form);
                    await runAction(() => saveTaxCategory(group.type, String(formData.get('category') || '').trim(), '', String(formData.get('ruleKeywords') || '').trim()), 'Tax category saved.');
                    form.reset();
                  }}
                >
                  <div className="grid min-w-0 flex-1 gap-2">
                    <input name="category" required placeholder="Add Category Title..." className="h-10 min-w-0 rounded-xl border border-white/10 bg-[#0B101C] px-3 text-xs font-semibold text-white outline-none placeholder:text-white/35" />
                    <input name="ruleKeywords" placeholder="Keywords: google, stripe, remittance..." className="h-9 min-w-0 rounded-xl border border-white/10 bg-[#0B101C] px-3 text-xs font-semibold text-white outline-none placeholder:text-white/35" />
                  </div>
                  <Button className={cn('h-10 rounded-xl px-3 text-xs font-black', group.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500')}>
                    <Plus className="mr-1 h-4 w-4" />
                    Category
                  </Button>
                </form>
                <div className="mt-4 max-h-[290px] space-y-3 overflow-y-auto pr-1">
                  {group.rows.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-[#080D18] p-5 text-center text-xs font-bold text-white/40">No categories yet.</div>
                  ) : null}
                  {group.rows.map((row) => (
                    <div key={row.id} className="rounded-xl border border-white/10 bg-[#080D18] p-3">
                      <div className="flex items-center justify-between gap-3">
                        {editingCategoryId === row.id ? (
                          <form
                            className="flex min-w-0 flex-1 gap-2"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const form = event.currentTarget;
                              const formData = new FormData(form);
                              await runAction(() => saveTaxCategory(row.type, String(formData.get('category') || '').trim(), row.id, String(formData.get('ruleKeywords') || '').trim()), 'Tax category updated.');
                              setEditingCategoryId('');
                            }}
                          >
                            <div className="grid min-w-0 flex-1 gap-2">
                              <input name="category" defaultValue={row.name} required className="h-9 min-w-0 rounded-lg border border-white/10 bg-[#0D1322] px-3 text-xs font-semibold text-white outline-none placeholder:text-white/35" />
                              <input name="ruleKeywords" defaultValue={row.ruleKeywords || ''} placeholder="Keywords, comma separated..." className="h-8 min-w-0 rounded-lg border border-white/10 bg-[#0D1322] px-3 text-xs font-semibold text-white outline-none placeholder:text-white/35" />
                            </div>
                            <Button variant="outline" className="h-9 rounded-lg border-white/10 bg-white/[0.04] px-3 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white">Save</Button>
                            <button type="button" onClick={() => setEditingCategoryId('')} className="h-9 rounded-lg px-2 text-xs font-bold text-white/45 transition hover:text-white">Cancel</button>
                          </form>
                        ) : (
                          <>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white">{row.name}</p>
                              {row.ruleKeywords ? (
                                <p className="mt-1 truncate font-mono text-[10px] font-bold text-cyan-300/70">Keywords: {row.ruleKeywords}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setEditingCategoryId(row.id)} className="text-white/45 hover:text-white">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" onClick={() => runAction(() => deleteTaxCategory(row.id), 'Tax category deleted.')} className="text-rose-400 hover:text-rose-300">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        ) : null}

      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-300" />
            <h2 className="text-base font-black tracking-tight">Quarterly Tax Curve</h2>
          </div>
          <p className="mt-1 text-xs font-medium text-white/40">Estimated payable balance by quarter.</p>
          <div className="mt-5 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realQuarterlyData}>
                <defs>
                  <linearGradient id="taxArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={formatAxis} tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 800 }} />
	                <Tooltip content={<TaxChartTooltip />} />
                <Area type="monotone" dataKey="tax" stroke="#06b6d4" strokeWidth={3} fill="url(#taxArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0D1322] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-emerald-300" />
                <h2 className="text-base font-black tracking-tight">Revenue vs Deductions</h2>
              </div>
              <p className="mt-1 text-xs font-medium text-white/40">Quarterly composition used by the liability model.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Revenue</span>
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-400" /> Deductions</span>
            </div>
          </div>
          <div className="mt-5 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={realQuarterlyData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 800 }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={formatAxis} tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 800 }} />
	                <Tooltip content={<TaxChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                  {realQuarterlyData.map((entry) => <Cell key={`revenue-${entry.quarter}`} fill="#10b981" />)}
                </Bar>
                <Bar dataKey="deductions" radius={[8, 8, 0, 0]}>
                  {realQuarterlyData.map((entry) => <Cell key={`deduction-${entry.quarter}`} fill="#fb7185" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5">
          <Mail className="h-5 w-5 text-cyan-300" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Source Sync</p>
          <p className="mt-2 text-sm font-bold text-white">tax@rermedapps.com</p>
          <p className="mt-1 text-xs font-medium text-white/40">Import receipts and accountant notes into the return workspace.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Audit Trail</p>
          <p className="mt-2 text-sm font-bold text-white">32 ledger checks passed</p>
          <p className="mt-1 text-xs font-medium text-white/40">Every adjustment keeps its source, status, and reviewer note.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0D1322] p-5">
          <Landmark className="h-5 w-5 text-blue-300" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Next Filing Window</p>
          <p className="mt-2 text-sm font-bold text-white">April 1, 2026 to March 31, 2027</p>
          <p className="mt-1 text-xs font-medium text-white/40">Current workspace follows the annual financial year structure.</p>
        </div>
      </section>

      <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden border-cyan-300/20 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_36%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200">
                <CircleHelp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/80">Tax Returns Help</p>
                <DialogTitle className="mt-1 text-lg font-black tracking-tight text-white">මෙම Tax Workspace එක භාවිතා කරන ආකාරය</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-white/45">
                  Tabs, buttons, delete actions, export package වගේ ප්‍රධාන දේවල් සරලව පැහැදිලි කර ඇත.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-5 md:p-6">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4">
              <p className="text-sm font-semibold leading-6 text-cyan-50/85">
                මේ page එකෙන් tax year එකකට අදාළ income, expenses, email evidence, categories, expected reports, export files එකම workspace එකක manage කරනවා.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {taxHelpQuickTips.map((tip) => (
                  <div key={tip} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold leading-5 text-white/55">
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {taxHelpSections.map((section) => {
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
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {section.actions.map((action) => (
                        <div key={`${section.title}-${action.label}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200">{action.label}</p>
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

      <Dialog open={Boolean(deleteEmailTarget)} onOpenChange={(open) => {
        if (!open && !isDeletingEmail) setDeleteEmailTarget(null);
      }}>
        <DialogContent className="max-w-lg overflow-hidden border-rose-300/20 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.2),transparent_42%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-rose-300/25 bg-rose-500/10 text-rose-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/80">Delete Email</p>
                <DialogTitle className="mt-1 text-lg font-black tracking-tight text-white">Move this email to Delete?</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-white/45">
                  This email will be removed from the approval queue and moved to the mailbox Delete folder.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {deleteEmailTarget ? (
            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Email Item</p>
                <p className="mt-2 text-sm font-black leading-5 text-white">{cleanInboxSubject(deleteEmailTarget.subject)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{deleteEmailTarget.suggestedType}</span>
                  <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 text-cyan-100">{deleteEmailTarget.attachmentName || 'Email Body'}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4 text-xs font-semibold leading-5 text-amber-100/80">
                This is for mail you do not want in the tax approval queue. Confirming moves the source email to Delete, so it will not return on the next sync.
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeletingEmail}
                  onClick={() => setDeleteEmailTarget(null)}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isDeletingEmail}
                  onClick={() => handleDeleteEmail(deleteEmailTarget)}
                  className="h-11 rounded-xl bg-rose-600 px-5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {isDeletingEmail ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {isDeletingEmail ? 'Moving...' : 'Move to Delete'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(duplicateEmailTarget)} onOpenChange={(open) => {
        if (!open && !isMarkingDuplicateEmail) setDuplicateEmailTarget(null);
      }}>
        <DialogContent className="max-w-lg overflow-hidden border-rose-300/20 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.2),transparent_42%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-rose-300/25 bg-rose-500/10 text-rose-200">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/80">Duplicate Email</p>
                <DialogTitle className="mt-1 text-lg font-black tracking-tight text-white">Mark this email as duplicate?</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-white/45">
                  This approval row will be removed from the queue and treated as a duplicate.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {duplicateEmailTarget ? (
            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Email Item</p>
                <p className="mt-2 text-sm font-black leading-5 text-white">{cleanInboxSubject(duplicateEmailTarget.subject)}</p>
                {duplicateEmailMatches[duplicateEmailTarget.id] ? (
                  <div className="mt-3 rounded-xl border border-rose-300/15 bg-rose-500/10 p-3 text-xs font-semibold leading-5 text-rose-100/80">
                    Matches ledger row {duplicateEmailMatches[duplicateEmailTarget.id].invoiceNo || duplicateEmailMatches[duplicateEmailTarget.id].ledgerId} by {duplicateEmailMatches[duplicateEmailTarget.id].reason}.
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 p-4 text-xs font-semibold leading-5 text-cyan-100/80">
                Future email syncs ignore duplicates, so this forwarded copy will not return to pending approvals.
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMarkingDuplicateEmail}
                  onClick={() => setDuplicateEmailTarget(null)}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isMarkingDuplicateEmail}
                  onClick={() => handleMarkDuplicateEmail(duplicateEmailTarget)}
                  className="h-11 rounded-xl bg-rose-600 px-5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {isMarkingDuplicateEmail ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  {isMarkingDuplicateEmail ? 'Marking...' : 'Mark Duplicate'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteLedgerEntryTarget)} onOpenChange={(open) => {
        if (!open && !isDeletingLedgerEntry) setDeleteLedgerEntryTarget(null);
      }}>
        <DialogContent className="max-w-lg overflow-hidden border-rose-300/20 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.2),transparent_42%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-rose-300/25 bg-rose-500/10 text-rose-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/80">Confirm Delete</p>
                <DialogTitle className="mt-1 text-lg font-black tracking-tight text-white">Delete this ledger row?</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-white/45">
                  The row will be removed from the tax ledger. The email can return on the next sync if it is still in the inbox.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {deleteLedgerEntryTarget ? (
            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Ledger Item</p>
                <p className="mt-2 text-sm font-black leading-5 text-white">{cleanInboxSubject(deleteLedgerEntryTarget.title)}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{deleteLedgerEntryTarget.entryType}</span>
                  <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2.5 py-1 text-cyan-100">{deleteLedgerEntryTarget.category}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{deleteLedgerEntryTarget.currency} {deleteLedgerEntryTarget.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-300/15 bg-amber-500/10 p-4 text-xs font-semibold leading-5 text-amber-100/80">
                Saved values for this email item will be reused when it appears again. Extract can refresh parsed values from the server email attachment.
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isDeletingLedgerEntry}
                  onClick={() => setDeleteLedgerEntryTarget(null)}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </Button>
	                <Button
	                  type="button"
	                  disabled={isDeletingLedgerEntry}
	                  onClick={() => handleDeleteLedgerEntry(deleteLedgerEntryTarget)}
	                  className="h-11 rounded-xl bg-rose-600 px-5 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50"
	                >
	                  {isDeletingLedgerEntry ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
	                  {isDeletingLedgerEntry ? 'Deleting...' : 'Delete Row'}
	                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingLedgerEntry)} onOpenChange={(open) => !open && setEditingLedgerEntry(null)}>
        <DialogContent className="max-w-3xl overflow-hidden border-white/10 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_42%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white">Edit Ledger Details</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/45">
                  Update the approved ledger subject, category, and attachment display name.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editingLedgerEntry ? (
            <form onSubmit={handleUpdateLedgerMetadata} className="grid gap-4 p-6 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Subject</span>
                <input
                  name="title"
                  required
                  defaultValue={cleanInboxSubject(editingLedgerEntry.title)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Category</span>
                <select name="category" required defaultValue={editingLedgerEntry.category} className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40">
                  {ledgerEditCategoryOptions.map((category) => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                  {!ledgerEditCategoryOptions.some((category) => category.name === editingLedgerEntry.category) ? (
                    <option value={editingLedgerEntry.category}>{editingLedgerEntry.category}</option>
                  ) : null}
                </select>
              </label>
              {showLedgerAttachmentNameEdit ? (
                <label className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Attachment Name</span>
                  <input
                    name="attachmentName"
                    defaultValue={editingLedgerEntry.attachmentName || ''}
                    placeholder="Credit_Advice.pdf"
                    className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
                  />
                </label>
              ) : null}
              <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end md:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditingLedgerEntry(null)} className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" className="h-11 rounded-xl bg-cyan-600 px-5 text-xs font-black hover:bg-cyan-500">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="max-w-4xl overflow-hidden border-white/10 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_42%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white">Add Tax Ledger Entry</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/45">
                  Insert an income or deductible expense row into FY {activePeriod}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSaveEntry} className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Date</span>
              <input name="transactionDate" type="date" required className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40" />
            </label>
            <label className="space-y-2 xl:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Type</span>
              <select value={entryType} onChange={(event) => setEntryType(event.target.value as 'Income' | 'Expense')} className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40">
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </label>
            <label className="space-y-2 xl:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Currency</span>
              <select name="currency" className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40">
                <option value="LKR">LKR</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="space-y-2 xl:col-span-4">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Description</span>
              <input name="title" required placeholder="Tax item / description" className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40" />
            </label>
            <label className="space-y-2 xl:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Amount</span>
              <input name="amount" type="number" step="0.01" min="0" required placeholder="0.00" className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40" />
            </label>
            <label className="space-y-2 xl:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Category</span>
              <select name="category" required className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40">
                <option value="">Select category</option>
                {formCategories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
            </label>
            <label className="space-y-2 xl:col-span-2">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Status</span>
              <select name="status" className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40">
                <option value="Ready">Ready</option>
                <option value="Review">Review</option>
                <option value="Pending">Pending</option>
              </select>
            </label>
            <label className="space-y-2 xl:col-span-6">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Notes</span>
              <textarea name="notes" rows={3} placeholder="Internal notes, source details, or filing reference" className="w-full resize-none rounded-xl border border-white/10 bg-[#080D18] px-3 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40" />
            </label>
            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end xl:col-span-6">
              <Button type="button" variant="outline" onClick={() => setIsEntryDialogOpen(false)} className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-black hover:bg-emerald-500">
                <Plus className="mr-2 h-4 w-4" />
                Save Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={(open) => !isExportingReturn && setIsExportDialogOpen(open)}>
        <DialogContent className="max-w-2xl overflow-hidden border-white/10 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-200">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white">Export Tax Return Package</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/45">
                  Select the date range for the return PDF and evidence ZIP files.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleExportReturn} className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Start Date</span>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(event) => setExportStartDate(event.target.value)}
                  disabled={isExportingReturn}
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:border-emerald-300/40 disabled:opacity-50"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">End Date</span>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(event) => setExportEndDate(event.target.value)}
                  disabled={isExportingReturn}
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none [color-scheme:dark] focus:border-emerald-300/40 disabled:opacity-50"
                />
              </label>
            </div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4">
              <p className="text-xs font-black text-emerald-100">Package output</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-emerald-100/65">
                The download contains the return PDF, `income.zip` for income evidence, and `expenses.zip` for deduction bills and receipts.
              </p>
            </div>
            {exportStatus ? (
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-xs font-black text-cyan-100">
                {exportStatus}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={isExportingReturn} onClick={() => setIsExportDialogOpen(false)} className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white">
                Cancel
              </Button>
              <Button type="submit" disabled={isExportingReturn} className="h-11 rounded-xl bg-emerald-600 px-5 text-xs font-black hover:bg-emerald-500 disabled:opacity-55">
                <Download className="mr-2 h-4 w-4" />
                {isExportingReturn ? 'Preparing...' : 'Download Package'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingEmail)} onOpenChange={(open) => !open && setEditingEmail(null)}>
        <DialogContent className="max-w-4xl overflow-hidden border-white/10 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_42%)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-200">
                <Pencil className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white">Edit Email Approval</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/45">
                  Correct parsed mail details before approving the row into the tax ledger.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {editingEmail ? (
            <form onSubmit={handleUpdateEmail} className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-2 xl:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Amount</span>
                <input name="amount" type="number" step="0.01" min="0" required defaultValue={editingEmail.amount} className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40" />
              </label>
              <label className="space-y-2 xl:col-span-3">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Currency</span>
                <select name="currency" defaultValue={editingEmail.currency} className="h-11 w-full rounded-xl border border-white/10 bg-[#080D18] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40">
                  <option value="LKR">LKR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end xl:col-span-6">
                <Button type="button" variant="outline" onClick={() => setEditingEmail(null)} className="h-11 rounded-xl border-white/10 bg-white/[0.03] px-5 text-xs font-black text-white/70 hover:bg-white/10 hover:text-white">
                  Cancel
                </Button>
                <Button type="submit" className="h-11 rounded-xl bg-cyan-600 px-5 text-xs font-black hover:bg-cyan-500">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(attachmentPreview)}
        onOpenChange={(open) => {
          if (!open) {
            setAttachmentPreview(null);
            setAttachmentPreviewError('');
            setIsAttachmentLoading(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden border-white/10 bg-[#0D1322] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
          <DialogHeader className="border-b border-white/10 px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <DialogTitle className="truncate text-lg font-black tracking-tight text-white">{attachmentPreview?.fileName || 'Attachment Preview'}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-white/45">
                  {attachmentPreview?.mimeType || 'Email attachment'}
                </DialogDescription>
              </div>
              {attachmentPreview?.dataUrl?.startsWith('data:') ? (
                <a href={attachmentPreviewObjectUrl || attachmentPreview.dataUrl} download={attachmentPreview.fileName || 'attachment'} className="inline-flex h-10 items-center justify-center rounded-xl bg-cyan-600 px-4 text-xs font-black text-white transition hover:bg-cyan-500">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              ) : null}
            </div>
          </DialogHeader>
          <div className="flex h-[72vh] flex-col gap-3 bg-[#070A12] p-4">
            {!isAttachmentLoading && attachmentPreview?.nestedAttachments?.length ? (
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">Attachments inside this email</p>
                <div className="flex flex-wrap gap-2">
                  {attachmentPreview.nestedAttachments.map((nested, index) => (
                    <a
                      key={`${nested.fileName}-${index}`}
                      href={nested.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={nested.fileName}
                      className="inline-flex h-9 max-w-full items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 text-xs font-black text-white/80 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-cyan-200" />
                      <span className="truncate">{nested.fileName}</span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {isAttachmentLoading ? (
              <div className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-white/10 bg-black/20 text-sm font-bold text-white/45">
                Loading attachment...
              </div>
            ) : null}
            {!isAttachmentLoading && attachmentPreviewError ? (
              <div className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-rose-300/20 bg-rose-500/10 p-6 text-center">
                <div className="max-w-xl">
                  <Paperclip className="mx-auto h-8 w-8 text-rose-200" />
                  <p className="mt-3 text-sm font-black text-rose-100">Attachment preview failed.</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-rose-100/70">{attachmentPreviewError}</p>
                </div>
              </div>
            ) : null}
            {!isAttachmentLoading && attachmentPreview?.dataUrl && attachmentPreview.mimeType?.startsWith('image/') ? (
              <div className="grid min-h-0 flex-1 place-items-center overflow-auto rounded-2xl border border-white/10 bg-black/20">
                <img src={attachmentPreviewObjectUrl || attachmentPreview.dataUrl} alt={attachmentPreview.fileName || 'Attachment'} className="max-h-full max-w-full rounded-xl object-contain" />
              </div>
            ) : null}
            {!isAttachmentLoading && attachmentPreview?.dataUrl && attachmentPreview.mimeType === 'application/pdf' ? (
              <iframe title={attachmentPreview.fileName || 'Attachment PDF'} src={attachmentPreviewObjectUrl || attachmentPreview.dataUrl} className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-white" />
            ) : null}
            {!isAttachmentLoading && attachmentPreview?.htmlPreview ? (
              <iframe
                title={attachmentPreview.fileName || 'Email Preview'}
                srcDoc={attachmentPreview.htmlPreview}
                sandbox=""
                className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-white"
              />
            ) : null}
            {!isAttachmentLoading && attachmentPreview?.textPreview && !attachmentPreview.htmlPreview ? (
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs leading-5 text-white/75">
                {attachmentPreview.textPreview}
              </pre>
            ) : null}
            {!isAttachmentLoading && attachmentPreview?.dataUrl && attachmentPreview.mimeType && !attachmentPreview.mimeType.startsWith('image/') && attachmentPreview.mimeType !== 'application/pdf' && !attachmentPreview.textPreview && !attachmentPreview.htmlPreview ? (
              <div className="grid min-h-0 flex-1 place-items-center rounded-2xl border border-white/10 bg-black/20 text-center">
                <div>
                  <Paperclip className="mx-auto h-8 w-8 text-cyan-300" />
                  <p className="mt-3 text-sm font-black text-white">Preview is not available for this file type.</p>
                  <p className="mt-1 text-xs font-semibold text-white/45">Use Download to open it locally.</p>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
