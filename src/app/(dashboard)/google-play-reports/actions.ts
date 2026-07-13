
'use server';

import { z } from 'zod';
import type { Earning } from './data';
import { earningSchema } from './data';
import Papa from 'papaparse';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

function parseCSV(csvText: string): Earning[] {
    // Remove potential BOM at the start of the file
    if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.substring(1);
    }
    
    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: header => header.trim().replace(/\s+/g, '_').toLowerCase(),
    });

    const actualHeaders = parsed.meta.fields || [];
    
    const hasProductId = actualHeaders.includes('product_id') || actualHeaders.includes('package_id');
    const hasTransactionType = actualHeaders.includes('transaction_type');
    const hasAmount = actualHeaders.includes('amount_(merchant_currency)');
    const hasTransactionDate = actualHeaders.includes('transaction_date');

    if (!hasTransactionType || !hasAmount || !hasTransactionDate) {
         throw new Error(`CSV file is missing one of the required columns: Transaction Type, Amount (Merchant Currency), Transaction Date`);
    }
    if (!hasProductId) {
         throw new Error(`CSV file is missing both 'Product ID' and 'Package ID'. Please ensure one of them is present.`);
    }

    const productIdKey = actualHeaders.includes('product_id') ? 'product_id' : 'package_id';


    const earnings: Earning[] = parsed.data
        .map((row: any, index: number) => ({
            id: `${row['transaction_id'] || index}`,
            description: row['description'],
            transactionDate: row['transaction_date'],
            transactionTime: row['transaction_time'],
            taxType: row['tax_type'],
            transactionType: row['transaction_type'],
            refundType: row['refund_type'],
            productTitle: row['product_title'],
            productId: row[productIdKey],
            productType: row['product_type'],
            skuId: row['sku_id'] || row[productIdKey], // Sku Id might not always be present
            hardware: row['hardware'],
            buyerCountry: row['buyer_country'],
            buyerState: row['buyer_state'],
            buyerPostalCode: row['buyer_postal_code'],
            buyerCurrency: row['buyer_currency'],
            amountBuyerCurrency: parseFloat(row['amount_(buyer_currency)']) || 0,
            currencyConversionRate: parseFloat(row['currency_conversion_rate']) || 0,
            merchantCurrency: row['merchant_currency'],
            amountMerchantCurrency: parseFloat(row['amount_(merchant_currency)']) || 0,
            basePlanId: row['base_plan_id'],
            offerId: row['offer_id'],
            groupId: row['group_id'],
            firstUsd1mEligible: row['first_usd_1m_eligible'],
            serviceFeePercent: parseFloat(row['service_fee_%']) || 0,
            feeDescription: row['fee_description'],
            promotionId: row['promotion_id'],
        }));

    return earnings;
}


export async function getEarningsReport(year: string, month: string): Promise<{ error: string } | { earnings: Earning[] }> {
    await requireAdminAuth();
    void year;
    void month;
    return { error: 'Google Cloud Storage report fetching has been removed from this project.' };
}

export async function listAvailableReports(): Promise<{ error: string } | { files: string[] }> {
    await requireAdminAuth();
    return { error: 'Google Cloud Storage report listing has been removed from this project.' };
}

const reportSaveSchema = z.object({
    fileName: z.string(),
    reportDate: z.string().regex(/^\d{4}-\d{2}$/, "Report date must be in YYYY-MM format"),
    rows: z.array(earningSchema),
});

type GooglePlayReportApiResponse = {
    success?: boolean;
    error_msg?: string;
    message?: string;
    saved_days?: number;
    docId?: string;
    status?: number;
    raw_response?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

function apiError(payload: GooglePlayReportApiResponse, fallback: string) {
    return payload.error_msg || payload.message || fallback;
}

async function postGooglePlayReport(report: {
    fileName: string;
    reportDate: string;
    rows: Earning[];
}) {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';

    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: new URLSearchParams({
            tag: 'SAVE_GOOGLE_PLAY_SALES_REPORT',
            db: 'MAIN',
            report_json: JSON.stringify(report),
        }),
    });

    const raw = await response.text();
    let payload: GooglePlayReportApiResponse;

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

export async function saveEarningsReport(data: z.infer<typeof reportSaveSchema>) {
    await requireAdminAuth();
    const validation = reportSaveSchema.safeParse(data);
    if (!validation.success) {
        console.error("Invalid report data:", validation.error.flatten());
        return { error: "Invalid data format for saving." };
    }

    try {
        const [year, month] = validation.data.reportDate.split('-');
        
        if (!year || !month) {
            return { error: "Invalid reportDate format. Expected YYYY-MM." };
        }

        const payload = await postGooglePlayReport({
            fileName: validation.data.fileName,
            reportDate: validation.data.reportDate,
            rows: validation.data.rows,
        });

        if (!payload.success) {
            return { error: apiError(payload, 'Failed to save the report to MySQL.'), debug: payload };
        }
        
        await logActivity('UPLOAD_ANDROID_SALES_REPORT', {
            entityType: 'Report',
            entityId: `earnings_${year}_${month}`,
            entityName: validation.data.fileName
        });

        console.log(`Saved Google Play earnings report to MySQL: ${payload.saved_days || 0} day(s)`);
        revalidatePath('/google-play-reports');
        return { success: true, docId: `earnings_${year}_${month}` };

    } catch (err: any) {
        console.error("Error saving report to MySQL:", err);
        return { error: err.message || "Failed to save the report to the database." };
    }
}
