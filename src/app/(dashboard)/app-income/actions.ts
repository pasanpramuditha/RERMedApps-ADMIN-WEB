
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { AppIncome } from './data';
import { getApps } from '../apps/actions';
import { logActivity } from '@/lib/activity-log';

const db = admin.firestore();
const appIncomesCollection = db.collection('app_incomes');

const appIncomeFormSchema = z.object({
  appId: z.string().min(1, "App is required"),
  category: z.enum(['IAP', 'AdMob']),
  year: z.coerce.number(),
  month: z.coerce.number().min(1).max(12),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
});

export async function addAppIncome(data: z.infer<typeof appIncomeFormSchema>) {
    await requireAdminAuth();
    const validation = appIncomeFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }
    
    try {
        const docRef = await appIncomesCollection.add(validation.data);
        revalidatePath('/app-income');
        
        await logActivity('ADD_APP_INCOME', {
            entityType: 'App Income',
            entityId: docRef.id,
            entityName: `Income for AppID ${validation.data.appId}`,
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to add income." };
    }
}

export async function updateAppIncome(id: string, data: z.infer<typeof appIncomeFormSchema>) {
    await requireAdminAuth();
    const validation = appIncomeFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        await appIncomesCollection.doc(id).update(validation.data);
        revalidatePath('/app-income');
        
        await logActivity('UPDATE_APP_INCOME', {
            entityType: 'App Income',
            entityId: id,
            entityName: `Income for AppID ${validation.data.appId}`,
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to update income." };
    }
}

export async function deleteAppIncome(id: string) {
    await requireAdminAuth();
    try {
        const incomeDoc = await appIncomesCollection.doc(id).get();
        if (!incomeDoc.exists) return { error: "Record not found." };
        const incomeName = `Income record ${id}`;
        
        await appIncomesCollection.doc(id).delete();
        revalidatePath('/app-income');
        
        await logActivity('DELETE_APP_INCOME', {
            entityType: 'App Income',
            entityId: id,
            entityName: incomeName,
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to delete income." };
    }
}

export async function listAppIncomes(): Promise<AppIncome[]> {
    await requireAdminAuth();
    try {
        const [incomeSnapshot, apps] = await Promise.all([
            // Query by year, then sort by month in code to avoid composite index requirement
            appIncomesCollection.orderBy('year', 'desc').get(),
            getApps()
        ]);
        
        if (incomeSnapshot.empty) return [];
        
        const appsMap = new Map(apps.map(app => [app.id, app]));

        const incomes = incomeSnapshot.docs.map(doc => {
            const data = doc.data();
            const app = appsMap.get(data.appId);
            return {
                id: doc.id,
                appName: app?.name || 'Unknown App',
                appIcon: app?.icon_url || 'https://placehold.co/40x40.png',
                ...data
            } as AppIncome;
        });

        // Sort by month in descending order after fetching
        incomes.sort((a, b) => b.month - a.month);

        return incomes;
    } catch (error) {
        console.error("Error listing app incomes:", error);
        return [];
    }
}
