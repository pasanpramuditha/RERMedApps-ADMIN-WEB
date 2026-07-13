
'use server';

import { revalidatePath } from 'next/cache';
import type { Feedback } from './data';
import { getApps } from '../apps/actions';
import { groupRegistryApps, type App, type AppRegistryFamily } from '../apps/data';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

interface ApiFeedback {
    id: number;
    subject: string;
    message: string;
    created_date: string;
    from_email: string;
    app_version: string;
    resolved: number;
    seen: number;
    language?: string;
}

const AUTH_TOKEN_TTL_MS = 60_000;
let cachedPhpAuthToken: string | null = null;
let cachedPhpAuthTokenAt = 0;

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

function normalizeDbKey(value: string | undefined | null) {
    return (value || '').trim().toLowerCase();
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

function getStatus(resolved: number, seen: number): 'Pending' | 'Replied' | 'Archived' | 'Resolved' {
    if (resolved === 2 || (resolved === 1 && seen === 1)) return 'Archived';
    if (resolved === 1) return 'Resolved';
    if (seen === 1) return 'Replied';
    return 'Pending';
}


function parsePlatform(appVersion: string, os?: string): 'iOS' | 'Android' | 'Unknown' {
    const versionValue = (appVersion || '').toLowerCase();
    if (versionValue.startsWith('ios')) return 'iOS';
    if (versionValue) return 'Android';

    const osValue = (os || '').toLowerCase();
    if (osValue.includes('ios')) return 'iOS';
    if (osValue.includes('android')) return 'Android';
    return 'Unknown';
}

function indexFamiliesByDbName(apps: App[]) {
    const familiesByDbName = new Map<string, AppRegistryFamily>();

    for (const family of groupRegistryApps(apps)) {
        const dbKeys = new Set([
            normalizeDbKey(family.db_name),
            ...family.variants.map((variant) => normalizeDbKey(variant.db_name)),
        ]);

        for (const key of dbKeys) {
            if (key) {
                familiesByDbName.set(key, family);
            }
        }
    }

    return familiesByDbName;
}

function selectFeedbackApp(family: AppRegistryFamily | undefined, platform: 'iOS' | 'Android' | 'Unknown') {
    if (!family) {
        return undefined;
    }

    if (platform === 'iOS') {
        return family.ios || family.variants.find((app) => parsePlatform('', app.os) === 'iOS') || family.variants[0];
    }

    if (platform === 'Android') {
        return family.android || family.variants.find((app) => parsePlatform('', app.os) === 'Android') || family.variants[0];
    }

    return family.android || family.ios || family.variants[0];
}

async function parseApiResponse(response: Response, tag: string) {
    const text = await response.text();
    if (!text.trim()) {
        return { success: false, error_msg: `Empty response from backend for tag ${tag}.` };
    }

    try {
        return JSON.parse(text);
    } catch (error: any) {
        return {
            success: false,
            error_msg: `Backend returned invalid JSON for tag ${tag}: ${error.message}`,
            raw_error: text,
        };
    }
}

export async function listAllFeedbacks(type: 'P' | 'R' | 'A'): Promise<{ feedbacks: Feedback[], error?: string }> {
    await requireAdminAuth();
    try {
        const apps = await getApps();
        const familiesByDbName = indexFamiliesByDbName(apps);
        const appIdArray = Array.from(new Set(
            apps
                .filter(app => app.isActive && app.id)
                .map(app => app.id)
        ));
        
        const formData = new URLSearchParams();
        formData.append('tag', 'GET_ALL_APPS_FEEDBACK');
        formData.append('db', '0');
        formData.append('type', type);
        formData.append('app_id_array', JSON.stringify(appIdArray));
        formData.append('limit', '300');

        const response = await fetch(phpApiUrl, {
            method: 'POST',
            body: formData.toString(),
            cache: 'no-store', 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders()),
            }
        });

        const data = await parseApiResponse(response, 'GET_ALL_APPS_FEEDBACK');
        
        if (!response.ok) {
            return { feedbacks: [], error: data.error_msg || `API Error: ${response.status} ${response.statusText}` };
        }

        if (!data.success || typeof data.feedbackLst !== 'object') {
            console.warn("API did not return successful feedback data:", data);
            return { feedbacks: [], error: data.error_msg };
        }
        
        const allFeedbacks: Feedback[] = [];

        for (const dbName in data.feedbackLst) {
            const appFamily = familiesByDbName.get(normalizeDbKey(dbName));
            const fallbackApp = selectFeedbackApp(appFamily, 'Unknown');
            const appName = appFamily?.name || fallbackApp?.name || 'Unknown App';
            const appIcon = appFamily?.icon_url || fallbackApp?.icon_url || 'https://placehold.co/40x40.png';

            const feedbackList = data.feedbackLst[dbName].feedback;

            if (Array.isArray(feedbackList)) {
                const mappedFeedbacks: Feedback[] = feedbackList.map(item => {
                    const platform = parsePlatform(item.app_version, fallbackApp?.os);
                    const platformApp = selectFeedbackApp(appFamily, platform);

                    return {
                        id: item.id.toString(),
                        appId: platformApp?.id || fallbackApp?.id || '',
                        appName: appName,
                        appIcon: appIcon,
                        platform,
                        appVersion: item.app_version,
                        feedback: item.message,
                        dateTime: item.created_date,
                        email: item.from_email,
                        languageCode: item.language ? item.language.toUpperCase() : 'N/A',
                        status: getStatus(item.resolved, item.seen),
                        dbName: dbName,
                    };
                });
                allFeedbacks.push(...mappedFeedbacks);
            }
        }

        allFeedbacks.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

        return { feedbacks: allFeedbacks };

    } catch (error: any) {
        console.error("Error fetching all feedbacks:", error);
        return { feedbacks: [], error: error.message };
    }
}


async function updateRemoteFeedback(id: string, appId: string, tag: 'SET_FEEDBACK_ARCHIVED' | 'DELETE_FEEDBACK' | 'SET_FEEDBACK_RESOLVED', params?: Record<string, string>) {
     try {
        const formData = new URLSearchParams();
        formData.append('tag', tag);
        formData.append('app_id', appId);
        formData.append('id', id);

        if (params) {
            for (const key in params) {
                formData.append(key, params[key]);
            }
        }

        const response = await fetch(phpApiUrl, {
            method: 'POST',
            body: formData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders()),
            }
        });

        const result = await parseApiResponse(response, tag);

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(result)}`);
        }
        
        if (!result.success) {
            throw new Error(result.message || 'API returned an error.');
        }

        revalidatePath('/user-feedbacks');
        return { success: true, apiResponse: result };
    } catch (error: any) {
        console.error(`Error with tag ${tag}:`, error);
        return { error: error.message || 'An unknown error occurred' };
    }
}

export async function updateFeedbackStatus(id: string, appId: string, tag: 'SET_FEEDBACK_ARCHIVED' | 'DELETE_FEEDBACK') {
    await requireAdminAuth();
    const result = await updateRemoteFeedback(id, appId, tag);
    if(result.success) {
        await logActivity('UPDATE_FEEDBACK_STATUS', {
            entityType: 'Feedback',
            entityId: id,
            entityName: `Feedback ${id}`,
            changes: { status: tag === 'SET_FEEDBACK_ARCHIVED' ? 'Archived' : 'Deleted' }
        });
    }
    return result;
}


export async function sendReply(id: string, appId: string, email: string, replyText: string) {
    await requireAdminAuth();
    const params = {
        resolution: replyText,
        email: email,
    };

    const result = await updateRemoteFeedback(id, appId, 'SET_FEEDBACK_RESOLVED', params);
    if (result.success) {
        await logActivity('SEND_REPLY', {
            entityType: 'Feedback',
            entityId: id,
            entityName: `Reply to ${email}`,
            changes: {
                reply: replyText,
                notificationQueued: Boolean(result.apiResponse?.notification_queued),
                notificationQueueId: result.apiResponse?.notification_queue_id,
                notificationError: result.apiResponse?.notification_error_msg,
            }
        });
    }
    return {
        ...result,
        warning: result.success && !result.apiResponse?.notification_queued
            ? result.apiResponse?.notification_error_msg || 'Reply was saved, but the feedback notification was not queued.'
            : undefined,
    };
}

export type AppReplyKnowledge = {
    id: number;
    app_id?: number | null;
    app_name: string;
    platform: 'Android' | 'iOS' | 'All';
    app_context: string;
    common_rules?: string | null;
    known_limitations?: string | null;
    reply_tone?: string | null;
    max_reply_chars: number;
    status: 'ACTIVE' | 'INACTIVE';
};

export async function getAppReplyKnowledge(appName: string, platform: string): Promise<{ knowledge: AppReplyKnowledge | null; error?: string }> {
    await requireAdminAuth();
    try {
        const formData = new URLSearchParams();
        formData.append('tag', 'GET_APP_REPLY_KNOWLEDGE');
        formData.append('app_name', appName);
        formData.append('platform', platform);

        const response = await fetch(phpApiUrl, {
            method: 'POST',
            body: formData.toString(),
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders()),
            }
        });

        const result = await parseApiResponse(response, 'GET_APP_REPLY_KNOWLEDGE');

        if (!response.ok || !result.success) {
            return { knowledge: null, error: result.error_msg || `API Error: ${response.status} ${response.statusText}` };
        }

        return { knowledge: result.knowledge || null };
    } catch (error: any) {
        return { knowledge: null, error: error.message || 'Unable to load app reply knowledge.' };
    }
}
