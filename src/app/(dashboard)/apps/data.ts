import { z } from 'zod';

export const platformVersionSchema = z.object({
  current_version: z.string().optional(),
  release_date: z.string().optional(),
  status: z.string().optional(),
  rollout: z.coerce.number().optional(),
  remark: z.string().optional(),
});

export const appStatusLabels: Record<number, string> = {
  0: 'Developing',
  1: 'Testing',
  2: 'Live',
  3: 'Unpublished',
  4: 'Skip',
};

export const appStatusOptions = [
  { value: 0, label: 'Developing' },
  { value: 1, label: 'Testing' },
  { value: 2, label: 'Live' },
  { value: 3, label: 'Unpublished' },
  { value: 4, label: 'Skip' },
] as const;

export const appFormSchema = z.object({
  package_name: z.string().min(1, 'Package name is required'),
  app_id: z.string().optional().or(z.literal('')),
  db_name: z.string().min(1, 'DB name is required'),
  name: z.string().min(1, 'App name is required'),
  theme_color: z.string().min(1, 'Theme color is required'),
  current_ver: z.string().optional().or(z.literal('')),
  release_date: z.string().optional().or(z.literal('')),
  paid: z.coerce.number().int().min(0).max(1),
  os: z.string().min(1, 'Platform is required'),
  url: z.string().optional().or(z.literal('')),
  private_key: z.string().optional().or(z.literal('')),
  endpoint: z.string().optional().or(z.literal('')),
  client_id: z.string().optional().or(z.literal('')),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  app_order: z.coerce.number().int().min(0),
  icon_url: z.string().optional().or(z.literal('')),
  landscapeSupport: z.coerce.number().int().min(0).max(1),
  status: z.coerce.number().int().min(0).max(4),
  log_level: z.coerce.number().int().min(0).max(4),
  server_folder: z.string().optional().or(z.literal('')),
  auth_account: z.string().optional().or(z.literal('')),
  nav_param: z.string().optional().or(z.literal('')),
});

export type AppFormValues = z.infer<typeof appFormSchema>;

export const appSchema = z.object({
  id: z.string(),
  package_name: z.string(),
  app_id: z.string().optional(),
  db_name: z.string(),
  name: z.string(),
  theme_color: z.string().optional(),
  themeColor: z.string().optional(),
  current_ver: z.string().optional(),
  release_date: z.string().optional(),
  paid: z.number().optional(),
  os: z.string(),
  url: z.string().optional(),
  private_key: z.string().optional(),
  endpoint: z.string().optional(),
  client_id: z.string().optional(),
  client_email: z.string().optional(),
  app_order: z.number().optional(),
  icon_url: z.string(),
  landscapeSupport: z.boolean(),
  status: z.number().optional(),
  status_label: z.string().optional(),
  isActive: z.boolean(),
  log_level: z.number().optional(),
  server_folder: z.string().optional(),
  auth_account: z.string().optional(),
  nav_param: z.string().optional(),
  remark: z.string().optional(),
  android: platformVersionSchema.optional(),
  ios: platformVersionSchema.optional(),
});

export type App = z.infer<typeof appSchema>;
export type PlatformVersion = z.infer<typeof platformVersionSchema>;

export type RawServerApp = {
  id?: string | number;
  package_name?: string;
  app_id?: string;
  db_name?: string;
  name?: string;
  theme_color?: string;
  current_ver?: string;
  release_date?: string;
  paid?: string | number;
  os?: string;
  url?: string;
  private_key?: string;
  endpoint?: string;
  client_id?: string;
  client_email?: string;
  app_order?: string | number;
  icon_url?: string;
  landscapeSupport?: string | number;
  status?: string | number;
  log_level?: string | number;
  server_folder?: string;
  auth_account?: string;
  nav_param?: string;
};

export type AppRegistryFamily = {
  id: string;
  package_name: string;
  db_name: string;
  name: string;
  theme_color: string;
  icon_url: string;
  app_order: number;
  paid: number;
  landscapeSupport: boolean;
  status: number;
  status_label: string;
  isActive: boolean;
  remark: string;
  server_folder?: string;
  auth_account?: string;
  nav_param?: string;
  availability: {
    android: {
      exists: boolean;
      status: number;
      label: string;
    };
    ios: {
      exists: boolean;
      status: number;
      label: string;
    };
  };
  android?: App;
  ios?: App;
  variants: App[];
};

export const appVariantEditorSchema = z.object({
  id: z.string().optional(),
  package_name: z.string().min(1, 'Package name is required'),
  app_id: z.string().optional().or(z.literal('')),
  os: z.string().min(1),
  current_ver: z.string().optional().or(z.literal('')),
  release_date: z.string().optional().or(z.literal('')),
  url: z.string().optional().or(z.literal('')),
  private_key: z.string().optional().or(z.literal('')),
  endpoint: z.string().optional().or(z.literal('')),
  client_id: z.string().optional().or(z.literal('')),
  client_email: z.string().email('Invalid email').optional().or(z.literal('')),
  status: z.coerce.number().int().min(0).max(4),
  log_level: z.coerce.number().int().min(0).max(4),
});

export const appFamilyEditorSchema = z.object({
  db_name: z.string().min(1, 'DB name is required'),
  name: z.string().min(1, 'App name is required'),
  theme_color: z.string().min(1, 'Theme color is required'),
  icon_url: z.string().optional().or(z.literal('')),
  app_order: z.coerce.number().int().min(0),
  paid: z.coerce.number().int().min(0).max(1),
  landscapeSupport: z.coerce.number().int().min(0).max(1),
  server_folder: z.string().optional().or(z.literal('')),
  auth_account: z.string().optional().or(z.literal('')),
  nav_param: z.string().optional().or(z.literal('')),
  android: appVariantEditorSchema.optional(),
  ios: appVariantEditorSchema.optional(),
});

export type AppFamilyEditorValues = z.infer<typeof appFamilyEditorSchema>;

export function normalizeServerApp(row: RawServerApp): App {
  const status = Number(row.status ?? 4);
  const iconUrl = (row.icon_url || '').trim() || 'https://placehold.co/128x128.png';
  const remark = [
    row.server_folder,
    row.nav_param,
    row.auth_account,
    row.endpoint,
    row.url,
  ]
    .map((value) => (value || '').trim())
    .find((value) => value !== '') || 'Not set';

  return {
    id: String(row.id ?? ''),
    package_name: (row.package_name || '').trim(),
    app_id: (row.app_id || '').trim() || undefined,
    db_name: (row.db_name || '').trim(),
    name: (row.name || '').trim(),
    theme_color: (row.theme_color || '').trim() || '#2f6fed',
    themeColor: (row.theme_color || '').trim() || '#2f6fed',
    current_ver: (row.current_ver || '').trim() || undefined,
    release_date: (row.release_date || '').trim() || undefined,
    paid: Number(row.paid ?? 0),
    os: (row.os || '').trim() || 'Android',
    url: (row.url || '').trim() || undefined,
    private_key: (row.private_key || '').trim() || undefined,
    endpoint: (row.endpoint || '').trim() || undefined,
    client_id: (row.client_id || '').trim() || undefined,
    client_email: (row.client_email || '').trim() || undefined,
    app_order: Number(row.app_order ?? 0),
    icon_url: iconUrl,
    landscapeSupport: Number(row.landscapeSupport ?? 0) === 1,
    status,
    status_label: appStatusLabels[status] ?? 'Unknown',
    isActive: status !== 4,
    log_level: Number(row.log_level ?? 0),
    server_folder: (row.server_folder || '').trim() || undefined,
    auth_account: (row.auth_account || '').trim() || undefined,
    nav_param: (row.nav_param || '').trim() || undefined,
    remark,
  };
}

function normalizePlatform(os?: string) {
  const value = (os || '').trim().toLowerCase();
  if (value.includes('android') && value.includes('ios')) {
    return 'android_ios';
  }

  if (value.includes('ios')) {
    return 'ios';
  }

  return 'android';
}

function platformStateFromApp(app?: App) {
  if (!app) {
    return {
      exists: false,
      status: 4,
      label: 'Missing',
    };
  }

  const status = Number(app.status ?? 4);
  return {
    exists: true,
    status,
    label: appStatusLabels[status] ?? 'Unknown',
  };
}

export function getAppRegistryFamilyKey(app: Pick<App, 'db_name' | 'package_name' | 'name'>) {
  return app.db_name || app.package_name || app.name;
}

export function groupRegistryApps(apps: App[]): AppRegistryFamily[] {
  const groups = new Map<string, AppRegistryFamily>();

  for (const app of apps) {
    const key = getAppRegistryFamilyKey(app);
    const existing = groups.get(key);
    const platform = normalizePlatform(app.os);
    const isRemovedPlatformRow = Number(app.status ?? 4) === -1;

    if (isRemovedPlatformRow && !existing) {
      continue;
    }

    const current = existing || {
      id: app.id,
      package_name: app.package_name,
      db_name: app.db_name,
      name: app.name,
      theme_color: app.theme_color || app.themeColor || '#2f6fed',
      icon_url: app.icon_url,
      app_order: app.app_order ?? 0,
      paid: app.paid ?? 0,
      landscapeSupport: app.landscapeSupport,
      status: app.status ?? 4,
      status_label: app.status_label || appStatusLabels[app.status ?? 4] || 'Unknown',
      isActive: app.isActive,
      remark: app.remark || '',
      server_folder: app.server_folder,
      auth_account: app.auth_account,
      nav_param: app.nav_param,
      availability: {
        android: platformStateFromApp(undefined),
        ios: platformStateFromApp(undefined),
      },
      variants: [],
    };

    if (isRemovedPlatformRow) {
      continue;
    }

    current.variants.push(app);
    if (platform === 'android' || platform === 'android_ios') {
      current.availability.android = platformStateFromApp(app);
      current.android = app;
    }
    if (platform === 'ios' || platform === 'android_ios') {
      current.availability.ios = platformStateFromApp(app);
      current.ios = app;
    }

    if (!existing || Number(app.id) < Number(existing.id)) {
      current.id = app.id;
    }

    if (Number(app.app_order ?? 0) < Number(current.app_order ?? 0)) {
      current.app_order = Number(app.app_order ?? 0);
    }

    if (app.remark && (!current.remark || current.remark === 'Not set')) {
      current.remark = app.remark;
    }

    if (!current.server_folder && app.server_folder) {
      current.server_folder = app.server_folder;
    }
    if (!current.auth_account && app.auth_account) {
      current.auth_account = app.auth_account;
    }
    if (!current.nav_param && app.nav_param) {
      current.nav_param = app.nav_param;
    }

    groups.set(key, current);
  }

  return Array.from(groups.values())
    .filter((family) => family.variants.length > 0)
    .sort((a, b) => {
    if (a.app_order !== b.app_order) {
      return a.app_order - b.app_order;
    }

    return a.name.localeCompare(b.name);
    });
}
