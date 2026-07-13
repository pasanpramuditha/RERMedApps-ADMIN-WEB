'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { Expense } from './data';

const expenseSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0.01),
  date: z.date(),
  category: z.enum(['One-Time', 'Recurring']),
  currency: z.enum(['USD', 'LKR']),
  attachmentUrl: z.string().url().optional(),
});

const editExpenseSchema = expenseSchema.extend({
    id: z.string().min(1),
});

type AddExpenseData = z.infer<typeof expenseSchema>;
type EditExpenseData = z.infer<typeof editExpenseSchema>;


const db = admin.firestore();

export async function addExpense(data: AddExpenseData) {
    await requireAdminAuth();
    const validation = expenseSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.' };
    }

    try {
        const expenseData = {
            ...validation.data,
            date: validation.data.date.toISOString().split('T')[0], 
        };
        await db.collection('expenses').add(expenseData);
        revalidatePath('/expenses-tracker');
        return { success: true };
    } catch (error: any) {
        return { error: 'Failed to add expense. ' + error.message };
    }
}

export async function editExpense(data: EditExpenseData) {
    await requireAdminAuth();
    const validation = editExpenseSchema.safeParse(data);
    if (!validation.success) {
        return { error: 'Invalid data provided.' };
    }

    try {
        const { id, ...expenseData } = validation.data;
        const updatedData = {
            ...expenseData,
            date: expenseData.date.toISOString().split('T')[0],
        }
        await db.collection('expenses').doc(id).update(updatedData);
        revalidatePath('/expenses-tracker');
        return { success: true };
    } catch (error: any) {
        return { error: 'Failed to update expense. ' + error.message };
    }
}


export async function listExpenses(): Promise<Expense[]> {
    await requireAdminAuth();
    try {
        const snapshot = await db.collection('expenses').orderBy('date', 'desc').get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                amount: data.amount,
                category: data.category,
                date: data.date,
                currency: data.currency || 'USD', // Default to USD if not set
                attachmentUrl: data.attachmentUrl,
            } as Expense;
        });
    } catch (error) {
        console.error("Error listing expenses:", error);
        return [];
    }
}

export async function deleteExpense(id: string) {
    await requireAdminAuth();
    try {
        await db.collection('expenses').doc(id).delete();
        revalidatePath('/expenses-tracker');
        return { success: true };
    } catch (error: any) {
        return { error: 'Failed to delete expense. ' + error.message };
    }
}
