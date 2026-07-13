
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { GlobalSettings } from './data';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const settingsFormSchema = z.object({
  service_account_json: z.string().optional(),
  google_services_json: z.string().optional(),
  dashboard_cards_json: z.string().optional(),
  navigation_visibility_json: z.string().optional(),
  exchange_rates_json: z.string().optional(),
  company_logo_url: z.string().url().optional().or(z.literal('')),
  initial_screen: z.string().optional(),
  demo_mode_info_cards: z.boolean().optional(),
  demo_mode_app_charts: z.boolean().optional(),
  demo_mode_financial_summary: z.boolean().optional(),
  debug_info_visibility: z.boolean().optional(),
  php_auth_token: z.string().optional(),
  in_app_ad_upload_path: z.string().optional(),
  in_app_ad_upload_url: z.string().optional(),
  finance_upload_path: z.string().optional(),
  finance_upload_url: z.string().optional(),
  app_store_connect_api_key_id: z.string().optional(),
  app_store_connect_api_issuer_id: z.string().optional(),
  app_store_connect_api_private_key: z.string().optional(),
  app_store_connect_vendor_number: z.string().optional(),
  admob_client_id: z.string().optional(),
  admob_client_secret: z.string().optional(),
  admob_refresh_token: z.string().optional(),
  admob_publisher_id: z.string().optional(),
  google_ads_client_id: z.string().optional(),
  google_ads_client_secret: z.string().optional(),
  google_ads_refresh_token: z.string().optional(),
  google_ads_developer_token: z.string().optional(),
  google_ads_customer_id: z.string().optional(),
  google_ads_login_customer_id: z.string().optional(),
  google_ads_api_version: z.string().optional(),
  tax_gmail_client_id: z.string().optional(),
  tax_gmail_client_secret: z.string().optional(),
  tax_gmail_refresh_token: z.string().optional(),
  tax_gmail_mailbox: z.string().optional(),
  tax_gmail_income_label: z.string().optional(),
  tax_gmail_expense_label: z.string().optional(),
  tax_gmail_approved_label: z.string().optional(),
  tax_imap_host: z.string().optional(),
  tax_imap_port: z.string().optional(),
  tax_imap_encryption: z.string().optional(),
  tax_imap_mailbox: z.string().optional(),
  tax_imap_username: z.string().optional(),
  tax_imap_password: z.string().optional(),
  tax_veryfi_enabled: z.boolean().optional(),
  tax_veryfi_client_id: z.string().optional(),
  tax_veryfi_username: z.string().optional(),
  tax_veryfi_api_key: z.string().optional(),
  tax_veryfi_client_secret: z.string().optional(),
  tax_veryfi_environment_url: z.string().optional(),
  tax_ocr_space_enabled: z.boolean().optional(),
  tax_ocr_space_api_key: z.string().optional(),
  tax_ocr_space_endpoint: z.string().optional(),
  tax_ocr_space_language: z.string().optional(),
  tax_ocr_space_engine: z.string().optional(),
  tax_evidence_save_enabled: z.boolean().optional(),
  tax_evidence_storage_provider: z.string().optional(),
  tax_uploadcare_public_key: z.string().optional(),
  tax_uploadcare_secret_key: z.string().optional(),
  tax_uploadcare_store: z.string().optional(),
  tax_drive_save_enabled: z.boolean().optional(),
  tax_drive_folder_id: z.string().optional(),
});

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const defaultGlobalSettings: GlobalSettings = {
    service_account_json: '',
    google_services_json: '',
    dashboard_cards_json: '',
    navigation_visibility_json: '',
    exchange_rates_json: '',
    company_logo_url: '',
    initial_screen: '/dashboard',
    demo_mode_info_cards: false,
    demo_mode_app_charts: false,
    demo_mode_financial_summary: false,
    debug_info_visibility: false,
    php_auth_token: '',
    in_app_ad_upload_path: '',
    in_app_ad_upload_url: '',
    finance_upload_path: '',
    finance_upload_url: '',
    app_store_connect_api_key_id: '',
    app_store_connect_api_issuer_id: '',
    app_store_connect_api_private_key: '',
    app_store_connect_vendor_number: '',
    admob_client_id: '',
    admob_client_secret: '',
    admob_refresh_token: '',
    admob_publisher_id: '',
    google_ads_client_id: '',
    google_ads_client_secret: '',
    google_ads_refresh_token: '',
    google_ads_developer_token: '',
    google_ads_customer_id: '',
    google_ads_login_customer_id: '',
    google_ads_api_version: 'v24',
    tax_gmail_client_id: '',
    tax_gmail_client_secret: '',
    tax_gmail_refresh_token: '',
    tax_gmail_mailbox: 'rermedapps.tax@gmail.com',
    tax_gmail_income_label: 'Income',
    tax_gmail_expense_label: 'Expenses',
    tax_gmail_approved_label: 'Tax/Approved',
    tax_imap_host: 'mail.rermedapps.com',
    tax_imap_port: '993',
    tax_imap_encryption: 'ssl',
    tax_imap_mailbox: 'INBOX',
    tax_imap_username: 'tax@rermedapps.com',
    tax_imap_password: '',
    tax_veryfi_enabled: false,
    tax_veryfi_client_id: '',
    tax_veryfi_username: '',
    tax_veryfi_api_key: '',
    tax_veryfi_client_secret: '',
    tax_veryfi_environment_url: 'https://api.veryfi.com',
    tax_ocr_space_enabled: false,
    tax_ocr_space_api_key: '',
    tax_ocr_space_endpoint: 'https://api.ocr.space/parse/image',
    tax_ocr_space_language: 'eng',
    tax_ocr_space_engine: '2',
    tax_evidence_save_enabled: true,
    tax_evidence_storage_provider: 'uploadcare',
    tax_uploadcare_public_key: '',
    tax_uploadcare_secret_key: '',
    tax_uploadcare_store: '1',
    tax_drive_save_enabled: false,
    tax_drive_folder_id: '',
};

type SettingsServerResponse = {
    success?: boolean;
    error_msg?: string;
    settings?: Record<string, unknown>;
    status?: number;
    raw_response?: string;
};

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const SECRET_MASK = '********';
const SECRET_FIELDS = [
    'service_account_json',
    'php_auth_token',
    'app_store_connect_api_key_id',
    'app_store_connect_api_issuer_id',
    'app_store_connect_api_private_key',
    'admob_client_id',
    'admob_client_secret',
    'admob_refresh_token',
    'google_ads_client_id',
    'google_ads_client_secret',
    'google_ads_refresh_token',
    'google_ads_developer_token',
    'tax_gmail_client_id',
    'tax_gmail_client_secret',
    'tax_gmail_refresh_token',
    'tax_imap_password',
    'tax_veryfi_client_id',
    'tax_veryfi_api_key',
    'tax_veryfi_client_secret',
    'tax_ocr_space_api_key',
    'tax_uploadcare_public_key',
    'tax_uploadcare_secret_key',
] as const satisfies readonly (keyof SettingsFormValues)[];

async function postSettingsAction(tag: string, body: Record<string, string> = {}, requireBackendAuth = true) {
    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            ...(requireBackendAuth ? getPhpBackendAuthHeaders() : {}),
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            tag,
            ...body,
        }),
    });

    const rawResponse = await response.text();
    let payload: SettingsServerResponse;

    try {
        payload = rawResponse ? JSON.parse(rawResponse) : {};
    } catch {
        payload = {
            success: false,
            error_msg: 'PHP returned a non-JSON response.',
            raw_response: rawResponse,
        };
    }

    return {
        ...payload,
        status: response.status,
        raw_response: rawResponse,
    } as SettingsServerResponse;
}

function normalizeSettings(data?: Record<string, unknown>): GlobalSettings {
    if (!data) {
        return defaultGlobalSettings;
    }

    return {
        ...defaultGlobalSettings,
        service_account_json: String(data.service_account_json || ''),
        google_services_json: String(data.google_services_json || ''),
        dashboard_cards_json: String(data.dashboard_cards_json || ''),
        navigation_visibility_json: String(data.navigation_visibility_json || ''),
        exchange_rates_json: String(data.exchange_rates_json || ''),
        company_logo_url: String(data.company_logo_url || ''),
        initial_screen: String(data.initial_screen || '/dashboard'),
        demo_mode_info_cards: data.demo_mode_info_cards === true || data.demo_mode_info_cards === 1 || data.demo_mode_info_cards === '1',
        demo_mode_app_charts: data.demo_mode_app_charts === true || data.demo_mode_app_charts === 1 || data.demo_mode_app_charts === '1',
        demo_mode_financial_summary: data.demo_mode_financial_summary === true || data.demo_mode_financial_summary === 1 || data.demo_mode_financial_summary === '1',
        debug_info_visibility: data.debug_info_visibility === true || data.debug_info_visibility === 1 || data.debug_info_visibility === '1',
        php_auth_token: String(data.php_auth_token || ''),
        in_app_ad_upload_path: String(data.in_app_ad_upload_path || ''),
        in_app_ad_upload_url: String(data.in_app_ad_upload_url || ''),
        finance_upload_path: String(data.finance_upload_path || ''),
        finance_upload_url: String(data.finance_upload_url || ''),
        app_store_connect_api_key_id: String(data.app_store_connect_api_key_id || ''),
        app_store_connect_api_issuer_id: String(data.app_store_connect_api_issuer_id || ''),
        app_store_connect_api_private_key: String(data.app_store_connect_api_private_key || ''),
        app_store_connect_vendor_number: String(data.app_store_connect_vendor_number || ''),
        admob_client_id: String(data.admob_client_id || ''),
        admob_client_secret: String(data.admob_client_secret || ''),
        admob_refresh_token: String(data.admob_refresh_token || ''),
        admob_publisher_id: String(data.admob_publisher_id || ''),
        google_ads_client_id: String(data.google_ads_client_id || ''),
        google_ads_client_secret: String(data.google_ads_client_secret || ''),
        google_ads_refresh_token: String(data.google_ads_refresh_token || ''),
        google_ads_developer_token: String(data.google_ads_developer_token || ''),
        google_ads_customer_id: String(data.google_ads_customer_id || ''),
        google_ads_login_customer_id: String(data.google_ads_login_customer_id || ''),
        google_ads_api_version: String(data.google_ads_api_version || 'v24'),
        tax_gmail_client_id: String(data.tax_gmail_client_id || ''),
        tax_gmail_client_secret: String(data.tax_gmail_client_secret || ''),
        tax_gmail_refresh_token: String(data.tax_gmail_refresh_token || ''),
        tax_gmail_mailbox: String(data.tax_gmail_mailbox || 'rermedapps.tax@gmail.com'),
        tax_gmail_income_label: String(data.tax_gmail_income_label || 'Income'),
        tax_gmail_expense_label: String(data.tax_gmail_expense_label || 'Expenses'),
        tax_gmail_approved_label: String(data.tax_gmail_approved_label || 'Tax/Approved'),
        tax_imap_host: String(data.tax_imap_host || 'mail.rermedapps.com'),
        tax_imap_port: String(data.tax_imap_port || '993'),
        tax_imap_encryption: String(data.tax_imap_encryption || 'ssl'),
        tax_imap_mailbox: String(data.tax_imap_mailbox || 'INBOX'),
        tax_imap_username: String(data.tax_imap_username || 'tax@rermedapps.com'),
        tax_imap_password: String(data.tax_imap_password || ''),
        tax_veryfi_enabled: data.tax_veryfi_enabled === true || data.tax_veryfi_enabled === 1 || data.tax_veryfi_enabled === '1',
        tax_veryfi_client_id: String(data.tax_veryfi_client_id || ''),
        tax_veryfi_username: String(data.tax_veryfi_username || ''),
        tax_veryfi_api_key: String(data.tax_veryfi_api_key || ''),
        tax_veryfi_client_secret: String(data.tax_veryfi_client_secret || ''),
        tax_veryfi_environment_url: String(data.tax_veryfi_environment_url || 'https://api.veryfi.com'),
        tax_ocr_space_enabled: data.tax_ocr_space_enabled === true || data.tax_ocr_space_enabled === 1 || data.tax_ocr_space_enabled === '1',
        tax_ocr_space_api_key: String(data.tax_ocr_space_api_key || ''),
        tax_ocr_space_endpoint: String(data.tax_ocr_space_endpoint || 'https://api.ocr.space/parse/image'),
        tax_ocr_space_language: String(data.tax_ocr_space_language || 'eng'),
        tax_ocr_space_engine: String(data.tax_ocr_space_engine || '2'),
        tax_evidence_save_enabled: data.tax_evidence_save_enabled === true || data.tax_evidence_save_enabled === 1 || data.tax_evidence_save_enabled === '1',
        tax_evidence_storage_provider: 'uploadcare',
        tax_uploadcare_public_key: String(data.tax_uploadcare_public_key || ''),
        tax_uploadcare_secret_key: String(data.tax_uploadcare_secret_key || ''),
        tax_uploadcare_store: String(data.tax_uploadcare_store || '1'),
        tax_drive_save_enabled: data.tax_drive_save_enabled === true || data.tax_drive_save_enabled === 1 || data.tax_drive_save_enabled === '1',
        tax_drive_folder_id: String(data.tax_drive_folder_id || ''),
    };
}

function toServerPayload(data: SettingsFormValues) {
    return {
        service_account_json: data.service_account_json || '',
        google_services_json: data.google_services_json || '',
        dashboard_cards_json: data.dashboard_cards_json || '',
        navigation_visibility_json: data.navigation_visibility_json || '',
        exchange_rates_json: data.exchange_rates_json || '',
        company_logo_url: data.company_logo_url || '',
        initial_screen: data.initial_screen || '/dashboard',
        demo_mode_info_cards: data.demo_mode_info_cards ? '1' : '0',
        demo_mode_app_charts: data.demo_mode_app_charts ? '1' : '0',
        demo_mode_financial_summary: data.demo_mode_financial_summary ? '1' : '0',
        debug_info_visibility: data.debug_info_visibility ? '1' : '0',
        php_auth_token: data.php_auth_token || '',
        in_app_ad_upload_path: data.in_app_ad_upload_path || '',
        in_app_ad_upload_url: data.in_app_ad_upload_url || '',
        finance_upload_path: data.finance_upload_path || '',
        finance_upload_url: data.finance_upload_url || '',
        app_store_connect_api_key_id: data.app_store_connect_api_key_id || '',
        app_store_connect_api_issuer_id: data.app_store_connect_api_issuer_id || '',
        app_store_connect_api_private_key: data.app_store_connect_api_private_key || '',
        app_store_connect_vendor_number: data.app_store_connect_vendor_number || '',
        admob_client_id: data.admob_client_id || '',
        admob_client_secret: data.admob_client_secret || '',
        admob_refresh_token: data.admob_refresh_token || '',
        admob_publisher_id: data.admob_publisher_id || '',
        google_ads_client_id: data.google_ads_client_id || '',
        google_ads_client_secret: data.google_ads_client_secret || '',
        google_ads_refresh_token: data.google_ads_refresh_token || '',
        google_ads_developer_token: data.google_ads_developer_token || '',
        google_ads_customer_id: data.google_ads_customer_id || '',
        google_ads_login_customer_id: data.google_ads_login_customer_id || '',
        google_ads_api_version: data.google_ads_api_version || 'v24',
        tax_gmail_client_id: data.tax_gmail_client_id || '',
        tax_gmail_client_secret: data.tax_gmail_client_secret || '',
        tax_gmail_refresh_token: data.tax_gmail_refresh_token || '',
        tax_gmail_mailbox: data.tax_gmail_mailbox || 'rermedapps.tax@gmail.com',
        tax_gmail_income_label: data.tax_gmail_income_label || 'Income',
        tax_gmail_expense_label: data.tax_gmail_expense_label || 'Expenses',
        tax_gmail_approved_label: data.tax_gmail_approved_label || 'Tax/Approved',
        tax_imap_host: data.tax_imap_host || 'mail.rermedapps.com',
        tax_imap_port: data.tax_imap_port || '993',
        tax_imap_encryption: data.tax_imap_encryption || 'ssl',
        tax_imap_mailbox: data.tax_imap_mailbox || 'INBOX',
        tax_imap_username: data.tax_imap_username || 'tax@rermedapps.com',
        tax_imap_password: data.tax_imap_password || '',
        tax_veryfi_enabled: data.tax_veryfi_enabled ? '1' : '0',
        tax_veryfi_client_id: data.tax_veryfi_client_id || '',
        tax_veryfi_username: data.tax_veryfi_username || '',
        tax_veryfi_api_key: data.tax_veryfi_api_key || '',
        tax_veryfi_client_secret: data.tax_veryfi_client_secret || '',
        tax_veryfi_environment_url: data.tax_veryfi_environment_url || 'https://api.veryfi.com',
        tax_ocr_space_enabled: data.tax_ocr_space_enabled ? '1' : '0',
        tax_ocr_space_api_key: data.tax_ocr_space_api_key || '',
        tax_ocr_space_endpoint: data.tax_ocr_space_endpoint || 'https://api.ocr.space/parse/image',
        tax_ocr_space_language: data.tax_ocr_space_language || 'eng',
        tax_ocr_space_engine: data.tax_ocr_space_engine || '2',
        tax_evidence_save_enabled: data.tax_evidence_save_enabled ? '1' : '0',
        tax_evidence_storage_provider: 'uploadcare',
        tax_uploadcare_public_key: data.tax_uploadcare_public_key || '',
        tax_uploadcare_secret_key: data.tax_uploadcare_secret_key || '',
        tax_uploadcare_store: data.tax_uploadcare_store || '1',
        tax_drive_save_enabled: data.tax_drive_save_enabled ? '1' : '0',
        tax_drive_folder_id: data.tax_drive_folder_id || '',
    };
}

async function loadGlobalSettings(): Promise<GlobalSettings> {
    try {
        const payload = await postSettingsAction('GET_GLOBAL_SETTINGS');
        if (!payload.success) {
            return defaultGlobalSettings;
        }

        return normalizeSettings(payload.settings);
    } catch (error) {
        console.error("Error fetching global settings:", error);
        return defaultGlobalSettings;
    }
}

function maskSecrets(settings: GlobalSettings): GlobalSettings {
    const masked: GlobalSettings = { ...settings };
    for (const field of SECRET_FIELDS) {
        if (masked[field]) {
            (masked as Record<string, unknown>)[field] = SECRET_MASK;
        }
    }
    return masked;
}

function preserveMaskedSecrets(data: SettingsFormValues, current: GlobalSettings): SettingsFormValues {
    const next: SettingsFormValues = { ...data };
    for (const field of SECRET_FIELDS) {
        const value = typeof next[field] === 'string' ? String(next[field]).trim() : next[field];
        if (value === undefined || value === '' || value === SECRET_MASK) {
            (next as Record<string, string | undefined>)[field] = String(current[field] || '');
        }
    }
    return next;
}

export async function getGlobalSettings(): Promise<GlobalSettings> {
    try {
        await requireAdminAuth();
    } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'Unauthorized' || message === 'Forbidden') {
            return maskSecrets(defaultGlobalSettings);
        }
        throw error;
    }
    return maskSecrets(await loadGlobalSettings());
}

export async function getPrivateGlobalSettings(): Promise<GlobalSettings> {
    await requireAdminAuth();
    return loadGlobalSettings();
}

export async function getPublicGlobalSettings(): Promise<Pick<GlobalSettings, 'company_logo_url' | 'initial_screen'>> {
    try {
        const payload = await postSettingsAction('GET_PUBLIC_SETTINGS', {}, false);
        if (!payload.success) {
            return {
                company_logo_url: defaultGlobalSettings.company_logo_url,
                initial_screen: defaultGlobalSettings.initial_screen,
            };
        }

        const settings = normalizeSettings(payload.settings);
        return {
            company_logo_url: settings.company_logo_url,
            initial_screen: settings.initial_screen,
        };
    } catch {
        return {
            company_logo_url: defaultGlobalSettings.company_logo_url,
            initial_screen: defaultGlobalSettings.initial_screen,
        };
    }
}

export async function saveGlobalSettings(data: SettingsFormValues) {
    await requireAdminAuth();

    const validation = settingsFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        const currentSettings = await loadGlobalSettings();
        const payload = await postSettingsAction('SAVE_GLOBAL_SETTINGS', toServerPayload(preserveMaskedSecrets(validation.data, currentSettings)));
        if (!payload.success) {
            return {
                error: payload.error_msg || "Failed to save global settings.",
                debug: {
                    status: payload.status,
                    response: payload.raw_response || payload,
                },
            };
        }

        revalidatePath('/settings');
        // Revalidate other paths that might use these settings
        revalidatePath('/dashboard', 'layout');
        revalidatePath('/', 'layout');
        
        return { success: true };
    } catch (error: any) {
        return {
            error: "Failed to save global settings.",
            debug: {
                message: error?.message || String(error),
            },
        };
    }
}
