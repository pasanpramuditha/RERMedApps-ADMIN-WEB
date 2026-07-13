
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { ReceivedPayment } from './data';
import { logActivity } from '@/lib/activity-log';
import { startOfDay } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';

const db = admin.firestore();
const paymentsCollection = db.collection('apps_received_payments'); // Corrected collection name
const timeZone = 'Asia/Colombo';

const receivedPaymentFormSchema = z.object({
  source: z.string().min(1, "Source is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
  date: z.date(),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
});

export async function addReceivedPayment(data: z.infer<typeof receivedPaymentFormSchema>, idToken?: string) {
    await requireAdminAuth();
    const validation = receivedPaymentFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }
    
    try {
        const zonedDate = toZonedTime(startOfDay(validation.data.date), timeZone);
        const docRef = await paymentsCollection.add({
            category: validation.data.source, // Map source to category
            description: validation.data.description,
            amount: validation.data.amount,
            currency: validation.data.currency,
            date: admin.firestore.Timestamp.fromDate(zonedDate),
            attachmentUrl: validation.data.attachmentUrl,
        });
        revalidatePath('/received-payments');
        
        await logActivity('ADD_RECEIVED_PAYMENT', {
            entityType: 'Received Payment',
            entityId: docRef.id,
            entityName: validation.data.description,
        }, idToken);

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to add payment." };
    }
}

export async function updateReceivedPayment(id: string, data: z.infer<typeof receivedPaymentFormSchema>, idToken?: string) {
    await requireAdminAuth();
    const validation = receivedPaymentFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        const zonedDate = toZonedTime(startOfDay(validation.data.date), timeZone);
        await paymentsCollection.doc(id).update({
            category: validation.data.source, // Map source to category
            description: validation.data.description,
            amount: validation.data.amount,
            currency: validation.data.currency,
            date: admin.firestore.Timestamp.fromDate(zonedDate),
            attachmentUrl: validation.data.attachmentUrl,
        });
        revalidatePath('/received-payments');
        
        await logActivity('UPDATE_RECEIVED_PAYMENT', {
            entityType: 'Received Payment',
            entityId: id,
            entityName: validation.data.description,
        }, idToken);

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to update payment." };
    }
}

export async function deleteReceivedPayment(id: string, idToken?: string) {
    await requireAdminAuth();
    try {
        const paymentRef = paymentsCollection.doc(id);
        const paymentDoc = await paymentRef.get();
        if (!paymentDoc.exists) return { error: "Payment record not found." };
        const paymentName = paymentDoc.data()?.description || 'Unknown Payment';

        await paymentRef.delete();
        revalidatePath('/received-payments');

        await logActivity('DELETE_RECEIVED_PAYMENT', {
            entityType: 'Received Payment',
            entityId: id,
            entityName: paymentName,
        }, idToken);

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to delete payment." };
    }
}

export async function listReceivedPayments(): Promise<ReceivedPayment[]> {
    await requireAdminAuth();
    try {
        const snapshot = await paymentsCollection.orderBy('date', 'desc').get();
        if (snapshot.empty) return [];

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const dateInColombo = toZonedTime(data.date.toDate(), timeZone);
            return {
                id: doc.id,
                source: data.category, // Map category back to source for display
                description: data.description,
                amount: data.amount,
                currency: data.currency || 'USD',
                date: formatTz(dateInColombo, 'yyyy-MM-dd', { timeZone }),
                attachmentUrl: data.attachmentUrl,
            } as ReceivedPayment;
        });
    } catch (error) {
        console.error("Error listing received payments:", error);
        return [];
    }
}
