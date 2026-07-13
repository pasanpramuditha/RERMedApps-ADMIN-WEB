'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { getApps } from '../apps/actions';
import { getRegisteredUsers } from '../registered-user/actions';
import type { RegisteredUser } from '../registered-user/data';
import { listAllFeedbacks } from '../user-feedbacks/actions';

export interface SearchUserAnalysis {
  users: RegisteredUser[];
  totalApps: number;
  appNames: string[];
  countries: string[];
  devices: string[];
  purchaseCount: number;
  isPaidUser: boolean;
  feedbackAppNames: string[];
  activeOffers: string[];
  error?: string;
}

function uniqueClean(values: Array<string | undefined | null>, fallback?: string) {
  const cleaned = values
    .map((value) => (value || '').trim())
    .filter((value) => value && value.toLowerCase() !== 'n/a' && value.toLowerCase() !== 'unknown app');

  const uniqueValues = Array.from(new Set(cleaned));
  return uniqueValues.length > 0 ? uniqueValues : fallback ? [fallback] : [];
}

function formatCountry(value: string | undefined | null) {
  const countryCode = (value || '').trim().toUpperCase();
  if (!countryCode || countryCode === 'N/A') return '';
  if (countryCode.length !== 2) return countryCode;

  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    const countryName = displayNames.of(countryCode)?.toUpperCase();
    return countryName ? `${countryCode}:${countryName}` : countryCode;
  } catch {
    return countryCode;
  }
}

export async function getSearchUserAnalysis(email: string): Promise<SearchUserAnalysis> {
  await requireAdminAuth();
  const normalizedEmail = email.trim().toLowerCase();
  const apps = await getApps();
  const activeAndroidApps = apps.filter((app) => app.isActive && (app.os || '').toLowerCase().includes('android'));
  const { users, error } = await getRegisteredUsers(undefined, normalizedEmail, apps);

  let feedbackAppNames: string[] = [];
  try {
    const feedbackResults = await Promise.all([
      listAllFeedbacks('P'),
      listAllFeedbacks('R'),
      listAllFeedbacks('A'),
    ]);

    feedbackAppNames = uniqueClean(
      feedbackResults
        .flatMap((result) => result.feedbacks || [])
        .filter((feedback) => (feedback.email || '').trim().toLowerCase() === normalizedEmail)
        .map((feedback) => feedback.appName)
    );
  } catch (feedbackError) {
    console.warn('Could not load feedback data for search-user analysis:', feedbackError);
  }

  const purchaseCount = users.reduce((sum, user) => {
    if (typeof user.purchase_count === 'number') return sum + user.purchase_count;
    return sum + (user.purchase_premium ? 1 : 0);
  }, 0);

  return {
    users,
    totalApps: activeAndroidApps.length,
    appNames: uniqueClean(users.map((user) => user.appName)),
    countries: uniqueClean(users.map((user) => formatCountry(user.country))),
    devices: uniqueClean(users.map((user) => user.device)),
    purchaseCount,
    isPaidUser: purchaseCount > 0 || users.some((user) => user.purchase_premium),
    feedbackAppNames,
    activeOffers: [],
    error,
  };
}
