
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-log';
import jwt from 'jsonwebtoken';
import pako from 'pako';
import Papa from 'papaparse';
import { getPrivateGlobalSettings } from '../settings/actions';
import type { AppleInstallRow } from './data';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const appleInstallDailyReportSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}$/, "Report date must be in YYYY-MM format"), // e.g. "2025-06"
  days: z.array(z.object({
    date: z.string(),
    itemCount: z.number(),
    totalUnits: z.number(),
    items: z.array(z.object({
      appleId: z.string(),
      units: z.number(),
    })),
  })),
});

export type AppleInstallReport = z.infer<typeof appleInstallDailyReportSchema>;

export async function saveInstallReport(data: AppleInstallReport): Promise<{ error: string } | { success: boolean; docId: string }> {
    await requireAdminAuth();
    const validation = appleInstallDailyReportSchema.safeParse(data);

    if (!validation.success) {
        console.error("Invalid Install report data:", validation.error.flatten());
        return { error: "Invalid report data provided." };
    }

    try {
        const [year, month] = validation.data.reportDate.split('-');
        const docId = `installs_${year}_${month}`;
        const payload = await postAppleInstallReport(validation.data);

        if (!payload.success) {
            return { error: apiError(payload, 'Failed to save the Apple install report to MySQL.') };
        }

        await logActivity('UPLOAD_APPLE_INSTALL_REPORT', {
            entityType: 'Report',
            entityId: docId,
            entityName: docId,
        });

        console.log(`Saved Apple Install report data to MySQL: ${payload.saved_days || validation.data.days.length} day(s)`);
        revalidatePath('/apple-install-reports');
        return { success: true, docId };

    } catch (err: any) {
        console.error("Error saving Apple Install report to MySQL:", err);
        return { error: err.message || "Failed to save the report." };
    }
}

type AppleInstallApiResponse = {
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

function apiError(payload: AppleInstallApiResponse, fallback: string) {
    return payload.error_msg || payload.message || fallback;
}

async function postAppleInstallReport(report: z.infer<typeof appleInstallDailyReportSchema>) {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';

    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: new URLSearchParams({
            tag: 'SAVE_APPLE_INSTALL_DAILY_REPORT',
            db: 'MAIN',
            report_json: JSON.stringify(report),
        }),
    });

    const raw = await response.text();
    let payload: AppleInstallApiResponse;

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

async function fetchAppleInstallReport(token: string, vendorNumber: string, frequency: 'DAILY' | 'MONTHLY', reportDate: string): Promise<string | null> {
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

function parseAppleInstallCsv(csvData: string, fallbackDate: string): AppleInstallRow[] {
        const parsed = Papa.parse(csvData, {
            header: true,
            delimiter: '\t',
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
        });

        const groupedData: { [name: string]: AppleInstallRow } = {};

        parsed.data.forEach((row: any) => {
            const date = row['Begin Date'] || fallbackDate;
            const name = row['Title'];
            const units = parseInt(row['Units'], 10) || 0;
            const type = row['Product Type Identifier'];
            const appleId = row['Apple Identifier'];

            // Only include installs (1) and free/purchased apps (1F), not updates (1T) etc.
            if (name && units > 0 && (type === '1' || type === '1F')) {
                const key = `${date}::${name}::${appleId || ''}`;
                if (groupedData[key]) {
                    groupedData[key].units! += units;
                } else {
                    groupedData[key] = {
                        date,
                        name: name,
                        creator: row['Developer'],
                        type: type,
                        platforms: row['Supported Platforms'],
                        appleId,
                        units: units,
                    };
                }
            }
        });

        return Object.values(groupedData);
}

export async function getAppleInstallReports(reportDate: string): Promise<{ rows: AppleInstallRow[], error?: string }> {
    await requireAdminAuth();
    try {
        const token = await getAppleApiToken();
        const settings = await getPrivateGlobalSettings();
        const vendorNumber = settings.app_store_connect_vendor_number;

        if (!vendorNumber) {
            throw new Error("App Store Connect Vendor Number is not set in Global Settings.");
        }

        const allRows: AppleInstallRow[] = [];
        const days = getDaysInMonth(reportDate);

        for (const day of days) {
            const csvData = await fetchAppleInstallReport(token, vendorNumber, 'DAILY', day);
            if (!csvData) {
                continue;
            }

            allRows.push(...parseAppleInstallCsv(csvData, day));
        }
        
        const groupedRows: AppleInstallRow[] = allRows.sort((a, b) => {
            const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
            return dateCompare !== 0 ? dateCompare : (b.units || 0) - (a.units || 0);
        });

        return { rows: groupedRows };

    } catch (error: any) {
        console.error("Error fetching Apple install report:", error);
        return { rows: [], error: error.message };
    }
}
