
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { EmployeePayment } from './data';
import { logActivity } from '@/lib/activity-log';
import { startOfDay } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { financeEmployeeNames, normalizeFinanceEmployeeName } from '@/lib/finance-employees';

const db = admin.firestore();
const paymentsCollection = db.collection('employee_payments');
const timeZone = 'Asia/Colombo';

const employeePaymentFormSchema = z.object({
  employeeName: z.enum(financeEmployeeNames),
  remarks: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
  date: z.date(),
  paymentSlipUrl: z.string().url().optional().or(z.literal('')),
  transactionType: z.enum(['Bank Transfer', 'Cash']).optional(),
});

export async function addEmployeePayment(data: z.infer<typeof employeePaymentFormSchema>) {
    await requireAdminAuth();
    const validation = employeePaymentFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }
    
    try {
        const zonedDate = toZonedTime(startOfDay(validation.data.date), timeZone);
        const docRef = await paymentsCollection.add({
            ...validation.data,
            date: admin.firestore.Timestamp.fromDate(zonedDate),
        });
        revalidatePath('/employee-payments');
        
        await logActivity('ADD_EMPLOYEE_PAYMENT', {
            entityType: 'Employee Payment',
            entityId: docRef.id,
            entityName: `Payment to ${validation.data.employeeName}`
        });

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to add payment." };
    }
}

export async function updateEmployeePayment(id: string, data: z.infer<typeof employeePaymentFormSchema>) {
    await requireAdminAuth();
    const validation = employeePaymentFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        const zonedDate = toZonedTime(startOfDay(validation.data.date), timeZone);
        await paymentsCollection.doc(id).update({
            ...validation.data,
            date: admin.firestore.Timestamp.fromDate(zonedDate),
        });
        revalidatePath('/employee-payments');
        
        await logActivity('UPDATE_EMPLOYEE_PAYMENT', {
            entityType: 'Employee Payment',
            entityId: id,
            entityName: `Payment to ${validation.data.employeeName}`
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to update payment." };
    }
}

export async function deleteEmployeePayment(id: string) {
    await requireAdminAuth();
    try {
        const doc = await paymentsCollection.doc(id).get();
        if (!doc.exists) return { error: "Payment not found." };
        const name = `Payment to ${doc.data()?.employeeName}`;

        await paymentsCollection.doc(id).delete();
        revalidatePath('/employee-payments');

        await logActivity('DELETE_EMPLOYEE_PAYMENT', {
            entityType: 'Employee Payment',
            entityId: id,
            entityName: name
        });
        
        return { success: true };
    } catch (error: any) {
        return { error: "Failed to delete payment." };
    }
}

export async function listEmployeePayments(): Promise<EmployeePayment[]> {
    await requireAdminAuth();
    try {
        const snapshot = await paymentsCollection.orderBy('date', 'desc').get();
        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const dateInColombo = toZonedTime(data.date.toDate(), timeZone);
            return {
                id: doc.id,
                employeeName: normalizeFinanceEmployeeName(data.employeeName),
                remarks: data.remarks,
                amount: data.amount,
                currency: data.currency || 'USD',
                date: formatTz(dateInColombo, 'yyyy-MM-dd', { timeZone }),
                paymentSlipUrl: data.paymentSlipUrl,
                transactionType: data.transactionType,
            } as EmployeePayment;
        });
    } catch (error) {
        console.error("Error listing employee payments:", error);
        return [];
    }
}
