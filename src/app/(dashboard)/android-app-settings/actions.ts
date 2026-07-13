'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getAppById } from '@/app/(dashboard)/apps/actions';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { androidAppSettingUpdateSchema, type AndroidAppSetting } from './data';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const androidSettingsApiUrl =
  process.env.NEXT_PUBLIC_RERMED_ANDROID_SETTINGS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

type AndroidSettingsResponse = {
  success?: boolean;
  error_msg?: string;
  message?: string;
  settings?: AndroidAppSetting[];
  raw_response?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postAndroidSettingsAction(tag: string, appId: string, body: Record<string, string> = {}) {
  const response = await fetch(androidSettingsApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(await getAuthHeaders()),
    },
    body: new URLSearchParams({
      tag,
      app_id: appId,
      ...body,
    }),
  });

  const raw = await response.text();
  let payload: AndroidSettingsResponse;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {
      success: false,
      error_msg: `Backend returned invalid JSON for ${tag}.`,
      raw_response: raw,
    };
  }

  if (!response.ok && !payload.error_msg) {
    payload.error_msg = `Backend request failed: ${response.status} ${response.statusText}`;
  }

  return payload;
}

function normalizeSetting(item: any): AndroidAppSetting {
  return {
    category: item.category ?? null,
    name: String(item.name ?? ''),
    int_value: item.int_value === null || item.int_value === undefined || item.int_value === ''
      ? null
      : Number(item.int_value),
    string_value: item.string_value ?? null,
    description: item.description ?? null,
  };
}

export async function getAndroidAppSettings(appId: string): Promise<{ settings: AndroidAppSetting[]; error?: string }> {
  await requireAdminAuth();
  if (!appId) {
    return { settings: [], error: 'App id is required.' };
  }

  const app = await getAppById(appId);
  if (!app) {
    return { settings: [], error: 'Could not find app.' };
  }

  try {
    const payload = await postAndroidSettingsAction('GET_ANDROID_APP_SETTINGS', app.id);
    if (!payload.success || !Array.isArray(payload.settings)) {
      return {
        settings: [],
        error: payload.error_msg || payload.message || 'Android settings were not returned by the backend.',
      };
    }

    return { settings: payload.settings.map(normalizeSetting) };
  } catch (error: any) {
    return { settings: [], error: error?.message || 'Failed to load Android settings.' };
  }
}

export async function updateAndroidAppSettings(data: z.infer<typeof androidAppSettingUpdateSchema>) {
  await requireAdminAuth();
  const validation = androidAppSettingUpdateSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.' };
  }

  const { appId, settings } = validation.data;
  const app = await getAppById(appId);
  if (!app) {
    return { error: 'Could not find app.' };
  }

  try {
    const payload = await postAndroidSettingsAction('SAVE_ANDROID_APP_SETTINGS', app.id, {
      settings: JSON.stringify(settings),
    });

    if (!payload.success) {
      return { error: payload.error_msg || payload.message || 'Backend rejected Android settings update.' };
    }

    revalidatePath('/android-app-settings');
    revalidatePath(`/android-app-settings/${app.id}/edit`);

    await logActivity('UPDATE_AD_SETTINGS', {
      entityType: 'Android App Settings',
      entityId: app.id,
      entityName: app.name,
      changes: settings.map((setting) => setting.name),
    });

    return { success: true };
  } catch (error: any) {
    return { error: error?.message || 'Failed to update Android settings.' };
  }
}
