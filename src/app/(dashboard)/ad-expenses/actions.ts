
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { AdExpense } from './data';
import { logActivity } from '@/lib/activity-log';

const db = admin.firestore();
const adExpensesCollection = db.collection('ad_expenses');

const adExpenseFormSchema = z.object({
  year: z.coerce.number(),
  month: z.coerce.number().min(1).max(12),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
});

export async function addAdExpense(data: z.infer<typeof adExpenseFormSchema>) {
    await requireAdminAuth();
    const validation = adExpenseFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }
    
    try {
        const docRef = await adExpensesCollection.add(validation.data);
        revalidatePath('/ad-expenses');

        await logActivity('ADD_AD_EXPENSE', {
            entityType: 'Ad Expense',
            entityId: docRef.id,
            entityName: `Ad expense for ${validation.data.year}-${validation.data.month}`
        });

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to add ad expense." };
    }
}

export async function updateAdExpense(id: string, data: z.infer<typeof adExpenseFormSchema>) {
    await requireAdminAuth();
    const validation = adExpenseFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        await adExpensesCollection.doc(id).update(validation.data);
        revalidatePath('/ad-expenses');
        
        await logActivity('UPDATE_AD_EXPENSE', {
            entityType: 'Ad Expense',
            entityId: id,
            entityName: `Ad expense for ${validation.data.year}-${validation.data.month}`
        });

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to update ad expense." };
    }
}

export async function deleteAdExpense(id: string) {
    await requireAdminAuth();
    try {
        const doc = await adExpensesCollection.doc(id).get();
        const data = doc.data();
        const name = data ? `Ad expense for ${data.year}-${data.month}` : `Ad Expense ID: ${id}`;

        await adExpensesCollection.doc(id).delete();
        revalidatePath('/ad-expenses');

        await logActivity('DELETE_AD_EXPENSE', {
            entityType: 'Ad Expense',
            entityId: id,
            entityName: name
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to delete ad expense." };
    }
}

export async function listAdExpenses(): Promise<AdExpense[]> {
    await requireAdminAuth();
    try {
        // First, query by year which is supported by default indexes.
        const snapshot = await adExpensesCollection.orderBy('year', 'desc').get();
        if (snapshot.empty) return [];

        // Then, perform the secondary sort by month in code.
        const expenses = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data
            } as AdExpense;
        });

        // Sort by year then by month
        expenses.sort((a, b) => {
            if (a.year !== b.year) {
                return b.year - a.year; // Descending year
            }
            return b.month - a.month; // Descending month
        });

        return expenses;

    } catch (error) {
        console.error("Error listing ad expenses:", error);
        return [];
    }
}
