
'use server';

import type { Review } from './data';
import type { App } from '../apps/data';
import { requireAdminAuth } from '@/lib/server-auth';

export async function getReviewsForApp(app: App): Promise<{ token: string } | { error: string } | { reviews: Review[] }> {
    await requireAdminAuth();
    void app;
    return { error: 'Google Play Android Developer API has been removed from this project.' };
}
