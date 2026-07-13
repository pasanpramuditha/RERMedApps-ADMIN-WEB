
'use server';

import type { PurchasedUser } from './data';
import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

type Period = 'today' | 'yesterday' | 'last7days';

export type PurchaseCounts = Record<Period, number>;

const AUTH_TOKEN_TTL_MS = 60_000;
let cachedPhpAuthToken: string | null = null;
let cachedPhpAuthTokenAt = 0;

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function fetchPurchasesFromApi(tag: string, appIdArray: string[], email?: string, limit?: number): Promise<any> {
    try {
        const formData = new URLSearchParams();
        formData.append('tag', tag);
        formData.append('db', 'MAIN');
        formData.append('app_id_array', JSON.stringify(appIdArray));
        if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
            formData.append('limit', String(Math.floor(limit)));
        }

        if (email) {
            formData.append('email', email);
        }

        const response = await fetch(phpApiUrl, {
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
            return { success: false, purchases: [], results: [], error: errorMessage, rawError: errorText };
        }

        const responseText = await response.text();
        if (!responseText.trim()) {
            return { success: false, purchases: [], results: [], error: `Empty response from backend for tag ${tag}.` };
        }

        try {
            return JSON.parse(responseText);
        } catch (parseError: any) {
            return {
                success: false,
                purchases: [],
                results: [],
                error: `Backend returned invalid JSON for tag ${tag}: ${parseError.message}`,
                rawError: responseText,
            };
        }

    } catch (error: any) {
        console.error("Error fetching purchased users:", error.message);
        if (error.cause) {
            console.error("Fetch error cause:", error.cause);
        }
        return { success: false, purchases: [], results: [], error: `Could not reach the endpoint URL. Please check the network connection and DNS settings. Details: ${error.message}` };
    }
}

function dedupeAppIds(apps: App[]) {
    return Array.from(new Set(
        apps
            .filter(app => app.isActive && (app.os === 'Android' || app.os === 'Android & iOS'))
            .map(app => app.id)
            .filter((id): id is string => !!id)
    ));
}

async function getAppsFromCache(apps?: App[]) {
    return apps ?? await getApps();
}

export async function getPurchasedUsers(period?: Period, email?: string, apps?: App[]): Promise<{users: PurchasedUser[], error?: string}> {
    await requireAdminAuth();
    const allApps = await getAppsFromCache(apps);
    const appsByDbName = new Map(allApps.map(app => [app.db_name, app]));
    const activeAppIds = dedupeAppIds(allApps);

    let apiPurchases: any[] = [];
    let searchTag = '';
    
    if (email) {
        searchTag = 'GET_USER_PURCHASE_BY_EMAIL';
    } else if (period) {
         const tagMap = {
            today: 'GET_TODAY_PURCHASED',
            yesterday: 'GET_YESTERDAY_PURCHASED',
            last7days: 'GET_LAST7DAYS_PURCHASED',
        };
        searchTag = tagMap[period];
    } else {
        return { users: [], error: "A time period or an email must be provided." };
    }

    const data = await fetchPurchasesFromApi(searchTag, activeAppIds, email, email ? undefined : 100);

    if (data.error) {
        return { users: [], error: data.error };
    }
    
    if (email) {
        if (data.success && Array.isArray(data.results)) {
            apiPurchases = data.results;
        } else {
            console.warn("API did not return successful purchase data for email search:", data);
        }
    } else {
        if (data.success && Array.isArray(data.purchases)) {
            apiPurchases = data.purchases;
        } else {
            console.warn("API did not return successful purchase data for today's purchases:", data);
        }
    }


    let mappedUsers: PurchasedUser[] = apiPurchases.map((purchase, index) => {
        const appInfo = appsByDbName.get(purchase.app_db) || { name: 'Unknown App', icon_url: 'https://placehold.co/40x40.png' };
        return {
            id: `${purchase.order_id}-${index}`,
            appName: appInfo.name,
            appIcon: appInfo.icon_url,
            email: purchase.email,
            sku: purchase.sku,
            appVersion: purchase.app_version,
            purchasedDate: purchase.purchased_date,
            orderId: purchase.order_id,
        };
    });
    
    return { users: mappedUsers };
}

export async function getPurchasedCounts(apps?: App[]): Promise<{ counts: PurchaseCounts; error?: string }> {
    await requireAdminAuth();
    const allApps = await getAppsFromCache(apps);
    const activeAppIds = dedupeAppIds(allApps);

    const data = await fetchPurchasesFromApi('GET_PURCHASE_COUNTS', activeAppIds);
    if (data.error) {
        return {
            counts: { today: 0, yesterday: 0, last7days: 0 },
            error: data.error
        };
    }

    const counts: PurchaseCounts = { today: 0, yesterday: 0, last7days: 0 };
    if (data.success && data.counts && typeof data.counts === 'object') {
        counts.today = Number(data.counts.today ?? 0);
        counts.yesterday = Number(data.counts.yesterday ?? 0);
        counts.last7days = Number(data.counts.last7days ?? 0);
    }

    return { counts };
}
