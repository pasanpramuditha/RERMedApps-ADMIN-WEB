'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { CommonLink } from './data';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
  process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
  'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const linkFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  link: z.string().url('Please enter a valid URL'),
});

type CommonLinksApiResponse = {
  success?: boolean;
  error_msg?: string;
  message?: string;
  links?: Array<{
    id?: string | number;
    name?: string;
    link?: string;
    created_at?: string;
    updated_at?: string;
  }>;
  link?: {
    id?: string | number;
    name?: string;
    link?: string;
  };
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postCommonLinksApi(tag: string, body: Record<string, string> = {}) {
  const headers = await getAuthHeaders();
  headers['Content-Type'] = 'application/x-www-form-urlencoded';

  const response = await fetch(phpApiUrl, {
    method: 'POST',
    cache: 'no-store',
    headers,
    body: new URLSearchParams({
      tag,
      db: 'MAIN',
      ...body,
    }),
  });

  const raw = await response.text();
  try {
    return JSON.parse(raw) as CommonLinksApiResponse;
  } catch {
    return {
      success: false,
      error_msg: raw || 'PHP returned a non-JSON response.',
    };
  }
}

function normalizeLink(row: NonNullable<CommonLinksApiResponse['links']>[number]): CommonLink {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    link: String(row.link ?? ''),
  };
}

export async function addCommonLink(data: z.infer<typeof linkFormSchema>, idToken?: string | null) {
  await requireAdminAuth();
  const validation = linkFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  try {
    const payload = await postCommonLinksApi('SAVE_COMMON_LINK', {
      name: validation.data.name,
      link: validation.data.link,
    });

    if (!payload.success) {
      return { error: payload.error_msg || payload.message || 'Failed to add link.' };
    }

    revalidatePath('/common-links');
    await logActivity('ADD_COMMON_LINK', {
      entityType: 'Common Link',
      entityId: String(payload.link?.id ?? ''),
      entityName: validation.data.name,
    }, idToken || undefined);

    return { success: true };
  } catch {
    return { error: 'Failed to add link.' };
  }
}

export async function updateCommonLink(id: string, data: z.infer<typeof linkFormSchema>, idToken?: string | null) {
  await requireAdminAuth();
  const validation = linkFormSchema.safeParse(data);
  if (!validation.success) {
    return { error: 'Invalid data provided.', details: validation.error.flatten() };
  }

  try {
    const payload = await postCommonLinksApi('SAVE_COMMON_LINK', {
      id,
      name: validation.data.name,
      link: validation.data.link,
    });

    if (!payload.success) {
      return { error: payload.error_msg || payload.message || 'Failed to update link.' };
    }

    revalidatePath('/common-links');
    await logActivity('UPDATE_COMMON_LINK', {
      entityType: 'Common Link',
      entityId: id,
      entityName: validation.data.name,
    }, idToken || undefined);

    return { success: true };
  } catch {
    return { error: 'Failed to update link.' };
  }
}

export async function deleteCommonLink(id: string, idToken?: string | null) {
  await requireAdminAuth();
  try {
    const payload = await postCommonLinksApi('DELETE_COMMON_LINK', { id });

    if (!payload.success) {
      return { error: payload.error_msg || payload.message || 'Failed to delete link.' };
    }

    revalidatePath('/common-links');
    await logActivity('DELETE_COMMON_LINK', {
      entityType: 'Common Link',
      entityId: id,
      entityName: String(payload.link?.name ?? 'Common Link'),
    }, idToken || undefined);

    return { success: true };
  } catch {
    return { error: 'Failed to delete link.' };
  }
}

export async function listCommonLinks(): Promise<CommonLink[]> {
  await requireAdminAuth();
  try {
    const payload = await postCommonLinksApi('GET_COMMON_LINKS');
    if (!payload.success || !Array.isArray(payload.links)) {
      return [];
    }

    return payload.links.map(normalizeLink);
  } catch (error) {
    console.error('Error listing common links:', error);
    return [];
  }
}
