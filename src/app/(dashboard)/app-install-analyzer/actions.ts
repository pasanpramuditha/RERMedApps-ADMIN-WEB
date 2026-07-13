

'use server';

import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import type { App } from '../apps/data';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

type Period = 'last7days' | 'this_month' | 'last_month' | 'last3months';

export interface InstallData {
    date: string;
    installs: number;
}

export interface LanguageDistributionData {
    language: string;
    [appName: string]: { percentage: number, count: number } | string;
}

const allLanguages = ['EN', 'ES', 'PT', 'FR', 'RU', 'DE', 'ZH', 'KO', 'JA', 'ID', 'IT', 'TR', 'VI'];
const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function fetchUsersFromApi(tag: string, appIdArray: string[], language?: string, dateRange?: DateRange): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const formData = new URLSearchParams();
        formData.append('tag', tag);
        formData.append('db', '0');
        formData.append('app_id_array', JSON.stringify(appIdArray));
        
        if (language && language !== 'all') {
            formData.append('language', language);
        }

        if (dateRange?.from && dateRange?.to) {
            formData.append('from_date', format(dateRange.from, 'yyyy-MM-dd'));
            formData.append('to_date', format(dateRange.to, 'yyyy-MM-dd'));
        }

        const response = await fetch(phpApiUrl, {
            method: 'POST',
            signal: controller.signal,
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
                errorMessage = 'Authentication failed. Please check the PHP auth token in settings.';
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
                rawError: responseText.slice(0, 500),
            };
        }

    } catch (error: any) {
        console.error("Error fetching registered users:", error.message);
        if (error.cause) {
            console.error("Fetch error cause:", error.cause);
        }
        const message = error?.name === 'AbortError'
            ? `Backend timed out for ${tag}. Please check API connectivity.`
            : `Could not reach the endpoint URL. Please check the network connection and DNS settings. Details: ${error.message}`;
        return { success: false, users: [], results: [], error: message };
    } finally {
        clearTimeout(timeoutId);
    }
}

function processUsersToInstallData(apiUsers: any[]): InstallData[] {
    const dailyCounts = new Map<string, number>();

    apiUsers.forEach(user => {
        if (user.registered_date) {
            try {
                // Assuming date is in 'YYYY-MM-DD HH:mm:ss' format
                const datePart = user.registered_date.split(' ')[0];
                 if (datePart) {
                    const currentCount = dailyCounts.get(datePart) || 0;
                    dailyCounts.set(datePart, currentCount + 1);
                }
            } catch (e) {
                console.warn(`Could not parse date: ${user.registered_date}`);
            }
        }
    });

    const installData: InstallData[] = Array.from(dailyCounts.entries()).map(([date, installs]) => ({
        date,
        installs
    }));
    
    // Sort by date ascending
    installData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return installData;
}


export async function getInstallAnalysis(appIdsToSearch: string[], language: string, period: Period): Promise<{ data: InstallData[], error?: string }> {
    await requireAdminAuth();
    const validAppIds = Array.from(new Set(appIdsToSearch.map((id) => id.trim()).filter(Boolean)));

    if (validAppIds.length === 0) {
        return { data: [], error: "No apps found for the selected criteria or configuration is missing." };
    }

    const tagMap = {
        last7days: 'GET_LAST7DAYS_REGISTERED',
        this_month: 'GET_CURRENTMONTH_REGISTERED',
        last_month: 'GET_LASTMONTH_REGISTERED',
        last3months: 'GET_LAST3MONTH_REGISTERED',
    };
    const searchTag = tagMap[period];
    
    let apiUsers: any[] = [];
    const data = await fetchUsersFromApi(searchTag, validAppIds);
    
    if (data.error) {
        return { data: [], error: data.error };
    }

    if (data.success) {
        if (data.feedbackLst) {
             for (const dbName in data.feedbackLst) {
                if (Array.isArray(data.feedbackLst[dbName].users)) {
                    apiUsers.push(...data.feedbackLst[dbName].users);
                }
            }
        } else if (data.users) {
            apiUsers = data.users;
        }
    } else {
        console.warn(`API did not return successful user data for tag ${searchTag}:`, data);
    }
    
    const filteredUsers = language === 'all'
        ? apiUsers
        : apiUsers.filter(user => user.language === language);
    
    const processedData = processUsersToInstallData(filteredUsers);

    return { data: processedData };
}

export async function getInstallAnalysisByDateRange(appIdsToSearch: string[], language: string, dateRange?: DateRange): Promise<{ data: InstallData[], error?: string }> {
    await requireAdminAuth();
    const validAppIds = Array.from(new Set(appIdsToSearch.map((id) => id.trim()).filter(Boolean)));

    if (validAppIds.length === 0) {
        return { data: [], error: "No apps found for the selected criteria or configuration is missing." };
    }

    if (!dateRange?.from || !dateRange?.to) {
        return { data: [], error: "Please select a complete date range." };
    }

    let apiUsers: any[] = [];
    const data = await fetchUsersFromApi('GET_CUSTOM_DATE_REGISTERED', validAppIds, language, dateRange);
    
    if (data.error || data.error_msg) {
        return { data: [], error: data.error || data.error_msg };
    }

    if (data.success) {
        if (data.feedbackLst) {
             for (const dbName in data.feedbackLst) {
                if (Array.isArray(data.feedbackLst[dbName].users)) {
                    apiUsers.push(...data.feedbackLst[dbName].users);
                }
            }
        } else if (data.users) {
            apiUsers = data.users;
        }
    } else {
        console.warn(`API did not return successful user data for custom range:`, data);
    }
    
    const filteredUsers = language === 'all'
        ? apiUsers
        : apiUsers.filter(user => user.language === language);
    
    return { data: processUsersToInstallData(filteredUsers) };
}

export async function getLanguageDistribution(appIds: string[], dateRange: DateRange | undefined, apps: App[]): Promise<{ data: LanguageDistributionData[], error?: string, apps: App[] }> {
    await requireAdminAuth();
    if (appIds.length === 0) {
        return { data: [], apps: [] };
    }

    if (!dateRange?.from || !dateRange?.to) {
        return { data: [], error: "Please select a complete date range.", apps: [] };
    }

    const selectedApps = apps.filter(app => appIds.includes(app.id));
    const appIdsToSearch = Array.from(new Set(selectedApps.map(app => app.id).filter(Boolean)));

    if (appIdsToSearch.length === 0) {
        return { data: [], error: "No apps found for the selected criteria.", apps: [] };
    }

    const data = await fetchUsersFromApi('GET_CUSTOM_DATE_REGISTERED', appIdsToSearch, undefined, dateRange);

    if (data.error) {
        return { data: [], error: data.error, apps: [] };
    }

    const appUsersMap = new Map<string, any[]>();
    selectedApps.forEach(app => {
        if(app.db_name) appUsersMap.set(app.db_name, []);
    });

    if (data.success && data.feedbackLst) {
        for (const dbName in data.feedbackLst) {
            if (appUsersMap.has(dbName) && Array.isArray(data.feedbackLst[dbName].users)) {
                appUsersMap.set(dbName, data.feedbackLst[dbName].users);
            }
        }
    } else if (data.success && data.users) {
        // Handle single app response case
        for (const user of data.users) {
            if(user.app_db && appUsersMap.has(user.app_db)) {
                appUsersMap.get(user.app_db)?.push(user);
            }
        }
    }
    
    const finalData: LanguageDistributionData[] = allLanguages.map(lang => {
        const row: LanguageDistributionData = { language: lang.toUpperCase() };
        const lowerCaseLang = lang.toLowerCase();
        selectedApps.forEach(app => {
            const users = app.db_name ? appUsersMap.get(app.db_name) || [] : [];
            const totalUsers = users.length;
            if (totalUsers > 0) {
                const langUsers = users.filter(u => u.language === lowerCaseLang).length;
                row[app.name] = {
                    percentage: (langUsers / totalUsers) * 100,
                    count: langUsers,
                };
            } else {
                 row[app.name] = { percentage: 0, count: 0 };
            }
        });
        return row;
    });

    return { data: finalData, apps: selectedApps };
}
