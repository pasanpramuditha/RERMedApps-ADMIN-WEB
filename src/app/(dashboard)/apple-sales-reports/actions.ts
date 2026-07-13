
'use server';

import jwt from 'jsonwebtoken';
import pako from 'pako';
import Papa from 'papaparse';
import { getPrivateGlobalSettings } from '../settings/actions';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';
import type { AppleSalesReportRow } from './data';
import { convertToUSD } from '@/lib/currency';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const getAppleApiToken = async () => {
    const settings = await getPrivateGlobalSettings();
    const privateKey = settings.app_store_connect_api_private_key;
    const keyId = settings.app_store_connect_api_key_id;
    const issuerId = settings.app_store_connect_api_issuer_id;

    if (!privateKey || !keyId || !issuerId) {
        throw new Error("App Store Connect API credentials (Key ID, Issuer ID, Private Key) are not set in Global Settings.");
    }
    
    const payload = {
        iss: issuerId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15 minutes expiration
        aud: 'appstoreconnect-v1'
    };

    const header = {
        alg: 'ES256',
        kid: keyId,
        typ: 'JWT'
    };

    return jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'ES256', header });
};


function getDaysInMonth(reportDate: string) {
    const [year, month] = reportDate.split('-').map(Number);
    if (!year || !month) {
        throw new Error('Invalid reportDate format. Expected YYYY-MM.');
    }

    const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: dayCount }, (_, index) => `${year}-${String(month).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`);
}

async function fetchAppleSalesReport(token: string, vendorNumber: string, frequency: 'DAILY' | 'MONTHLY', reportDate: string): Promise<string | null> {
        const params = new URLSearchParams({
            'filter[frequency]': frequency,
            'filter[reportDate]': reportDate,
            'filter[reportType]': 'SALES',
            'filter[reportSubType]': 'SUMMARY',
            'filter[vendorNumber]': vendorNumber,
            'filter[version]': '1_0',
        });

        const response = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => response.text());
            console.error("Apple API Error:", errorData);
            const detail = errorData.errors?.[0]?.detail || JSON.stringify(errorData);

            if (response.status === 404 || /no\s+reports?|not\s+found|not\s+available/i.test(detail)) {
                return null;
            }

            throw new Error(`API request failed with status ${response.status}: ${detail}`);
        }
        
        const gzipBuffer = await response.arrayBuffer();
        return pako.ungzip(gzipBuffer, { to: 'string' });
}

async function parseAppleSalesCsv(csvData: string, fallbackDate: string): Promise<AppleSalesReportRow[]> {
    const parsed = Papa.parse(csvData, {
            header: true,
            delimiter: '\t',
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
        });
        
        const mappedRows = await Promise.all(parsed.data.map(async (row: any): Promise<AppleSalesReportRow> => {
             const proceeds = parseFloat(row['Developer Proceeds']) || 0;
             const currency = row['Customer Currency'] || 'USD';
             const customerPrice = parseFloat(row['Customer Price']) || 0;
             const proceedsUSD = await convertToUSD(proceeds, currency);
             const customerPriceUSD = await convertToUSD(customerPrice, currency);

             return {
                 provider: row['Provider'],
                 providerCountry: row['Provider Country'],
                 sku: row['SKU'],
                 developer: row['Developer'],
                 title: row['Title'],
                 version: row['Version'],
                 productTypeIdentifier: row['Product Type Identifier'],
                 units: parseInt(row['Units'], 10) || 0,
                 developerProceeds: proceeds,
                 developerProceedsUSD: proceedsUSD,
                 beginDate: row['Begin Date'] || fallbackDate,
                 endDate: row['End Date'] || fallbackDate,
                 customerCurrency: row['Customer Currency'],
                 countryCode: row['Country Code'],
                 currencyOfProceeds: row['Currency of Proceeds'],
                 appleIdentifier: row['Apple Identifier'],
                 customerPrice,
                 customerPriceUSD,
                 promoCode: row['Promo Code'],
                 parentIdentifier: row['Parent Identifier'],
                 subscription: row['Subscription'],
                 period: row['Period'],
                 category: row['Category'],
                 cmb: row['CMB'],
                 device: row['Device'],
                 supportedPlatforms: row['Supported Platforms'],
                 proceedsReason: row['Proceeds Reason'],
                 preservedPricing: row['Preserved Pricing'],
                 client: row['Client'],
                 orderType: row['Order Type'],
            };
        }));
        
        return mappedRows.filter(row => (row.developerProceeds || 0) > 0);
}

export async function getAppleSales(reportDate: string): Promise<{ rows: AppleSalesReportRow[], error?: string }> {
    await requireAdminAuth();
    try {
        const token = await getAppleApiToken();
        const settings = await getPrivateGlobalSettings();
        const vendorNumber = settings.app_store_connect_vendor_number;

        if (!vendorNumber) {
            throw new Error("App Store Connect Vendor Number is not set in Global Settings.");
        }

        const allRows: AppleSalesReportRow[] = [];
        const days = getDaysInMonth(reportDate);

        for (const day of days) {
            const csvData = await fetchAppleSalesReport(token, vendorNumber, 'DAILY', day);
            if (!csvData) {
                continue;
            }

            const rows = await parseAppleSalesCsv(csvData, day);
            allRows.push(...rows);
        }

        allRows.sort((a, b) => String(b.beginDate || '').localeCompare(String(a.beginDate || '')));

        return { rows: allRows };

    } catch (error: any) {
        console.error("Error fetching Apple sales report:", error);
        return { rows: [], error: error.message };
    }
}

const appleSalesDailyReportSchema = z.object({
    reportDate: z.string().regex(/^\d{4}-\d{2}$/, "Report date must be in YYYY-MM format"),
    days: z.array(z.object({
        date: z.string(),
        itemCount: z.number(),
        totalSalesUSD: z.number(),
        totalProceedsUSD: z.number(),
        items: z.array(z.object({
            sku: z.string(),
            appleIdentifier: z.string(),
            salesUSD: z.number(),
            proceedsUSD: z.number(),
        })),
    })),
});

type AppleSalesApiResponse = {
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

function apiError(payload: AppleSalesApiResponse, fallback: string) {
    return payload.error_msg || payload.message || fallback;
}

async function postAppleSalesReport(report: z.infer<typeof appleSalesDailyReportSchema>) {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';

    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: new URLSearchParams({
            tag: 'SAVE_APPLE_SALES_DAILY_REPORT',
            db: 'MAIN',
            report_json: JSON.stringify(report),
        }),
    });

    const raw = await response.text();
    let payload: AppleSalesApiResponse;

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

export async function saveAppleSalesReport(data: z.infer<typeof appleSalesDailyReportSchema>) {
    await requireAdminAuth();
    const validation = appleSalesDailyReportSchema.safeParse(data);

    if (!validation.success) {
        console.error("Invalid Apple sales report data for action:", validation.error.flatten());
        return { error: "Invalid data format provided to server action." };
    }

    try {
        const reportDate = validation.data.reportDate;
        const [year, month] = reportDate.split('-');
        
        if (!year || !month) {
            return { error: "Invalid reportDate format. Expected YYYY-MM." };
        }

        const docId = `earnings_${year}_${month}`;
        const payload = await postAppleSalesReport(validation.data);

        if (!payload.success) {
            return { error: apiError(payload, 'Failed to save the Apple sales report to MySQL.') };
        }

        await logActivity('UPLOAD_APPLE_SALES_REPORT', {
            entityType: 'Report',
            entityId: docId,
            entityName: docId
        });

        revalidatePath('/apple-sales-reports');
        return { success: true, docId };

    } catch (err: any) {
        console.error("Error saving Apple Sales report to MySQL:", err);
        return { error: err.message || "Failed to save the report." };
    }
}
