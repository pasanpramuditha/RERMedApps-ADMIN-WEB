'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { InAppAd, AdTemplate } from './data';
import { adTemplateSchema, inAppAdFormSchema } from './data';
import { getAppById } from '../apps/actions';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const apiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

type ApiPayload = {
    success?: boolean;
    error_msg?: string;
    message?: string;
    templates?: AdTemplate[];
    template?: AdTemplate;
    ads?: InAppAd[];
    ad?: InAppAd;
    url?: string;
    path?: string;
    raw_response?: string;
    status?: number;
};

type ActionResult = { success?: boolean; error?: string; details?: unknown; debug?: unknown };
type SyncActionResult = { success?: boolean; apiResponse?: any; error?: string };

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postPhpAction(tag: string, body: Record<string, string> = {}, multipart?: FormData): Promise<ApiPayload> {
    const headers = await getAuthHeaders();
    const requestBody = multipart || new URLSearchParams({ tag, db: 'MAIN', ...body });

    if (!multipart) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
        multipart.append('tag', tag);
        if (!body.db) {
            multipart.append('db', 'MAIN');
        }
        Object.entries(body).forEach(([key, value]) => multipart.append(key, value));
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: requestBody,
    });

    const raw = await response.text();
    let payload: ApiPayload;
    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        payload = {
            success: false,
            error_msg: 'PHP returned a non-JSON response.',
            raw_response: raw,
        };
    }

    return {
        ...payload,
        status: response.status,
        raw_response: raw,
    };
}

function apiError(payload: ApiPayload, fallback: string) {
    return payload.error_msg || payload.message || fallback;
}

function platformFromAppOs(os?: string): 'Android' | 'iOS' | 'Android & iOS' {
    const normalized = (os || '').toLowerCase();
    if (normalized.includes('ios') || normalized.includes('apple')) return 'iOS';
    if (normalized.includes('android')) return 'Android';
    return 'Android';
}

function templatePayload(data: z.infer<typeof adTemplateSchema>, user = 'admin') {
    return {
        name: data.name,
        platform: data.platform,
        android_json_b64: Buffer.from(JSON.stringify(data.android || null), 'utf8').toString('base64'),
        ios_json_b64: Buffer.from(JSON.stringify(data.ios || null), 'utf8').toString('base64'),
        user,
    };
}

function adPayload(data: z.infer<typeof inAppAdFormSchema>, appId: string, status = 'Pending', platform = 'Android') {
    return {
        app_id: appId,
        template_id: data.templateId,
        template_name: data.templateName,
        start_date: data.startDate,
        end_date: data.endDate,
        one_time: data.oneTime ? '1' : '0',
        target_group: data.targetGroup,
        language: data.language,
        platform,
        status,
        android_json_b64: Buffer.from(JSON.stringify(data.android || null), 'utf8').toString('base64'),
        ios_json_b64: Buffer.from(JSON.stringify(data.ios || null), 'utf8').toString('base64'),
    };
}

export async function getInAppAds(): Promise<InAppAd[]> {
    await requireAdminAuth();
    const payload = await postPhpAction('GET_IN_APP_ADS');
    return payload.success && Array.isArray(payload.ads) ? payload.ads : [];
}

export async function getInAppAdById(id: string): Promise<InAppAd | null> {
    await requireAdminAuth();
    const payload = await postPhpAction('GET_IN_APP_AD', { id });
    return payload.success && payload.ad ? payload.ad : null;
}

export async function getAdTemplates(): Promise<AdTemplate[]> {
    await requireAdminAuth();
    const payload = await postPhpAction('GET_IN_APP_AD_TEMPLATES');
    return payload.success && Array.isArray(payload.templates) ? payload.templates : [];
}

export async function getTemplateById(id: string): Promise<AdTemplate | null> {
    await requireAdminAuth();
    const payload = await postPhpAction('GET_IN_APP_AD_TEMPLATE', { id });
    return payload.success && payload.template ? payload.template : null;
}

export async function getTemplateDetails(id: string): Promise<Pick<AdTemplate, 'platform' | 'android' | 'ios' | 'name'> | null> {
    await requireAdminAuth();
    const template = await getTemplateById(id);
    if (!template) return null;
    return {
        name: template.name,
        platform: template.platform,
        android: template.android,
        ios: template.ios,
    };
}

export async function createAdTemplate(data: z.infer<typeof adTemplateSchema>, idToken?: string | null): Promise<ActionResult> {
    await requireAdminAuth();
    const validation = adTemplateSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.', details: validation.error.flatten() };
    }

    const payload = await postPhpAction('SAVE_IN_APP_AD_TEMPLATE', templatePayload(validation.data));
    if (!payload.success) {
        return { error: apiError(payload, 'Failed to create ad template.'), debug: payload };
    }

    await logActivity('CREATE_AD_TEMPLATE', {
        entityType: 'Ad Template',
        entityId: payload.template?.id || 'new',
        entityName: validation.data.name,
    }, idToken ?? undefined);

    revalidatePath('/in-app-ads/templates');
    return { success: true };
}

export async function updateAdTemplate(id: string, data: z.infer<typeof adTemplateSchema>, idToken?: string | null): Promise<ActionResult> {
    await requireAdminAuth();
    const validation = adTemplateSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.', details: validation.error.flatten() };
    }

    const payload = await postPhpAction('SAVE_IN_APP_AD_TEMPLATE', {
        id,
        ...templatePayload(validation.data),
    });

    if (!payload.success) {
        return { error: apiError(payload, 'Failed to update ad template.'), debug: payload };
    }

    await logActivity('UPDATE_AD_TEMPLATE', {
        entityType: 'Ad Template',
        entityId: id,
        entityName: validation.data.name,
    }, idToken ?? undefined);

    revalidatePath('/in-app-ads/templates');
    revalidatePath(`/in-app-ads/templates/${id}/edit`);
    return { success: true };
}

export async function deleteAdTemplate(id: string, idToken?: string | null): Promise<ActionResult> {
    await requireAdminAuth();
    const template = await getTemplateById(id);
    const payload = await postPhpAction('DELETE_IN_APP_AD_TEMPLATE', { id });
    if (!payload.success) {
        return { error: apiError(payload, 'Failed to delete ad template.'), debug: payload };
    }

    await logActivity('DELETE_AD_TEMPLATE', {
        entityType: 'Ad Template',
        entityId: id,
        entityName: template?.name || id,
    }, idToken ?? undefined);

    revalidatePath('/in-app-ads/templates');
    return { success: true };
}

export async function deleteMultipleAdTemplates(ids: string[], idToken?: string | null): Promise<ActionResult> {
    await requireAdminAuth();
    for (const id of ids) {
        const result = await deleteAdTemplate(id, idToken);
        if ('error' in result && result.error) return result;
    }
    return { success: true };
}

export async function createInAppAd(data: z.infer<typeof inAppAdFormSchema>, idToken?: string | null): Promise<ActionResult> {
    await requireAdminAuth();
    const validation = inAppAdFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.', details: validation.error.flatten() };
    }

    for (const appId of validation.data.targetApps) {
        const app = await getAppById(appId);
        const platform = platformFromAppOs(app?.os);
        const payload = await postPhpAction('SAVE_IN_APP_AD', adPayload(validation.data, appId, 'Pending', platform));
        if (!payload.success) {
            return { error: apiError(payload, `Failed to create in-app ad for ${app?.name || appId}.`), debug: payload };
        }

        await logActivity('CREATE_IN_APP_AD', {
            entityType: 'In-App Ad',
            entityId: payload.ad?.id || 'new',
            entityName: `Ad for ${app?.name || appId} using template ${validation.data.templateName}`,
        }, idToken ?? undefined);
    }

    revalidatePath('/in-app-ads');
    return { success: true };
}

export async function updateInAppAd(id: string, data: z.infer<typeof inAppAdFormSchema>, idToken?: string | null): Promise<ActionResult> {
    await requireAdminAuth();
    const validation = inAppAdFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.', details: validation.error.flatten() };
    }

    const current = await getInAppAdById(id);
    if (!current) {
        return { error: 'Ad not found.' };
    }

    const appId = validation.data.targetApps[0];
    const app = await getAppById(appId);
    const payload = await postPhpAction('SAVE_IN_APP_AD', {
        id,
        ...adPayload(validation.data, appId, current.status, platformFromAppOs(app?.os)),
    });

    if (!payload.success) {
        return { error: apiError(payload, 'Failed to update in-app ad.'), debug: payload };
    }

    if (current.status === 'Active') {
        const updatedAd = await getInAppAdById(id);
        if (updatedAd) {
            const syncResult = await syncActiveAd(updatedAd, true, false, true);
            if ('error' in syncResult) {
                return { error: `Ad saved, but live sync failed: ${syncResult.error}` };
            }
        }
    }

    await logActivity('UPDATE_IN_APP_AD', {
        entityType: 'In-App Ad',
        entityId: id,
        entityName: `Ad ID ${id}`,
    }, idToken ?? undefined);

    revalidatePath('/in-app-ads');
    revalidatePath(`/in-app-ads/${id}/edit`);
    return { success: true };
}

async function updateInAppAdStatusLocal(id: string, status: 'Active' | 'Paused' | 'Archived' | 'Pending' | 'Internal Testing') {
    const payload = await postPhpAction('UPDATE_IN_APP_AD_STATUS', { id, status });
    if (!payload.success) {
        return { success: false, error: apiError(payload, `Failed to update ad status to ${status}.`) };
    }
    revalidatePath('/in-app-ads');
    return { success: true };
}

async function syncActiveAd(ad: InAppAd, isUpdate: boolean, isProduction = false, isLiveUpdate = false): Promise<{ success: boolean; apiResponse?: any } | { error: string }> {
    if (!ad.appId) {
        return { error: 'Ad is missing app id.' };
    }

    if (isLiveUpdate) {
        const devResult = await syncActiveAd(ad, true, false, false);
        if ('error' in devResult) return { error: `Failed to update development server: ${devResult.error}` };
    }

    const adPlatform = ad.platform.toLowerCase();
    const tag = adPlatform.includes('ios')
        ? (isProduction ? 'PUBLISH_TO_PRODUCTION_IOS_CUSTOM_MESSAGE' : isUpdate ? 'UPDATE_DEV_IOS_CUSTOM_MESSAGE' : 'INSERT_IOS_CUSTOM_MESSAGE')
        : (isLiveUpdate ? 'UPDATE_LIVE_ANDROID_CUSTOM_MESSAGE' : isProduction ? 'PUBLISH_TO_PRODUCTION_ANDROID_CUSTOM_MESSAGE' : isUpdate ? 'UPDATE_DEV_ANDROID_CUSTOM_MESSAGE' : 'INSERT_ANDROID_CUSTOM_MESSAGE');

    const targetBody: Record<string, string> = isProduction || tag.includes('LIVE')
        ? { app_id: ad.appId }
        : { db: 'rermedap_admin', app_id: ad.appId };
    const formData = new FormData();
    formData.append('firebase_ad_id', ad.id);
    formData.append('valid_from', ad.startDate);
    formData.append('valid_to', ad.endDate);
    formData.append('onetime', ad.oneTime ? '1' : '0');
    formData.append('target_group', ad.targetGroup);
    formData.append('language', ad.language);
    formData.append('iap', '0');
    formData.append('case_subcase_id', '0');

    if (adPlatform.includes('ios')) {
        const iosConfig = ad.ios;
        if (!iosConfig) return { error: 'iOS configuration is missing.' };
        formData.append('content', Buffer.from(iosConfig.htmlContent, 'utf8').toString('base64'));
        formData.append('navigate_url', iosConfig.navigationUrl || '');
        formData.append('btn_close_bottom', iosConfig.closeButtonEnabled ? '1' : '0');
        formData.append('btn_close_top', iosConfig.closeButtonTopPosition ? '1' : '0');
        formData.append('btn_color', iosConfig.buttonColor || '');
        Object.entries(iosConfig.buttonText || {}).forEach(([lang, text]) => {
            const langMap: Record<string, string> = {
                en: 'english',
                de: 'german',
                es: 'spanish',
                fr: 'french',
                pt: 'portuguese',
                ru: 'russian',
                zh: 'chinese',
            };
            if (langMap[lang]) formData.append(`btn_name_${langMap[lang]}`, String(text));
        });
    } else {
        const androidConfig = ad.android;
        if (!androidConfig) return { error: 'Android configuration is missing.' };
        formData.append('content', Buffer.from(androidConfig.htmlContent, 'utf8').toString('base64'));
        formData.append('navigate_url', androidConfig.navigationUrl || '');
        ['ok', 'cancel', 'explore', 'premium', 'visit', 'download', 'invite'].forEach((type) => {
            formData.append(`btn_${type}`, androidConfig.buttonType === type ? '1' : '0');
        });
        formData.append('mobile_height', '1050');
        formData.append('tablet_height', '750');
    }

    const payload = await postPhpAction(tag, targetBody, formData);
    return payload.success ? { success: true, apiResponse: payload } : { error: apiError(payload, 'Server sync failed.') };
}

async function remoteAction(tag: string, target: { db?: string; appId?: string }, firebaseAdId: string) {
    const payload = await postPhpAction(tag, {
        ...(target.db ? { db: target.db } : {}),
        ...(target.appId ? { app_id: target.appId } : {}),
        firebase_ad_id: firebaseAdId,
    });
    if (!payload.success) {
        throw new Error(apiError(payload, `API returned an error for ${tag}.`));
    }
    return payload;
}

export async function activateInAppAd(id: string): Promise<SyncActionResult> {
    await requireAdminAuth();
    const ad = await getInAppAdById(id);
    if (!ad) return { error: 'Ad not found.' };

    const syncResult = await syncActiveAd(ad, false);
    if ('error' in syncResult) return syncResult;

    await updateInAppAdStatusLocal(ad.id, 'Internal Testing');
    revalidatePath('/in-app-ads');
    return { success: true, apiResponse: syncResult.apiResponse };
}

export async function publishInAppAdToProduction(id: string): Promise<SyncActionResult> {
    await requireAdminAuth();
    const ad = await getInAppAdById(id);
    if (!ad) return { error: 'Ad not found.' };
    if (ad.status !== 'Internal Testing') return { error: 'Only ads in Internal Testing can be published.' };

    const syncResult = await syncActiveAd(ad, false, true);
    if ('error' in syncResult) return syncResult;

    await updateInAppAdStatusLocal(ad.id, 'Active');
    revalidatePath('/in-app-ads');
    return syncResult;
}

export async function pauseInAppAd(ad: InAppAd): Promise<{ success: boolean; error?: string }> {
    await requireAdminAuth();
    try {
        if (ad.platform.toLowerCase().includes('android')) {
            await remoteAction('PAUSE_DEV_ANDROID_CUSTOM_MESSAGE', { db: 'rermedap_admin', appId: ad.appId }, ad.id);
            await remoteAction('PAUSE_LIVE_ANDROID_CUSTOM_MESSAGE', { appId: ad.appId }, ad.id);
        }
        return updateInAppAdStatusLocal(ad.id, 'Paused');
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to pause ad.' };
    }
}

export async function resumeInAppAd(ad: InAppAd): Promise<{ success: boolean; error?: string }> {
    await requireAdminAuth();
    try {
        if (ad.platform.toLowerCase().includes('android')) {
            await remoteAction('RESUME_DEV_ANDROID_CUSTOM_MESSAGE', { db: 'rermedap_admin', appId: ad.appId }, ad.id);
            await remoteAction('RESUME_LIVE_ANDROID_CUSTOM_MESSAGE', { appId: ad.appId }, ad.id);
        }
        return updateInAppAdStatusLocal(ad.id, 'Active');
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to resume ad.' };
    }
}

export async function stopInAppAd(ad: InAppAd): Promise<{ success: boolean; error?: string }> {
    await requireAdminAuth();
    try {
        if (ad.platform.toLowerCase().includes('android')) {
            await remoteAction('STOP_DEV_ANDROID_CUSTOM_MESSAGE', { db: 'rermedap_admin', appId: ad.appId }, ad.id);
            await remoteAction('STOP_LIVE_ANDROID_CUSTOM_MESSAGE', { appId: ad.appId }, ad.id);
        }
        return updateInAppAdStatusLocal(ad.id, 'Archived');
    } catch (error: any) {
        return { success: false, error: error?.message || 'Failed to stop ad.' };
    }
}

export async function revertAdToDevelopment(ad: InAppAd): Promise<SyncActionResult> {
    await requireAdminAuth();
    try {
        if (ad.platform.toLowerCase().includes('android')) {
            await remoteAction('REVERT_TO_DEVELOPMENT_ANDROID_CUSTOM_MESSAGE', { db: 'rermedap_admin', appId: ad.appId }, ad.id);
        }
        await updateInAppAdStatusLocal(ad.id, 'Pending');
        return { success: true };
    } catch (error: any) {
        return { error: error?.message || 'Failed to revert ad.' };
    }
}

export async function deleteInAppAd(ad: InAppAd, idToken?: string | null): Promise<{ success: boolean; error?: string }> {
    await requireAdminAuth();
    const payload = await postPhpAction('DELETE_IN_APP_AD', { id: ad.id });
    if (!payload.success) {
        return { success: false, error: apiError(payload, 'Failed to delete in-app ad.') };
    }

    await logActivity('DELETE_IN_APP_AD', {
        entityType: 'In-App Ad',
        entityId: ad.id,
        entityName: `Ad for ${ad.appName}`,
    }, idToken ?? undefined);

    revalidatePath('/in-app-ads');
    return { success: true };
}

export async function updateInAppAdStatus(id: string, status: 'Active' | 'Paused' | 'Archived' | 'Pending' | 'Internal Testing') {
    await requireAdminAuth();
    return updateInAppAdStatusLocal(id, status);
}

export async function uploadInAppAdImage(formData: FormData): Promise<{ success: boolean; url?: string; path?: string; error?: string; debug?: unknown }> {
    await requireAdminAuth();
    const payload = await postPhpAction('UPLOAD_IN_APP_AD_IMAGE', {}, formData);
    if (!payload.success || !payload.url) {
        return { success: false, error: apiError(payload, 'Failed to upload image.'), debug: payload };
    }

    return {
        success: true,
        url: payload.url,
        path: payload.path,
    };
}
