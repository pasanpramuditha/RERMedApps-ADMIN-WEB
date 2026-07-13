'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { OtherIncome } from './data';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const otherIncomeFormSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.enum(['USD', 'LKR']),
  date: z.date(),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
});

type FinanceApiResponse = {
  success?: boolean;
  error_msg?: string;
  message?: string;
  incomes?: OtherIncome[];
  income?: OtherIncome;
  categories?: string[];
  rates?: Record<string, number>;
  base_currency?: string;
  url?: string;
  path?: string;
  file_name?: string;
  raw_response?: string;
  status?: number;
};

type ActionResult = { success?: boolean; error?: string; details?: unknown; debug?: unknown };

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postFinanceAction(tag: string, body: Record<string, string> = {}, multipart?: FormData): Promise<FinanceApiResponse> {
  const headers = await getAuthHeaders();
  const requestBody = multipart || new URLSearchParams({ tag, db: 'MAIN', ...body });

  if (multipart) {
    multipart.append('tag', tag);
    if (!body.db) {
      multipart.append('db', 'MAIN');
    }
    Object.entries(body).forEach(([key, value]) => multipart.append(key, value));
  } else {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers,
    body: requestBody,
  });

  const raw = await response.text();
  let payload: FinanceApiResponse;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {
      success: false,
      error_msg: 'PHP returned a non-JSON response.',
      raw_response: raw,
    };
  }

  return {
    ...payload,
    status: response.status,
    raw_response: raw,
  };
}

function apiError(payload: FinanceApiResponse, fallback: string) {
  return payload.error_msg || payload.message || fallback;
}

function dateToYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function toPayload(data: z.infer<typeof otherIncomeFormSchema>) {
  const convertedAmount = await convertAmountToUSD(data.amount, data.currency);
  return {
    category: data.category,
    description: data.description,
    amount: String(data.amount),
    currency: data.currency,
    date: dateToYmd(data.date),
    attachment_url: data.attachmentUrl || '',
    converted_amount: convertedAmount.toFixed(2),
  };
}

export async function listCurrencyRates(): Promise<Record<string, number>> {
  await requireAdminAuth();
  const payload = await postFinanceAction('GET_CURRENCY_RATES');
  if (payload.success && payload.rates) {
    return payload.rates;
  }

  return { USD: 1, LKR: 300 };
}

async function convertAmountToUSD(amount: number, currency: string): Promise<number> {
  const code = currency.toUpperCase();
  if (code === 'USD') {
    return amount;
  }

  const rates = await listCurrencyRates();
  const rate = rates[code];
  if (!rate || rate <= 0) {
    return amount;
  }

  return amount / rate;
}

export async function addOtherIncome(data: z.infer<typeof otherIncomeFormSchema>, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const validation = otherIncomeFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  const payload = await postFinanceAction('SAVE_OTHER_INCOME', await toPayload(validation.data));
  if (!payload.success) {
    return { error: apiError(payload, 'Failed to add income.'), debug: payload };
  }

  await logActivity('ADD_OTHER_INCOME', {
    entityType: 'Other Income',
    entityId: payload.income?.id || 'new',
    entityName: validation.data.description,
  }, idToken ?? undefined);

  revalidatePath('/other-income');
  return { success: true };
}

export async function updateOtherIncome(id: string, data: z.infer<typeof otherIncomeFormSchema>, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const validation = otherIncomeFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  const payload = await postFinanceAction('SAVE_OTHER_INCOME', {
    id,
    ...(await toPayload(validation.data)),
  });

  if (!payload.success) {
    return { error: apiError(payload, 'Failed to update income.'), debug: payload };
  }

  await logActivity('UPDATE_OTHER_INCOME', {
    entityType: 'Other Income',
    entityId: id,
    entityName: validation.data.description,
  }, idToken ?? undefined);

  revalidatePath('/other-income');
  return { success: true };
}

export async function deleteOtherIncome(id: string, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postFinanceAction('DELETE_OTHER_INCOME', { id });
  if (!payload.success) {
    return { error: apiError(payload, 'Failed to delete income.'), debug: payload };
  }

  await logActivity('DELETE_OTHER_INCOME', {
    entityType: 'Other Income',
    entityId: id,
    entityName: payload.income?.description || 'Unknown Income',
  }, idToken ?? undefined);

  revalidatePath('/other-income');
  return { success: true };
}

export async function listOtherIncomes(): Promise<OtherIncome[]> {
  await requireAdminAuth();
  const payload = await postFinanceAction('GET_OTHER_INCOMES');
  return payload.success && Array.isArray(payload.incomes) ? payload.incomes : [];
}

export async function listIncomeCategories(): Promise<string[]> {
  await requireAdminAuth();
  const payload = await postFinanceAction('LIST_OTHER_INCOME_CATEGORIES');
  return payload.success && Array.isArray(payload.categories) ? payload.categories : [];
}

export async function renameIncomeCategory(oldName: string, newName: string, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  if (!oldName || !newName || oldName === newName) {
    return { error: 'Invalid category names provided.' };
  }

  const payload = await postFinanceAction('RENAME_OTHER_INCOME_CATEGORY', {
    old_name: oldName,
    new_name: newName,
  });

  if (!payload.success) {
    return { error: apiError(payload, 'Failed to rename category.'), debug: payload };
  }

  await logActivity('RENAME_INCOME_CATEGORY', {
    entityType: 'Category',
    entityId: oldName,
    entityName: `From '${oldName}' to '${newName}'`,
  }, idToken ?? undefined);

  revalidatePath('/other-income');
  return { success: true };
}

export async function deleteIncomeCategory(categoryName: string, idToken?: string | null): Promise<ActionResult> {
  await requireAdminAuth();
  if (!categoryName) {
    return { error: 'Category name is required.' };
  }

  const payload = await postFinanceAction('DELETE_OTHER_INCOME_CATEGORY', {
    category: categoryName,
  });

  if (!payload.success) {
    return { error: apiError(payload, 'Failed to delete category.'), debug: payload };
  }

  await logActivity('DELETE_OTHER_INCOME', {
    entityType: 'Category',
    entityId: categoryName,
    entityName: categoryName,
  }, idToken ?? undefined);

  revalidatePath('/other-income');
  return { success: true };
}

export async function uploadFinanceAttachment(formData: FormData): Promise<{ success: boolean; url?: string; path?: string; fileName?: string; error?: string; debug?: unknown }> {
  await requireAdminAuth();
  const payload = await postFinanceAction('UPLOAD_FINANCE_ATTACHMENT', {}, formData);
  if (!payload.success || !payload.url) {
    return { success: false, error: apiError(payload, 'Failed to upload attachment.'), debug: payload };
  }

  return {
    success: true,
    url: payload.url,
    path: payload.path,
    fileName: payload.file_name,
  };
}
