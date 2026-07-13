
'use server';

import { z } from 'zod';
import type { InstallationData } from './data';
import { installationDataSchema } from './data';
import Papa from 'papaparse';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-log';
import { getGlobalSettings } from '../settings/actions';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';


const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

function parseInstallationsCSV(csvText: string): InstallationData[] {
    // Remove potential BOM at the start of the file
    if (csvText.charCodeAt(0) === 0xFEFF) {
        csvText = csvText.substring(1);
    }
    
    const dataRows = Papa.parse<string[]>(csvText.trim(), {
        skipEmptyLines: true,
    }).data;

    if (dataRows.length < 2) {
        return [];
    }

    const cleanCell = (value: string | undefined) =>
        (value || '').replace(/\u0000/g, '').replace(/\s+/g, '').trim();

    // Skip the header row (index 0) and map the rest
    return dataRows.slice(1).map((row, index) => {
        if (row.length < 12) { // Ensure row has enough columns
            return null;
        }

        const date = cleanCell(row[0]);
        const packageName = cleanCell(row[1]);
        
        if (!date || !packageName) {
            return null; // Invalid row, filter it out
        }
        
        return {
            id: `${date}-${packageName}-${index}`,
            date,
            packageName,
            dailyDeviceInstalls: cleanCell(row[2]) || '0',
            dailyDeviceUninstalls: cleanCell(row[3]) || '0',
            dailyDeviceUpgrades: cleanCell(row[4]) || '0',
            totalUserInstalls: cleanCell(row[5]) || '0',
            dailyUserInstalls: cleanCell(row[6]) || '0',
            dailyUserUninstalls: cleanCell(row[7]) || '0',
            activeDeviceInstalls: cleanCell(row[8]) || '0',
            installEvents: cleanCell(row[9]) || '0',
            updateEvents: cleanCell(row[10]) || '0',
            uninstallEvents: cleanCell(row[11]) || '0',
        };
    }).filter((item): item is InstallationData => item !== null);
}

function decodeInstallationCsv(buffer: Buffer): string {
    if (buffer.length >= 2) {
        const first = buffer[0];
        const second = buffer[1];

        if (first === 0xff && second === 0xfe) {
            return new TextDecoder('utf-16le').decode(buffer);
        }

        if (first === 0xfe && second === 0xff) {
            return new TextDecoder('utf-16be').decode(buffer);
        }
    }

    const sampleLength = Math.min(buffer.length, 200);
    let nullBytes = 0;
    for (let i = 0; i < sampleLength; i++) {
        if (buffer[i] === 0) {
            nullBytes += 1;
        }
    }

    if (nullBytes > sampleLength * 0.2) {
        return new TextDecoder('utf-16le').decode(buffer);
    }

    return buffer.toString('utf8');
}

export async function getInstallationReport(year: string, month: string): Promise<{ error: string } | { installations: InstallationData[], fileName: string }> {
    await requireAdminAuth();
    void year;
    void month;
    return { error: 'Google Cloud Storage installation report fetching has been removed from this project.' };
}


export async function listAvailableInstallationReports(): Promise<{ error: string } | { files: string[] }> {
    await requireAdminAuth();
    return { error: 'Google Cloud Storage installation report listing has been removed from this project.' };
}

const reportSaveSchema = z.object({
    fileName: z.string(),
    reportDate: z.string(),
    rows: z.array(installationDataSchema),
});

export type DebugInfo = {
    packageName: string;
    conversions: {
        field: string;
        before: string;
        after: number;
    }[];
};

function safeParseInt(value: string | undefined): number {
    if (value === undefined || value === null) return 0;

    const str = String(value);
    const digitsOnly = str.replace(/\D/g, '');
    const parsed = parseInt(digitsOnly, 10);

    return isNaN(parsed) ? 0 : parsed;
}

type DailyInstallPackageMetric = {
    packageName: string;
    dailyUserInstalls: number;
    dailyUserUninstalls: number;
    activeDeviceInstalls: number;
};

type DailyInstallationReportRow = {
    date: string;
    packageCount: number;
    totalDailyUserInstalls: number;
    totalDailyUserUninstalls: number;
    totalActiveDeviceInstalls: number;
    packages: DailyInstallPackageMetric[];
};

type InstallationReportApiResponse = {
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

function apiError(payload: InstallationReportApiResponse, fallback: string) {
    return payload.error_msg || payload.message || fallback;
}

function groupRowsByDate(rows: InstallationData[]): DailyInstallationReportRow[] {
    const dayMap = new Map<string, Map<string, DailyInstallPackageMetric>>();

    rows.forEach((row) => {
        if (!row.date || !row.packageName) {
            return;
        }

        const packageMap = dayMap.get(row.date) || new Map<string, DailyInstallPackageMetric>();
        const existing = packageMap.get(row.packageName) || {
            packageName: row.packageName,
            dailyUserInstalls: 0,
            dailyUserUninstalls: 0,
            activeDeviceInstalls: 0,
        };

        existing.dailyUserInstalls += safeParseInt(row.dailyUserInstalls);
        existing.dailyUserUninstalls += safeParseInt(row.dailyUserUninstalls);
        existing.activeDeviceInstalls = Math.max(existing.activeDeviceInstalls, safeParseInt(row.activeDeviceInstalls));

        packageMap.set(row.packageName, existing);
        dayMap.set(row.date, packageMap);
    });

    return Array.from(dayMap.entries())
        .map(([date, packageMap]) => {
            const packages = Array.from(packageMap.values()).sort((a, b) => a.packageName.localeCompare(b.packageName));

            return {
                date,
                packageCount: packages.length,
                totalDailyUserInstalls: packages.reduce((sum, item) => sum + item.dailyUserInstalls, 0),
                totalDailyUserUninstalls: packages.reduce((sum, item) => sum + item.dailyUserUninstalls, 0),
                totalActiveDeviceInstalls: packages.reduce((sum, item) => sum + item.activeDeviceInstalls, 0),
                packages,
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}

async function postInstallationReport(report: {
    fileName: string;
    reportDate: string;
    days: DailyInstallationReportRow[];
}) {
    const headers = await getAuthHeaders();
    headers['Content-Type'] = 'application/x-www-form-urlencoded';

    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers,
        body: new URLSearchParams({
            tag: 'SAVE_GOOGLE_PLAY_INSTALLATION_DAILY_REPORT',
            db: 'MAIN',
            report_json: JSON.stringify(report),
        }),
    });

    const raw = await response.text();
    let payload: InstallationReportApiResponse;

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

export async function saveInstallationReport(data: z.infer<typeof reportSaveSchema>): Promise<{ error: string } | { success: boolean; docId: string, debugInfo?: DebugInfo }> {
    await requireAdminAuth();
    const validation = reportSaveSchema.safeParse(data);
    if (!validation.success) {
        console.error("Invalid installation report data:", validation.error.flatten());
        return { error: "Invalid data format for saving." };
    }

    try {
        const [year, month] = validation.data.reportDate.split('-');
        const docId = `installs_${year}_${month}`;

        if (!year || !month) {
            return { error: "Invalid reportDate format. Expected YYYY-MM." };
        }

        const days = groupRowsByDate(validation.data.rows);
        const payload = await postInstallationReport({
            fileName: validation.data.fileName,
            reportDate: validation.data.reportDate,
            days,
        });

        if (!payload.success) {
            return { error: apiError(payload, 'Failed to save the installation report to MySQL.') };
        }
        
        await logActivity('UPLOAD_ANDROID_INSTALL_REPORT', {
            entityType: 'Report',
            entityId: docId,
            entityName: validation.data.fileName
        });

        console.log(`Saved Android installation report to MySQL: ${payload.saved_days || days.length} day(s)`);
        revalidatePath('/installation-reports');
        return { success: true, docId };

    } catch (err: any) {
        console.error("Error saving installation report to MySQL:", err);
        return { error: err.message || "Failed to save the report to the database." };
    }
}
