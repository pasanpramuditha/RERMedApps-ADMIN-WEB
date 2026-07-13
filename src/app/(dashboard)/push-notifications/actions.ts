'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-log';
import { translateText } from '@/ai/flows/translate-flow';
import { getApps } from '../apps/actions';
import { getRegisteredUsers } from '../registered-user/actions';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(65),
  message: z.string().min(1, 'Message is required').max(178),
  imageUrl: z.string().url().optional().or(z.literal('')),
  targetApps: z.array(z.string()).min(1, 'At least one app must be targeted'),
  sendOption: z.enum(['now', 'schedule']).optional(),
  scheduledTime: z.date().optional(),
});

const userNotificationSchema = z.object({
  appId: z.string().min(1, 'Android app is required'),
  email: z.string().email('A valid user email is required'),
  title: z.string().min(1, 'Title is required').max(65),
  message: z.string().min(1, 'Message is required').max(178),
});

const userNotificationTranslationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(65),
  message: z.string().min(1, 'Message is required').max(178),
  targetLanguage: z.string().min(1, 'Target language is required'),
});

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const AUTH_TOKEN_TTL_MS = 60_000;
let cachedPhpAuthToken: string | null = null;
let cachedPhpAuthTokenAt = 0;

type PushAppResult = {
  app_id?: number;
  app_name?: string;
  db_name?: string;
  success?: boolean;
  sent?: number;
  failed?: number;
  skipped?: number;
  errors?: string[];
  error_msg?: string;
};

type PushServerResponse = {
  success?: boolean;
  error_msg?: string;
  sent?: number;
  failed?: number;
  skipped?: number;
  targeted_apps?: number;
  apps?: PushAppResult[];
  raw_response?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

export type PushTargetUser = {
  id: string;
  appId: string;
  appName: string;
  appIcon: string;
  email: string;
  country?: string;
  language: string;
  device: string;
  version: string;
  last_online: string;
  dbName: string;
};

function timestampValue(value: string | undefined | null) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value.replace(' ', 'T')).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function postPushAction(tag: string, body: Record<string, string>): Promise<PushServerResponse> {
  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(await getAuthHeaders()),
    },
    body: new URLSearchParams({
      tag,
      ...body,
    }),
  });

  const raw = await response.text();
  let payload: PushServerResponse;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    const safeRaw = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    payload = {
      success: false,
      error_msg: safeRaw
        ? `Backend returned a non-JSON response: ${safeRaw.slice(0, 220)}`
        : 'Backend returned a non-JSON response.',
      raw_response: raw,
    };
  }

  if (!response.ok && !payload.error_msg) {
    payload.error_msg = `Backend request failed: ${response.status} ${response.statusText}`;
  }

  return {
    ...payload,
    raw_response: raw,
  };
}

function summarizePushResult(result: PushServerResponse) {
  const sent = result.sent ?? 0;
  const failed = result.failed ?? 0;
  const skipped = result.skipped ?? 0;
  const targeted = result.targeted_apps ?? result.apps?.length ?? 0;

  return `Sent ${sent} topic broadcast${sent === 1 ? '' : 's'} across ${targeted} app${targeted === 1 ? '' : 's'}. Failed: ${failed}. Skipped: ${skipped}.`;
}

function firstDetailedError(result: PushServerResponse) {
  if (result.error_msg) {
    return result.error_msg;
  }

  const appError = result.apps?.find((app) => app.error_msg || app.errors?.length);
  if (!appError) {
    return 'Failed to send notification.';
  }

  return appError.error_msg || `${appError.app_name || appError.db_name || 'App'}: ${appError.errors?.[0]}`;
}

function normalizedTargetLanguage(language: string) {
  const normalized = language.trim().toUpperCase();
  return normalized && normalized !== 'N/A' ? normalized : 'EN';
}

export async function prepareUserNotificationTranslation(
  data: z.infer<typeof userNotificationTranslationSchema>,
) {
  await requireAdminAuth();
  const validation = userNotificationTranslationSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  const { title, message } = validation.data;
  const targetLanguage = normalizedTargetLanguage(validation.data.targetLanguage);

  if (targetLanguage === 'EN') {
    return {
      success: true,
      targetLanguage,
      title,
      message,
    };
  }

  try {
    const [translatedTitle, translatedMessage] = await Promise.all([
      translateText({
        text: title,
        sourceLanguage: 'EN',
        targetLanguage,
      }),
      translateText({
        text: message,
        sourceLanguage: 'EN',
        targetLanguage,
      }),
    ]);

    if (translatedTitle.translation.length > 65) {
      return {
        error: `Translated title is ${translatedTitle.translation.length} characters. Shorten the English title so the translated title stays within 65 characters.`,
      };
    }

    if (translatedMessage.translation.length > 178) {
      return {
        error: `Translated message is ${translatedMessage.translation.length} characters. Shorten the English message so the translated message stays within 178 characters.`,
      };
    }

    return {
      success: true,
      targetLanguage,
      title: translatedTitle.translation,
      message: translatedMessage.translation,
    };
  } catch (error: any) {
    return {
      error: error?.message || 'Failed to translate notification.',
    };
  }
}

export async function sendNotification(data: z.infer<typeof notificationSchema>) {
  await requireAdminAuth();
  const validation = notificationSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  const notification = validation.data;

  if (notification.sendOption === 'schedule') {
    return {
      error: 'Scheduled sending is not enabled yet. Please send the notification now.',
    };
  }

  try {
    const result = await postPushAction('SEND_ADMIN_PUSH_NOTIFICATION', {
      title: notification.title,
      message: notification.message,
      image_url: notification.imageUrl || '',
      target_app_ids: JSON.stringify(notification.targetApps),
    });

    if (!result.success) {
      return {
        error: firstDetailedError(result),
        debug: result,
      };
    }

    await logActivity('SEND_NOTIFICATION', {
      entityType: 'Push Notification',
      entityId: `notification-${Date.now()}`,
      entityName: notification.title,
      changes: {
        message: notification.message,
        targetCount: notification.targetApps.length,
        sent: result.sent ?? 0,
        failed: result.failed ?? 0,
        skipped: result.skipped ?? 0,
      },
    });

    revalidatePath('/push-notifications');

    return {
      success: true,
      summary: summarizePushResult(result),
      result,
    };
  } catch (error: any) {
    return {
      error: error?.message || 'Failed to send notification.',
    };
  }
}

export async function sendUserNotification(data: z.infer<typeof userNotificationSchema>) {
  await requireAdminAuth();
  const validation = userNotificationSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  const notification = validation.data;

  try {
    const result = await postPushAction('SEND_ANDROID_USER_PUSH_NOTIFICATION', {
      app_id: notification.appId,
      email: notification.email,
      title: notification.title,
      message: notification.message,
    });

    if (!result.success) {
      return {
        error: firstDetailedError(result),
        debug: result,
      };
    }

    await logActivity('SEND_NOTIFICATION', {
      entityType: 'Push Notification',
      entityId: `notification-${Date.now()}`,
      entityName: notification.title,
      changes: {
        message: notification.message,
        targetEmail: notification.email,
        targetAppId: notification.appId,
        sent: result.sent ?? 0,
        failed: result.failed ?? 0,
        skipped: result.skipped ?? 0,
      },
    });

    revalidatePath('/push-notifications');

    return {
      success: true,
      summary: `Queued for ${notification.email}.`,
      result,
    };
  } catch (error: any) {
    return {
      error: error?.message || 'Failed to send notification.',
    };
  }
}

export async function searchAndroidPushUsers(email: string): Promise<{ users: PushTargetUser[]; error?: string }> {
  await requireAdminAuth();
  const query = email.trim();
  if (!z.string().email().safeParse(query).success) {
    return { users: [], error: 'Enter a valid Android user email.' };
  }

  const apps = await getApps();
  const androidApps = apps.filter((app) => app.isActive && app.os.toLowerCase().includes('android'));
  const result = await getRegisteredUsers(undefined, query, androidApps);

  if (result.error) {
    return { users: [], error: result.error };
  }

  const users = result.users.map((user) => ({
      id: user.id,
      appId: user.appId,
      appName: user.appName,
      appIcon: user.appIcon,
      email: user.email,
      country: user.country,
      language: user.language,
      device: user.device,
      version: user.version,
      last_online: user.last_online,
      dbName: user.dbName,
    }))
    .sort((a, b) => timestampValue(b.last_online) - timestampValue(a.last_online));

  return { users };
}
