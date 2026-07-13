
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { AppleSalesReportSchema, type AppleSalesReport, AppleReportRowSchema } from './data';

// The input to this action will have rows as a JSON string
const SaveActionSchema = AppleSalesReportSchema.extend({
    rows: z.string(),
});

export async function saveAppleSalesReport(data: {
    fileName: string;
    reportDate: string; // YYYY-MM
    summary: { totalProceedsUSD: number; totalUnits: number; };
    rows: string; // JSON string
}): Promise<{ error: string } | { success: boolean; docId: string }> {
    await requireAdminAuth();
    const validation = SaveActionSchema.safeParse(data);

    if (!validation.success) {
        console.error("Invalid Apple sales report data for action:", validation.error.flatten());
        return { error: "Invalid data format provided to server action." };
    }

    try {
        const parsedRows = z.array(AppleReportRowSchema).parse(JSON.parse(validation.data.rows));

        const db = admin.firestore();
        const [year, month] = validation.data.reportDate.split('-');
        
        if (!year || !month) {
            return { error: "Invalid reportDate format. Expected YYYY-MM." };
        }

        const docId = `sales_${year}_${month}`;
        const docRef = db.collection('apple_sales_reports').doc(docId);
        
        const dataToSave: AppleSalesReport = {
            ...validation.data,
            rows: parsedRows,
        };
        
        await docRef.set({
            ...dataToSave,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Saved Apple Sales report to Firestore document: ${docRef.id}`);
        revalidatePath('/app-publishing');
        return { success: true, docId: docRef.id };

    } catch (err: any) {
        console.error("Error saving Apple Sales report:", err);
        return { error: err.message || "Failed to save the report." };
    }
}
