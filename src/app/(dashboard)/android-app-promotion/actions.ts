'use server';

import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';
import type {
  CreatePromotionCampaignInput,
  PromotionCampaign,
  PromotionNotificationTemplate,
  PromotionPeriod,
  PromotionRewardValue,
  PromotionTemplate,
  PromotionUser,
  PromotionUserProfile,
} from './data';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postPromotionAction(tag: string, body: Record<string, string>) {
  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(await getAuthHeaders()),
    },
    body: new URLSearchParams({
      tag,
      db: '0',
      ...body,
    }),
  });

  const text = await response.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    return {
      success: false,
      error: `Backend returned invalid JSON: ${text.slice(0, 180)}`,
    };
  }

  if (!response.ok || !payload?.success) {
    return {
      success: false,
      error: payload?.error_msg || `Request failed with status ${response.status}`,
      payload,
    };
  }

  return payload;
}

export async function getAndroidPromotionUsers(period: PromotionPeriod = 'today') {
  await requireAdminAuth();
  const payload = await postPromotionAction('GET_ANDROID_PROMOTION_RECENT_PURCHASES', {
    period,
    limit: '150',
  });

  if (!payload.success) {
    return { users: [] as PromotionUser[], error: payload.error || 'Unable to load users' };
  }

  return {
    users: Array.isArray(payload.users) ? payload.users as PromotionUser[] : [],
    error: undefined,
  };
}

export async function getAndroidPromotionUserProfile(email: string) {
  await requireAdminAuth();
  const payload = await postPromotionAction('GET_ANDROID_PROMOTION_USER_PROFILE', { email });

  if (!payload.success) {
    return { profile: null as PromotionUserProfile | null, error: payload.error || 'Unable to load user profile' };
  }

  return {
    profile: {
      email: payload.email,
      summary: payload.summary,
      apps: Array.isArray(payload.apps) ? payload.apps : [],
    } as PromotionUserProfile,
    error: undefined,
  };
}

export async function getAndroidPromotionTemplates() {
  await requireAdminAuth();
  const payload = await postPromotionAction('GET_ANDROID_PROMOTION_TEMPLATES', {});

  if (!payload.success) {
    return { templates: [] as PromotionTemplate[], error: payload.error || 'Unable to load templates' };
  }

  return {
    templates: Array.isArray(payload.templates) ? payload.templates as PromotionTemplate[] : [],
    error: undefined,
  };
}

export async function getAndroidPromotionNotificationTemplates() {
  await requireAdminAuth();
  const payload = await postPromotionAction('GET_ANDROID_PROMOTION_NOTIFICATION_TEMPLATES', {});

  if (!payload.success) {
    return { notificationTemplates: [] as PromotionNotificationTemplate[], error: payload.error || 'Unable to load notification templates' };
  }

  return {
    notificationTemplates: Array.isArray(payload.notification_templates) ? payload.notification_templates as PromotionNotificationTemplate[] : [],
    error: undefined,
  };
}

export async function getAndroidPromotionCampaigns() {
  await requireAdminAuth();
  const payload = await postPromotionAction('GET_ANDROID_PROMOTION_CAMPAIGNS', {});

  if (!payload.success) {
    return { campaigns: [] as PromotionCampaign[], error: payload.error || 'Unable to load campaigns' };
  }

  return {
    campaigns: Array.isArray(payload.campaigns) ? payload.campaigns as PromotionCampaign[] : [],
    error: undefined,
  };
}

export async function getAndroidPromotionRewardValues(packageName: string) {
  await requireAdminAuth();
  const payload = await postPromotionAction('GET_ANDROID_PROMOTION_REWARD_VALUES', {
    package_name: packageName,
  });

  if (!payload.success) {
    return { rewardValues: [] as PromotionRewardValue[], error: payload.error || 'Unable to load reward values' };
  }

  return {
    rewardValues: Array.isArray(payload.reward_values) ? payload.reward_values as PromotionRewardValue[] : [],
    error: undefined,
  };
}

export async function createAndroidPromotionCampaign(input: CreatePromotionCampaignInput) {
  await requireAdminAuth();
  const payload = await postPromotionAction('CREATE_ANDROID_PROMOTION_CAMPAIGN', input);

  if (!payload.success) {
    return { success: false, error: payload.error || 'Unable to create promotion campaign' };
  }

  return {
    success: true,
    campaignId: payload.campaign_id as number | undefined,
    notificationQueued: Boolean(payload.notification_queued),
  };
}

export async function updateAndroidPromotionCampaignStatus(campaignId: number, status: string) {
  await requireAdminAuth();
  const payload = await postPromotionAction('UPDATE_ANDROID_PROMOTION_CAMPAIGN_STATUS', {
    campaign_id: String(campaignId),
    status,
  });

  if (!payload.success) {
    return { success: false, error: payload.error || 'Unable to update promotion campaign status' };
  }

  return { success: true };
}
