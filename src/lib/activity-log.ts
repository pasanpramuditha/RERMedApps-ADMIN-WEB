'use server';

import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';
import { getPhpBackendAuthHeaders } from '@/lib/server-auth';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

export type ActivityAction =
  | 'CREATE_APP' | 'UPDATE_APP' | 'DELETE_APP'
  | 'CREATE_IN_APP_AD' | 'UPDATE_IN_APP_AD' | 'DELETE_IN_APP_AD' | 'ACTIVATE_IN_APP_AD'
  | 'CREATE_AD_TEMPLATE' | 'UPDATE_AD_TEMPLATE' | 'DELETE_AD_TEMPLATE'
  | 'ADD_AD_EXPENSE' | 'UPDATE_AD_EXPENSE' | 'DELETE_AD_EXPENSE'
  | 'ADD_APP_INCOME' | 'UPDATE_APP_INCOME' | 'DELETE_APP_INCOME'
  | 'ADD_EMPLOYEE_PAYMENT' | 'UPDATE_EMPLOYEE_PAYMENT' | 'DELETE_EMPLOYEE_PAYMENT'
  | 'ADD_OTHER_EXPENSE' | 'UPDATE_OTHER_EXPENSE' | 'DELETE_OTHER_EXPENSE'
  | 'RENAME_EXPENSE_CATEGORY'
  | 'ADD_OTHER_INCOME' | 'UPDATE_OTHER_INCOME' | 'DELETE_OTHER_INCOME'
  | 'RENAME_INCOME_CATEGORY'
  | 'ADD_COMMON_LINK' | 'UPDATE_COMMON_LINK' | 'DELETE_COMMON_LINK'
  | 'ADD_CASH_ACCOUNT' | 'UPDATE_CASH_ACCOUNT' | 'DELETE_CASH_ACCOUNT'
  | 'ADD_FIXED_DEPOSIT' | 'UPDATE_FIXED_DEPOSIT' | 'DELETE_FIXED_DEPOSIT'
  | 'ADD_RECEIVED_PAYMENT' | 'UPDATE_RECEIVED_PAYMENT' | 'DELETE_RECEIVED_PAYMENT'
  | 'ADD_PAYOUT' | 'UPDATE_PAYOUT' | 'DELETE_PAYOUT'
  | 'ADD_FINANCE_EXPENSE' | 'UPDATE_FINANCE_EXPENSE' | 'DELETE_FINANCE_EXPENSE'
  | 'SEND_FINANCE_INVOICE'
  | 'CREATE_USER' | 'UPDATE_USER' | 'UPDATE_USER_STATUS'
  | 'SAVE_GLOBAL_SETTINGS'
  | 'UPLOAD_APPLE_SALES_REPORT' | 'UPLOAD_APPLE_INSTALL_REPORT' | 'UPLOAD_APPLE_SUBSCRIPTION_REPORT'
  | 'UPLOAD_ANDROID_SALES_REPORT' | 'UPLOAD_ANDROID_INSTALL_REPORT' | 'UPLOAD_ANDROID_SUBSCRIPTION_REPORT'
  | 'UPLOAD_ADMOB_REPORT' | 'UPLOAD_GOOGLE_ADS_REPORT'
  | 'SEND_REPLY' | 'UPDATE_FEEDBACK_STATUS'
  | 'UPDATE_USER_PERMISSIONS'
  | 'SEND_NOTIFICATION'
  | 'UPDATE_AD_SETTINGS'
  | 'UPLOAD_BANK_STATEMENT';

type OperationType = 'insert' | 'update' | 'delete' | 'action';

interface LogDetails {
  entityType: string;
  entityId: string;
  entityName?: string;
  changes?: unknown;
}

type ActivityLogApiResponse = {
  success?: boolean;
  error_msg?: string;
  logs?: Array<{
    id?: string | number;
    user_email?: string;
    user_uid?: string;
    action?: string;
    operation?: OperationType;
    entity_type?: string;
    entity_id?: string;
    entity_name?: string;
    changes_json?: string;
    ip_address?: string;
    created_at?: string;
  }>;
};

async function getCurrentUser(idToken?: string) {
  if (!idToken) {
    return { email: 'system@unknown', uid: '' };
  }

  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return { email: decodedToken.email || 'system@unknown', uid: decodedToken.uid || '' };
  } catch (error) {
    console.error('Error verifying token for activity log:', error);
    return { email: 'system@error', uid: '' };
  }
}

function getOperation(action: string): OperationType {
  if (action.includes('DELETE')) return 'delete';
  if (action.includes('UPDATE') || action.includes('RENAME') || action.includes('SAVE')) return 'update';
  if (action.includes('CREATE') || action.includes('ADD')) return 'insert';
  return 'action';
}

function humanizeAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTimestamp(value?: string) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postActivityLogApi(tag: string, body: Record<string, string> = {}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      tag,
      db: 'MAIN',
      ...body,
    }),
  });

  const raw = await response.text();
  try {
    return JSON.parse(raw) as ActivityLogApiResponse;
  } catch {
    return {
      success: false,
      error_msg: raw || 'PHP returned a non-JSON response.',
    };
  }
}

export async function logActivity(action: ActivityAction, details: LogDetails, idToken?: string) {
  try {
    const user = await getCurrentUser(idToken);
    const headerStore = await headers();

    await postActivityLogApi('SAVE_ACTIVITY_LOG', {
      user_email: user.email,
      user_uid: user.uid || '',
      action,
      operation: getOperation(action),
      entity_type: details.entityType,
      entity_id: details.entityId,
      entity_name: details.entityName || details.entityId,
      changes_json: details.changes === undefined ? '' : JSON.stringify(details.changes),
      ip_address: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      user_agent: headerStore.get('user-agent') || '',
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export interface ActivityLog {
  id: string;
  userEmail: string;
  userUid: string;
  action: string;
  rawAction: string;
  operation: OperationType;
  entityType: string;
  entityId: string;
  entityName: string;
  timestamp: string;
  ipAddress?: string;
  changes?: string;
}

export async function listActivityLogs(): Promise<ActivityLog[]> {
  try {
    const payload = await postActivityLogApi('GET_ACTIVITY_LOGS', { limit: '200' });
    if (!payload.success || !Array.isArray(payload.logs)) {
      return [];
    }

    return payload.logs.map((row) => ({
      id: String(row.id ?? ''),
      userEmail: String(row.user_email || 'Unknown User'),
      userUid: String(row.user_uid || ''),
      rawAction: String(row.action || ''),
      action: humanizeAction(String(row.action || '')),
      operation: row.operation || getOperation(String(row.action || '')),
      entityType: String(row.entity_type || ''),
      entityId: String(row.entity_id || ''),
      entityName: String(row.entity_name || row.entity_id || ''),
      timestamp: formatTimestamp(row.created_at),
      ipAddress: String(row.ip_address || ''),
      changes: String(row.changes_json || ''),
    }));
  } catch (error) {
    console.error('Error listing activity logs:', error);
    return [];
  }
}
