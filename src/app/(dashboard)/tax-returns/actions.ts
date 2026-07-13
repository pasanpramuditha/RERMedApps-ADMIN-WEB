'use server';

import { revalidatePath } from 'next/cache';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

export type TaxEntryType = 'Income' | 'Expense';
export type TaxStatus = 'Ready' | 'Review' | 'Pending';

export type TaxLedgerEntry = {
  id: string;
  taxYear: string;
  transactionDate: string;
  title: string;
  category: string;
  subcategory?: string;
  amount: number;
  currency: 'LKR' | 'USD';
  entryType: TaxEntryType;
  source: string;
  status: TaxStatus;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  gmailMessageId?: string;
  gmailAttachmentId?: string;
  gmailPartId?: string;
  parsedInvoiceNo?: string;
  parsedInvoiceDate?: string;
  parsedVendor?: string;
  parsedTaxAmount?: number | null;
  parsedInvoiceAmount?: number | null;
  parsedCurrency?: string;
  parsedPaymentDetails?: string;
};

export type TaxCategory = {
  id: string;
  type: TaxEntryType;
  name: string;
  ruleKeywords?: string;
  subcategories: Array<{ id: string; name: string; ruleKeywords?: string }>;
};

export type TaxEmailQueueItem = {
  id: string;
  receivedAt: string;
  senderEmail: string;
  emailSubject?: string;
  subject: string;
  bodyPreview?: string;
  suggestedType: TaxEntryType;
  suggestedCategory: string;
  suggestedSubcategory?: string;
  amount: number;
  currency: 'LKR' | 'USD';
  registryDestination?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  ledgerId?: string;
  gmailMessageId?: string;
  gmailAttachmentId?: string;
  gmailPartId?: string;
  gmailLabel?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentCount?: number;
  parsedInvoiceNo?: string;
  parsedInvoiceDate?: string;
  parsedVendor?: string;
  parsedTaxAmount?: number | null;
  parsedInvoiceAmount?: number | null;
  parsedCurrency?: string;
  parsedPaymentDetails?: string;
  parseConfidence?: number | null;
};

export type TaxWorkspace = {
  ledger: TaxLedgerEntry[];
  categories: TaxCategory[];
  emailQueue: TaxEmailQueueItem[];
};

type ApiPayload = {
  success?: boolean;
  error_msg?: string;
  message?: string;
  ledger?: TaxLedgerEntry[];
  categories?: TaxCategory[];
  email_queue?: TaxEmailQueueItem[];
  entry?: TaxLedgerEntry;
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
  status?: number;
  raw_response?: string;
  email?: TaxEmailQueueItem;
  textPreview?: string;
  htmlPreview?: string;
  nestedAttachments?: Array<{ fileName: string; mimeType: string; dataUrl: string }>;
  inserted?: number;
  skipped?: number;
  found?: number;
  searched?: unknown[];
  errors?: unknown[];
  reset?: { mode?: string; queueCleared?: number; messagesCleared?: number; errors?: unknown[] };
  parsed?: TaxInvoiceExtractionResult['parsed'];
  imap_move_status?: string;
  imap_move_error?: string;
  uploadcare_delete_status?: string;
  uploadcare_delete_error?: string;
};

type ActionResult = { success?: boolean; error?: string; debug?: unknown };
type SyncResult = ActionResult & {
  inserted?: number;
  skipped?: number;
  found?: number;
  searched?: string[];
  errors?: string[];
  reset?: { mode?: string; queueCleared?: number; messagesCleared?: number; errors?: string[] };
  emailQueue?: TaxEmailQueueItem[];
};
type GmailLabelResult = { gmailLabelName?: string; gmailLabelError?: string; gmailRemovedLabels?: string[] };
type ImapMoveResult = { imapMoveStatus?: string; imapMoveError?: string };
type UploadcareDeleteResult = { uploadcareDeleteStatus?: string; uploadcareDeleteError?: string };
export type TaxAttachmentPreview = ActionResult & {
  fileName?: string;
  mimeType?: string;
  dataUrl?: string;
  textPreview?: string;
  htmlPreview?: string;
  nestedAttachments?: Array<{ fileName: string; mimeType: string; dataUrl: string }>;
};

export type TaxInvoiceExtractionResult = ActionResult & {
  email?: TaxEmailQueueItem;
  emailQueue?: TaxEmailQueueItem[];
  parsed?: {
    invoiceNo?: string;
    invoiceDate?: string;
    vendor?: string;
    amount?: number | null;
    currency?: string;
    taxAmount?: number | null;
    paymentDetails?: string;
    paymentSource?: string;
    confidence?: number | null;
    engine?: string;
    veryfiStatus?: string;
    ocrSpaceStatus?: string;
  };
};

function decodeDataUrlText(dataUrl: string) {
  const marker = ';base64,';
  const index = dataUrl.indexOf(marker);
  if (index === -1) return '';
  try {
    return Buffer.from(dataUrl.slice(index + marker.length), 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function decodeQuotedPrintable(value: string) {
  return value
    .replace(/=\r?\n/g, '')
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeMimeBody(headers: string, body: string) {
  const encoding = /content-transfer-encoding:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim().toLowerCase() || '';
  const cleaned = body.replace(/\r?\n--[^\r\n]+--?\s*$/g, '').trim();
  if (encoding === 'base64') {
    try {
      return Buffer.from(cleaned.replace(/\s+/g, ''), 'base64').toString('utf8');
    } catch {
      return cleaned;
    }
  }
  if (encoding === 'quoted-printable') return decodeQuotedPrintable(cleaned);
  return cleaned;
}

function encodeMimeBodyBase64(headers: string, body: string) {
  const encoding = /content-transfer-encoding:\s*([^\r\n]+)/i.exec(headers)?.[1]?.trim().toLowerCase() || '';
  const cleaned = body.replace(/\r?\n--[^\r\n]+--?\s*$/g, '').trim();
  if (encoding === 'base64') return cleaned.replace(/\s+/g, '');
  if (encoding === 'quoted-printable') return Buffer.from(decodeQuotedPrintable(cleaned), 'utf8').toString('base64');
  return Buffer.from(cleaned, 'utf8').toString('base64');
}

function splitHeaderBody(part: string) {
  const match = /\r?\n\r?\n/.exec(part);
  if (!match || match.index < 0) return { headers: '', body: part };
  return {
    headers: part.slice(0, match.index),
    body: part.slice(match.index + match[0].length),
  };
}

function unfoldHeaders(headers: string) {
  return headers.replace(/\r?\n[ \t]+/g, ' ');
}

function getMimeBoundary(headers: string) {
  return /boundary="?([^";\r\n]+)"?/i.exec(headers)?.[1] || '';
}

function getMimeType(headers: string) {
  return /content-type:\s*([^;\r\n]+)/i.exec(headers)?.[1]?.trim().toLowerCase() || 'application/octet-stream';
}

function getMimeFilename(headers: string) {
  return /filename\*?=(?:UTF-8''|")?([^";\r\n]+)/i.exec(headers)?.[1]?.replace(/"$/g, '').trim() || '';
}

function collectMimeParts(raw: string): Array<{ headers: string; body: string }> {
  const root = splitHeaderBody(raw);
  const rootHeaders = unfoldHeaders(root.headers);
  const boundary = getMimeBoundary(rootHeaders);
  if (!boundary) return [root];

  const delimiter = `--${boundary}`;
  const directParts = root.body
    .split(delimiter)
    .map((part) => part.replace(/^\r?\n/, '').replace(/\r?\n$/, ''))
    .filter((part) => part.trim() && part.trim() !== '--')
    .map(splitHeaderBody);

  return directParts.flatMap((part) => {
    const headers = unfoldHeaders(part.headers);
    if (/content-type:\s*multipart\//i.test(headers)) {
      return collectMimeParts(`${part.headers}\r\n\r\n${part.body}`);
    }
    return [part];
  });
}

function extractMimePart(raw: string, mime: string) {
  const parts = collectMimeParts(raw);
  for (const part of parts) {
    const headers = unfoldHeaders(part.headers);
    if (new RegExp(`content-type:\\s*${mime.replace('/', '\\/')}(?:\\s*;|\\s|$)`, 'i').test(headers)) {
      return decodeMimeBody(headers, part.body);
    }
  }
  return '';
}

function sanitizeEmailHtml(html: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '');
  if (!/<(html|body|table|div|p|span|h1|h2|h3|br|img|a)\b/i.test(cleaned)) return '';
  return cleaned;
}

function parseEmlPreview(raw: string): { htmlPreview: string; textPreview: string; nestedAttachments: Array<{ fileName: string; mimeType: string; dataUrl: string }> } {
  const nestedAttachments = collectMimeParts(raw)
    .map((part) => {
      const headers = unfoldHeaders(part.headers);
      const fileName = getMimeFilename(headers);
      const mimeType = getMimeType(headers);
      const isAttachment = /content-disposition:\s*attachment/i.test(headers) || Boolean(fileName);
      if (!isAttachment || !fileName || /message\/rfc822/i.test(mimeType)) return null;
      const base64 = encodeMimeBodyBase64(headers, part.body);
      if (!base64) return null;
      return { fileName, mimeType, dataUrl: `data:${mimeType};base64,${base64}` };
    })
    .filter((item): item is { fileName: string; mimeType: string; dataUrl: string } => Boolean(item));

  const html = extractMimePart(raw, 'text/html');
  if (html) {
    const sanitized = sanitizeEmailHtml(html);
    if (sanitized) return { htmlPreview: sanitized, textPreview: '', nestedAttachments };
  }

  const plain = extractMimePart(raw, 'text/plain');
  if (plain) return { htmlPreview: '', textPreview: plain.slice(0, 20000), nestedAttachments };

  const bodyStart = raw.search(/\r?\n\r?\n/);
  const body = bodyStart >= 0 ? raw.slice(bodyStart).trim() : raw;
  return { htmlPreview: '', textPreview: body.slice(0, 20000), nestedAttachments };
}

function summarizeRawResponse(raw: string) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postTax(tag: string, body: Record<string, string> = {}): Promise<ApiPayload> {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers,
    body: new URLSearchParams({ tag, db: 'MAIN', ...body }),
  });

  const raw = await response.text();
  try {
    return { ...(raw ? JSON.parse(raw) : {}), status: response.status, raw_response: raw };
  } catch {
    const summary = summarizeRawResponse(raw);
    return {
      success: false,
      error_msg: `PHP returned a non-JSON response. HTTP ${response.status}${summary ? `: ${summary}` : ''}`,
      status: response.status,
      raw_response: raw,
    };
  }
}

function apiError(payload: ApiPayload, fallback: string) {
  return payload.error_msg || payload.message || fallback;
}

const DEFAULT_TAX_GMAIL_APPROVED_LABEL = 'Tax/Approved';
const DEFAULT_TAX_GMAIL_DUPLICATE_LABEL = 'Tax/Duplicate';
const DEFAULT_TAX_GMAIL_DELETED_LABEL = 'Tax/Deleted';

function cleanGmailLabelName(value: unknown, fallback = '') {
  return String(value || '').trim() || fallback;
}

async function markGmailMessageApproved(gmailMessageId: string): Promise<GmailLabelResult> {
  void gmailMessageId;
  return {};
}

async function markGmailMessageDuplicate(gmailMessageId: string): Promise<GmailLabelResult> {
  void gmailMessageId;
  return {};
}

async function markGmailMessageDeleted(gmailMessageId: string): Promise<GmailLabelResult> {
  void gmailMessageId;
  return {};
}

async function removeGmailMessageApprovedLabel(gmailMessageId: string): Promise<GmailLabelResult> {
  void gmailMessageId;
  return {};
}

function extractDriveFileId(value?: string) {
  const text = String(value || '').trim();
  const fileMatch = text.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
  if (fileMatch?.[1]) return fileMatch[1];

  try {
    const url = new URL(text);
    if (url.hostname.includes('drive.google.com')) {
      return url.searchParams.get('id') || '';
    }
  } catch {
    return '';
  }

  return '';
}

function inferMimeTypeFromName(fileName?: string) {
  const lower = String(fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

function bufferFromMediaData(data: unknown) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (typeof data === 'string') return Buffer.from(data, 'binary');
  return Buffer.from([]);
}

export async function getTaxWorkspace(taxYear: string): Promise<TaxWorkspace> {
  await requireAdminAuth();
  const payload = await postTax('GET_TAX_WORKSPACE', { tax_year: taxYear });
  return {
    ledger: payload.success && Array.isArray(payload.ledger) ? payload.ledger : [],
    categories: payload.success && Array.isArray(payload.categories) ? payload.categories : [],
    emailQueue: payload.success && Array.isArray(payload.email_queue) ? payload.email_queue : [],
  };
}

export async function saveTaxLedgerEntry(data: Omit<TaxLedgerEntry, 'id' | 'source'> & { id?: string }): Promise<ActionResult> {
  await requireAdminAuth();
  if (!data.taxYear || !data.transactionDate || !data.title || !data.category || !data.amount || data.amount <= 0) {
    return { error: 'Required tax entry fields are missing.' };
  }

  const payload = await postTax('SAVE_TAX_LEDGER_ENTRY', {
    ...(data.id ? { id: data.id } : {}),
    tax_year: data.taxYear,
    transaction_date: data.transactionDate,
    title: data.title,
    category: data.category,
    subcategory: data.subcategory || '',
    amount: String(data.amount),
    currency: data.currency,
    entry_type: data.entryType,
    status: data.status,
    notes: data.notes || '',
    attachment_name: data.attachmentName || '',
  });

  if (!payload.success) return { error: apiError(payload, 'Failed to save tax ledger entry.'), debug: payload };
  revalidatePath('/tax-returns');
  return { success: true };
}

export async function deleteTaxLedgerEntry(entry: string | Pick<TaxLedgerEntry, 'id' | 'gmailMessageId'>): Promise<ActionResult & GmailLabelResult & ImapMoveResult & UploadcareDeleteResult> {
  await requireAdminAuth();
  const id = typeof entry === 'string' ? entry : entry.id;
  const gmailMessageId = typeof entry === 'string' ? '' : entry.gmailMessageId || '';
  const payload = await postTax('DELETE_TAX_LEDGER_ENTRY', { id });
  if (!payload.success) return { error: apiError(payload, 'Failed to delete tax ledger entry.'), debug: payload };
  const gmailLabelResult = await removeGmailMessageApprovedLabel(gmailMessageId);
  revalidatePath('/tax-returns');
  return {
    success: true,
    ...gmailLabelResult,
    imapMoveStatus: String(payload.imap_move_status || ''),
    imapMoveError: String(payload.imap_move_error || ''),
    uploadcareDeleteStatus: String(payload.uploadcare_delete_status || ''),
    uploadcareDeleteError: String(payload.uploadcare_delete_error || ''),
  };
}

export async function saveTaxCategory(type: TaxEntryType, name: string, id = '', ruleKeywords = ''): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postTax('SAVE_TAX_CATEGORY', { id, type, name, rule_keywords: ruleKeywords });
  if (!payload.success) return { error: apiError(payload, 'Failed to save category.'), debug: payload };
  revalidatePath('/tax-returns');
  return { success: true };
}

export async function deleteTaxCategory(id: string): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postTax('DELETE_TAX_CATEGORY', { id });
  if (!payload.success) return { error: apiError(payload, 'Failed to delete category.'), debug: payload };
  revalidatePath('/tax-returns');
  return { success: true };
}

export async function saveTaxSubcategory(categoryId: string, name: string, ruleKeywords = '', id = ''): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postTax('SAVE_TAX_SUBCATEGORY', { id, category_id: categoryId, name, rule_keywords: ruleKeywords });
  if (!payload.success) return { error: apiError(payload, 'Failed to save subcategory.'), debug: payload };
  revalidatePath('/tax-returns');
  return { success: true };
}

export async function deleteTaxSubcategory(id: string): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postTax('DELETE_TAX_SUBCATEGORY', { id });
  if (!payload.success) return { error: apiError(payload, 'Failed to delete subcategory.'), debug: payload };
  revalidatePath('/tax-returns');
  return { success: true };
}

export async function simulateTaxEmail(): Promise<ActionResult> {
  await requireAdminAuth();
  const payload = await postTax('SIMULATE_TAX_EMAIL');
  if (!payload.success) return { error: apiError(payload, 'Failed to simulate tax email.'), debug: payload };
  revalidatePath('/tax-returns');
  return { success: true };
}

export async function approveTaxEmail(mail: TaxEmailQueueItem, taxYear: string): Promise<ActionResult> {
  await requireAdminAuth();
  const numericId = /^\d+$/.test(mail.id) ? mail.id : '0';
  const payload = await postTax('APPROVE_TAX_EMAIL', {
    id: numericId,
    tax_year: taxYear,
    received_at: mail.receivedAt,
    subject: mail.subject,
    body_preview: mail.bodyPreview || '',
    suggested_type: mail.suggestedType,
    suggested_category: mail.suggestedCategory,
    suggested_subcategory: mail.suggestedSubcategory || '',
    amount: String(mail.amount),
    currency: mail.currency,
    registry_destination: mail.registryDestination || '',
    gmail_message_id: mail.gmailMessageId || '',
    gmail_attachment_id: mail.gmailAttachmentId || '',
    attachment_name: mail.attachmentName || '',
    attachment_mime: mail.attachmentMime || '',
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to approve tax email.'), debug: payload };
  const gmailLabelResult = await markGmailMessageApproved(mail.gmailMessageId || '');
  revalidatePath('/tax-returns');
  return { success: true, ...gmailLabelResult };
}

export async function approveTaxEmailGroup(
  gmailMessageId: string,
  ids: string[],
  taxYear: string,
  rows: Array<TaxEmailQueueItem & { uploadEvidence?: boolean }> = []
): Promise<ActionResult & GmailLabelResult & { ledger?: TaxLedgerEntry[]; emailQueue?: TaxEmailQueueItem[]; driveErrors?: string[]; driveUploadedCount?: number; driveStatuses?: string[] }> {
  await requireAdminAuth();
  const numericIds = ids.filter((id) => /^\d+$/.test(id));
  if (!gmailMessageId || (numericIds.length === 0 && rows.length === 0)) {
    return { error: 'Select every child item before approving the email.' };
  }

  const payload = await postTax('APPROVE_TAX_EMAIL_GROUP', {
    gmail_message_id: gmailMessageId,
    ids: JSON.stringify(numericIds),
    rows: JSON.stringify(rows),
    tax_year: taxYear,
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to approve email group.'), debug: payload };
  const gmailLabelResult = await markGmailMessageApproved(gmailMessageId);
  revalidatePath('/tax-returns');
  return {
    success: true,
    ...gmailLabelResult,
    ledger: Array.isArray(payload.ledger) ? payload.ledger : undefined,
    emailQueue: Array.isArray(payload.email_queue) && payload.email_queue.length > 0 ? payload.email_queue : undefined,
    driveErrors: Array.isArray((payload as any).drive_errors) ? (payload as any).drive_errors : [],
    driveUploadedCount: Number((payload as any).drive_uploaded_count || 0),
    driveStatuses: Array.isArray((payload as any).drive_statuses) ? (payload as any).drive_statuses : [],
  };
}

export async function updateTaxEmail(data: Pick<TaxEmailQueueItem, 'id' | 'subject' | 'bodyPreview' | 'suggestedType' | 'suggestedCategory' | 'suggestedSubcategory' | 'amount' | 'currency' | 'registryDestination'>): Promise<ActionResult> {
  await requireAdminAuth();
  if (!data.id || !data.subject || !data.suggestedType || !data.suggestedCategory || data.amount < 0) {
    return { error: 'Required email approval fields are missing.' };
  }

  const payload = await postTax('UPDATE_TAX_EMAIL', {
    id: data.id,
    subject: data.subject,
    body_preview: data.bodyPreview || '',
    suggested_type: data.suggestedType,
    suggested_category: data.suggestedCategory,
    suggested_subcategory: data.suggestedSubcategory || '',
    amount: String(data.amount),
    currency: data.currency,
    registry_destination: data.registryDestination || '',
  });

  if (!payload.success) return { error: apiError(payload, 'Failed to update email approval.'), debug: payload };
  revalidatePath('/tax-returns');
  return { success: true };
}

export async function extractTaxEmailInvoiceWithDocumentAi(mail: Pick<TaxEmailQueueItem, 'id' | 'gmailMessageId' | 'gmailAttachmentId' | 'attachmentName' | 'attachmentMime' | 'amount' | 'currency'>): Promise<TaxInvoiceExtractionResult> {
  await requireAdminAuth();
  const payload = await postTax('EXTRACT_TAX_EMAIL_INVOICE', {
    id: /^\d+$/.test(mail.id) ? mail.id : '0',
    gmail_message_id: mail.gmailMessageId || '',
    gmail_attachment_id: mail.gmailAttachmentId || '',
    attachment_name: mail.attachmentName || '',
    attachment_mime: mail.attachmentMime || '',
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to extract tax document values.'), debug: payload };
  revalidatePath('/tax-returns');
  return {
    success: true,
    email: payload.email,
    emailQueue: Array.isArray(payload.email_queue) ? payload.email_queue : undefined,
    parsed: payload.parsed,
  };
}

export async function getTaxEmailAttachment(mail: Pick<TaxEmailQueueItem, 'id' | 'gmailMessageId' | 'gmailAttachmentId' | 'attachmentName' | 'attachmentMime'>): Promise<TaxAttachmentPreview> {
  await requireAdminAuth();
  const payload = await postTax('GET_TAX_EMAIL_ATTACHMENT', {
    id: /^\d+$/.test(mail.id) ? mail.id : '0',
    gmail_message_id: mail.gmailMessageId || '',
    gmail_attachment_id: mail.gmailAttachmentId || '',
    attachment_name: mail.attachmentName || '',
    attachment_mime: mail.attachmentMime || '',
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to load email attachment.'), debug: payload };
  return {
    success: true,
    fileName: String(payload.fileName || mail.attachmentName || 'attachment'),
    mimeType: String(payload.mimeType || mail.attachmentMime || 'application/octet-stream'),
    dataUrl: String(payload.dataUrl || ''),
    textPreview: typeof payload.textPreview === 'string' ? payload.textPreview : undefined,
    htmlPreview: typeof payload.htmlPreview === 'string' ? payload.htmlPreview : undefined,
    nestedAttachments: Array.isArray(payload.nestedAttachments) ? payload.nestedAttachments : undefined,
  };
}

export async function getTaxLedgerAttachment(row: Pick<TaxLedgerEntry, 'id' | 'title' | 'attachmentUrl' | 'attachmentName' | 'gmailMessageId' | 'gmailAttachmentId'>): Promise<TaxAttachmentPreview> {
  await requireAdminAuth();
  const fileName = row.attachmentName || `${row.title || 'tax-ledger-attachment'}.pdf`;

  if (row.gmailMessageId && row.gmailAttachmentId) {
    return getTaxEmailAttachment({
      id: row.id || '0',
      gmailMessageId: row.gmailMessageId,
      gmailAttachmentId: row.gmailAttachmentId,
      attachmentName: fileName,
      attachmentMime: inferMimeTypeFromName(fileName),
    });
  }

  if (!row.attachmentUrl) {
    return { error: 'No PDF attachment is available for this ledger row.' };
  }

  const driveFileId = extractDriveFileId(row.attachmentUrl);
  if (driveFileId) {
    return { error: 'Google Drive attachment access has been removed from this project.' };
  }

  try {
    const response = await fetch(row.attachmentUrl, { cache: 'no-store' });
    if (!response.ok) {
      return { error: `Attachment URL returned HTTP ${response.status}.` };
    }
    const mimeType = response.headers.get('content-type') || inferMimeTypeFromName(fileName);
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      success: true,
      fileName,
      mimeType,
      dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load attachment URL.';
    return { error: message };
  }
}

export async function deleteTaxEmail(mail: string | Pick<TaxEmailQueueItem, 'id' | 'gmailMessageId'>): Promise<ActionResult & GmailLabelResult & { emailQueue?: TaxEmailQueueItem[]; imapMoveStatus?: string; imapMoveError?: string }> {
  await requireAdminAuth();
  const id = typeof mail === 'string' ? mail : mail.id;
  const gmailMessageId = typeof mail === 'string' ? '' : mail.gmailMessageId || '';

  let gmailLabelResult: GmailLabelResult = {};
  if (gmailMessageId) {
    gmailLabelResult = await markGmailMessageDeleted(gmailMessageId);
    if (gmailLabelResult.gmailLabelError) {
      return {
        error: `Email source delete marker update failed: ${gmailLabelResult.gmailLabelError}`,
        ...gmailLabelResult,
      };
    }
  }

  const payload = await postTax('DELETE_TAX_EMAIL', {
    id: /^\d+$/.test(id) ? id : '0',
    gmail_message_id: gmailMessageId,
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to delete email item.'), debug: payload, ...gmailLabelResult };
  revalidatePath('/tax-returns');
  return {
    success: true,
    ...gmailLabelResult,
    imapMoveStatus: typeof payload.imap_move_status === 'string' ? payload.imap_move_status : undefined,
    imapMoveError: typeof payload.imap_move_error === 'string' ? payload.imap_move_error : undefined,
    emailQueue: Array.isArray(payload.email_queue) ? payload.email_queue : undefined,
  };
}

export async function markTaxEmailDuplicate(mail: Pick<TaxEmailQueueItem, 'id' | 'gmailMessageId'>): Promise<ActionResult & GmailLabelResult & { emailQueue?: TaxEmailQueueItem[]; imapMoveStatus?: string; imapMoveError?: string }> {
  await requireAdminAuth();
  const gmailMessageId = mail.gmailMessageId || '';
  if (!gmailMessageId) {
    return { error: 'Email message id is required before marking a duplicate.' };
  }

  const gmailLabelResult = await markGmailMessageDuplicate(gmailMessageId);
  if (gmailLabelResult.gmailLabelError) {
    return {
      error: `Email source duplicate marker update failed: ${gmailLabelResult.gmailLabelError}`,
      ...gmailLabelResult,
    };
  }

  const payload = await postTax('MARK_TAX_EMAIL_DUPLICATE', {
    id: /^\d+$/.test(mail.id) ? mail.id : '0',
    gmail_message_id: gmailMessageId,
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to mark email as duplicate.'), debug: payload, ...gmailLabelResult };
  revalidatePath('/tax-returns');
  return {
    success: true,
    ...gmailLabelResult,
    imapMoveStatus: typeof payload.imap_move_status === 'string' ? payload.imap_move_status : undefined,
    imapMoveError: typeof payload.imap_move_error === 'string' ? payload.imap_move_error : undefined,
    emailQueue: Array.isArray(payload.email_queue) ? payload.email_queue : undefined,
  };
}

export async function saveTaxGmailSettings(data: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  mailbox: string;
  incomeLabel: string;
  expenseLabel: string;
}): Promise<ActionResult> {
  await requireAdminAuth();
  void data;
  return { error: 'Tax Gmail settings have been removed from this project.' };
}

export async function syncTaxGmailEmails(limit = 100): Promise<SyncResult> {
  await requireAdminAuth();
  const payload = await postTax('SYNC_TAX_IMAP_EMAILS', {
    limit: String(Math.max(1, Math.min(500, Math.trunc(limit) || 100))),
  });
  if (!payload.success) return { error: apiError(payload, 'Failed to sync tax email inbox.'), debug: payload };
  revalidatePath('/tax-returns');
  return {
    success: true,
    inserted: Number(payload.inserted || 0),
    skipped: Number(payload.skipped || 0),
    found: Number(payload.found || 0),
    searched: Array.isArray(payload.searched) ? payload.searched.map(String) : undefined,
    errors: Array.isArray(payload.errors) ? payload.errors.map(String) : undefined,
    reset: payload.reset && typeof payload.reset === 'object' ? {
      mode: String(payload.reset.mode || ''),
      queueCleared: Number(payload.reset.queueCleared || 0),
      messagesCleared: Number(payload.reset.messagesCleared || 0),
      errors: Array.isArray(payload.reset.errors) ? payload.reset.errors.map(String) : undefined,
    } : undefined,
    emailQueue: Array.isArray(payload.email_queue) ? payload.email_queue : undefined,
  };
}
