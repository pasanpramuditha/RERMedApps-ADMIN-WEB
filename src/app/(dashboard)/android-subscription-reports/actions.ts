
'use server';

import { z } from 'zod';
import type { AndroidSubscriptionReportRow } from './data';
import Papa from 'papaparse';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

function parseSubscriptionsCSV(csvText: string): AndroidSubscriptionReportRow[] {
    // Detect and remove UTF-16 BOM
    if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.substring(1);
    }
    
    const parsed = Papa.parse(csvText, {
        header: true,
        transformHeader: h => h.trim().replace(/\s+/g, '').toLowerCase(),
        skipEmptyLines: true,
    });

    const requiredColumns = ['date', 'packagename', 'productid', 'newsubscriptions', 'cancelledsubscriptions', 'activesubscriptions'];
    const actualHeaders = parsed.meta.fields || [];
    const missingColumns = requiredColumns.filter(col => !actualHeaders.includes(col));
    
    if (missingColumns.length > 0) {
        throw new Error(`CSV file is missing required columns: ${missingColumns.join(', ')}`);
    }

    return parsed.data.map((row: any) => ({
        date: row['date'],
        packageName: row['packagename'],
        productId: row['productid'],
        country: row['country'],
        basePlanId: row['baseplanid'],
        offerId: row['offerid'],
        newSubscriptions: parseInt(row['newsubscriptions'], 10) || 0,
        cancelledSubscriptions: parseInt(row['cancelledsubscriptions'], 10) || 0,
        activeSubscriptions: parseInt(row['activesubscriptions'], 10) || 0,
    }));
}


export async function getSubscriptionReport(year: string, month: string): Promise<{ error: string, rawCsv?: string } | { subscriptions: AndroidSubscriptionReportRow[], fileName: string, rawCsv: string }> {
    await requireAdminAuth();
    void year;
    void month;
    return { error: 'Google Cloud Storage subscription report fetching has been removed from this project.', rawCsv: '' };
}

export async function listAvailableSubscriptionReports(): Promise<{ error: string } | { files: string[] }> {
    await requireAdminAuth();
    return { error: 'Google Cloud Storage subscription report listing has been removed from this project.' };
}


const reportSaveSchema = z.object({
    fileName: z.string(),
    reportDate: z.string().regex(/^\d{4}-\d{2}$/, "Report date must be in YYYY-MM format"),
    days: z.array(z.object({
        date: z.string(),
        productCount: z.number(),
        totalNewSubscriptions: z.number(),
        totalCancelledSubscriptions: z.number(),
        totalActiveSubscriptions: z.number(),
        products: z.array(z.object({
            packageName: z.string(),
            productId: z.string(),
            newSubscriptions: z.number(),
            cancelledSubscriptions: z.number(),
            activeSubscriptions: z.number(),
        })),
    })),
});

type DailySubscriptionProductMetric = {
    packageName: string;
    productId: string;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    activeSubscriptions: number;
};

type DailySubscriptionReportRow = {
    date: string;
    productCount: number;
    totalNewSubscriptions: number;
    totalCancelledSubscriptions: number;
    totalActiveSubscriptions: number;
    products: DailySubscriptionProductMetric[];
};

type SubscriptionReportApiResponse = {
    success?: boolean;
    error_msg?: string;
    message?: string;
    saved_days?: number;
    status?: number;
    raw_response?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

function apiError(payload: SubscriptionReportApiResponse, fallback: string) {
    return payload.error_msg || payload.message || fallback;
}

async function postSubscriptionReport(report: {
    fileName: string;
    reportDate: string;
    days: DailySubscriptionReportRow[];
}) {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';

    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: new URLSearchParams({
            tag: 'SAVE_GOOGLE_PLAY_SUBSCRIPTION_DAILY_REPORT',
            db: 'MAIN',
            report_json: JSON.stringify(report),
        }),
    });

    const raw = await response.text();
    let payload: SubscriptionReportApiResponse;

    try {
        payload = raw ? JSON.parse(raw) : {};
    } catch {
        payload = {
            success: false,
            error_msg: 'PHP returned a non-JSON response.',
            raw_response: raw,
        };
    }

    return {
        ...payload,
        status: response.status,
        raw_response: raw,
    };
}

export async function saveSubscriptionReport(data: z.infer<typeof reportSaveSchema>) {
    await requireAdminAuth();
    const validation = reportSaveSchema.safeParse(data);
    if (!validation.success) {
        console.error("Invalid subscription report data:", validation.error.flatten());
        return { error: "Invalid data format for saving." };
    }

    try {
        const [year, month] = validation.data.reportDate.split('-');
        const docId = `subscriptions_${year}_${month}`;

        if (!year || !month) {
            return { error: "Invalid reportDate format. Expected YYYY-MM." };
        }

        const payload = await postSubscriptionReport({
            fileName: validation.data.fileName,
            reportDate: validation.data.reportDate,
            days: validation.data.days,
        });

        if (!payload.success) {
            return { error: apiError(payload, 'Failed to save the subscription report to MySQL.') };
        }
        
        await logActivity('UPLOAD_ANDROID_SUBSCRIPTION_REPORT', {
            entityType: 'Report',
            entityId: docId,
            entityName: validation.data.fileName
        });
        
        console.log(`Saved Android subscription report to MySQL: ${payload.saved_days || validation.data.days.length} day(s)`);
        revalidatePath('/android-subscription-reports');
        return { success: true, docId: docId };

    } catch (err: any) {
        console.error("Error saving report to MySQL:", err);
        return { error: err.message || "Failed to save the report to the database." };
    }
}
