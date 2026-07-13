
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import type { AppleSubscriptionReportRow } from './data';
import { logActivity } from '@/lib/activity-log';
import jwt from 'jsonwebtoken';
import pako from 'pako';
import Papa from 'papaparse';
import { getPrivateGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const appleSubscriptionDailyReportSchema = z.object({
    reportDate: z.string().regex(/^\d{4}-\d{2}$/, 'Report date must be in YYYY-MM format'),
    days: z.array(z.object({
        date: z.string(),
        itemCount: z.number(),
        totalActiveSubs: z.number(),
        items: z.array(z.object({
            appAppleId: z.string().optional(),
            subscriptionAppleId: z.string(),
            subscriptionName: z.string().optional(),
            activeSubs: z.number(),
        })),
    })),
});

type AppleSubscriptionDailyReport = z.infer<typeof appleSubscriptionDailyReportSchema>;

export async function saveAppleSubscriptionReport(data: unknown): Promise<{ error: string } | { success: boolean; docId: string }> {
    await requireAdminAuth();
    const validation = appleSubscriptionDailyReportSchema.safeParse(data);

    if (!validation.success) {
        console.error("Invalid Apple Subscription report data:", validation.error.flatten());
        return { error: "Invalid report data provided." };
    }

    try {
        const [year, month] = validation.data.reportDate.split('-');
        const docId = `subscriptions_${year}_${month}`;
        const payload = await postAppleSubscriptionReport(validation.data);

        if (!payload.success) {
            return { error: apiError(payload, 'Failed to save the Apple subscription report to MySQL.') };
        }

        await logActivity('UPLOAD_APPLE_SUBSCRIPTION_REPORT', {
            entityType: 'Report',
            entityId: docId,
            entityName: docId,
        });

        console.log(`Saved Apple Subscription report data to MySQL: ${payload.saved_days || validation.data.days.length} day(s)`);
        revalidatePath('/apple-subscription-reports');
        return { success: true, docId };

    } catch (err: any) {
        console.error("Error saving Apple Subscription report to MySQL:", err);
        return { error: err.message || "Failed to save the report." };
    }
}

type AppleSubscriptionApiResponse = {
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

function apiError(payload: AppleSubscriptionApiResponse, fallback: string) {
    return payload.error_msg || payload.message || fallback;
}

async function postAppleSubscriptionReport(report: AppleSubscriptionDailyReport) {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';

    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: new URLSearchParams({
            tag: 'SAVE_APPLE_SUBSCRIPTION_DAILY_REPORT',
            db: 'MAIN',
            report_json: JSON.stringify(report),
        }),
    });

    const raw = await response.text();
    let payload: AppleSubscriptionApiResponse;

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

async function fetchAppleSubscriptionReport(token: string, vendorNumber: string, reportDate: string): Promise<string | null> {
    const params = new URLSearchParams({
        'filter[frequency]': 'DAILY',
        'filter[reportDate]': reportDate,
        'filter[reportType]': 'SUBSCRIPTION',
        'filter[reportSubType]': 'SUMMARY',
        'filter[vendorNumber]': vendorNumber,
        'filter[version]': '1_4',
    });

    const response = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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

const safeParseNumber = (value: string | undefined): number | undefined => {
    if (value === undefined || value === null) return undefined;
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
};

function parseAppleSubscriptionCsv(csvData: string, fallbackDate: string): AppleSubscriptionReportRow[] {
    const parsed = Papa.parse(csvData, {
        header: true,
        delimiter: '\t',
        skipEmptyLines: true,
        transformHeader: header => header.trim(),
    });

    return parsed.data.map((row: any) => ({
        date: row['Begin Date'] || fallbackDate,
        appName: row['App Name'],
        appAppleId: row['App Apple ID'],
        subscriptionName: row['Subscription Name'],
        subscriptionAppleId: row['Subscription Apple ID'],
        subscriptionGroupId: row['Subscription Group ID'],
        standardSubscriptionDuration: row['Standard Subscription Duration'],
        subscriptionOfferName: row['Subscription Offer Name'],
        promotionalOfferId: row['Promotional Offer ID'],
        customerPrice: safeParseNumber(row['Customer Price']),
        customerCurrency: row['Customer Currency'],
        developerProceeds: safeParseNumber(row['Developer Proceeds']),
        proceedsCurrency: row['Proceeds Currency'],
        preservedPricing: row['Preserved Pricing'],
        proceedsReason: row['Proceeds Reason'],
        client: row['Client'],
        device: row['Device'],
        state: row['State'],
        country: row['Country'],
        activeStandardPriceSubscriptions: safeParseNumber(row['Active Standard Price Subscriptions']),
        activeFreeTrialIntroductoryOfferSubscriptions: safeParseNumber(row['Active Free Trial Introductory Offer Subscriptions']),
        activePayUpFrontIntroductoryOfferSubscriptions: safeParseNumber(row['Active Pay Up Front Introductory Offer Subscriptions']),
        activePayAsYouGoIntroductoryOfferSubscriptions: safeParseNumber(row['Active Pay As You Go Introductory Offer Subscriptions']),
        freeTrialPromotionalOfferSubscriptions: safeParseNumber(row['Free Trial Promotional Offer Subscriptions']),
        payUpFrontPromotionalOfferSubscriptions: safeParseNumber(row['Pay Up Front Promotional Offer Subscriptions']),
        payAsYouGoPromotionalOfferSubscriptions: safeParseNumber(row['Pay As You Go Promotional Offer Subscriptions']),
        freeTrialOfferCodeSubscriptions: safeParseNumber(row['Free Trial Offer Code Subscriptions']),
        payUpFrontOfferCodeSubscriptions: safeParseNumber(row['Pay Up Front Offer Code Subscriptions']),
        payAsYouGoOfferCodeSubscriptions: safeParseNumber(row['Pay As You Go Offer Code Subscriptions']),
        marketingOptIns: safeParseNumber(row['Marketing Opt-Ins']),
        billingRetry: safeParseNumber(row['Billing Retry']),
        gracePeriod: safeParseNumber(row['Grace Period']),
        subscribers: safeParseNumber(row['Subscribers']),
        freeTrialWinBackOffers: safeParseNumber(row['Free Trial Win-back Offers']),
        payUpFrontWinBackOffers: safeParseNumber(row['Pay Up Front Win-back Offers']),
        payAsYouGoWinBackOffers: safeParseNumber(row['Pay As You Go Win-back Offers']),
    }));
}

const subscriptionCountFields: Array<keyof AppleSubscriptionReportRow> = [
    'activeStandardPriceSubscriptions',
    'activeFreeTrialIntroductoryOfferSubscriptions',
    'activePayUpFrontIntroductoryOfferSubscriptions',
    'activePayAsYouGoIntroductoryOfferSubscriptions',
    'freeTrialPromotionalOfferSubscriptions',
    'payUpFrontPromotionalOfferSubscriptions',
    'payAsYouGoPromotionalOfferSubscriptions',
    'freeTrialOfferCodeSubscriptions',
    'payUpFrontOfferCodeSubscriptions',
    'payAsYouGoOfferCodeSubscriptions',
    'marketingOptIns',
    'billingRetry',
    'gracePeriod',
    'subscribers',
    'freeTrialWinBackOffers',
    'payUpFrontWinBackOffers',
    'payAsYouGoWinBackOffers',
];

function aggregateAppleSubscriptionRowsByDay(rows: AppleSubscriptionReportRow[]) {
    const grouped = new Map<string, AppleSubscriptionReportRow>();

    rows.forEach((row) => {
        const date = row.date || '';
        const appAppleId = row.appAppleId || '';
        const subscriptionAppleId = row.subscriptionAppleId || '';
        const subscriptionName = row.subscriptionName || '';
        const key = `${date}::${appAppleId}::${subscriptionAppleId || subscriptionName}`;

        const existing = grouped.get(key) || {
            date: row.date,
            appName: row.appName,
            appAppleId: row.appAppleId,
            subscriptionName: row.subscriptionName,
            subscriptionAppleId: row.subscriptionAppleId,
            subscriptionGroupId: row.subscriptionGroupId,
            standardSubscriptionDuration: row.standardSubscriptionDuration,
            device: 'All',
            country: 'All',
        };

        subscriptionCountFields.forEach((field) => {
            const current = typeof existing[field] === 'number' ? (existing[field] as number) : 0;
            const next = typeof row[field] === 'number' ? (row[field] as number) : 0;
            (existing as Record<string, unknown>)[field] = current + next;
        });

        grouped.set(key, existing);
    });

    return Array.from(grouped.values());
}

export async function getAppleSubscriptionReport(reportDate: string): Promise<{ rows: AppleSubscriptionReportRow[], error?: string }> {
    await requireAdminAuth();
    try {
        const token = await getAppleApiToken();
        const settings = await getPrivateGlobalSettings();
        const vendorNumber = settings.app_store_connect_vendor_number;

        if (!vendorNumber) {
            throw new Error("App Store Connect Vendor Number is not set in Global Settings.");
        }

        const rows: AppleSubscriptionReportRow[] = [];
        const days = getDaysInMonth(reportDate);

        for (const day of days) {
            const csvData = await fetchAppleSubscriptionReport(token, vendorNumber, day);
            if (!csvData) {
                continue;
            }

            rows.push(...parseAppleSubscriptionCsv(csvData, day));
        }

        const aggregatedRows = aggregateAppleSubscriptionRowsByDay(rows);

        aggregatedRows.sort((a, b) => {
            const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
            if (dateCompare !== 0) return dateCompare;
            return (b.activeStandardPriceSubscriptions || 0) - (a.activeStandardPriceSubscriptions || 0);
        });

        return { rows: aggregatedRows };

    } catch (error: any) {
        console.error("Error fetching Apple subscription report:", error);
        return { rows: [], error: error.message };
    }
}
