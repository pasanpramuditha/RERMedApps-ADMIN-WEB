'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getApps, getAppById } from '@/app/(dashboard)/apps/actions';
import { platformAdSettingsSchema } from './data';
import type { AdSettings, PlatformAdSettings } from './data';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const admobApiUrl =
    process.env.NEXT_PUBLIC_RERMED_ADMOB_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

type AdSettingsServerResponse = {
    success?: boolean;
    error_msg?: string;
    message?: string;
    status?: number;
    tag?: string;
    db?: string;
    ads_android?: Array<{ name?: string; int_value?: string | number }>;
    ads_ios?: Array<{ ad_type?: string; active?: string | number; frequency?: string | number }>;
    raw_response?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postAdmobAction(tag: string, appId: string, body: Record<string, string> = {}) {
    const response = await fetch(admobApiUrl, {
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
    let payload: AdSettingsServerResponse;

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

    return {
        ...payload,
        status: response.status,
        tag,
        db: payload.db,
        raw_response: raw,
    };
}

const defaultSettings: PlatformAdSettings = {
    nativeInterval: undefined,
    rewardInterval: undefined,
    banner: undefined,
    interstitial: undefined,
    nativeAd: undefined,
    appOpen: undefined,
};

function toNumber(value: unknown) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}

function toBool(value: unknown) {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    return Number(value) === 1 || value === true;
}

function getRegisteredPlatform(app: { os?: string }) {
    const osValue = (app.os || '').toLowerCase().replace(/[^a-z]/g, '');
    if (osValue === 'ios' || osValue === 'iphone' || osValue === 'apple') {
        return 'ios';
    }

    if (osValue === 'android') {
        return 'android';
    }

    return 'unknown';
}

async function getIosAdSettingsForApp(appId: string): Promise<{ settings: PlatformAdSettings; error?: string; debug?: AdSettingsServerResponse }> {
    try {
        const data = await postAdmobAction('GET_IOS_ADMOBADS_SETTINGS', appId);
        if (!data.success || !Array.isArray(data.ads_ios)) {
            return {
                settings: defaultSettings,
                error: data.error_msg || data.message || 'iOS AdMob settings were not returned by the backend.',
                debug: data,
            };
        }

        const getAd = (adType: string) => data.ads_ios?.find((ad) => ad.ad_type === adType);
        const bannerAd = getAd('ADMOB_BANNER_ADS');
        const interstitialAd = getAd('ADMOB_INTERSTITIAL_AD');
        const nativeAd = getAd('ADMOB_NATIVE_ADS');
        const appOpenAd = getAd('ADMOB_APP_OPEN_AD');

        return {
            settings: {
                nativeInterval: toNumber(interstitialAd?.frequency),
                rewardInterval: undefined,
                banner: toBool(bannerAd?.active),
                interstitial: toBool(interstitialAd?.active),
                nativeAd: toBool(nativeAd?.active),
                appOpen: toBool(appOpenAd?.active),
            },
            debug: data,
        };
    } catch (error: any) {
        return {
            settings: defaultSettings,
            error: error?.message || 'Failed to load iOS AdMob settings.',
            debug: {
                success: false,
                error_msg: error?.message || 'Failed to load iOS AdMob settings.',
                tag: 'GET_IOS_ADMOBADS_SETTINGS',
            },
        };
    }
}

async function getAndroidAdSettingsForApp(appId: string): Promise<{ settings: PlatformAdSettings; error?: string; debug?: AdSettingsServerResponse }> {
    try {
        const data = await postAdmobAction('GET_ANDROID_ADMOBADS_SETTINGS', appId);
        if (!data.success || !Array.isArray(data.ads_android)) {
            return {
                settings: defaultSettings,
                error: data.error_msg || data.message || 'Android AdMob settings were not returned by the backend.',
                debug: data,
            };
        }

        const getAdValue = (name: string) => data.ads_android?.find((ad) => ad.name === name)?.int_value;

        return {
            settings: {
                appOpen: toBool(getAdValue('ADMOB_APP_OPEN_AD')),
                banner: toBool(getAdValue('ADMOB_BANNER_ADS')),
                interstitial: toBool(getAdValue('ADMOB_INTERSTITIAL_AD')),
                nativeAd: toBool(getAdValue('ADMOB_NATIVE_ADS')),
                nativeInterval: toNumber(getAdValue('ADMOB_NATIVE_INTERVAL')),
                rewardInterval: toNumber(getAdValue('REWARD_AD_INTERVAL_HOURS')),
            },
            debug: data,
        };
    } catch (error: any) {
        return {
            settings: defaultSettings,
            error: error?.message || 'Failed to load Android AdMob settings.',
            debug: {
                success: false,
                error_msg: error?.message || 'Failed to load Android AdMob settings.',
                tag: 'GET_ANDROID_ADMOBADS_SETTINGS',
            },
        };
    }
}

export async function getAdSettings(platform: 'android' | 'ios'): Promise<{ settings: AdSettings[]; errorCount: number; debugResponses: AdSettingsServerResponse[] }> {
    await requireAdminAuth();
    const allApps = await getApps();
    const activeApps = allApps.filter((app) => [1, 2].includes(Number(app.status)));
    const platformApps = activeApps.filter((app) => getRegisteredPlatform(app) === platform);

    const rows = await Promise.all(
        platformApps.map(async (app) => {
            const result = platform === 'ios'
                ? await getIosAdSettingsForApp(app.id)
                : await getAndroidAdSettingsForApp(app.id);

            return {
                id: app.id,
                name: app.name,
                icon_url: app.icon_url,
                settings: result.settings,
                error: result.error,
                debug: result.debug,
            };
        })
    );

    return {
        settings: rows,
        errorCount: rows.filter((row) => row.error).length,
        debugResponses: rows
            .map((row) => row.debug)
            .filter((debug): debug is AdSettingsServerResponse => Boolean(debug)),
    };
}

const updateAdSettingsSchema = z.object({
  appId: z.string(),
  platform: z.enum(['android', 'ios']),
  settings: platformAdSettingsSchema,
});

async function updateAndroidAdSettings(appId: string, settings: PlatformAdSettings): Promise<{ success: boolean; error?: string }> {
    const result = await postAdmobAction('SAVE_ANDROID_ADMOBADS_SETTINGS', appId, {
        ADMOB_APP_OPEN_AD: settings.appOpen ? '1' : '0',
        ADMOB_BANNER_ADS: settings.banner ? '1' : '0',
        ADMOB_INTERSTITIAL_AD: settings.interstitial ? '1' : '0',
        ADMOB_NATIVE_ADS: settings.nativeAd ? '1' : '0',
        ADMOB_NATIVE_INTERVAL: String(settings.nativeInterval ?? 0),
        REWARD_AD_INTERVAL_HOURS: String(settings.rewardInterval ?? 0),
        ADMOB_REWARD_ADS: settings.rewardInterval ? '1' : '0',
    });

    if (!result.success) {
        return { success: false, error: result.error_msg || result.message || 'Backend rejected Android AdMob update.' };
    }

    return { success: true };
}

async function updateIosAdSettings(appId: string, settings: PlatformAdSettings): Promise<{ success: boolean; error?: string }> {
    const result = await postAdmobAction('SAVE_IOS_ADMOBADS_SETTINGS', appId, {
        ADMOB_BANNER_ADS: settings.banner ? '1' : '0',
        ADMOB_INTERSTITIAL_AD: settings.interstitial ? '1' : '0',
    });

    if (!result.success) {
        return { success: false, error: result.error_msg || result.message || 'Backend rejected iOS AdMob update.' };
    }

    return { success: true };
}

export async function updateAdSettings(data: z.infer<typeof updateAdSettingsSchema>): Promise<{ error: string } | { success: boolean }> {
    await requireAdminAuth();
    const validation = updateAdSettingsSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.' };
    }

    const { appId, platform, settings } = validation.data;
    const app = await getAppById(appId);
    if (!app) {
        return { error: 'Could not find app.' };
    }

    const result = platform === 'android'
        ? await updateAndroidAdSettings(app.id, settings)
        : await updateIosAdSettings(app.id, settings);

    if (!result.success) {
        return { error: result.error || 'Failed to update ad settings.' };
    }

    revalidatePath('/admob-ads');
    await logActivity('UPDATE_AD_SETTINGS', {
        entityType: 'AdMob Settings',
        entityId: app.id,
        entityName: `${app.name} (${platform})`,
        changes: settings,
    });

    return { success: true };
}
