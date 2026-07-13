

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getFinancialSummaryData, type FinancialSummaryData } from '@/app/(dashboard)/dashboard/actions';
import { Skeleton } from '../ui/skeleton';
import { MessageSquare, CheckSquare, Layers, Code, Wallet, ClipboardList, Activity } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { Button } from '../ui/button';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';
import { SubscriptionCountsCard } from './subscription-counts-card';

function formatCurrency(value?: number) {
    if (value === undefined || value === null || isNaN(value)) return '$0';
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

const demoFinancialData: FinancialSummaryData = {
    appIncome: 125000,
    appProfit: 80000,
    otherExpenses: 45000,
    pfcAccountBalance: 75000,
    mmAccountBalance: 150000,
    pfcLastUpdated: '2 hours ago',
    mmLastUpdated: 'yesterday',
    fixedDeposits: 250000,
    employeePayments: 15000,
    todaySubscriptions: {
        android: { monthly: 5, yearly: 2, lifetime: 1, lifetime_offer: 3 },
        ios: { monthly: 8, yearly: 4, lifetime: 2, lifetime_offer: 1 },
    },
    quickStats: {
        pendingFeedbacks: 12,
        totalApps: { android: 8, ios: 5 },
        activeInAppAds: 3,
    },
    debug: {}
};

interface FinancialSummaryProps {
    demoMode?: boolean;
    visibilitySettings?: Record<string, boolean>;
}

const financialItems = (data: FinancialSummaryData) => [
    { label: 'Total App Profit', value: data.appProfit, description: "(App Revenue + AdMob + Other Income) - Ad Expenses - Other expenses", currency: 'USD' },
    { label: 'Current PFC Account Balance (USD)', value: data.pfcAccountBalance, description: data.pfcLastUpdated ? `Last updated ${data.pfcLastUpdated}` : "Total cash on hand", currency: 'USD' },
    { label: 'Current Savings Account Balance (LKR)', value: data.mmAccountBalance, description: data.mmLastUpdated ? `Last updated ${data.mmLastUpdated}`: "Total savings balance", currency: 'LKR'},
    { label: 'Fixed Deposits (LKR)', value: data.fixedDeposits, description: "Total value in term deposits", currency: 'LKR' },
    { label: 'Total Employee Payments (LKR)', value: data.employeePayments, description: "Total salary and other payments", currency: 'LKR' },
];

export function FinancialSummary({ demoMode = false, visibilitySettings }: FinancialSummaryProps) {
  const [data, setData] = React.useState<FinancialSummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showDebug, setShowDebug] = React.useState(false);
  
  const showSubCounts = visibilitySettings?.['Subscription Counts'] !== false;
  const showQuickStats = visibilitySettings?.['Quick Stats'] !== false;
  const showFinancialOverview = visibilitySettings?.['Financial Overview'] !== false;

  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      // If none of the sections are visible, don't fetch anything
      if (!showSubCounts && !showQuickStats && !showFinancialOverview) {
          setLoading(false);
          return;
      }

      setLoading(true);

      const settings = await getGlobalSettings();
      if (cancelled) return;
      setShowDebug(settings.debug_info_visibility || false);
      
      if (demoMode) {
          setData(demoFinancialData);
      } else {
          const result = await getFinancialSummaryData(visibilitySettings);
          if (cancelled) return;
          setData(result);
      }
      setLoading(false);
    }
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [demoMode, visibilitySettings, showSubCounts, showQuickStats, showFinancialOverview]);

  if (!showSubCounts && !showQuickStats && !showFinancialOverview) {
      return null;
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {showSubCounts && <Skeleton className="h-48 w-full" />}
        {showQuickStats && <Skeleton className="h-32 w-full" />}
        {showFinancialOverview && <Skeleton className="h-64 w-full" />}
      </div>
    );
  }
  
  const appProfit = data.appIncome + Math.abs(data.debug?.adExpenses || 0) - data.otherExpenses;

  return (
    <div className="space-y-4">
        {showSubCounts && (
            <SubscriptionCountsCard 
                demoMode={demoMode} 
                initialData={data.todaySubscriptions} 
                visibilityFlags={visibilitySettings}
            />
        )}
        
        {showQuickStats && (
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold"><Activity className="w-4 h-4"/> Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm pt-0 pb-4">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground"><MessageSquare className="w-4 h-4 text-yellow-500" /> Pending Feedbacks</span>
                        <span className="font-medium">{data.quickStats.pendingFeedbacks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground"><Layers className="w-4 h-4 text-blue-500" /> Active Total Apps</span>
                        <span className="font-medium">Android: {data.quickStats.totalApps.android} / iOS: {data.quickStats.totalApps.ios}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-muted-foreground"><CheckSquare className="w-4 h-4 text-purple-500" /> Active In-App Ads</span>
                        <span className="font-medium">{data.quickStats.activeInAppAds}</span>
                    </div>
                     {showDebug && data.debug && (
                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full text-xs">
                                    <Code className="mr-2 h-4 w-4" /> View Debug Info
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <Alert variant="destructive" className="mt-2">
                                    <AlertTitle>Debug Values</AlertTitle>
                                    <AlertDescription>
                                        <pre className="text-xs mt-2 p-2 bg-muted rounded-md max-h-60 overflow-y-auto">
                                            {JSON.stringify(data.debug, null, 2)}
                                        </pre>
                                    </AlertDescription>
                                </Alert>
                            </CollapsibleContent>
                        </Collapsible>
                     )}
                </CardContent>
            </Card>
        )}

        {showFinancialOverview && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold"><Wallet className="w-4 h-4"/> Financial Overview</CardTitle>
                    <CardDescription>A quick glance at your assets and liabilities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                    {financialItems({...data, appProfit}).map(item => (
                        <div key={item.label}>
                            <div className="flex justify-between">
                                <span>{item.label}</span>
                                <span className="font-medium">{item.currency === 'LKR' ? `Rs ${item.value.toLocaleString('en-US', {maximumFractionDigits: 0})}` : formatCurrency(item.value)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                    ))}
                    </div>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
