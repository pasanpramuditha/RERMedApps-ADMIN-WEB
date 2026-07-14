'use server';

import { getAdmobStats, getDashboardStats, getHomeActiveFunnelStats, getHomeAppInstallStats, getHomeAppActiveUsersStats, getHomePurchaseStats } from "../dashboard/actions";
import type { DateRange } from "react-day-picker"
import { subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { DashboardVisibilityConfig } from "@/components/home/DashboardConfigDialog";
import { getGlobalSettings } from "../settings/actions";
import { getApps } from "../apps/actions";
import { getPhpBackendAuthHeaders, requireAdminAuth } from '@/lib/server-auth';

const phpApiUrl =
    process.env.NEXT_PUBLIC_RERMED_APPS_API_URL ||
    'https://admin.rermedapps.com/web/1.0/RERMedappsHandleling.php';

const HOME_TIME_ZONE = 'Asia/Colombo';

const AUTH_TOKEN_TTL_MS = 60_000;
let cachedPhpAuthToken: string | null = null;
let cachedPhpAuthTokenAt = 0;

export type HomePageConfig = {
    visibility: Record<string, boolean>;
    refreshIntervalSeconds: number;
    showDebugInfo: boolean;
};

export type HomeRevenueRange = 3 | 6 | 12;

export type HomeMonthlyRevenueRow = {
    month: string;
    label: string;
    androidRevenue: number;
    iosRevenue: number;
    admobRevenue: number;
    total: number;
    sources: {
        android: 'report' | 'events';
        ios: 'report' | 'events';
        admob: 'report' | 'none';
    };
    reportRows: {
        android: number;
        ios: number;
        admob: number;
    };
};

export type HomeMonthlyRevenueStats = {
    months: HomeRevenueRange;
    rows: HomeMonthlyRevenueRow[];
};

const defaultHomeVisibility: Record<string, boolean> = {
    netRevenue: true,
    appInstalls: true,
    activeUsers: true,
    purchaseEvents: true,
    refundEvents: true,
    appRevenue: true,
    activeFunnel: true,
    purchaseEventsDetails: true,
    admobStatus: true,
    revenueBreakdown: true,
    referralSource: true,
    adExpenses: true,
    revenueFlow: true,
    purchaseEventsLog: true,
};

const defaultHomePageConfig: HomePageConfig = {
    visibility: defaultHomeVisibility,
    refreshIntervalSeconds: 0,
    showDebugInfo: false,
};

type HomeConfigResponse = {
    success?: boolean;
    error_msg?: string;
    config?: {
        visibility?: Record<string, unknown>;
        refreshIntervalSeconds?: number | string;
        showDebugInfo?: boolean | number | string;
    };
};

type PlatformCounts = { android: number; apple: number; total: number };

type HomeReferralPurchaseDetail = {
    appId: string;
    appName: string;
    packageName: string;
    sku: string;
    purchaseUsers: number;
    purchaseEvents: number;
    revenueUsd: number;
    revenueLkr: number;
    iconUrl: string;
};

type HomeReferralSourceStats = {
    organic: PlatformCounts;
    inAppAds: PlatformCounts;
    googleAds: PlatformCounts;
    metaAds: PlatformCounts;
    others: PlatformCounts;
    details: Record<string, {
        label: string;
        acquired: PlatformCounts;
        purchaseUsers: number;
        purchaseEvents: number;
        revenueUsd: number;
        revenueLkr: number;
        purchases: HomeReferralPurchaseDetail[];
    }>;
};

type HomeGoogleAdsStats = {
    expenses: PlatformCounts;
    impressions: PlatformCounts;
    clicks: PlatformCounts;
};

const emptyPlatformCounts = (): PlatformCounts => ({ android: 0, apple: 0, total: 0 });

const emptyReferralSourceStats = (): HomeReferralSourceStats => ({
    organic: emptyPlatformCounts(),
    inAppAds: emptyPlatformCounts(),
    googleAds: emptyPlatformCounts(),
    metaAds: emptyPlatformCounts(),
    others: emptyPlatformCounts(),
    details: {
        organic: { label: 'Organic Installs', acquired: emptyPlatformCounts(), purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] },
        inAppAds: { label: 'In-App Ads', acquired: emptyPlatformCounts(), purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] },
        googleAds: { label: 'Google Ads', acquired: emptyPlatformCounts(), purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] },
        metaAds: { label: 'Meta Ads', acquired: emptyPlatformCounts(), purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] },
        others: { label: 'Others', acquired: emptyPlatformCounts(), purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] },
    },
});

const emptyGoogleAdsStats = (): HomeGoogleAdsStats => ({
    expenses: emptyPlatformCounts(),
    impressions: emptyPlatformCounts(),
    clicks: emptyPlatformCounts(),
});

const toHomeCountNumber = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/,/g, '').trim());
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

function formatHomeDate(date: Date, pattern: string) {
    return formatInTimeZone(date, HOME_TIME_ZONE, pattern);
}

async function postHomeAction(tag: string, body: Record<string, string> = {}) {
    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            tag,
            ...body,
        }),
    });

    const text = await response.text();
    try {
        return (text ? JSON.parse(text) : {}) as HomeConfigResponse;
    } catch {
        return {
            success: false,
            error_msg: 'PHP returned a non-JSON response.',
        } as HomeConfigResponse;
    }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  return getPhpBackendAuthHeaders();
}

async function postAuthedHomeAction(tag: string, body: Record<string, string> = {}) {
    const response = await fetch(phpApiUrl, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/x-www-form-urlencoded',
            ...(await getAuthHeaders()),
        },
        body: new URLSearchParams({
            tag,
            db: '0',
            ...body,
        }),
    });

    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return {
            success: false,
            error_msg: 'PHP returned a non-JSON response.',
            raw_response: text,
        };
    }
}

function normalizeHomePageConfig(config?: HomeConfigResponse['config']): HomePageConfig {
    if (!config) {
        return defaultHomePageConfig;
    }

    const visibility = { ...defaultHomeVisibility };
    if (config.visibility && typeof config.visibility === 'object') {
        for (const [key, value] of Object.entries(config.visibility)) {
            visibility[key] = value === true || value === 1 || value === '1';
        }
    }

    return {
        visibility,
        refreshIntervalSeconds: Number(config.refreshIntervalSeconds ?? 0) || 0,
        showDebugInfo: config.showDebugInfo === true || config.showDebugInfo === 1 || config.showDebugInfo === '1',
    };
}

export async function getHomePageConfig(): Promise<HomePageConfig> {
    await requireAdminAuth();
    try {
        const payload = await postAuthedHomeAction('GET_HOME_PAGE_CONFIG');
        if (!payload.success) {
            return defaultHomePageConfig;
        }

        return normalizeHomePageConfig(payload.config);
    } catch (error) {
        console.error('Error fetching home page config:', error);
        return defaultHomePageConfig;
    }
}

export async function saveHomePageConfig(visibility: Record<string, boolean>, refreshIntervalSeconds: number) {
    await requireAdminAuth();
    try {
        const payload = await postAuthedHomeAction('SAVE_HOME_PAGE_CONFIG', {
            visibility_json: JSON.stringify(visibility),
            refresh_interval_seconds: String(refreshIntervalSeconds),
        });

        if (!payload.success) {
            return { error: payload.error_msg || 'Failed to save home page config.' };
        }

        return { success: true, config: normalizeHomePageConfig(payload.config) };
    } catch (error: any) {
        return { error: error?.message || 'Failed to save home page config.' };
    }
}

export async function getHomeReferralSourceStats(fromDate: string, toDate: string): Promise<HomeReferralSourceStats> {
    await requireAdminAuth();
    const empty = emptyReferralSourceStats();

    try {
        const apps = await getApps();
        const activeApps = apps.filter((app) => app.isActive && app.id);
        const appIdArray = activeApps.map((app) => app.id);

        if (appIdArray.length === 0) {
            return empty;
        }

        const payload = await postAuthedHomeAction('GET_HOME_REFERRAL_SOURCE_STATS', {
            app_id_array: JSON.stringify(appIdArray),
            from_date: fromDate,
            to_date: toDate,
        });

        if (!payload?.success || !payload?.referral_source) {
            return empty;
        }

        const source = payload.referral_source;
        const makeCounts = (bucket: any): PlatformCounts => {
            const android = toHomeCountNumber(bucket?.android);
            const apple = 0;
            const total = toHomeCountNumber(bucket?.total) || android + apple;
            return { android, apple, total };
        };
        const makeDetail = (key: keyof HomeReferralSourceStats['details'], label: string) => {
            const detail = source.details?.[key] || {};
            const acquired = makeCounts(detail.acquired || source[key]);
            const purchases = Array.isArray(detail.purchases)
                ? detail.purchases.map((purchase: any) => ({
                    appId: String(purchase.app_id ?? purchase.appId ?? ''),
                    appName: String(purchase.app_name ?? purchase.appName ?? 'Unknown App'),
                    packageName: String(purchase.package_name ?? purchase.packageName ?? ''),
                    sku: String(purchase.sku ?? ''),
                    purchaseUsers: toHomeCountNumber(purchase.purchase_users ?? purchase.purchaseUsers),
                    purchaseEvents: toHomeCountNumber(purchase.purchase_events ?? purchase.purchaseEvents),
                    revenueUsd: toHomeCountNumber(purchase.revenue_usd ?? purchase.revenueUsd),
                    revenueLkr: toHomeCountNumber(purchase.revenue_lkr ?? purchase.revenueLkr),
                    iconUrl: String(purchase.icon_url ?? purchase.iconUrl ?? ''),
                }))
                : [];
            return {
                label: String(detail.label || label),
                acquired,
                purchaseUsers: toHomeCountNumber(detail.purchase_users ?? detail.purchaseUsers),
                purchaseEvents: toHomeCountNumber(detail.purchase_events ?? detail.purchaseEvents),
                revenueUsd: toHomeCountNumber(detail.revenue_usd ?? detail.revenueUsd),
                revenueLkr: toHomeCountNumber(detail.revenue_lkr ?? detail.revenueLkr),
                purchases,
            };
        };

        return {
            organic: makeCounts(source.organic),
            inAppAds: makeCounts(source.inAppAds),
            googleAds: makeCounts(source.googleAds),
            metaAds: makeCounts(source.metaAds),
            others: makeCounts(source.others),
            details: {
                organic: makeDetail('organic', 'Organic Installs'),
                inAppAds: makeDetail('inAppAds', 'In-App Ads'),
                googleAds: makeDetail('googleAds', 'Google Ads'),
                metaAds: makeDetail('metaAds', 'Meta Ads'),
                others: makeDetail('others', 'Others'),
            },
        };
    } catch (error) {
        console.error('Error fetching home referral source stats:', error);
        return empty;
    }
}

export async function getHomeGoogleAdsStats(fromDate: string, toDate: string): Promise<HomeGoogleAdsStats> {
    await requireAdminAuth();
    const empty = emptyGoogleAdsStats();

    try {
        const payload = await postAuthedHomeAction('GET_HOME_GOOGLE_ADS_STATS', {
            from_date: fromDate,
            to_date: toDate,
        });

        if (!payload?.success || !payload?.google_ads) {
            return empty;
        }

        const source = payload.google_ads;
        const expenses = {
            android: toHomeCountNumber(source.expenses?.android),
            apple: toHomeCountNumber(source.expenses?.apple),
            total: toHomeCountNumber(source.expenses?.total),
        };
        const impressions = {
            android: toHomeCountNumber(source.impressions?.android),
            apple: toHomeCountNumber(source.impressions?.apple),
            total: toHomeCountNumber(source.impressions?.total),
        };
        const clicks = {
            android: toHomeCountNumber(source.clicks?.android),
            apple: toHomeCountNumber(source.clicks?.apple),
            total: toHomeCountNumber(source.clicks?.total),
        };

        return {
            expenses: { ...expenses, total: expenses.total || expenses.android + expenses.apple },
            impressions: { ...impressions, total: impressions.total || impressions.android + impressions.apple },
            clicks: { ...clicks, total: clicks.total || clicks.android + clicks.apple },
        };
    } catch (error) {
        console.error('Error fetching home Google Ads stats:', error);
        return empty;
    }
}

export async function getHomeDashboardStats(dateRange?: DateRange, visibilityConfig?: DashboardVisibilityConfig) {
    await requireAdminAuth();
    const startDate = dateRange?.from ? formatHomeDate(dateRange.from, 'yyyy-MM') : undefined;
    const endDate = dateRange?.to ? formatHomeDate(dateRange.to, 'yyyy-MM') : startDate;

    const fromDateStr = dateRange?.from ? formatHomeDate(dateRange.from, 'yyyy-MM-dd') : formatHomeDate(new Date(), 'yyyy-MM-dd');
    const toDateStr = dateRange?.to ? formatHomeDate(dateRange.to, 'yyyy-MM-dd') : fromDateStr;
    const isVisible = (key: string) => visibilityConfig?.[key] !== false;

    const needsDashboardStats =
        isVisible('netRevenue') ||
        isVisible('revenueFlow');
    const needsAdmobStats =
        isVisible('netRevenue') ||
        isVisible('admobStatus') ||
        isVisible('revenueFlow');
    const needsPurchaseStats =
        isVisible('netRevenue') ||
        isVisible('purchaseEvents') ||
        isVisible('refundEvents') ||
        isVisible('appRevenue') ||
        isVisible('revenueFlow');
    const needsActiveUsers = isVisible('activeUsers');
    const needsActiveSubscribers = isVisible('activeFunnel');
    const needsAppInstalls = isVisible('appInstalls');
    const needsReferralSource = isVisible('referralSource');
    const needsGoogleAdsStats =
        isVisible('netRevenue') ||
        isVisible('adExpenses') ||
        isVisible('revenueFlow');

    const results = await Promise.all([
        needsDashboardStats ? getDashboardStats(startDate, endDate, { 'App Purchases': false, 'App Revenue': false, 'Admob Impressions': false, 'Admob CTR': false, 'Admob Revenue': false }) : Promise.resolve(null),
        needsAdmobStats ? getAdmobStats(fromDateStr, toDateStr) : Promise.resolve(null),
        needsActiveSubscribers ? getHomeActiveFunnelStats() : Promise.resolve(null),
        needsAppInstalls ? getHomeAppInstallStats(fromDateStr, toDateStr) : Promise.resolve({ counts: { android: 0, apple: 0, total: 0 }, breakdown: [], debug: { requestParams: { tag: '', db: '', app_id_array: '', from_date: '', to_date: '' }, rawResponse: null, error: 'Skipped - visibility disabled' } }),
        needsActiveUsers ? getHomeAppActiveUsersStats(fromDateStr, toDateStr) : Promise.resolve({ counts: { android: 0, apple: 0, total: 0 }, breakdown: [], debug: { requestParams: { tag: '', db: '', app_id_array: '', from_date: '', to_date: '' }, rawResponse: null, error: 'Skipped - visibility disabled' } }),
        needsPurchaseStats ? getHomePurchaseStats(fromDateStr, toDateStr) : Promise.resolve({ purchases: { totalPurchases: { total: 0, android: 0, apple: 0 }, refundEvents: { total: 0, android: 0, apple: 0 }, freeTrials: { total: 0, android: 0, apple: 0 }, yearlySubscribers: { total: 0, android: 0, apple: 0 }, monthlySubscribers: { total: 0, android: 0, apple: 0 }, lifetimePurchases: { total: 0, android: 0, apple: 0 }, offerPurchases: { total: 0, android: 0, apple: 0 }, appRevenue: { total: 0, android: 0, apple: 0 }, appRevenueLkr: { total: 0, android: 0, apple: 0 }, grossAppRevenue: { total: 0, android: 0, apple: 0 }, grossAppRevenueLkr: { total: 0, android: 0, apple: 0 }, refundRevenue: { total: 0, android: 0, apple: 0 }, refundRevenueLkr: { total: 0, android: 0, apple: 0 }, appBreakdown: { monthly: [], yearly: [], lifetime: [], offer: [] } }, debug: { requestParams: {}, rawResponse: null, error: 'Skipped - visibility disabled' } }),
        needsReferralSource ? getHomeReferralSourceStats(fromDateStr, toDateStr) : Promise.resolve(emptyReferralSourceStats()),
        needsGoogleAdsStats ? getHomeGoogleAdsStats(fromDateStr, toDateStr) : Promise.resolve(emptyGoogleAdsStats()),
    ]);

    const dashboardStats = results[0];
    const admobStats = results[1];
    const activeSubscribers = results[2];
    const appInstallResult = results[3];
    const activeUsersResult = results[4];
    const purchaseResult = results[5];
    const referralSourceResult = results[6];
    const googleAdsStats = results[7];
    const purchaseStats = purchaseResult.purchases;
    const grossAppRevenue = purchaseStats?.grossAppRevenue || purchaseStats?.appRevenue || { android: 0, apple: 0, total: 0 };
    const grossAppRevenueLkr = purchaseStats?.grossAppRevenueLkr || purchaseStats?.appRevenueLkr || { android: 0, apple: 0, total: 0 };
    const refundRevenue = purchaseStats?.refundRevenue || { android: 0, apple: 0, total: 0 };
    const refundRevenueLkr = purchaseStats?.refundRevenueLkr || { android: 0, apple: 0, total: 0 };
    const netAppRevenue = purchaseStats?.appRevenue || {
        android: (grossAppRevenue.android || 0) - (refundRevenue.android || 0),
        apple: (grossAppRevenue.apple || 0) - (refundRevenue.apple || 0),
        total: (grossAppRevenue.total || 0) - (refundRevenue.total || 0),
    };

    const netRevenue = (netAppRevenue.total || 0) + 
                       (admobStats?.revenue?.total || 0) -
                       Math.abs(googleAdsStats?.expenses?.total || 0) + 
                       (dashboardStats?.other?.totalAmount || 0);

    return {
        netRevenue,
        appInstalls: appInstallResult.counts || { android: 0, apple: 0, total: 0 },
        appInstallBreakdown: appInstallResult.breakdown || [],
        appInstallDebug: appInstallResult.debug,
        activeUsers: activeUsersResult.counts.total || 0, 
        activeUsersAndroid: activeUsersResult.counts.android || 0,
        activeUsersIos: activeUsersResult.counts.apple || 0,
        activeUsersDebug: activeUsersResult.debug,
        purchaseEvents: purchaseStats?.totalPurchases || { android: 0, apple: 0, total: 0 },
        refundEvents: purchaseStats?.refundEvents || { android: 0, apple: 0, total: 0 },
        purchaseStats,
        purchaseDebug: purchaseResult.debug,
        appRevenue: grossAppRevenue,
        appRevenueLkr: grossAppRevenueLkr,
        netAppRevenue,
        netAppRevenueLkr: purchaseStats?.appRevenueLkr || {
            android: (grossAppRevenueLkr.android || 0) - (refundRevenueLkr.android || 0),
            apple: (grossAppRevenueLkr.apple || 0) - (refundRevenueLkr.apple || 0),
            total: (grossAppRevenueLkr.total || 0) - (refundRevenueLkr.total || 0),
        },
        grossAppRevenue,
        grossAppRevenueLkr,
        refundRevenue,
        refundRevenueLkr,
        adExpenses: googleAdsStats,
        revenueFlow: {
            appIncome: netAppRevenue.total || 0,
            admobIncome: admobStats?.revenue?.total || 0,
            adsExpenses: googleAdsStats?.expenses?.total || 0,
            net: (netAppRevenue.total || 0) +
                 (admobStats?.revenue?.total || 0) -
                 Math.abs(googleAdsStats?.expenses?.total || 0),
        },
        referralSource: referralSourceResult,
        admobStatus: admobStats || { revenue: { total: 0, android: 0, apple: 0 }, impressions: { total: 0, android: 0, apple: 0 }, clicks: { total: 0, android: 0, apple: 0 }, ctr: 0, ctrByPlatform: { android: 0, apple: 0 } },
        activeFunnel: activeSubscribers || {
            monthly: { total: 0, android: 0, apple: 0 },
            yearly: { total: 0, android: 0, apple: 0 },
            trials: { total: 0, android: 0, apple: 0 },
            lifetime: { total: 0, android: 0, apple: 0 },
            lifetimeOffer: { total: 0, android: 0, apple: 0 },
        },
    }
}


export async function getDetailedPurchaseEvents(period: 'today' | 'yesterday' | 'last7days') {
    await requireAdminAuth();
    const today = new Date();
    let from = today;
    let to = today;

    if (period === 'yesterday') {
        from = subDays(today, 1);
        to = from;
    } else if (period === 'last7days') {
        from = subDays(today, 6);
    }

    const result = await getHomePurchaseStats(formatHomeDate(from, 'yyyy-MM-dd'), formatHomeDate(to, 'yyyy-MM-dd'));
    return result.purchases;
}

export async function getHomeMonthlyRevenueStats(months: HomeRevenueRange): Promise<{ data: HomeMonthlyRevenueStats; error?: string }> {
    await requireAdminAuth();
    const safeMonths: HomeRevenueRange = months === 3 || months === 12 ? months : 6;
    const empty: HomeMonthlyRevenueStats = {
        months: safeMonths,
        rows: [],
    };

    try {
        const payload = await postAuthedHomeAction('GET_HOME_MONTHLY_REVENUE_STATS', {
            months: String(safeMonths),
        });

        if (!payload?.success || !payload?.revenue) {
            return {
                data: empty,
                error: payload?.error_msg || 'Failed to load monthly revenue chart.',
            };
        }

        const rows = Array.isArray(payload.revenue.rows) ? payload.revenue.rows : [];
        return {
            data: {
                months: safeMonths,
                rows: rows.map((row: any) => ({
                    month: String(row.month || ''),
                    label: String(row.label || row.month || ''),
                    androidRevenue: Number(row.androidRevenue || 0),
                    iosRevenue: Number(row.iosRevenue || 0),
                    admobRevenue: Number(row.admobRevenue || 0),
                    total: Number(row.total || 0),
                    sources: {
                        android: row.sources?.android === 'report' ? 'report' : 'events',
                        ios: row.sources?.ios === 'report' ? 'report' : 'events',
                        admob: row.sources?.admob === 'report' ? 'report' : 'none',
                    },
                    reportRows: {
                        android: Number(row.reportRows?.android || 0),
                        ios: Number(row.reportRows?.ios || 0),
                        admob: Number(row.reportRows?.admob || 0),
                    },
                })),
            },
        };
    } catch (error: any) {
        return {
            data: empty,
            error: error?.message || 'Failed to load monthly revenue chart.',
        };
    }
}
