

'use server';

import type { RegisteredUser } from './data';
import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

export type RegisteredPeriod = 'today' | 'yesterday' | 'last7days' | 'this_month' | 'last_month' | 'last3months' | 'last6months' | 'last_year';
export type RegisteredCounts = Record<RegisteredPeriod, number>;

const AUTH_TOKEN_TTL_MS = 60_000;
let cachedPhpAuthToken: string | null = null;
let cachedPhpAuthTokenAt = 0;

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function fetchUsersFromApi(tag: string, appIdArray: string[], email?: string): Promise<any> {
    try {
        const formData = new URLSearchParams();
        formData.append('tag', tag);
        formData.append('db', '0');
        formData.append('app_id_array', JSON.stringify(appIdArray));

        if (email) {
            formData.append('email', email);
        }
        
        const response = await fetch("https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php", {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders())
            },
            body: formData.toString(),
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error("API Error:", response.status, response.statusText);
            const errorText = await response.text();
            let errorMessage = `API request failed with status ${response.status}: ${response.statusText}.`;
            if (response.status === 401 || response.status === 403) {
                errorMessage = "Authentication failed. Please check if the backend authorization token is correctly set in the environment variables.";
            }
            return { success: false, users: [], results: [], error: errorMessage, rawError: errorText };
        }

        const responseText = await response.text();
        if (!responseText.trim()) {
            return { success: false, users: [], results: [], error: `Empty response from backend for tag ${tag}.` };
        }

        try {
            return JSON.parse(responseText);
        } catch (parseError: any) {
            return {
                success: false,
                users: [],
                results: [],
                error: `Backend returned invalid JSON for tag ${tag}: ${parseError.message}`,
                rawError: responseText,
            };
        }

    } catch (error: any) {
        console.error("Error fetching registered users:", error.message);
        if (error.cause) {
            console.error("Fetch error cause:", error.cause);
        }
        return { success: false, users: [], results: [], error: `Could not reach the endpoint URL. Please check the network connection and DNS settings. Details: ${error.message}` };
    }
}

function periodToTag(period: RegisteredPeriod = 'today') {
    switch (period) {
        case 'today':
            return 'GET_TODAY_REGISTERED';
        case 'yesterday':
            return 'GET_YESTERDAY_REGISTERED';
        case 'last7days':
            return 'GET_LAST7DAYS_REGISTERED';
        case 'this_month':
            return 'GET_CURRENTMONTH_REGISTERED';
        case 'last_month':
            return 'GET_LASTMONTH_REGISTERED';
        case 'last3months':
            return 'GET_LAST3MONTH_REGISTERED';
        case 'last6months':
            return 'GET_LAST6MONTHS_REGISTERED';
        case 'last_year':
            return 'GET_LASTYEAR_REGISTERED';
        default:
            return 'GET_TODAY_REGISTERED';
    }
}

function dedupeAppIds(apps: App[]) {
    return Array.from(new Set(
        apps
            .filter(app => (app.os || '').toLowerCase().includes('android') && app.isActive)
            .map(app => app.id)
            .filter((id): id is string => !!id)
    ));
}

function emptyCounts(): RegisteredCounts {
    return {
        today: 0,
        yesterday: 0,
        last7days: 0,
        this_month: 0,
        last_month: 0,
        last3months: 0,
        last6months: 0,
        last_year: 0,
    };
}

export async function getRegisteredUsers(period?: RegisteredPeriod, email = '', apps?: App[]): Promise<{users: RegisteredUser[], error?: string}> {
    await requireAdminAuth();
    const activePeriod = period || 'today';
    const allApps = apps ?? await getApps();
    const appsByDbName = new Map(allApps.map(app => [app.db_name, app]));
    const androidAppIds = dedupeAppIds(allApps);

    let apiUsers: any[] = [];
    const searchTag = email ? 'GET_USER_BY_EMAIL' : periodToTag(activePeriod);
    const data = await fetchUsersFromApi(searchTag, androidAppIds, email);

    if (data.error || data.error_msg) {
        return { users: [], error: data.error || data.error_msg };
    }
    
    if (email) {
        if (data.success && Array.isArray(data.results)) {
            apiUsers = data.results;
        } else {
             console.warn("API did not return successful user data for email search:", data);
        }
    } else {
         if (data.success && typeof data.feedbackLst === 'object') {
            for (const dbName in data.feedbackLst) {
                if (Array.isArray(data.feedbackLst[dbName].users)) {
                     apiUsers.push(...data.feedbackLst[dbName].users);
                }
            }
        } else if (data.success && Array.isArray(data.users)) {
             apiUsers = data.users;
        } else {
             console.warn("API did not return successful user data for today's registered:", data);
        }
    }

    let mappedUsers: RegisteredUser[] = apiUsers.map((user, index) => {
        const appInfo = appsByDbName.get(user.app_db);
        return {
            id: `${user.email}-${user.app_db}-${index}`, // Create a more unique ID
            appId: appInfo?.id || '',
            appName: appInfo?.name || 'Unknown App',
            appIcon: appInfo?.icon_url || 'https://placehold.co/40x40.png',
            os: 'Android',
            email: user.email,
            country: user.country || 'N/A',
            language: user.language?.toUpperCase() || 'N/A',
            registered_date: user.registered_date,
            device: user.device,
            version: user.curr_version || user.version,
            last_online: user.last_online,
            dbName: user.app_db,
            premium: user.premium,
            purchase_premium: !!(user.purchase_premium || Number(user.purchase_count) > 0),
            purchase_count: Number(user.purchase_count ?? 0),
            ads_free: user.ads_free,
            ss_enabled: user.ss_enabled,
            chat_enabled: user.chat_enabled,
        };
    });

    return { users: mappedUsers };
}

export async function getRegisteredCounts(apps?: App[]): Promise<{ counts: RegisteredCounts; error?: string }> {
    await requireAdminAuth();
    const allApps = apps ?? await getApps();
    const androidAppIds = dedupeAppIds(allApps);

    const data = await fetchUsersFromApi('GET_REGISTERED_COUNTS', androidAppIds);
    if (data.error || data.error_msg) {
        return { counts: emptyCounts(), error: data.error || data.error_msg };
    }

    const counts = emptyCounts();
    if (data.success && data.counts && typeof data.counts === 'object') {
        (Object.keys(counts) as RegisteredPeriod[]).forEach(period => {
            counts[period] = Number(data.counts[period] ?? 0);
        });
    }

    return { counts };
}

const updateUserSchema = z.object({
    appId: z.string(),
    email: z.string().email(),
    premium: z.boolean(),
    ads_free: z.boolean(),
    ss_enabled: z.boolean(),
    chat_enabled: z.boolean(),
});

export async function updateRegisteredUser(data: z.infer<typeof updateUserSchema>) {
    await requireAdminAuth();
    const validation = updateUserSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.' };
    }
    
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'UPDATE_USER_DETAILS');
        formData.append('app_id', validation.data.appId);
        formData.append('email', validation.data.email);
        formData.append('premium', validation.data.premium ? '1' : '0');
        formData.append('ads_free', validation.data.ads_free ? '1' : '0');
        formData.append('ss_enabled', validation.data.ss_enabled ? '1' : '0');
        formData.append('chat_enabled', validation.data.chat_enabled ? '1' : '0');

        const response = await fetch("https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php", {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders())
            },
            body: formData.toString(),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'API returned an error during update.');
        }
        
        await logActivity('UPDATE_USER_PERMISSIONS', {
            entityType: 'Registered User',
            entityId: validation.data.email,
            entityName: validation.data.email,
            changes: validation.data
        });

        revalidatePath('/registered-user');
        return { success: true };

    } catch (error: any) {
        console.error("Error updating user:", error);
        return { error: error.message };
    }
}
