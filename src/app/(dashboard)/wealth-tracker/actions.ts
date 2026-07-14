
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { FixedDeposit, CashAccount } from './data';
import { logActivity } from '@/lib/activity-log';

const db = admin.firestore();
const fixedDepositsCollection = db.collection('fixed_deposits');
const cashAccountsCollection = db.collection('cash_accounts');

// Fixed Deposit Schemas and Actions
const fixedDepositFormSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['LKR', 'USD']).default('LKR'),
  startDate: z.date(),
  endDate: z.date(),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative"),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

export async function addFixedDeposit(data: z.infer<typeof fixedDepositFormSchema>) {
    await requireAdminAuth();
    const validation = fixedDepositFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }
    
    try {
        const docRef = await fixedDepositsCollection.add(validation.data);
        revalidatePath('/wealth-tracker');
        
        await logActivity('ADD_FIXED_DEPOSIT', {
            entityType: 'Fixed Deposit',
            entityId: docRef.id,
            entityName: `FD at ${validation.data.bankName}`
        });

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to add fixed deposit." };
    }
}

export async function updateFixedDeposit(id: string, data: z.infer<typeof fixedDepositFormSchema>) {
    await requireAdminAuth();
    const validation = fixedDepositFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        await fixedDepositsCollection.doc(id).update(validation.data);
        revalidatePath('/wealth-tracker');

        await logActivity('UPDATE_FIXED_DEPOSIT', {
            entityType: 'Fixed Deposit',
            entityId: id,
            entityName: `FD at ${validation.data.bankName}`
        });

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to update fixed deposit." };
    }
}

export async function deleteFixedDeposit(id: string) {
    await requireAdminAuth();
    try {
        const doc = await fixedDepositsCollection.doc(id).get();
        if (!doc.exists) return { error: "Deposit not found." };
        const name = `FD at ${doc.data()?.bankName}`;
        
        await fixedDepositsCollection.doc(id).delete();
        revalidatePath('/wealth-tracker');

        await logActivity('DELETE_FIXED_DEPOSIT', {
            entityType: 'Fixed Deposit',
            entityId: id,
            entityName: name
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to delete fixed deposit." };
    }
}

export async function listFixedDeposits(): Promise<FixedDeposit[]> {
    await requireAdminAuth();
    try {
        const snapshot = await fixedDepositsCollection.orderBy('endDate', 'desc').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                bankName: data.bankName,
                amount: data.amount,
                currency: data.currency || 'LKR',
                startDate: (data.startDate.toDate() as Date).toISOString().split('T')[0],
                endDate: (data.endDate.toDate() as Date).toISOString().split('T')[0],
                interestRate: data.interestRate,
            } as FixedDeposit;
        });
    } catch (error) {
        console.error("Error listing fixed deposits:", error);
        return [];
    }
}

// Cash Account Schemas and Actions
const cashAccountFormSchema = z.object({
    bankName: z.string().min(1, "Bank name is required"),
    balance: z.coerce.number().min(0, "Balance cannot be negative"),
});

export async function addCashAccount(data: z.infer<typeof cashAccountFormSchema>) {
    await requireAdminAuth();
    const validation = cashAccountFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        const docRef = await cashAccountsCollection.add(validation.data);
        revalidatePath('/wealth-tracker');
        
        await logActivity('ADD_CASH_ACCOUNT', {
            entityType: 'Cash Account',
            entityId: docRef.id,
            entityName: `Account at ${validation.data.bankName}`
        });

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to add cash account." };
    }
}

export async function updateCashAccount(id: string, data: z.infer<typeof cashAccountFormSchema>) {
    await requireAdminAuth();
    const validation = cashAccountFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        await cashAccountsCollection.doc(id).update(validation.data);
        revalidatePath('/wealth-tracker');
        
        await logActivity('UPDATE_CASH_ACCOUNT', {
            entityType: 'Cash Account',
            entityId: id,
            entityName: `Account at ${validation.data.bankName}`
        });

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to update cash account." };
    }
}

export async function deleteCashAccount(id: string) {
    await requireAdminAuth();
    try {
        const doc = await cashAccountsCollection.doc(id).get();
        if (!doc.exists) return { error: "Account not found." };
        const name = `Account at ${doc.data()?.bankName}`;

        await cashAccountsCollection.doc(id).delete();
        revalidatePath('/wealth-tracker');

        await logActivity('DELETE_CASH_ACCOUNT', {
            entityType: 'Cash Account',
            entityId: id,
            entityName: name
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to delete cash account." };
    }
}

export async function listCashAccounts(): Promise<CashAccount[]> {
    await requireAdminAuth();
    try {
        const snapshot = await cashAccountsCollection.orderBy('bankName').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                bankName: data.bankName,
                balance: data.balance,
            } as CashAccount;
        });
    } catch (error) {
        console.error("Error listing cash accounts:", error);
        return [];
    }
}
