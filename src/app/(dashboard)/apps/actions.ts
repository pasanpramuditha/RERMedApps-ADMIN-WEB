'use server';

import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';
import { revalidatePath } from 'next/cache';
import {
  appFormSchema,
  getAppRegistryFamilyKey,
  groupRegistryApps,
  normalizeServerApp,
  type AppRegistryFamily,
  type App,
  type AppFormValues,
  type RawServerApp,
} from './data';
import { logActivity } from '@/lib/activity-log';

export type { App } from './data';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

type ServerResponse<T> = {
  success?: boolean;
  error_msg?: string;
  info?: string;
  apps?: T;
  app?: RawServerApp;
  updated_ids?: Array<string | number>;
};

async function postServerAction<T>(tag: string, body: Record<string, string> = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(phpApiUrl, {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        ...getPhpBackendAuthHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        tag,
        ...body,
      }),
    });

    return (await response.json()) as ServerResponse<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePayload(data: AppFormValues, id?: string) {
  return {
    ...(id ? { id } : {}),
    package_name: data.package_name,
    app_id: data.app_id || '',
    db_name: data.db_name,
    name: data.name,
    theme_color: data.theme_color,
    current_ver: data.current_ver || '',
    release_date: data.release_date || '',
    paid: String(data.paid),
    os: data.os,
    url: data.url || '',
    private_key: data.private_key || '',
    endpoint: data.endpoint || '',
    client_id: data.client_id || '',
    client_email: data.client_email || '',
    app_order: String(data.app_order),
    icon_url: data.icon_url || '',
    landscapeSupport: String(data.landscapeSupport),
    status: String(data.status),
    log_level: String(data.log_level),
    server_folder: data.server_folder || '',
    auth_account: data.auth_account || '',
    nav_param: data.nav_param || '',
  };
}

function parseAppRows(payload: ServerResponse<RawServerApp[]>) {
  if (!payload.success || !Array.isArray(payload.apps)) {
    return [];
  }

  return payload.apps.map((row) => normalizeServerApp(row));
}

export async function getApps(): Promise<App[]> {
  await requireAdminAuth();
  try {
    const payload = await postServerAction<RawServerApp[]>('GET_APPS');
    return parseAppRows(payload);
  } catch (error) {
    console.error('Error fetching apps:', error);
    return [];
  }
}

export async function getAppRegistryFamilies(): Promise<AppRegistryFamily[]> {
  await requireAdminAuth();
  const apps = await getApps();
  return groupRegistryApps(apps);
}

export async function getAppRegistryFamilyById(id: string): Promise<AppRegistryFamily | undefined> {
  await requireAdminAuth();
  const apps = await getApps();
  const row = apps.find((app) => app.id === id);
  if (!row) {
    return undefined;
  }

  const key = getAppRegistryFamilyKey(row);
  return groupRegistryApps(apps).find((family) => family.db_name === key || family.package_name === key || family.name === key);
}

export async function getAppById(id: string): Promise<App | undefined> {
  await requireAdminAuth();
  try {
    const payload = await postServerAction<RawServerApp>('GET_APP_BY_ID', { id });
    if (!payload.success || !payload.app) {
      return undefined;
    }

    return normalizeServerApp(payload.app);
  } catch (error) {
    console.error('Error fetching app by ID:', error);
    return undefined;
  }
}

export async function createApp(data: AppFormValues, _idToken?: string) {
  await requireAdminAuth();
  const validation = appFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  try {
    const payload = await postServerAction<RawServerApp>('SAVE_APP', normalizePayload(validation.data));
    if (!payload.success || !payload.app) {
      return { error: payload.error_msg || 'Failed to create app.' };
    }

    const app = normalizeServerApp(payload.app);
    await logActivity('CREATE_APP', {
      entityType: 'App',
      entityId: app.id,
      entityName: app.name,
      changes: {
        package_name: app.package_name,
        db_name: app.db_name,
        os: app.os,
        status: app.status,
      },
    }, _idToken);

    revalidatePath('/apps');
    return { success: true, app };
  } catch (error) {
    console.error('Error creating app:', error);
    return { error: 'Failed to create app in database.' };
  }
}

export async function updateApp(id: string, data: AppFormValues, _idToken?: string) {
  await requireAdminAuth();
  const validation = appFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  try {
    const payload = await postServerAction<RawServerApp>('SAVE_APP', normalizePayload(validation.data, id));
    if (!payload.success || !payload.app) {
      return { error: payload.error_msg || 'Failed to update app.' };
    }

    const app = normalizeServerApp(payload.app);
    await logActivity('UPDATE_APP', {
      entityType: 'App',
      entityId: app.id,
      entityName: app.name,
      changes: {
        package_name: app.package_name,
        db_name: app.db_name,
        os: app.os,
        status: app.status,
      },
    }, _idToken);

    revalidatePath('/apps');
    revalidatePath(`/apps/${id}/edit`);
    return { success: true, app };
  } catch (error) {
    console.error('Error updating app:', error);
    return { error: 'Failed to update app in database.' };
  }
}

export async function deleteApp(id: string, _idToken?: string) {
  await requireAdminAuth();
  if (!id) {
    return { error: 'App id is required.' };
  }

  try {
    const payload = await postServerAction('DELETE_APP', { id });
    if (!payload.success) {
      return { error: payload.error_msg || 'Failed to delete app.' };
    }

    await logActivity('DELETE_APP', {
      entityType: 'App',
      entityId: id,
      entityName: `App ${id}`,
    }, _idToken);

    revalidatePath('/apps');
    return { success: true };
  } catch (error) {
    console.error('Error deleting app:', error);
    return { error: 'Failed to delete app.' };
  }
}

export async function updateMultipleAppStatus(appIds: string[], isActive: boolean, _idToken?: string) {
  await requireAdminAuth();
  if (!appIds.length) {
    return { error: 'No app IDs provided.' };
  }

  try {
    const status = isActive ? '2' : '4';
    await Promise.all(
      appIds.map((id) =>
        postServerAction('UPDATE_APP_STATUS', {
          id,
          status,
        })
      )
    );

    await logActivity('UPDATE_APP', {
      entityType: 'App',
      entityId: appIds.join(','),
      entityName: `${appIds.length} app status update`,
      changes: { status },
    }, _idToken);

    revalidatePath('/apps');
    return { success: true };
  } catch (error) {
    console.error('Error updating multiple app statuses:', error);
    return { error: 'Failed to update app statuses in database.' };
  }
}
