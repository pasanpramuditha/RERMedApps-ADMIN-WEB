

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { IosAppSetting, SimilarApp, AppVersionSetting, AppFontSizeSetting, AdmobSetting, NavigationSetting, PromoSetting } from './data';
import { similarAppSchema } from './data';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { normalizeServerApp, type App, type RawServerApp } from '../apps/data';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const iosSettingsApiUrl =
    process.env.NEXT_PUBLIC_RERMED_IOS_SETTINGS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const iosAppSettingUpdateSchema = z.object({
    dbName: z.string(),
    settings: z.array(z.object({
        id: z.any(),
        param: z.string(),
        category: z.string().nullable().optional(),
        int_value: z.coerce.number().nullable(),
        string_value: z.string().nullable(),
        date_value: z.string().nullable().optional(),
        comment: z.string().nullable(),
    })),
});

const promoSettingUpdateSchema = z.object({
    dbName: z.string(),
    promos: z.array(z.object({
        id: z.coerce.number(),
        param: z.string(),
        int_value: z.coerce.number().nullable(),
        string_value: z.string().nullable(),
        date_value: z.string().nullable(),
        comment: z.string().nullable(),
    })),
});

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

function appendAppTarget(formData: URLSearchParams, appTarget: string) {
    const value = appTarget.trim();
    if (/^\d+$/.test(value)) {
        formData.append('app_id', value);
        return;
    }

    formData.append('db', value);
}

export async function getLiveIosApps(): Promise<App[]> {
    await requireAdminAuth();
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_GET_LIVE_APPS');

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        if (!data.success || !Array.isArray(data.apps)) {
            return [];
        }

        return data.apps.map((row: RawServerApp) => normalizeServerApp(row));
    } catch (error) {
        console.error('Error fetching live iOS apps:', error);
        return [];
    }
}

async function fetchSettingsFromApi(dbName: string, tag: string): Promise<{ settings: IosAppSetting[], error?: string, rawResponse?: any }> {
    if (!dbName) {
        return { settings: [], error: 'Database name is not configured for this app.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('tag', tag);
        appendAppTarget(formData, dbName);

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });
        
        const data = await response.json();

        if (!response.ok) {
            return { settings: [], error: `API Error: ${response.status} ${response.statusText}`, rawResponse: data };
        }
        
        if (!data.success) {
            return { settings: [], error: `API call was not successful. Response: ${JSON.stringify(data)}`, rawResponse: data };
        }
        
        const sourceArray = data.result || data.feedback;

        if (!Array.isArray(sourceArray)) {
            return { settings: [], error: 'API response did not contain a valid array of settings in "result" or "feedback" key.', rawResponse: data };
        }

        const settingsArray: IosAppSetting[] = sourceArray.map((item: any) => ({
            id: item.id || item.param,
            param: item.name || item.param,
            category: item.category ?? null,
            int_value: item.int_value,
            string_value: item.string_value,
            date_value: item.date_value ?? null,
            comment: item.comment ?? null,
        }));
        
        return { settings: settingsArray, rawResponse: data };
    } catch (error: any) {
        return { settings: [], error: `Failed to connect to the settings API. Details: ${error.message}` };
    }
}

export async function getIosAppSettings(dbName: string): Promise<{ settings: IosAppSetting[], error?: string }> {
    await requireAdminAuth();
    return fetchSettingsFromApi(dbName, 'IOS_GET_APP_SETTINGS');
}

export async function getAppConfigSettings(dbName: string): Promise<{ settings: IosAppSetting[], error?: string }> {
    await requireAdminAuth();
    return fetchSettingsFromApi(dbName, 'IOS_GET_APP_CONFIG');
}

export async function getNavigationSettings(dbName: string): Promise<{ settings: NavigationSetting[], error?: string }> {
    await requireAdminAuth();
    if (!dbName) {
        return { settings: [], error: 'Database name is not configured for this app.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_GET_NAVIGATION');
        appendAppTarget(formData, dbName);

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });
        
        const data = await response.json();

        if (!response.ok) {
            return { settings: [], error: `API Error: ${response.status} ${response.statusText}` };
        }
        
        if (!data.success || !Array.isArray(data.result)) {
            return { settings: [], error: 'API response for navigation settings was not successful or badly formatted.' };
        }
        
        return { settings: data.result };
    } catch (error: any) {
        return { settings: [], error: `Failed to connect to the navigation settings API. Details: ${error.message}` };
    }
}

export async function saveNavigationSettings(dbName: string, settings: NavigationSetting[]) {
    await requireAdminAuth();
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_SAVE_NAVIGATION');
        appendAppTarget(formData, dbName);
        formData.append('settings', JSON.stringify(settings));

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', ...(await getAuthHeaders()) },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API returned an error during navigation save.');
        }

        revalidatePath(`/ios-app-settings/${dbName}`);
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getPromoSettings(dbName: string): Promise<{ promos: PromoSetting[], error?: string }> {
    await requireAdminAuth();
    if (!dbName) {
        return { promos: [], error: 'Database name is not configured for this app.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_GET_PROMO');
        appendAppTarget(formData, dbName);

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });

        const data = await response.json();
        if (!response.ok) {
            return { promos: [], error: `API Error: ${response.status} ${response.statusText}` };
        }

        if (!data.success || !Array.isArray(data.result)) {
            return { promos: [], error: 'API response for promo settings was not successful or badly formatted.' };
        }

        return { promos: data.result };
    } catch (error: any) {
        return { promos: [], error: `Failed to connect to the promo settings API. Details: ${error.message}` };
    }
}

export async function savePromoSettings(data: z.infer<typeof promoSettingUpdateSchema>) {
    await requireAdminAuth();
    const validation = promoSettingUpdateSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid promo data provided.' };
    }

    const { dbName, promos } = validation.data;

    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_SAVE_APP_PROMO');
        appendAppTarget(formData, dbName);
        formData.append('promos', JSON.stringify(promos));

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', ...(await getAuthHeaders()) },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API returned an error during promo save.');
        }

        revalidatePath(`/ios-app-settings/${dbName}`);
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getAdmobSettings(dbName: string): Promise<{ settings: AdmobSetting[], error?: string }> {
     await requireAdminAuth();
     if (!dbName) {
        return { settings: [], error: 'Database name is not configured for this app.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_GET_ADMOB');
        appendAppTarget(formData, dbName);

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });
        
        const data = await response.json();

        if (!response.ok) {
            return { settings: [], error: `API Error: ${response.status} ${response.statusText}` };
        }
        
        if (!data.success || !Array.isArray(data.result)) {
            return { settings: [], error: 'API response for AdMob settings was not successful or badly formatted.' };
        }
        
        return { settings: data.result };
    } catch (error: any) {
        return { settings: [], error: `Failed to connect to the AdMob settings API. Details: ${error.message}` };
    }
}


export async function updateIosAppSettings(data: z.infer<typeof iosAppSettingUpdateSchema>) {
    await requireAdminAuth();
    const validation = iosAppSettingUpdateSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.' };
    }

    const { dbName, settings } = validation.data;
    
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_SAVE_APP_CONFIG_SETTINGS');
        appendAppTarget(formData, dbName);
        formData.append('settings', JSON.stringify(settings));

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', ...(await getAuthHeaders()) },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API returned an error during save.');
        }
        
        await logActivity('UPDATE_AD_SETTINGS', {
            entityType: 'iOS App Settings',
            entityId: dbName,
            entityName: dbName,
            changes: settings.map(s => s.param)
        });

        revalidatePath('/ios-app-settings');
        revalidatePath(`/ios-app-settings/${dbName}`); // Revalidate the edit page
        return { success: true };

    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getSimilarApps(dbName: string): Promise<{ similarApps: SimilarApp[], error?: string}> {
    await requireAdminAuth();
    if (!dbName) {
        return { similarApps: [], error: 'Database name is not configured for this app.' };
    }

    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_GET_SIMILAR_APPS');
        appendAppTarget(formData, dbName);

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });
        
        if (!response.ok) {
            return { similarApps: [], error: `API Error: ${response.status} ${response.statusText}` };
        }

        const data = await response.json();
        
        if (!data.success || !Array.isArray(data.feedback)) {
             return { similarApps: [], error: 'Failed to fetch similar apps from API or response format is incorrect.' };
        }
        
        return { similarApps: data.feedback };

    } catch (error: any) {
         return { similarApps: [], error: `Failed to connect to the similar apps API. Details: ${error.message}` };
    }
}


export async function updateSimilarAppVisibility(dbName: string, appId: number, visible: boolean) {
    await requireAdminAuth();
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_UPDATE_SIMILAR_APP_VISIBILITY');
        appendAppTarget(formData, dbName);
        formData.append('id', String(appId));
        formData.append('visible', visible ? '1' : '0');

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', ...(await getAuthHeaders()) },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API returned an error during visibility update.');
        }

        revalidatePath(`/ios-app-settings/${dbName}`);
        return { success: true };

    } catch (error: any) {
        return { error: error.message };
    }
}


const similarAppMutationSchema = similarAppSchema.omit({ visible: true, id: true });
type SimilarAppMutation = z.infer<typeof similarAppMutationSchema>;

async function postSimilarApp(tag: 'IOS_ADD_SIMILAR_APP' | 'IOS_UPDATE_SIMILAR_APP', dbName: string, data: SimilarAppMutation & { id?: number }) {
    const formData = new URLSearchParams();
    formData.append('tag', tag);
    appendAppTarget(formData, dbName);

    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
            formData.append(key, String(value));
        }
    }

    try {
        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || `API call for ${tag} failed.`);
        }
        
        revalidatePath(`/ios-app-settings/${dbName}`);
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function addSimilarApp(dbName: string, data: SimilarAppMutation) {
    await requireAdminAuth();
    return postSimilarApp('IOS_ADD_SIMILAR_APP', dbName, data);
}

export async function updateSimilarApp(dbName: string, id: number, data: SimilarAppMutation) {
    await requireAdminAuth();
    return postSimilarApp('IOS_UPDATE_SIMILAR_APP', dbName, { ...data, id });
}


export async function getAppUpdateInfo(dbName: string): Promise<{ versions: AppVersionSetting[], error?: string }> {
    await requireAdminAuth();
    if (!dbName) {
        return { versions: [], error: 'Database name is not configured for this app.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_GET_APP_UPDATE');
        appendAppTarget(formData, dbName);

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });

        if (!response.ok) {
            return { versions: [], error: `API Error: ${response.status} ${response.statusText}` };
        }

        const data = await response.json();
        if (!data.success || !Array.isArray(data.feedback)) {
            return { versions: [], error: 'Failed to fetch app update info or response format is incorrect.' };
        }
        
        return { versions: data.feedback };
    } catch (error: any) {
        return { versions: [], error: `Failed to connect to the app update API. Details: ${error.message}` };
    }
}

export async function saveAppUpdateInfo(dbName: string, versions: AppVersionSetting[]) {
    await requireAdminAuth();
    try {
        const promises = versions.map(async (version) => {
            const formData = new URLSearchParams();
                formData.append('tag', 'IOS_UPDATE_APP_UPDATE');
            appendAppTarget(formData, dbName);
            formData.append('ver', version.ver.replace(/ /g, '_'));
            formData.append('app_update', String(version.app_update));
            formData.append('mandatory', String(version.mandatory));
            formData.append('maintenance', String(version.maintenance));

            return fetch(iosSettingsApiUrl, {
                method: 'POST',
                headers: { 'User-Agent': 'Mozilla/5.0', ...(await getAuthHeaders()) },
                body: formData,
            }).then(async response => {
                if (!response.ok) {
                    throw new Error(`API request failed for version ${version.ver} with status ${response.status}`);
                }
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message || `API returned an error for version ${version.ver}.`);
                }
                return result;
            });
        });

        await Promise.all(promises);

        revalidatePath(`/ios-app-settings/${dbName}`);
        return { success: true };

    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getAppFontSizes(dbName: string): Promise<{ fontSizes: AppFontSizeSetting[], error?: string }> {
    await requireAdminAuth();
    if (!dbName) {
        return { fontSizes: [], error: 'Database name is not configured for this app.' };
    }
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_GET_APP_FONTSIZE');
        appendAppTarget(formData, dbName);

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', ...(await getAuthHeaders()) },
            body: formData,
            cache: 'no-store',
        });

        if (!response.ok) {
            return { fontSizes: [], error: `API Error: ${response.status} ${response.statusText}` };
        }

        const data = await response.json();
        if (!data.success || !Array.isArray(data.result)) {
            return { fontSizes: [], error: 'Failed to fetch font sizes or response format is incorrect.' };
        }
        
        return { fontSizes: data.result };
    } catch (error: any) {
        return { fontSizes: [], error: `Failed to connect to the font size API. Details: ${error.message}` };
    }
}

export async function saveAppFontSizes(dbName: string, fontSizes: AppFontSizeSetting[]) {
     await requireAdminAuth();
     try {
        const formData = new URLSearchParams();
        formData.append('tag', 'IOS_SAVE_APP_FONTSIZE');
        appendAppTarget(formData, dbName);
        formData.append('fontsizes', JSON.stringify(fontSizes));

        const response = await fetch(iosSettingsApiUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'Mozilla/5.0', ...(await getAuthHeaders()) },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API returned an error during save.');
        }
        
        revalidatePath(`/ios-app-settings/${dbName}`);
        return { success: true };

    } catch (error: any) {
        return { error: error.message };
    }
}
