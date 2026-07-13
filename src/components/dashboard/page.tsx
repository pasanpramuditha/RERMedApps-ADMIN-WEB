

'use client';

import * as React from 'react';
import { InfoCard } from '@/components/dashboard/info-card';
import { EarningBreakdownChart } from '@/components/dashboard/earning-breakdown-chart';
import { AdExpensesChart } from '@/components/dashboard/ad-expenses-chart';
import { BestSellingApps } from '@/components/dashboard/best-selling-apps';
import { PageHeader } from '@/components/dashboard/page-header';
import { getDashboardStats, getCurrentActiveSubscribers, type ActiveSubscribers } from '@/app/(dashboard)/dashboard/actions';
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format, subMonths, getMonth } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';
import type { GlobalSettings } from '@/app/(dashboard)/settings/data';
import { defaultDashboardConfig } from '@/components/settings/dashboard-customization-form';
import { AppRevenueChart } from '@/components/dashboard/app-revenue-chart';
import { cn } from '@/lib/utils';
import { FinancialSummary } from '@/components/dashboard/financial-summary';


function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function formatCurrency(num: number | undefined): string {
    if (num === undefined) return '$0';
    if (num >= 1000000) {
        return '$' + (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
        return '$' + (num / 1000).toFixed(2) + 'K';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

interface Stats {
    installs: {
        android: number;
        apple: number;
        total: number;
    };
    purchases: {
        totalPurchases: { total: number; android: number; apple: number };
        appRevenue: { total: number; android: number; apple: number };
    };
    admob: {
        revenue: { total: number; android: number; apple: number; };
        impressions: { total: number; android: number; apple: number; };
        ctr: number;
    };
    googleAds: {
        expenses: { total: number; android: number; apple: number };
        impressions: { total: number; android: number; apple: number };
        clicks: { total: number; android: number; apple: number };
    };
    other: {
        otherIncome: number;
        otherExpenses: number;
        totalAmount: number;
    }
}

interface DashboardSettings {
    cardConfig: {
        [key: string]: {
            icon: string;
            color: string;
        }
    };
    platformIcons: {
        apple: string;
        android: string;
    },
    platformStyles: {
        android: { bgColor: string };
        ios: { bgColor: string };
    }
}

interface VisibilitySettings {
    [key: string]: boolean;
}

const demoStats: Stats = {
    installs: { android: 12500, apple: 8500, total: 21000 },
    purchases: { totalPurchases: { total: 450, android: 300, apple: 150 }, appRevenue: { total: 15000, android: 10000, apple: 5000 } },
    admob: { revenue: { total: 8000, android: 5000, apple: 3000 }, impressions: { total: 1200000, android: 800000, apple: 400000 }, ctr: 2.5 },
    googleAds: { expenses: { total: 3000, android: 2000, apple: 1000 }, impressions: { total: 500000, android: 300000, apple: 200000 }, clicks: { total: 5000, android: 3000, apple: 2000 } },
    other: { otherIncome: 1200, otherExpenses: 400, totalAmount: 800 }
};

const demoActiveSubscribers: ActiveSubscribers = {
    yearly: { total: 1200, android: 800, apple: 400 },
    monthly: { total: 3500, android: 2500, apple: 1000 },
    trials: { total: 45, android: 25, apple: 20 }
};

export default function DashboardPage() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [activeSubscribers, setActiveSubscribers] = React.useState<ActiveSubscribers | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadingSubs, setLoadingSubs] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState(subMonths(new Date(), 1));
  const [dashboardSettings, setDashboardSettings] = React.useState<DashboardSettings>(defaultDashboardConfig);
  const [visibilitySettings, setVisibilitySettings] = React.useState<VisibilitySettings>({});
  const [loadingSettings, setLoadingSettings] = React.useState(true);
  const [demoMode, setDemoMode] = React.useState({ infoCards: false, appCharts: false, financialSummary: false });

  React.useEffect(() => {
    async function fetchSettings() {
        setLoadingSettings(true);
        const settings: GlobalSettings = await getGlobalSettings();
        if (settings.dashboard_cards_json) {
            try {
                const parsedSettings = JSON.parse(settings.dashboard_cards_json);
                setDashboardSettings(parsedSettings);
            } catch (e) {
                console.error("Failed to parse dashboard_cards_json, using default.", e);
                setDashboardSettings(defaultDashboardConfig);
            }
        } else {
            setDashboardSettings(defaultDashboardConfig);
        }

        if (settings.navigation_visibility_json) {
            try {
                setVisibilitySettings(JSON.parse(settings.navigation_visibility_json));
            } catch (e) {
                console.error("Failed to parse navigation_visibility_json.", e);
                setVisibilitySettings({});
            }
        }
        
        setDemoMode({
            infoCards: !!settings.demo_mode_info_cards,
            appCharts: !!settings.demo_mode_app_charts,
            financialSummary: !!settings.demo_mode_financial_summary,
        });

        setLoadingSettings(false);
    }
    fetchSettings();
  }, []);

  React.useEffect(() => {
    const fetchStats = async () => {
        if (demoMode.infoCards) {
            setStats(demoStats);
            setLoading(false);
            return;
        }

        setLoading(true);

        let startDate, endDate;
        const month = getMonth(selectedDate);
        const day = selectedDate.getDate();

        // If the date is the first day of the first month, fetch for the whole year
        if (month === 0 && day === 1) {
            startDate = format(startOfYear(selectedDate), 'yyyy-MM');
            endDate = format(endOfYear(selectedDate), 'yyyy-MM');
        } else { // Otherwise, fetch for the selected month
            startDate = format(startOfMonth(selectedDate), 'yyyy-MM');
            endDate = format(endOfMonth(selectedDate), 'yyyy-MM');
        }

        const dashboardData = await getDashboardStats(startDate, endDate);
        
        const { purchases, ...rest } = dashboardData;
        const { yearlySubscribers, monthlySubscribers, ...restPurchases } = purchases;
        
        setStats({ purchases: restPurchases, ...rest });
        setLoading(false);
    }
    if (!loadingSettings) {
      fetchStats();
    }
  }, [selectedDate, demoMode.infoCards, loadingSettings]);

  React.useEffect(() => {
    const fetchActiveSubs = async () => {
        if (demoMode.infoCards) {
            setActiveSubscribers(demoActiveSubscribers);
            setLoadingSubs(false);
            return;
        }
        setLoadingSubs(true);
        const subsData = await getCurrentActiveSubscribers();
        setActiveSubscribers(subsData);
        setLoadingSubs(false);
    }
    if (!loadingSettings) {
      fetchActiveSubs();
    }
  }, [demoMode.infoCards, loadingSettings]);

  const InfoCardSkeleton = () => <Skeleton className="h-[128px] rounded-lg" />;
  
  if (loadingSettings) {
      return (
        <div className="flex flex-col gap-6">
            <PageHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(15)].map((_, i) => <InfoCardSkeleton key={i} />)}
            </div>
        </div>
      )
  }

  const { cardConfig, platformIcons, platformStyles } = dashboardSettings;
  
  const netRevenue = stats 
    ? stats.purchases.appRevenue.total + stats.admob.revenue.total - stats.googleAds.expenses.total + stats.other.totalAmount
    : 0;

  return (
    <div className="flex flex-col gap-6">
        <PageHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* This section can be a map if the cards are dynamic */}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="App Installs" value={formatNumber(stats.installs.total)} androidValue={formatNumber(stats.installs.android)} iosValue={formatNumber(stats.installs.apple)} iconUrl={cardConfig.installs.icon} iconBgClassName="bg-blue-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="App Purchases" value={formatNumber(stats.purchases.totalPurchases.total)} androidValue={formatNumber(stats.purchases.totalPurchases.android)} iosValue={formatNumber(stats.purchases.totalPurchases.apple)} iconUrl={cardConfig.purchases.icon} iconBgClassName="bg-orange-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="App Revenue (USD)" value={formatCurrency(stats.purchases.appRevenue.total)} androidValue={formatCurrency(stats.purchases.appRevenue.android)} iosValue={formatCurrency(stats.purchases.appRevenue.apple)} iconUrl={cardConfig.appRevenue.icon} iconBgClassName="bg-red-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Admob Impressions" value={formatNumber(stats.admob.impressions.total)} androidValue={formatNumber(stats.admob.impressions.android)} iosValue={formatNumber(stats.admob.impressions.apple)} iconUrl={cardConfig.admobImpressions.icon} iconBgClassName="bg-purple-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Admob CTR" value={`${stats.admob.ctr.toFixed(2)}%`} iconUrl={cardConfig.admobCtr.icon} iconBgClassName="bg-indigo-500" platformIcons={platformIcons} platformStyles={platformStyles} change="Click-through rate for all ads." />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Admob Revenue (USD)" value={formatCurrency(stats.admob.revenue.total)} androidValue={formatCurrency(stats.admob.revenue.android)} iosValue={formatCurrency(stats.admob.revenue.apple)} iconUrl={cardConfig.admobRevenue.icon} iconBgClassName="bg-pink-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Ads Impressions" value={formatNumber(stats.googleAds.impressions.total)} androidValue={formatNumber(stats.googleAds.impressions.android)} iosValue={formatNumber(stats.googleAds.impressions.apple)} iconUrl={cardConfig.adsImpressions.icon} iconBgClassName="bg-gray-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Ads Clicks" value={formatNumber(stats.googleAds.clicks.total)} androidValue={formatNumber(stats.googleAds.clicks.android)} iosValue={formatNumber(stats.googleAds.clicks.apple)} iconUrl={cardConfig.costPerConversion.icon} iconBgClassName="bg-gray-600" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Ads Expenses (USD)" value={formatCurrency(stats.googleAds.expenses.total)} androidValue={formatNumber(stats.googleAds.expenses.android)} iosValue={formatNumber(stats.googleAds.expenses.apple)} iconUrl={cardConfig.adsExpenses.icon} iconBgClassName="bg-slate-600" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Other Income" value={formatCurrency(stats.other.otherIncome)} change="Total income outside of app or ad revenue." iconUrl={cardConfig.otherIncome.icon} iconBgClassName="bg-gray-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Other Expenses" value={formatCurrency(stats.other.otherExpenses)} change="Total operational expenses outside of ads." iconUrl={cardConfig.otherExpenses.icon} iconBgClassName="bg-gray-600" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Total Amount" value={formatCurrency(stats.other.totalAmount)} change="Net balance from other income and expenses." iconUrl={cardConfig.totalAmount.icon} iconBgClassName="bg-slate-600" platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loadingSubs || !activeSubscribers ? <InfoCardSkeleton /> : <InfoCard title="Active Yearly Subs" value={formatNumber(activeSubscribers.yearly.total)} androidValue={formatNumber(activeSubscribers.yearly.android)} iosValue={formatNumber(activeSubscribers.yearly.apple)} iconUrl={cardConfig.yearlySubs.icon} iconBgClassName="bg-green-500" isLive={true} platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loadingSubs || !activeSubscribers ? <InfoCardSkeleton /> : <InfoCard title="Active Monthly Subs" value={formatNumber(activeSubscribers.monthly.total)} androidValue={formatNumber(activeSubscribers.monthly.android)} iosValue={formatNumber(activeSubscribers.monthly.apple)} iconUrl={cardConfig.monthlySubs.icon} iconBgClassName="bg-teal-500" isLive={true} platformIcons={platformIcons} platformStyles={platformStyles} />}
                {loading || !stats ? <InfoCardSkeleton /> : <InfoCard title="Net Revenue (USD)" value={formatCurrency(netRevenue)} change="App Revenue + AdMob Revenue - Ad Expenses + Other" iconUrl={cardConfig.netRevenue.icon} iconBgClassName="bg-pink-500" platformIcons={platformIcons} platformStyles={platformStyles} />}
            </div>
            <div className="lg:col-span-1">
                <FinancialSummary demoMode={demoMode.financialSummary} />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibilitySettings['Earning Breakdown'] !== false && <EarningBreakdownChart />}
            {visibilitySettings['Ad Expenses'] !== false && <AdExpensesChart />}
        </div>
        
        {visibilitySettings['App Revenue Breakdown'] !== false && (
            <div className="grid grid-cols-1 gap-6">
                <AppRevenueChart demoMode={demoMode.appCharts} />
            </div>
        )}
        
        {visibilitySettings['Best Selling Apps'] !== false && (
            <div className="grid grid-cols-1 gap-6">
                <BestSellingApps />
            </div>
        )}
    </div>
  );
}
