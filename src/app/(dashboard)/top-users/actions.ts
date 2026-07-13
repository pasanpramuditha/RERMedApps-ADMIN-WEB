
'use server';

import type { TopUser } from './data';
import type { App } from '../apps/data';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

export async function getTopPurchaseUsers(apps: App[]): Promise<TopUser[]> {
    await requireAdminAuth();
    try {
        const appsByPackageName = new Map(apps.map(app => [app.package_name, app]));
        const appIdArray = Array.from(new Set(
            apps
                .filter(app => app.isActive && app.id)
                .map(app => app.id)
                .filter(Boolean)
        ));

        const formData = new URLSearchParams();
        formData.append('tag', 'GET_TOP_PURCHASE_USERS');
        formData.append('db', '0');
        formData.append('limit', '100');
        formData.append('app_id_array', JSON.stringify(appIdArray));

        const response = await fetch(phpApiUrl, {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders()),
            },
            body: formData.toString(),
            cache: 'no-store', 
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText}. ${errorText.slice(0, 200)}`);
        }

        const responseText = await response.text();
        if (!responseText.trim()) {
            console.warn('Top users API returned an empty response.');
            return [];
        }

        let data: any;
        try {
            data = JSON.parse(responseText);
        } catch (parseError: any) {
            console.warn('Top users API returned invalid JSON:', responseText.slice(0, 500));
            throw new Error(`Invalid JSON from top users API: ${parseError.message}`);
        }

        if (!data.success || !Array.isArray(data.users)) {
            console.warn("API did not return successful top user data:", data);
            return [];
        }

        return data.users.map((user: any, index: number) => {
            const userPackages: string[] = user.packages ? user.packages.split(',') : [];
            const packageDetails = userPackages
                .map(pkg => {
                    const app = appsByPackageName.get(pkg);
                    return app ? { name: app.name, iconUrl: app.icon_url } : null;
                })
                .filter((p): p is { name: string; iconUrl: string; } => p !== null);

            return {
                id: user.email || index.toString(),
                email: user.email,
                appsPurchased: user.apps_purchased || 0,
                packages: packageDetails,
            }
        });
    } catch (error: any) {
        // This will catch network errors like 'fetch failed'
        console.error("Error fetching top purchase users:", error.message);
        // if (error.cause && (error.cause as any).code === 'ENOTFOUND') {
        //    console.error("Could not reach the endpoint URL. Please check the network connection and DNS settings.");
        // }
        return [];
    }
}
