'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-log';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';
import { financeEmployeeNames, normalizeFinanceEmployeeName, type FinanceEmployeeName } from '@/lib/finance-employees';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

export type FinanceFixedDeposit = {
  id: string;
  bankEntity: string;
  capitalAsset: string;
  apyPercent: number;
  maturityDate: string;
  status: 'Active' | 'Pending';
};

export type FinancePayout = {
  id: string;
  employeeName: FinanceEmployeeName;
  remarks?: string;
  amount: number;
  currency: 'USD' | 'LKR';
  date: string;
  paymentSlipUrl?: string;
  transactionType?: 'Bank Transfer' | 'Cash';
};

export type FinanceExpense = {
  id: string;
  category: string;
  subCategory?: string;
  description: string;
  amount: number;
  currency: 'USD' | 'LKR';
  date: string;
  recurrence: 'One-Time' | 'Monthly' | 'Annually';
  attachmentUrl?: string;
  convertedAmount?: number;
  isGenerated?: boolean;
  parentId?: string;
};

export type FinanceHubRevenueSummary = {
  iosRevenueUsd: number;
  androidRevenueUsd: number;
  admobRevenueUsd: number;
};

export type FinanceInvoiceTag = 'Expenses' | 'Other expenses';

export type FinanceInvoiceLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

export type SendFinanceInvoiceInput = {
  invoiceNo: string;
  vendorName: string;
  invoiceDate: string;
  dueDate?: string;
  currency: 'USD' | 'LKR';
  tag: FinanceInvoiceTag;
  remark?: string;
  lines: FinanceInvoiceLineInput[];
};

const fixedDepositSchema = z.object({
  bankEntity: z.string().min(1),
  capitalAsset: z.string().min(1),
  apyPercent: z.coerce.number().positive(),
  maturityDate: z.string().min(10),
  status: z.enum(['Active', 'Pending']),
});

const payoutSchema = z.object({
  employeeName: z.enum(financeEmployeeNames),
  remarks: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: z.enum(['USD', 'LKR']),
  date: z.string().min(10),
  paymentSlipUrl: z.string().optional(),
  transactionType: z.enum(['Bank Transfer', 'Cash']).optional(),
});

const expenseSchema = z.object({
  category: z.string().min(1),
  subCategory: z.string().optional(),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.enum(['USD', 'LKR']),
  date: z.string().min(10),
  recurrence: z.enum(['One-Time', 'Monthly', 'Annually']),
  attachmentUrl: z.string().optional(),
  convertedAmount: z.coerce.number().optional(),
});

const invoiceLineSchema = z.object({
  description: z.string().trim().min(1).max(220),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

const financeInvoiceSchema = z.object({
  invoiceNo: z.string().trim().min(1).max(80),
  vendorName: z.string().trim().min(1).max(160),
  invoiceDate: z.string().trim().min(10).max(10),
  dueDate: z.string().trim().max(10).optional().or(z.literal('')),
  currency: z.enum(['USD', 'LKR']),
  tag: z.enum(['Expenses', 'Other expenses']),
  remark: z.string().trim().max(1200).optional(),
  lines: z.array(invoiceLineSchema).min(1).max(50),
});

type ApiPayload = Record<string, any> & { success?: boolean; error_msg?: string; message?: string };
type ActionResult = { success?: boolean; error?: string; debug?: unknown };
type SendFinanceInvoiceResult = ActionResult & { messageId?: string; recipient?: string; total?: number };
const FINANCE_INVOICE_RECIPIENT = 'tax@rermedapps.com';

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postFinanceHub(tag: string, body: Record<string, string> = {}): Promise<ApiPayload> {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers,
    body: new URLSearchParams({ tag, db: 'MAIN', ...body }),
  });

  const raw = await response.text();
  let payload: ApiPayload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { success: false, error_msg: 'PHP returned a non-JSON response.', raw_response: raw };
  }

  return { ...payload, status: response.status, raw_response: raw };
}

function apiError(payload: ApiPayload, fallback: string) {
  const message = payload.error_msg || payload.message || fallback;
  if (message === 'Unknown request tag') {
    return 'Server PHP route SEND_FINANCE_INVOICE is not deployed yet. Upload Server/RERMedappsHandleling.php and Server/module/FinanceHandleling.php, then clear PHP OPcache/restart PHP.';
  }
  if (payload.raw_response && String(payload.raw_response).trim() && String(payload.raw_response).trim()[0] !== '{') {
    return `${message} ${String(payload.raw_response).replace(/\s+/g, ' ').slice(0, 220)}`;
  }
  return message;
}

function cleanSetting(value: unknown, fallback = '') {
  return String(value || '').trim() || fallback;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInvoiceMoney(amount: number, currency: 'USD' | 'LKR') {
  const prefix = currency === 'LKR' ? 'Rs ' : '$';
  return `${prefix}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function encodeEmailHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function encodeGmailRawMessage(value: string) {
  return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildFinanceInvoiceHtml(invoice: z.infer<typeof financeInvoiceSchema>, recipient: string) {
  const rows = invoice.lines.map((line, index) => {
    const lineTotal = line.quantity * line.unitPrice;
    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">${index + 1}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">${escapeHtml(line.description)}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">${line.quantity}</td>
        <td style="padding:14px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#4b5563;">${formatInvoiceMoney(line.unitPrice, invoice.currency)}</td>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:800;">${formatInvoiceMoney(lineTotal, invoice.currency)}</td>
      </tr>
    `;
  }).join('');
  const subtotal = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const accent = invoice.tag === 'Expenses' ? '#f43f5e' : '#8b5cf6';
  const remark = invoice.remark ? `
    <div style="margin-top:24px;border-radius:18px;border:1px solid #e5e7eb;background:#f9fafb;padding:18px;">
      <div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Remark</div>
      <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#111827;">${escapeHtml(invoice.remark).replace(/\n/g, '<br>')}</div>
    </div>
  ` : '';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;padding:32px;font-family:Inter,Arial,sans-serif;color:#111827;">
    <div style="max-width:820px;margin:0 auto;border-radius:30px;background:#ffffff;box-shadow:0 22px 70px rgba(15,23,42,0.16);overflow:hidden;">
      <div style="background:#0d0d11;padding:34px 38px;color:#ffffff;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px;">
          <div>
            <div style="font-size:11px;font-weight:900;letter-spacing:0.22em;text-transform:uppercase;color:#34d399;">RER MedApps Finance</div>
            <h1 style="margin:8px 0 0;font-size:34px;line-height:1;font-style:italic;letter-spacing:-0.04em;">Invoice</h1>
            <div style="margin-top:14px;display:inline-block;border-radius:999px;background:${accent};padding:8px 13px;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(invoice.tag)}</div>
          </div>
          <div style="text-align:right;font-size:13px;color:rgba(255,255,255,0.7);line-height:1.7;">
            <div style="font-weight:900;color:#ffffff;">${escapeHtml(invoice.invoiceNo)}</div>
            <div>Invoice date: ${escapeHtml(invoice.invoiceDate)}</div>
            ${invoice.dueDate ? `<div>Due date: ${escapeHtml(invoice.dueDate)}</div>` : ''}
          </div>
        </div>
      </div>
      <div style="padding:34px 38px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:30px;">
          <div style="border-radius:20px;background:#f9fafb;padding:18px;border:1px solid #e5e7eb;">
            <div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Vendor</div>
            <div style="margin-top:8px;font-size:18px;font-weight:900;color:#111827;">${escapeHtml(invoice.vendorName)}</div>
          </div>
          <div style="border-radius:20px;background:#f9fafb;padding:18px;border:1px solid #e5e7eb;">
            <div style="font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">Tax mailbox</div>
            <div style="margin-top:8px;font-size:18px;font-weight:900;color:#111827;">${escapeHtml(recipient)}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:0 0 12px;text-align:left;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">#</th>
              <th style="padding:0 12px 12px;text-align:left;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Description</th>
              <th style="padding:0 12px 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Qty</th>
              <th style="padding:0 12px 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Rate</th>
              <th style="padding:0 0 12px;text-align:right;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9ca3af;">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:28px;display:flex;justify-content:flex-end;">
          <div style="min-width:270px;border-radius:22px;background:#111827;color:#ffffff;padding:22px;">
            <div style="display:flex;justify-content:space-between;color:rgba(255,255,255,0.62);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;">
              <span>Total</span>
              <span>${invoice.currency}</span>
            </div>
            <div style="margin-top:10px;text-align:right;font-size:30px;font-style:italic;font-weight:900;letter-spacing:-0.04em;color:#ffffff;">${formatInvoiceMoney(subtotal, invoice.currency)}</div>
          </div>
        </div>
        ${remark}
      </div>
    </div>
  </body>
</html>`;
}

function buildFinanceInvoiceText(invoice: z.infer<typeof financeInvoiceSchema>, recipient: string) {
  const total = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const lineText = invoice.lines
    .map((line, index) => `${index + 1}. ${line.description} - ${line.quantity} x ${formatInvoiceMoney(line.unitPrice, invoice.currency)} = ${formatInvoiceMoney(line.quantity * line.unitPrice, invoice.currency)}`)
    .join('\n');

  return [
    `RER MedApps Finance Invoice`,
    `Invoice No: ${invoice.invoiceNo}`,
    `Vendor: ${invoice.vendorName}`,
    `Tag: ${invoice.tag}`,
    `Invoice date: ${invoice.invoiceDate}`,
    invoice.dueDate ? `Due date: ${invoice.dueDate}` : '',
    `Recipient: ${recipient}`,
    '',
    lineText,
    '',
    `Total: ${formatInvoiceMoney(total, invoice.currency)}`,
    invoice.remark ? `Remark: ${invoice.remark}` : '',
  ].filter(Boolean).join('\n');
}

export async function listFinanceFixedDeposits(): Promise<FinanceFixedDeposit[]> {
  await requireAdminAuth();
  const payload = await postFinanceHub('GET_FINANCE_FIXED_DEPOSITS');
  return payload.success && Array.isArray(payload.fixed_deposits) ? payload.fixed_deposits : [];
}

export async function getFinanceHubRevenueSummary(months = 12): Promise<FinanceHubRevenueSummary> {
  await requireAdminAuth();
  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      tag: 'GET_HOME_MONTHLY_REVENUE_STATS',
      db: '0',
      months: String(months),
    }),
  });
  const raw = await response.text();
  let payload: ApiPayload;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = { success: false, error_msg: 'PHP returned a non-JSON response.', raw_response: raw };
  }

  const rows: any[] = payload.success && Array.isArray(payload.revenue?.rows) ? payload.revenue.rows : [];

  return rows.reduce<FinanceHubRevenueSummary>(
    (summary, row) => ({
      iosRevenueUsd: summary.iosRevenueUsd + Number(row.iosRevenue || 0),
      androidRevenueUsd: summary.androidRevenueUsd + Number(row.androidRevenue || 0),
      admobRevenueUsd: summary.admobRevenueUsd + Number(row.admobRevenue || 0),
    }),
    { iosRevenueUsd: 0, androidRevenueUsd: 0, admobRevenueUsd: 0 }
  );
}

export async function saveFinanceFixedDeposit(data: Omit<FinanceFixedDeposit, 'id'> & { id?: string }, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const validation = fixedDepositSchema.safeParse(data);
  if (!validation.success) return { error: 'Invalid fixed deposit data.' };

  const payload = await postFinanceHub('SAVE_FINANCE_FIXED_DEPOSIT', {
    ...(data.id ? { id: data.id } : {}),
    bank_entity: validation.data.bankEntity,
    capital_asset: validation.data.capitalAsset,
    apy_percent: String(validation.data.apyPercent),
    maturity_date: validation.data.maturityDate,
    status: validation.data.status,
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to save fixed deposit.'), debug: payload };

  await logActivity(data.id ? 'UPDATE_FIXED_DEPOSIT' : 'ADD_FIXED_DEPOSIT', {
    entityType: 'Fixed Deposit',
    entityId: payload.fixed_deposit?.id || data.id || 'new',
    entityName: validation.data.bankEntity,
  }, idToken ?? undefined);
  revalidatePath('/finance-hub');
  return { success: true };
}

export async function deleteFinanceFixedDeposit(id: string, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postFinanceHub('DELETE_FINANCE_FIXED_DEPOSIT', { id });
  if (!payload.success) return { error: apiError(payload, 'Failed to delete fixed deposit.'), debug: payload };
  await logActivity('DELETE_FIXED_DEPOSIT', { entityType: 'Fixed Deposit', entityId: id, entityName: payload.fixed_deposit?.bankEntity || id }, idToken ?? undefined);
  revalidatePath('/finance-hub');
  return { success: true };
}

export async function listFinancePayouts(): Promise<FinancePayout[]> {
  await requireAdminAuth();
  const payload = await postFinanceHub('GET_FINANCE_PAYOUTS');
  return payload.success && Array.isArray(payload.payouts)
    ? payload.payouts.map((payout: FinancePayout) => ({
        ...payout,
        employeeName: normalizeFinanceEmployeeName(payout.employeeName) as FinanceEmployeeName,
      }))
    : [];
}

export async function saveFinancePayout(data: Omit<FinancePayout, 'id'> & { id?: string }, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const validation = payoutSchema.safeParse(data);
  if (!validation.success) return { error: 'Invalid payout data.' };
  const payload = await postFinanceHub('SAVE_FINANCE_PAYOUT', {
    ...(data.id ? { id: data.id } : {}),
    payee_name: validation.data.employeeName,
    remarks: validation.data.remarks || '',
    amount: String(validation.data.amount),
    currency: validation.data.currency,
    date: validation.data.date,
    payment_slip_url: validation.data.paymentSlipUrl || '',
    transaction_type: validation.data.transactionType || 'Bank Transfer',
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to save payout.'), debug: payload };
  await logActivity(data.id ? 'UPDATE_PAYOUT' : 'ADD_PAYOUT', { entityType: 'Payout', entityId: payload.payout?.id || data.id || 'new', entityName: validation.data.employeeName }, idToken ?? undefined);
  revalidatePath('/finance-hub');
  return { success: true };
}

export async function deleteFinancePayout(id: string, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postFinanceHub('DELETE_FINANCE_PAYOUT', { id });
  if (!payload.success) return { error: apiError(payload, 'Failed to delete payout.'), debug: payload };
  await logActivity('DELETE_PAYOUT', { entityType: 'Payout', entityId: id, entityName: payload.payout?.employeeName || id }, idToken ?? undefined);
  revalidatePath('/finance-hub');
  return { success: true };
}

export async function listFinanceExpenses(): Promise<FinanceExpense[]> {
  await requireAdminAuth();
  const payload = await postFinanceHub('GET_FINANCE_EXPENSES');
  return payload.success && Array.isArray(payload.expenses) ? payload.expenses : [];
}

export async function saveFinanceExpense(data: Omit<FinanceExpense, 'id'> & { id?: string }, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const validation = expenseSchema.safeParse(data);
  if (!validation.success) return { error: 'Invalid expense data.' };
  const payload = await postFinanceHub('SAVE_FINANCE_EXPENSE', {
    ...(data.id ? { id: data.id } : {}),
    category: validation.data.category,
    sub_category: validation.data.subCategory || '',
    description: validation.data.description,
    amount: String(validation.data.amount),
    currency: validation.data.currency,
    date: validation.data.date,
    recurrence: validation.data.recurrence,
    attachment_url: validation.data.attachmentUrl || '',
    converted_amount: validation.data.convertedAmount !== undefined ? String(validation.data.convertedAmount) : '',
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to save expense.'), debug: payload };
  await logActivity(data.id ? 'UPDATE_FINANCE_EXPENSE' : 'ADD_FINANCE_EXPENSE', { entityType: 'Finance Expense', entityId: payload.expense?.id || data.id || 'new', entityName: validation.data.description }, idToken ?? undefined);
  revalidatePath('/finance-hub');
  return { success: true };
}

export async function deleteFinanceExpense(id: string, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postFinanceHub('DELETE_FINANCE_EXPENSE', { id });
  if (!payload.success) return { error: apiError(payload, 'Failed to delete expense.'), debug: payload };
  await logActivity('DELETE_FINANCE_EXPENSE', { entityType: 'Finance Expense', entityId: id, entityName: payload.expense?.description || id }, idToken ?? undefined);
  revalidatePath('/finance-hub');
  return { success: true };
}

export async function sendFinanceInvoice(data: SendFinanceInvoiceInput, idToken?: string | null): Promise<SendFinanceInvoiceResult> {
  await requireAdminAuth();
  const validation = financeInvoiceSchema.safeParse(data);
  if (!validation.success) return { error: 'Invalid invoice data.' };

  const invoice = validation.data;
  const recipient = FINANCE_INVOICE_RECIPIENT;
  const total = invoice.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const subject = `Invoice ${invoice.invoiceNo} - ${invoice.vendorName} - ${formatInvoiceMoney(total, invoice.currency)}`;
  const payload = await postFinanceHub('SEND_FINANCE_INVOICE', {
    recipient,
    subject,
    invoice_no: invoice.invoiceNo,
    vendor_name: invoice.vendorName,
    invoice_date: invoice.invoiceDate,
    due_date: invoice.dueDate || '',
    tag: invoice.tag,
    remark: invoice.remark || '',
    invoice_total: String(total),
    currency: invoice.currency,
    lines_json: JSON.stringify(invoice.lines),
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to send invoice.'), debug: payload };

  await logActivity('SEND_FINANCE_INVOICE', {
    entityType: 'Finance Invoice',
    entityId: invoice.invoiceNo,
    entityName: invoice.vendorName,
    changes: { recipient, total, currency: invoice.currency, tag: invoice.tag },
  }, idToken ?? undefined);
  revalidatePath('/finance-hub');
  revalidatePath('/tax-returns');
  return {
    success: true,
    messageId: String(payload.message_id || invoice.invoiceNo),
    recipient: String(payload.recipient || recipient),
    total: Number(payload.total || total),
  };
}
