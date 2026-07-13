'use server';

import admin, { type FirestoreQuery } from '@/lib/firebase-admin';
import { startOfMonth, subMonths, format, startOfYear, endOfYear, getYear, eachMonthOfInterval, lastDayOfMonth, parse, subYears, startOfWeek, endOfWeek, subDays, formatDistanceToNow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import { getGlobalSettings } from '../settings/actions';
import type { GlobalSettings } from '../settings/data';
import { convertToUSD } from '@/lib/currency';
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const db = admin.firestore();
const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

const getCanonicalAppName = (nameFromReport: string, sku: string, allApps: App[]): string | null => {
    if (!nameFromReport && !sku) return null;
    for (const app of allApps) {
        if (sku && app.package_name && sku.startsWith(app.package_name)) {
            return app.name;
        }
    }
    const normalizedReportName = (nameFromReport || "").toLowerCase().trim().replace(/\|/g, ' ').replace(/\s+/g, ' ');
    if (!normalizedReportName) return null;
    for (const app of allApps) {
        const normalizedAppName = app.name.toLowerCase();
        if (normalizedReportName.includes(normalizedAppName) || normalizedAppName.includes(normalizedReportName)) {
            return app.name;
        }
    }
    return nameFromReport;
};

export interface AppRevenueBreakdown {
    label: string;
    iosRevenue: number;
    androidRevenue: number;
    admobRevenue: number;
    iosAdExpense: number;
    androidAdExpense: number;
    total: number;
    debug: {
        ios: { docId: string; values: string };
        android: { docId: string; values: string };
        admob: { docId: string; values: string };
        adExpense: {docId: string; values: string; logs: string[]};
    };
}

export async function getAppRevenueBreakdown(period: 'last-month' | 'this-year' | 'last-year'): Promise<{ data: AppRevenueBreakdown[], docIds: { apple: string[], android: string[], admob: string[], adExpense: string[] } }> {
    await requireAdminAuth();
    const allApps = await getApps();
    const activeApps = allApps.filter(app => app.isActive);
    const revenueMap = new Map<string, AppRevenueBreakdown>();
    
    activeApps.forEach(app => {
        revenueMap.set(app.name, {
            label: app.name, iosRevenue: 0, androidRevenue: 0, admobRevenue: 0, iosAdExpense: 0, androidAdExpense: 0, total: 0,
            debug: { ios: { docId: '', values: '' }, android: { docId: '', values: '' }, admob: { docId: '', values: '' }, adExpense: {docId: '', values: '', logs: []} },
        });
    });

    try {
        let docIdsToFetchEarnings: string[] = [];
        let docIdsToFetchAds: string[] = [];
        const timeZone = 'Asia/Colombo';
        let start, end;
        const nowInColombo = toZonedTime(new Date(), timeZone);

        if (period === 'last-month') {
            const lastMonthDate = subMonths(nowInColombo, 1);
            docIdsToFetchEarnings = [`earnings_${format(lastMonthDate, 'yyyy_MM')}`];
            docIdsToFetchAds = [`ads_${format(lastMonthDate, 'yyyy_MM')}`];
        } else {
            if (period === 'this-year') {
                start = startOfYear(nowInColombo); end = endOfYear(nowInColombo);
            } else {
                const lastYear = subYears(nowInColombo, 1); start = startOfYear(lastYear); end = endOfYear(lastYear);
            }
            const months = eachMonthOfInterval({ start, end });
            docIdsToFetchEarnings = [...new Set(months.map(m => `earnings_${format(m, 'yyyy_MM')}`))];
            docIdsToFetchAds = [...new Set(months.map(m => `ads_${format(m, 'yyyy_MM')}`))];
        }
        
        const docIdResult = { apple: [] as string[], android: [] as string[], admob: [] as string[], adExpense: [] as string[] };
        if (docIdsToFetchEarnings.length === 0) return { data: [], docIds: docIdResult };

        const appleDocs = await db.collection('apple_earnings_reports').where(admin.firestore.FieldPath.documentId(), 'in', docIdsToFetchEarnings).get();
        appleDocs.forEach(doc => {
            docIdResult.apple.push(doc.id);
            const d = doc.data();
            if (d && Array.isArray(d.rows)) {
                for (const row of d.rows) {
                    const appName = getCanonicalAppName(row.name || '', row.skuId || '', activeApps);
                    if (appName && revenueMap.has(appName)) {
                        const entry = revenueMap.get(appName)!;
                        const proceeds = row.proceedsUSD || 0;
                        if (proceeds > 0) { entry.iosRevenue += proceeds; entry.debug.ios.values += `${proceeds.toFixed(2)} + `; entry.debug.ios.docId = doc.id; }
                    }
                }
            }
        });
        
        const androidDocs = await db.collection('android_earnings_reports').where(admin.firestore.FieldPath.documentId(), 'in', docIdsToFetchEarnings).get();
        androidDocs.forEach(doc => {
            docIdResult.android.push(doc.id);
            const d = doc.data();
            if (d && Array.isArray(d.rows)) {
                for (const row of d.rows.filter((r: any) => r.transactionType === 'Charge')) {
                    const appName = getCanonicalAppName(row.productTitle || '', row.skuId || '', activeApps);
                    if (appName && revenueMap.has(appName)) {
                        const entry = revenueMap.get(appName)!;
                        const rev = row.amountMerchantCurrency || 0;
                        if (rev > 0) { entry.androidRevenue += rev; entry.debug.android.values += `${rev.toFixed(2)} + `; entry.debug.android.docId = doc.id; }
                    }
                }
            }
        });

        const admobDocs = await db.collection('admob_earnings').where(admin.firestore.FieldPath.documentId(), 'in', docIdsToFetchEarnings).get();
        admobDocs.forEach(doc => {
            docIdResult.admob.push(doc.id);
            const d = doc.data();
            if (d && Array.isArray(d.rows)) {
                for (const row of d.rows) {
                    const appName = getCanonicalAppName(row.app || '', '', activeApps);
                    if (appName && revenueMap.has(appName)) {
                        const entry = revenueMap.get(appName)!;
                        const rev = row.estimatedEarnings || 0;
                        if (rev > 0) { entry.admobRevenue += rev; entry.debug.admob.values += `${rev.toFixed(2)} + `; entry.debug.admob.docId = doc.id; }
                    }
                }
            }
        });

        const adExpenseDocs = await db.collection('google_ads_reports').where(admin.firestore.FieldPath.documentId(), 'in', docIdsToFetchAds).get();
        adExpenseDocs.forEach(doc => {
            docIdResult.adExpense.push(doc.id);
            const d = doc.data();
            if (d && Array.isArray(d.rows)) {
                for (const row of d.rows) {
                    const cost = row.Costs || 0;
                    if (cost !== 0 && row.Description) {
                        const desc = row.Description.toLowerCase();
                        let target: 'iOS' | 'Android' | null = desc.startsWith('ios |') ? 'iOS' : desc.startsWith('a |') ? 'Android' : null;
                        if (target) {
                            activeApps.forEach(app => {
                                if ((app.os === target || app.os === 'Android & iOS') && desc.includes(app.name.toLowerCase())) {
                                    const entry = revenueMap.get(app.name);
                                    if (entry) {
                                        if (target === 'iOS') entry.iosAdExpense += Math.abs(cost); else entry.androidAdExpense += Math.abs(cost);
                                        entry.debug.adExpense.docId = doc.id; entry.debug.adExpense.values += `${Math.abs(cost).toFixed(2)} (${target}) + `;
                                        entry.debug.adExpense.logs.push(`Matched expense "${row.Description}" to "${app.name}". Cost: ${cost}.`);
                                    }
                                }
                            });
                        }
                    }
                }
            }
        });
        
        const result = Array.from(revenueMap.values()).map(item => ({ ...item, total: item.iosRevenue + item.androidRevenue + item.admobRevenue }))
            .filter(item => item.total > 0 || item.iosAdExpense > 0 || item.androidAdExpense > 0);
        result.sort((a, b) => b.total - a.total);
        return { data: result, docIds: docIdResult };
    } catch (error) {
        console.error("Error fetching app revenue breakdown:", error);
        return { data: [], docIds: { apple: [], android: [], admob: [], adExpense: [] } };
    }
}

export interface AppRevenue { name: string; revenue: number; icon: string; themeColor?: string; debug: { docIds: string[]; values: string; } }

export async function getBestsellingApps(period: 'last-month' | 'this-year' | 'last-year'): Promise<AppRevenue[]> {
    await requireAdminAuth();
    const allApps = await getApps();
    const activeApps = allApps.filter(app => app.isActive);
    const revenueMap = new Map<string, { revenue: number, icon: string, themeColor?: string, debug: {docIds: Set<string>, values: string[]} }>();
    activeApps.forEach(app => { revenueMap.set(app.name, { revenue: 0, icon: app.icon_url, themeColor: app.themeColor, debug: {docIds: new Set(), values: []} }); });

    try {
        const timeZone = 'Asia/Colombo';
        const nowInColombo = toZonedTime(new Date(), timeZone);
        let docIds: string[] = [];
        if (period === 'last-month') docIds = [`earnings_${format(subMonths(nowInColombo, 1), 'yyyy_MM')}`];
        else if (period === 'this-year') docIds = [...new Set(eachMonthOfInterval({ start: startOfYear(nowInColombo), end: nowInColombo }).map(m => `earnings_${format(m, 'yyyy_MM')}`))];
        else docIds = [...new Set(eachMonthOfInterval({ start: startOfYear(subYears(nowInColombo, 1)), end: endOfYear(subYears(nowInColombo, 1)) }).map(m => `earnings_${format(m, 'yyyy_MM')}`))];

        if (docIds.length === 0) return [];
        for (const [coll, field] of [['apple_earnings_reports', 'proceedsUSD'], ['android_earnings_reports', 'amountMerchantCurrency'], ['admob_earnings', 'estimatedEarnings']]) {
            const snapshot = await db.collection(coll).where(admin.firestore.FieldPath.documentId(), 'in', docIds).get();
            snapshot.forEach(doc => {
                const d = doc.data();
                if (d && Array.isArray(d.rows)) {
                    for (const row of d.rows) {
                        const appName = getCanonicalAppName(row.name || row.productTitle || row.app || '', row.skuId || '', activeApps);
                        if (appName && revenueMap.has(appName)) {
                            const entry = revenueMap.get(appName)!;
                            const rev = row[field] || 0;
                            if (rev > 0) { entry.revenue += rev; entry.debug.docIds.add(doc.id); entry.debug.values.push(rev.toFixed(2)); }
                        }
                    }
                }
            });
        }
        return Array.from(revenueMap.entries()).map(([name, data]) => ({ name, revenue: data.revenue, icon: data.icon, themeColor: data.themeColor, debug: { docIds: Array.from(data.debug.docIds), values: data.debug.values.join(' + ') } }))
            .filter(item => item.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    } catch (error) { console.error("Error fetching bestselling apps:", error); return []; }
}

export interface MonthlyExpenseBreakdown { month: string; adExpenses: number; otherExpenses: number; }
export async function getMonthlyExpensesBreakdown(months: number): Promise<MonthlyExpenseBreakdown[]> {
    await requireAdminAuth();
    const today = new Date();
    const lastCompletedMonth = startOfMonth(subMonths(today, 1));
    const dateRange = Array.from({ length: months }, (_, i) => {
        const d = subMonths(lastCompletedMonth, i);
        return { year: d.getFullYear(), month: d.getMonth() + 1, monthName: format(d, 'MMM') };
    }).reverse();

    const monthlyDataMap: { [key: string]: MonthlyExpenseBreakdown } = {};
    dateRange.forEach(d => { monthlyDataMap[`${d.year}-${String(d.month).padStart(2, '0')}`] = { month: d.monthName, adExpenses: 0, otherExpenses: 0 }; });

    try {
        const startId = `ads_${dateRange[0].year}_${String(dateRange[0].month).padStart(2, '0')}`;
        const endId = `ads_${dateRange[dateRange.length-1].year}_${String(dateRange[dateRange.length-1].month).padStart(2, '0')}`;
        const adSnapshot = await db.collection('google_ads_reports').where(admin.firestore.FieldPath.documentId(), '>=', startId).where(admin.firestore.FieldPath.documentId(), '<=', endId).get();
        adSnapshot.forEach(doc => {
            const [_, y, m] = doc.id.split('_');
            const key = `${y}-${m}`;
            if (monthlyDataMap[key] && Array.isArray(doc.data()?.rows)) monthlyDataMap[key].adExpenses += doc.data().rows.reduce((s: number, r: any) => s + Math.abs(r.Costs || 0), 0);
        });

        const otherSnapshot = await db.collection('other_expenses').where('date', '>=', new Date(dateRange[0].year, dateRange[0].month - 1, 1)).where('date', '<=', lastDayOfMonth(new Date(dateRange[dateRange.length-1].year, dateRange[dateRange.length-1].month - 1, 1))).get();
        for (const doc of otherSnapshot.docs) {
            const d = doc.data(); const key = format(d.date.toDate(), 'yyyy-MM');
            if (monthlyDataMap[key]) monthlyDataMap[key].otherExpenses += Math.abs(d.convertedAmount !== undefined ? d.convertedAmount : await convertToUSD(d.amount || 0, d.currency || 'USD'));
        }
        return Object.values(monthlyDataMap);
    } catch (error) { console.error("Error fetching monthly expenses:", error); return Object.values(monthlyDataMap); }
}

export interface InstallCounts { android: number; apple: number; total: number; }
export interface PurchaseStats {
    totalPurchases: { total: number; android: number; apple: number };
    refundEvents?: { total: number; android: number; apple: number };
    freeTrials?: { total: number; android: number; apple: number };
    yearlySubscribers: { total: number; android: number; apple: number };
    monthlySubscribers: { total: number; android: number; apple: number };
    lifetimePurchases?: { total: number; android: number; apple: number };
    offerPurchases?: { total: number; android: number; apple: number };
    appRevenue: { total: number; android: number; apple: number };
    appRevenueLkr?: { total: number; android: number; apple: number };
    grossAppRevenue?: { total: number; android: number; apple: number };
    grossAppRevenueLkr?: { total: number; android: number; apple: number };
    refundRevenue?: { total: number; android: number; apple: number };
    refundRevenueLkr?: { total: number; android: number; apple: number };
    appBreakdown?: Record<string, PurchaseAppBreakdownItem[]>;
}
interface PurchaseAppBreakdownItem {
    app_id?: string;
    app_name: string;
    app_key?: string;
    product_id?: string;
    package_name?: string;
    platform: 'android' | 'apple' | string;
    icon_url?: string;
    count: number;
    revenue_lkr: number;
    revenue_usd: number;
}
interface AdmobStats {
    revenue: { total: number; android: number; apple: number; };
    impressions: { total: number; android: number; apple: number; };
    clicks?: { total: number; android: number; apple: number; };
    ctr: number;
    ctrByPlatform?: { android: number; apple: number };
}
interface GoogleAdsStats { expenses: { total: number; android: number; apple: number }; impressions: { total: number; android: number; apple: number }; clicks: { total: number; android: number; apple: number }; }
interface OtherFinancials { otherIncome: number; otherExpenses: number; totalAmount: number; }

export async function getDashboardStats(startDate?: string, endDate?: string, visibilityFlags?: Record<string, boolean>): Promise<{ installs: InstallCounts, purchases: PurchaseStats, admob: AdmobStats, googleAds: GoogleAdsStats, other: OtherFinancials }> {
    await requireAdminAuth();
    const showI = visibilityFlags?.['App Installs'] !== false;
    const showP = visibilityFlags?.['App Purchases'] !== false || visibilityFlags?.['App Revenue'] !== false;
    const showAm = visibilityFlags?.['Admob Impressions'] !== false || visibilityFlags?.['Admob CTR'] !== false || visibilityFlags?.['Admob Revenue'] !== false;
    const showGa = visibilityFlags?.['Ads Impressions'] !== false || visibilityFlags?.['Ads Clicks'] !== false || visibilityFlags?.['Ads Expenses'] !== false;
    const showO = visibilityFlags?.['Other Income'] !== false || visibilityFlags?.['Other Expenses'] !== false || visibilityFlags?.['Total Amount'] !== false;
    const [installs, purchases, admob, googleAds, other] = await Promise.all([
        showI ? getInstallStats(startDate, endDate) : Promise.resolve({ android: 0, apple: 0, total: 0 }),
        showP ? getPurchaseStats(startDate, endDate) : Promise.resolve({ totalPurchases: { total: 0, android: 0, apple: 0 }, freeTrials: { total: 0, android: 0, apple: 0 }, yearlySubscribers: { total: 0, android: 0, apple: 0 }, monthlySubscribers: { total: 0, android: 0, apple: 0 }, appRevenue: { total: 0, android: 0, apple: 0 } }),
        showAm ? getAdmobStats(startDate, endDate) : Promise.resolve({ revenue: { total: 0, android: 0, apple: 0 }, impressions: { total: 0, android: 0, apple: 0 }, ctr: 0 }),
        showGa ? getGoogleAdsStats(startDate, endDate) : Promise.resolve({ expenses: { total: 0, android: 0, apple: 0 }, impressions: { total: 0, android: 0, apple: 0 }, clicks: { total: 0, android: 0, apple: 0 } }),
        showO ? getOtherFinancials(startDate, endDate) : Promise.resolve({ otherIncome: 0, otherExpenses: 0, totalAmount: 0 })
    ]);
    return { installs, purchases, admob, googleAds, other };
}

async function getOtherFinancials(startDate?: string, endDate?: string): Promise<OtherFinancials> {
    try {
        let iq = db.collection('other_income') as FirestoreQuery; let eq = db.collection('other_expenses') as FirestoreQuery;
        if (startDate) { const s = parse(startDate, 'yyyy-MM', new Date()); iq = iq.where('date', '>=', s); eq = eq.where('date', '>=', s); }
        if (endDate) { const e = lastDayOfMonth(parse(endDate, 'yyyy-MM', new Date())); iq = iq.where('date', '<=', e); eq = eq.where('date', '<=', e); }
        const [is, es] = await Promise.all([iq.get(), eq.get()]);
        let inc = 0, exp = 0;
        for (const doc of is.docs) inc += doc.data().convertedAmount !== undefined ? doc.data().convertedAmount : await convertToUSD(doc.data().amount || 0, doc.data().currency || 'USD');
        for (const doc of es.docs) exp += doc.data().convertedAmount !== undefined ? doc.data().convertedAmount : await convertToUSD(doc.data().amount || 0, doc.data().currency || 'USD');
        return { otherIncome: inc, otherExpenses: exp, totalAmount: inc - exp };
    } catch (e) { console.error(e); return { otherIncome: 0, otherExpenses: 0, totalAmount: 0 }; }
}

async function getInstallStats(start?: string, end?: string): Promise<InstallCounts> {
    try {
        let aq = db.collection('android_installation_reports') as FirestoreQuery; if (start) aq = aq.where('reportDate', '>=', start); if (end) aq = aq.where('reportDate', '<=', end);
        let iq = db.collection('apple_installation_reports') as FirestoreQuery; if (start) iq = iq.where('reportDate', '>=', start); if (end) iq = iq.where('reportDate', '<=', end);
        const [as, is] = await Promise.all([aq.get(), iq.get()]);
        let ac = 0, ic = 0;
        as.forEach(doc => { const d = doc.data(); if (d.summary) ac += d.summary.reduce((s: number, i: any) => s + (Number(i.totalDailyUserInstalls) || 0), 0); else if (d.rows) ac += d.rows.reduce((s: number, r: any) => s + (Number(r.dailyUserInstalls) || 0), 0); });
        is.forEach(doc => { const d = doc.data(); if (d.summary?.totalUnits) ic += d.summary.totalUnits; else if (d.rows) ic += d.rows.reduce((s: number, r: any) => s + (Number(r.units) || 0), 0); });
        return { android: ac, apple: ic, total: ac + ic };
    } catch (e) { console.error(e); return { android: 0, apple: 0, total: 0 }; }
}

async function getPurchaseStats(start?: string, end?: string): Promise<PurchaseStats> {
    const s = { totalPurchases: { total: 0, android: 0, apple: 0 }, freeTrials: { total: 0, android: 0, apple: 0 }, yearlySubscribers: { total: 0, android: 0, apple: 0 }, monthlySubscribers: { total: 0, android: 0, apple: 0 }, appRevenue: { total: 0, android: 0, apple: 0 } };
    try {
        let aq = db.collection('android_earnings_reports') as FirestoreQuery; if (start) aq = aq.where('reportDate', '>=', start); if (end) aq = aq.where('reportDate', '<=', end);
        let iq = db.collection('apple_earnings_reports') as FirestoreQuery; if (start) iq = iq.where('reportDate', '>=', start); if (end) iq = iq.where('reportDate', '<=', end);
        const [as, is] = await Promise.all([aq.get(), iq.get()]);
        as.forEach(doc => { const d = doc.data(); if (d.summary) s.appRevenue.android += d.summary.reduce((su: number, i: any) => su + (i.totalAmount || 0), 0); else if (d.rows) s.appRevenue.android += d.rows.filter((r: any) => r.transactionType === 'Charge').reduce((su: number, r: any) => su + (r.amountMerchantCurrency || 0), 0); if (d.rows) d.rows.filter((r: any) => r.transactionType?.toLowerCase() === 'charge').forEach((r: any) => { if (r.skuId?.toLowerCase().includes('yearly')) s.yearlySubscribers.android++; else if (r.skuId?.toLowerCase().includes('monthly')) s.monthlySubscribers.android++; else s.totalPurchases.android++; }); });
        is.forEach(doc => { const d = doc.data(); if (d.summary?.totalProceedsUSD) s.appRevenue.apple += d.summary.totalProceedsUSD; else if (d.rows) s.appRevenue.apple += d.rows.reduce((su: number, r: any) => su + (r.proceedsUSD || 0), 0); if (d.rows) d.rows.forEach((r: any) => { if (r.proceedsUSD > 0) { if (r.subscription) { if (r.period?.toLowerCase().includes('year')) s.yearlySubscribers.apple++; else if (r.period?.toLowerCase().includes('month')) s.monthlySubscribers.apple++; } else s.totalPurchases.apple++; } }); });
        s.totalPurchases.total = s.totalPurchases.android + s.totalPurchases.apple; s.yearlySubscribers.total = s.yearlySubscribers.android + s.yearlySubscribers.apple; s.monthlySubscribers.total = s.monthlySubscribers.android + s.monthlySubscribers.apple; s.appRevenue.total = s.appRevenue.android + s.appRevenue.apple;
        return s;
    } catch (e) { console.error(e); return s; }
}

export async function getHomePurchaseStats(fromDate: string, toDate: string): Promise<{ purchases: PurchaseStats; debug: { requestParams: Record<string, string>; rawResponse: any; error?: string; httpStatus?: number } }> {
    await requireAdminAuth();
    const empty: PurchaseStats = {
        totalPurchases: { total: 0, android: 0, apple: 0 },
        refundEvents: { total: 0, android: 0, apple: 0 },
        freeTrials: { total: 0, android: 0, apple: 0 },
        yearlySubscribers: { total: 0, android: 0, apple: 0 },
        monthlySubscribers: { total: 0, android: 0, apple: 0 },
        lifetimePurchases: { total: 0, android: 0, apple: 0 },
        offerPurchases: { total: 0, android: 0, apple: 0 },
        appRevenue: { total: 0, android: 0, apple: 0 },
        appRevenueLkr: { total: 0, android: 0, apple: 0 },
        appBreakdown: { monthly: [], yearly: [], lifetime: [], offer: [] },
    };
    const requestParams = {
        tag: 'GET_HOME_PURCHASE_STATS',
        db: '0',
        from_date: fromDate,
        to_date: toDate,
    };

    try {
        const response = await fetch(phpApiUrl, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders()),
            },
            body: new URLSearchParams(requestParams),
        });
        const httpStatus = response.status;
        const rawText = await response.text();
        let payload: any;

        try {
            payload = rawText ? JSON.parse(rawText) : {};
        } catch {
            return {
                purchases: empty,
                debug: {
                    requestParams,
                    rawResponse: rawText,
                    error: `Failed to parse JSON. HTTP ${httpStatus}`,
                    httpStatus,
                },
            };
        }

        if (!payload?.success || !payload?.purchases) {
            return {
                purchases: empty,
                debug: {
                    requestParams,
                    rawResponse: payload,
                    error: payload?.error_msg || `Purchase stats request failed. HTTP ${httpStatus}`,
                    httpStatus,
                },
            };
        }

        return {
            purchases: {
                ...empty,
                ...payload.purchases,
                totalPurchases: { ...empty.totalPurchases, ...(payload.purchases.totalPurchases || {}) },
                refundEvents: { ...empty.refundEvents!, ...(payload.purchases.refundEvents || {}) },
                freeTrials: { ...empty.freeTrials!, ...(payload.purchases.freeTrials || {}) },
                yearlySubscribers: { ...empty.yearlySubscribers, ...(payload.purchases.yearlySubscribers || {}) },
                monthlySubscribers: { ...empty.monthlySubscribers, ...(payload.purchases.monthlySubscribers || {}) },
                lifetimePurchases: { ...empty.lifetimePurchases!, ...(payload.purchases.lifetimePurchases || {}) },
                offerPurchases: { ...empty.offerPurchases!, ...(payload.purchases.offerPurchases || {}) },
                appRevenue: { ...empty.appRevenue, ...(payload.purchases.appRevenue || {}) },
                appRevenueLkr: { ...empty.appRevenueLkr!, ...(payload.purchases.appRevenueLkr || {}) },
                appBreakdown: {
                    monthly: Array.isArray(payload.purchases.appBreakdown?.monthly) ? payload.purchases.appBreakdown.monthly : [],
                    yearly: Array.isArray(payload.purchases.appBreakdown?.yearly) ? payload.purchases.appBreakdown.yearly : [],
                    lifetime: Array.isArray(payload.purchases.appBreakdown?.lifetime) ? payload.purchases.appBreakdown.lifetime : [],
                    offer: Array.isArray(payload.purchases.appBreakdown?.offer) ? payload.purchases.appBreakdown.offer : [],
                },
            },
            debug: { requestParams, rawResponse: payload, httpStatus },
        };
    } catch (error: any) {
        return {
            purchases: empty,
            debug: {
                requestParams,
                rawResponse: null,
                error: error?.message || String(error),
            },
        };
    }
}

export async function getAdmobStats(startDate?: string, endDate?: string): Promise<AdmobStats> {
    await requireAdminAuth();
    const res: AdmobStats = {
        revenue: { total: 0, android: 0, apple: 0 },
        impressions: { total: 0, android: 0, apple: 0 },
        clicks: { total: 0, android: 0, apple: 0 },
        ctr: 0,
        ctrByPlatform: { android: 0, apple: 0 },
    };

    const fromDate = startDate && startDate.length === 7 ? `${startDate}-01` : startDate;
    const toDate = endDate && endDate.length === 7
        ? format(lastDayOfMonth(parse(endDate, 'yyyy-MM', new Date())), 'yyyy-MM-dd')
        : (endDate || fromDate);

    if (!fromDate || !toDate) {
        return res;
    }

    try {
        const response = await fetch(phpApiUrl, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders()),
            },
            body: new URLSearchParams({
                tag: 'GET_HOME_ADMOB_STATS',
                db: '0',
                from_date: fromDate,
                to_date: toDate,
            }),
        });
        const payload = await response.json();
        if (!payload?.success || !payload?.admob) {
            return res;
        }

        return {
            revenue: { ...res.revenue, ...(payload.admob.revenue || {}) },
            impressions: { ...res.impressions, ...(payload.admob.impressions || {}) },
            clicks: { ...res.clicks!, ...(payload.admob.clicks || {}) },
            ctr: Number(payload.admob.ctr || 0),
            ctrByPlatform: { ...res.ctrByPlatform!, ...(payload.admob.ctrByPlatform || {}) },
        };
    } catch (e) {
        console.error(e);
        return res;
    }
}

async function getGoogleAdsStats(start?: string, end?: string): Promise<GoogleAdsStats> {
    const res = { expenses: { total: 0, android: 0, apple: 0 }, impressions: { total: 0, android: 0, apple: 0 }, clicks: { total: 0, android: 0, apple: 0 } };
    try {
        let q = db.collection('google_ads_reports') as FirestoreQuery; if (start && end) q = q.where(admin.firestore.FieldPath.documentId(), '>=', `ads_${start.replace('-', '_')}`).where(admin.firestore.FieldPath.documentId(), '<=', `ads_${end.replace('-', '_')}`);
        const sn = await q.get(); if (sn.empty) return res;
        sn.forEach(doc => { const d = doc.data(); if (d.rows) d.rows.forEach((r: any) => { const imp = parseInt(String(r.Impressions || '0').replace(/,/g, ''), 10) || 0, clk = parseInt(String(r.Clicks || '0').replace(/,/g, ''), 10) || 0, cst = r.Costs || 0; res.impressions.total += imp; res.clicks.total += clk; res.expenses.total += cst; if (r.Description?.startsWith('iOS |')) { res.impressions.apple += imp; res.clicks.apple += clk; res.expenses.apple += cst; } else { res.impressions.android += imp; res.clicks.android += clk; res.expenses.android += cst; } }); });
        return res;
    } catch (e) { console.error(e); return res; }
}

export type SubscriptionPeriod = 'today' | 'yesterday' | 'last7days';
export type SubscriptionCounts = { android: { monthly: number; yearly: number; lifetime: number; lifetime_offer: number; }; ios: { monthly: number; yearly: number; lifetime: number; lifetime_offer: number; }; };

async function getSubscriptionCounts(platform: 'ios' | 'android', period: SubscriptionPeriod, appIdArray: string[]): Promise<{ monthly: number, yearly: number, lifetime: number, lifetime_offer: number }> {
    const counts = { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 }; if (appIdArray.length === 0) return counts;
    const tag = { ios: { today: 'GET_TODAY_PURCHASES_IOS', yesterday: 'GET_YESTERDAY_PURCHASES_IOS', last7days: 'GET_LAST_7_DAYS_PURCHASES_IOS' }, android: { today: 'GET_TODAY_PURCHASED', yesterday: 'GET_YESTERDAY_PURCHASED', last7days: 'GET_LAST7DAYS_PURCHASED' } }[platform][period];
    try {
        const res = await fetch(phpApiUrl, { method: 'POST', body: new URLSearchParams({ tag, db: 'MAIN', app_id_array: JSON.stringify(appIdArray) }), cache: 'no-store', headers: { ...(await getAuthHeaders()) } });
        const data = await res.json(); if (data.success && Array.isArray(data.purchases)) data.purchases.forEach((p: any) => { const s = p.sku?.toLowerCase() || ''; if (s.includes('monthly')) counts.monthly++; else if (s.includes('yearly')) counts.yearly++; else if (s.includes('lifetime_offer')) counts.lifetime_offer++; else if (s.includes('lifetime')) counts.lifetime++; });
        return counts;
    } catch (e) { console.error(e); return counts; }
}

export async function getSubscriptionCountsForPeriod(period: SubscriptionPeriod, visibilityFlags?: Record<string, boolean>): Promise<SubscriptionCounts> {
    await requireAdminAuth();
    if (visibilityFlags?.['Subscription Counts'] === false) return { android: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 }, ios: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 } };
    const apps = await getApps(); const active = apps.filter(a => a.isActive);
    const androidAppIds = active.filter(a => (a.os === 'Android' || a.os === 'Android & iOS') && a.id).map(a => a.id);
    const iosAppIds = active.filter(a => (a.os === 'iOS' || a.os === 'Android & iOS') && a.id).map(a => a.id);
    const [as, is] = await Promise.all([getSubscriptionCounts('android', period, androidAppIds), getSubscriptionCounts('ios', period, iosAppIds)]);
    return { android: as, ios: is };
}

export interface FinancialSummaryData { appIncome: number; appProfit: number; otherExpenses: number; pfcAccountBalance: number; pfcLastUpdated?: string; mmAccountBalance: number; mmLastUpdated?: string; fixedDeposits: number; employeePayments: number; todaySubscriptions: SubscriptionCounts; quickStats: { pendingFeedbacks: number; totalApps: { android: number, ios: number }; activeInAppAds: number; }; debug: any; }

export async function getFinancialSummaryData(visibilityFlags?: Record<string, boolean>): Promise<FinancialSummaryData> {
    await requireAdminAuth();
    const showFin = visibilityFlags?.['Financial Overview'] !== false, showQ = visibilityFlags?.['Quick Stats'] !== false, showSub = visibilityFlags?.['Subscription Counts'] !== false;
    if (!showFin && !showQ && !showSub) return { appIncome: 0, appProfit: 0, otherExpenses: 0, pfcAccountBalance: 0, mmAccountBalance: 0, fixedDeposits: 0, employeePayments: 0, todaySubscriptions: { android: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 }, ios: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 } }, quickStats: { pendingFeedbacks: 0, totalApps: { android: 0, ios: 0 }, activeInAppAds: 0 }, debug: {} };
    try {
        const apps = await getApps(); const active = apps.filter(a => a.isActive); const appIds = active.filter(a => a.id).map(a => a.id);
        const tasks = {
            ae: showFin ? db.collection('android_earnings').get() : Promise.resolve({ docs: [] }), ie: showFin ? db.collection('apple_earnings').get() : Promise.resolve({ docs: [] }), am: showFin ? db.collection('admob_stats').get() : Promise.resolve({ docs: [] }), ads: showFin ? db.collection('ads_stats').get() : Promise.resolve({ docs: [] }),
            oi: showFin ? db.collection('other_income').get() : Promise.resolve({ docs: [] }), oe: showFin ? db.collection('other_expenses').get() : Promise.resolve({ docs: [] }), ep: showFin ? db.collection('employee_payments').get() : Promise.resolve({ docs: [] }),
            pfc: showFin ? db.collection('cash_accounts').doc('pfc_account').get() : Promise.resolve({ exists: false, data: () => null }), mm: showFin ? db.collection('cash_accounts').doc('mm_account').get() : Promise.resolve({ exists: false, data: () => null }), fd: showFin ? db.collection('fixed_deposits').get() : Promise.resolve({ docs: [] }),
            iaa: showQ ? db.collection('in_app_ads').where('status', '==', 'Active').get() : Promise.resolve({ size: 0 }),
        };
        const results: any = {}; const rs = await Promise.all(Object.values(tasks)); Object.keys(tasks).forEach((k, i) => results[k] = rs[i]);
        let feedback = 0; if (showQ) { try { const res = await fetch(phpApiUrl, { method: 'POST', body: new URLSearchParams({ tag: 'GET_ALL_APPS_FEEDBACK', type: 'P', db: 'MAIN', app_id_array: JSON.stringify(appIds) }), cache: 'no-store', headers: { ...(await getAuthHeaders()) } }); const j = await res.json(); if (j.success && j.feedbackLst) Object.values(j.feedbackLst).forEach((f: any) => { if (f.feedback) feedback += f.feedback.length; }); } catch (e) { console.error(e); } }
        const sum = (ds: any[], f: string) => ds.reduce((s: number, d: any) => { 
            if (!d || !d.exists) return s;
            const da = d.data(); 
            return da && da.rows ? s + da.rows.reduce((rs: number, r: any) => rs + (Number(r[f]) || 0), 0) : s; 
        }, 0);

        const anR = sum(results.ae.docs, 'amountMerchantCurrency');
        const apR = sum(results.ie.docs, 'proceedsUSD');
        const amR = results.am.docs.reduce((s: number, d: any) => {
            if (!d || !d.exists) return s;
            const da = d.data();
            if (!da) return s;
            if (da.totalEarnings) return s + da.totalEarnings;
            if (da.rows) return s + da.rows.reduce((rs: number, r: any) => rs + (Number(r.estimatedEarnings) || 0), 0);
            return s;
        }, 0);
        
        const adE = results.ads.docs.reduce((s: number, d: any) => {
            if (!d || !d.exists) return s;
            const da = d.data();
            return da && da.rows ? s + da.rows.reduce((rs: number, r: any) => rs + (r.Costs || 0), 0) : s;
        }, 0);
        
        let oiT = 0; 
        for (const d of results.oi.docs) {
            if (d.exists) {
                const da = d.data();
                oiT += da.convertedAmount !== undefined ? da.convertedAmount : await convertToUSD(da.amount || 0, da.currency || 'USD');
            }
        }

        let oeT = 0; 
        for (const d of results.oe.docs) {
            if (d.exists) {
                const da = d.data();
                oeT += da.convertedAmount !== undefined ? da.convertedAmount : await convertToUSD(da.amount || 0, da.currency || 'USD');
            }
        }

        const inc = anR + apR + amR + oiT;
        const prof = inc + adE - oeT;
        const epL = results.ep.docs.reduce((s: number, d: any) => {
            if (!d || !d.exists) return s;
            const da = d.data();
            return da ? s + (da.amount || 0) * (da.currency === 'USD' ? 300 : 1) : s;
        }, 0);
        
        const pfcB = results.pfc.exists ? results.pfc.data().balance : 0;
        const mmB = results.mm.exists ? results.mm.data().balance : 0;
        const pfcU = results.pfc.exists && results.pfc.data().lastUpdated ? formatDistanceToNow(results.pfc.data().lastUpdated.toDate(), { addSuffix: true }) : undefined;
        const mmU = results.mm.exists && results.mm.data().lastUpdated ? formatDistanceToNow(results.mm.data().lastUpdated.toDate(), { addSuffix: true }) : undefined;
        const fdT = results.fd.docs.reduce((s: number, d: any) => {
            if (!d || !d.exists) return s;
            return s + (d.data()?.amount || 0);
        }, 0);
        
        const appsS = active.reduce((acc: any, a: any) => { 
            if (a.os === 'Android' || a.os === 'Android & iOS') acc.android++; 
            if (a.os === 'iOS' || a.os === 'Android & iOS') acc.ios++; 
            return acc; 
        }, { android: 0, ios: 0 });

        return { 
            appIncome: inc, appProfit: prof, otherExpenses: oeT, 
            pfcAccountBalance: pfcB, pfcLastUpdated: pfcU, 
            mmAccountBalance: mmB, mmLastUpdated: mmU, 
            fixedDeposits: fdT, employeePayments: epL, 
            todaySubscriptions: { android: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 }, ios: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 } }, 
            quickStats: { pendingFeedbacks: feedback, totalApps: appsS, activeInAppAds: results.iaa.size }, 
            debug: showFin ? { anR, apR, amR, adE, oeT, oiT, epL, pfcB, mmB, fdT } : {} 
        };
    } catch (e) { 
        console.error(e); 
        return { 
            appIncome: 0, appProfit: 0, otherExpenses: 0, pfcAccountBalance: 0, mmAccountBalance: 0, fixedDeposits: 0, employeePayments: 0, 
            todaySubscriptions: { android: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 }, ios: { monthly: 0, yearly: 0, lifetime: 0, lifetime_offer: 0 } }, 
            quickStats: { pendingFeedbacks: 0, totalApps: { android: 0, ios: 0 }, activeInAppAds: 0 }, 
            debug: { error: (e as Error).message } 
        }; 
    }
}

export type MonthlyBreakdown = { month: string; apple: number; android: number; admob: number; };
export async function getMonthlyEarningsBreakdown(months: number): Promise<MonthlyBreakdown[]> {
    await requireAdminAuth();
    const dateRange = Array.from({ length: months }, (_, i) => { const d = subMonths(startOfMonth(subMonths(new Date(), 1)), i); return { year: d.getFullYear(), month: d.getMonth() + 1, monthName: format(d, 'MMM') }; }).reverse();
    const map: { [key: string]: MonthlyBreakdown } = {}; dateRange.forEach(d => map[`${d.year}-${String(d.month).padStart(2, '0')}`] = { month: d.monthName, apple: 0, android: 0, admob: 0 });
    try {
        const start = `earnings_${dateRange[0].year}_${String(dateRange[0].month).padStart(2, '0')}`, end = `earnings_${dateRange[dateRange.length-1].year}_${String(dateRange[dateRange.length-1].month).padStart(2, '0')}`;
        for (const [coll, key, field] of [['apple_earnings_reports', 'apple', 'proceedsUSD'], ['android_earnings_reports', 'android', 'amountMerchantCurrency'], ['admob_earnings', 'admob', 'estimatedEarnings']]) {
            const sn = await db.collection(coll).where(admin.firestore.FieldPath.documentId(), '>=', start).where(admin.firestore.FieldPath.documentId(), '<=', end).get();
            sn.forEach(doc => { const [_, y, m] = doc.id.split('_'); const k = `${y}-${m}`; if (map[k] && doc.data()?.rows) (map[k] as any)[key] += doc.data().rows.reduce((s: number, r: any) => s + (r[field] || 0), 0); });
        }
    } catch (e) { console.error(e); } return Object.values(map);
}

export interface ActiveSubscriberMetric { total: number; android: number; apple: number }
export interface ActiveSubscribers {
    yearly: ActiveSubscriberMetric;
    monthly: ActiveSubscriberMetric;
    trials: ActiveSubscriberMetric;
}
export async function getHomeActiveFunnelStats(): Promise<ActiveSubscribers> {
    await requireAdminAuth();
    const empty: ActiveSubscribers = {
        yearly: { total: 0, android: 0, apple: 0 },
        monthly: { total: 0, android: 0, apple: 0 },
        trials: { total: 0, android: 0, apple: 0 },
    };
    const requestParams = {
        tag: 'GET_HOME_ACTIVE_FUNNEL',
        db: '0',
    };

    try {
        const response = await fetch(phpApiUrl, {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(await getAuthHeaders()),
            },
            body: new URLSearchParams(requestParams),
        });
        const payload = await response.json();
        if (!payload?.success || !payload?.active_funnel) {
            return empty;
        }

        return {
            yearly: { ...empty.yearly, ...(payload.active_funnel.yearly || {}) },
            monthly: { ...empty.monthly, ...(payload.active_funnel.monthly || {}) },
            trials: { ...empty.trials, ...(payload.active_funnel.trials || {}) },
        };
    } catch (error) {
        console.error('Error fetching home active funnel:', error);
        return empty;
    }
}

export async function getCurrentActiveSubscribers(): Promise<ActiveSubscribers> {
    await requireAdminAuth();
    const res: ActiveSubscribers = {
        yearly: { total: 0, android: 0, apple: 0 },
        monthly: { total: 0, android: 0, apple: 0 },
        trials: { total: 0, android: 0, apple: 0 },
    };
    try {
        const as = await db.collection('android_subscription_reports').orderBy(admin.firestore.FieldPath.documentId(), 'asc').get();
        if (!as.empty) { const d = as.docs[as.docs.length-1].data(); if (d.rows) { const md = d.rows.reduce((m: string, r: any) => r.date > m ? r.date : m, d.rows[0].date); d.rows.filter((r: any) => r.date === md).forEach((r: any) => { if (r.productId?.toLowerCase().includes('yearly')) res.yearly.android += r.activeSubscriptions; else if (r.productId?.toLowerCase().includes('monthly')) res.monthly.android += r.activeSubscriptions; }); } }
        const ps = await db.collection('apple_subscription_reports').orderBy(admin.firestore.FieldPath.documentId(), 'asc').get();
        if (!ps.empty) { const d = ps.docs[ps.docs.length-1].data(); if (d.rows) d.rows.forEach((r: any) => { const n = r.subscriptionName?.toLowerCase() || ''; if (n.includes('yearly') || n.includes('annual')) res.yearly.apple += r.activeStandardPriceSubscriptions; else if (n.includes('monthly')) res.monthly.apple += r.activeStandardPriceSubscriptions; }); }
        res.yearly.total = res.yearly.android + res.yearly.apple; res.monthly.total = res.monthly.android + res.monthly.apple;
    } catch (e) { console.error(e); } return res;
}

export interface TotalIncomeStats { lifetime: number; lastMonth: number; currentYear: number; breakdown: { source: string; value: number; fill: string; }[]; }
export async function getTotalIncomeStats(): Promise<TotalIncomeStats> {
    await requireAdminAuth();
    const res = { lifetime: 0, lastMonth: 0, currentYear: 0, breakdown: [] as any[] };
    try {
        const now = toZonedTime(new Date(), 'Asia/Colombo'), lmId = format(subMonths(now, 1), 'yyyy_MM'), cy = getYear(now);
        for (const [coll, field, label] of [['android_earnings_reports', 'amountMerchantCurrency', 'Android'], ['apple_earnings_reports', 'proceedsUSD', 'Apple'], ['admob_earnings', 'estimatedEarnings', 'AdMob']]) {
            const sn = await db.collection(coll).get(); 
            let lt = 0; 
            sn.forEach(doc => { 
                const d = doc.data(); 
                if (d) {
                    if (d.rows && Array.isArray(d.rows)) lt += d.rows.reduce((s: number, r: any) => s + (r[field] || 0), 0); 
                    else if (d.totalEarnings) lt += d.totalEarnings; 
                    else if (d.summary?.totalProceedsUSD) lt += d.summary.totalProceedsUSD; 
                }
            });
            res.lifetime += lt; res.breakdown.push({ source: label, value: lt, fill: '' });
            
            const lm = await db.collection(coll).doc(`earnings_${lmId}`).get(); 
            if (lm.exists) { 
                const d = lm.data(); 
                if (d) {
                    if (d.rows && Array.isArray(d.rows)) res.lastMonth += d.rows.reduce((s: number, r: any) => s + (r[field] || 0), 0); 
                    else if (d.totalEarnings) res.lastMonth += d.totalEarnings; 
                }
            }
            const yn = await db.collection(coll).where(admin.firestore.FieldPath.documentId(), '>=', `earnings_${cy}_01`).where(admin.firestore.FieldPath.documentId(), '<=', `earnings_${cy}_12`).get();
            yn.forEach(doc => { 
                const d = doc.data(); 
                if (d) {
                    if (d.rows && Array.isArray(d.rows)) res.currentYear += d.rows.reduce((s: number, r: any) => s + (r[field] || 0), 0); 
                    else if (d.totalEarnings) res.currentYear += d.totalEarnings; 
                }
            });
        }
    } catch (e) { console.error(e); } return res;
}

export interface AppInstallResult {
    counts: InstallCounts;
    breakdown: AppInstallBreakdownItem[];
    debug: {
        requestParams: {
            tag: string;
            db: string;
            app_id_array: string;
            from_date: string;
            to_date: string;
        };
        rawResponse: any;
        error?: string;
        httpStatus?: number;
    };
}

export interface AppInstallBreakdownItem {
    appId: string;
    appName: string;
    appDb: string;
    packageName: string;
    platform: string;
    iconUrl: string;
    android: number;
    apple: number;
    total: number;
}

const toCountNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/,/g, '').trim());
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const getFirstCount = (source: Record<string, any> | undefined, keys: string[]): number => {
    if (!source) return 0;
    for (const key of keys) {
        const count = toCountNumber(source[key]);
        if (count > 0 || source[key] === 0 || source[key] === '0') return count;
    }
    return 0;
};

const extractAppInstallBreakdown = (source: any): AppInstallBreakdownItem[] => {
    const rows = source?.users?.apps || source?.apps || [];
    if (!Array.isArray(rows)) return [];

    return rows.map((row: any) => {
        const android = toCountNumber(row?.android_count ?? row?.android);
        const apple = toCountNumber(row?.ios_count ?? row?.apple_count ?? row?.ios ?? row?.apple);
        const total = toCountNumber(row?.total_count ?? row?.total) || android + apple;

        return {
            appId: String(row?.app_id ?? row?.id ?? ''),
            appName: String(row?.app_name ?? row?.name ?? row?.app_db ?? 'Unknown App'),
            appDb: String(row?.app_db ?? row?.db_name ?? ''),
            packageName: String(row?.package_name ?? ''),
            platform: String(row?.platform ?? row?.os ?? ''),
            iconUrl: String(row?.icon_url ?? ''),
            android,
            apple,
            total,
        };
    }).filter((row) => row.appName || row.appDb);
};

const extractPlatformCounts = (source: any): InstallCounts => {
    const empty: InstallCounts = { android: 0, apple: 0, total: 0 };
    if (!source) return empty;

    if (Array.isArray(source)) {
        return source.reduce((counts, item) => {
            const platform = String(item?.platform || item?.os || item?.device || item?.app_platform || '').toLowerCase();
            const value = toCountNumber(item?.count ?? item?.active_users ?? item?.activeUsers ?? item?.total ?? 1);
            if (platform.includes('android')) counts.android += value;
            if (platform.includes('ios') || platform.includes('apple')) counts.apple += value;
            counts.total += value;
            return counts;
        }, { ...empty });
    }

    if (typeof source !== 'object') return empty;

    const objectSource = source as Record<string, any>;
    const candidates = [
        objectSource.summary,
        objectSource.users?.summary,
        objectSource.active_users?.summary,
        objectSource.activeUsers?.summary,
        objectSource.active_users,
        objectSource.activeUsers,
        objectSource.counts,
        objectSource.users,
        objectSource,
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
            const counts = extractPlatformCounts(candidate);
            if (counts.total || counts.android || counts.apple) return counts;
            continue;
        }

        if (typeof candidate !== 'object') continue;

        const android = getFirstCount(candidate, [
            'android_count',
            'android_active_count',
            'android_active_users',
            'androidActiveUsers',
            'android_users',
            'androidUsers',
            'android',
        ]);
        const apple = getFirstCount(candidate, [
            'ios_count',
            'apple_count',
            'ios_active_count',
            'apple_active_count',
            'ios_active_users',
            'apple_active_users',
            'iosActiveUsers',
            'appleActiveUsers',
            'ios_users',
            'apple_users',
            'iosUsers',
            'appleUsers',
            'ios',
            'apple',
        ]);
        const total = getFirstCount(candidate, [
            'total_count',
            'total_active_count',
            'total_active_users',
            'totalActiveUsers',
            'active_users',
            'activeUsers',
            'total_users',
            'totalUsers',
            'total',
        ]);

        if (android || apple || total) {
            return {
                android,
                apple,
                total: total || android + apple,
            };
        }
    }

    return empty;
};

async function getHomeAppCountStats(tag: string, fromDate: string, toDate: string): Promise<AppInstallResult> {
    const counts: InstallCounts = { android: 0, apple: 0, total: 0 };
    const requestParams = {
        tag,
        db: '0',
        app_id_array: '',
        from_date: fromDate,
        to_date: toDate,
    };
    const emptyResult = { counts, breakdown: [], debug: { requestParams, rawResponse: null as any } };
    
    try {
        const apps = await getApps();
        const activeApps = apps.filter(a => a.isActive && a.id);
        const appIdArray = activeApps.map(a => a.id);
        
        requestParams.app_id_array = JSON.stringify(appIdArray);
        
        if (appIdArray.length === 0) {
            return { ...emptyResult, debug: { ...emptyResult.debug, error: 'No active apps found' } };
        }

        const res = await fetch(phpApiUrl, {
            method: 'POST',
            body: new URLSearchParams(requestParams),
            cache: 'no-store',
            headers: { ...(await getAuthHeaders()) }
        });

        const httpStatus = res.status;
        let data: any;
        const rawText = await res.text();
        try {
            data = JSON.parse(rawText);
        } catch {
            return { counts, breakdown: [], debug: { requestParams, rawResponse: rawText, error: `Failed to parse JSON. HTTP ${httpStatus}`, httpStatus } };
        }

        const parsedCounts = extractPlatformCounts(data);
        counts.android = parsedCounts.android;
        counts.apple = parsedCounts.apple;
        counts.total = parsedCounts.total;

        return { counts, breakdown: extractAppInstallBreakdown(data), debug: { requestParams, rawResponse: data, httpStatus } };
    } catch (e: any) {
        console.error(`Error fetching home app count stats for ${tag}:`, e);
        return { counts, breakdown: [], debug: { requestParams, rawResponse: null, error: e?.message || String(e) } };
    }
}

export async function getHomeAppInstallStats(fromDate: string, toDate: string): Promise<AppInstallResult> {
    await requireAdminAuth();
    return getHomeAppCountStats('GET_APP_INSTALL', fromDate, toDate);
}

export async function getHomeAppActiveUsersStats(fromDate: string, toDate: string): Promise<AppInstallResult> {
    await requireAdminAuth();
    return getHomeAppCountStats('GET_APP_ACTIVE_USERS', fromDate, toDate);
}
