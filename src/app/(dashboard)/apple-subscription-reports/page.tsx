
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getAppleSubscriptionReport, saveAppleSubscriptionReport } from './actions';
import { SubscriptionDataTable } from '@/components/apple-subscription-reports/data-table';
import { columns } from '@/components/apple-subscription-reports/columns';
import type { AppleSubscriptionReportRow } from './data';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CalendarDays, RotateCw, Save, Sparkles, Users } from 'lucide-react';
import { subMonths, getYear, getMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { StatCard } from '@/components/crash-analysis/stat-card';
import { type VisibilityState } from '@tanstack/react-table';
import { ReportControls, ReportPageShell, ReportSection } from '@/components/dashboard/report-page-shell';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));
const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
    { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
    { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];

function isValidReportYear(value: string | null): value is string {
    return !!value && /^\d{4}$/.test(value);
}

function isValidReportMonth(value: string | null): value is string {
    return !!value && /^(0[1-9]|1[0-2])$/.test(value);
}

type AppleSubscriptionDailyItem = {
    appAppleId?: string;
    subscriptionAppleId: string;
    subscriptionName?: string;
    standardSubscriptionDuration?: string;
    activeSubs: number;
    activeFreeTrialIntroductoryOfferSubscriptions: number;
};

function groupAppleSubscriptionRowsByDate(rows: AppleSubscriptionReportRow[]) {
    const dayMap = new Map<string, Map<string, AppleSubscriptionDailyItem>>();

    rows.forEach((row) => {
        const date = row.date;
        const subscriptionAppleId = row.subscriptionAppleId || '';
        if (!date || !subscriptionAppleId) {
            return;
        }

        const itemKey = `${row.appAppleId || ''}::${subscriptionAppleId}`;
        const itemMap = dayMap.get(date) || new Map<string, AppleSubscriptionDailyItem>();
        const existing = itemMap.get(itemKey) || {
            appAppleId: row.appAppleId,
            subscriptionAppleId,
            subscriptionName: row.subscriptionName,
            standardSubscriptionDuration: row.standardSubscriptionDuration,
            activeSubs: 0,
            activeFreeTrialIntroductoryOfferSubscriptions: 0,
        };

        existing.standardSubscriptionDuration = existing.standardSubscriptionDuration || row.standardSubscriptionDuration;
        existing.activeSubs += row.activeStandardPriceSubscriptions || 0;
        existing.activeFreeTrialIntroductoryOfferSubscriptions += row.activeFreeTrialIntroductoryOfferSubscriptions || 0;

        itemMap.set(itemKey, existing);
        dayMap.set(date, itemMap);
    });

    return Array.from(dayMap.entries())
        .map(([date, itemMap]) => {
            const items = Array.from(itemMap.values())
                .sort((a, b) => a.subscriptionAppleId.localeCompare(b.subscriptionAppleId));
            return {
                date,
                itemCount: items.length,
                totalActiveSubs: items.reduce((sum, item) => sum + item.activeSubs, 0),
                items,
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}

function isMonthlyDuration(duration: string | undefined) {
    return /\b(1\s*)?(month|monthly)\b/i.test(duration || '');
}

function isYearlyDuration(duration: string | undefined) {
    return /\b(1\s*)?(year|yearly|annual|annually)\b/i.test(duration || '');
}

function sumRows(rows: AppleSubscriptionReportRow[], field: keyof AppleSubscriptionReportRow) {
    return rows.reduce((sum, row) => {
        const value = row[field];
        return sum + (typeof value === 'number' ? value : 0);
    }, 0);
}

function AppleSubscriptionReportsContent() {
    const searchParams = useSearchParams();
    const initialYear = searchParams.get('year');
    const initialMonth = searchParams.get('month');
    const shouldAutoFetch = searchParams.get('autofetch') === '1';
    const autoFetchKey = React.useRef<string | null>(null);
    const lastMonth = subMonths(new Date(), 1);
    const [year, setYear] = React.useState<string>(isValidReportYear(initialYear) ? initialYear : String(getYear(lastMonth)));
    const [month, setMonth] = React.useState<string>(isValidReportMonth(initialMonth) ? initialMonth : String(getMonth(lastMonth) + 1).padStart(2, '0'));
    const [data, setData] = React.useState<AppleSubscriptionReportRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();

    // Reusing the same column visibility state from the old uploader component.
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
        'appAppleId': false, 'subscriptionGroupId': false,
        'standardSubscriptionDuration': false, 'promotionalOfferId': false, 'preservedPricing': false,
        'proceedsReason': false, 'client': false, 'state': false, 'activeFreeTrialIntroductoryOfferSubscriptions': false,
        'activePayUpFrontIntroductoryOfferSubscriptions': false, 'activePayAsYouGoIntroductoryOfferSubscriptions': false,
        'freeTrialPromotionalOfferSubscriptions': false, 'payUpFrontPromotionalOfferSubscriptions': false,
        'payAsYouGoPromotionalOfferSubscriptions': false, 'freeTrialOfferCodeSubscriptions': false,
        'payUpFrontOfferCodeSubscriptions': false, 'payAsYouGoOfferCodeSubscriptions': false,
        'marketingOptIns': false, 'freeTrialWinBackOffers': false, 'payUpFrontWinBackOffers': false,
        'payAsYouGoWinBackOffers': false,
    });

    const fetchReport = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        const reportDate = `${year}-${month}`;
        const result = await getAppleSubscriptionReport(reportDate);
        if (result.error) {
            setError(result.error);
            setData([]);
        } else {
            setData(result.rows);
        }
        setLoading(false);
    }, [year, month]);

    React.useEffect(() => {
        if (!shouldAutoFetch || !isValidReportYear(initialYear) || !isValidReportMonth(initialMonth)) return;

        const key = `${initialYear}-${initialMonth}`;
        if (autoFetchKey.current === key) return;

        if (year !== initialYear || month !== initialMonth) {
            setYear(initialYear);
            setMonth(initialMonth);
            return;
        }

        autoFetchKey.current = key;
        void fetchReport();
    }, [fetchReport, initialMonth, initialYear, month, shouldAutoFetch, year]);

    const handleSave = async () => {
        if (data.length === 0) {
            toast({ title: 'No data to save', description: 'Fetch a report with data before saving.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        const reportDate = `${year}-${month}`;
        const reportToSave = {
            reportDate,
            days: groupAppleSubscriptionRowsByDate(data),
        };
        
        const result = await saveAppleSubscriptionReport(reportToSave);

        if ('error' in result) {
            toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Report Saved!', description: `Report for ${reportDate} has been saved.`});
        }
        setIsSaving(false);
    };

    const latestReportDate = data.reduce<string | null>((latest, row) => {
        if (!row.date) return latest;
        return !latest || row.date > latest ? row.date : latest;
    }, null);
    const latestRows = data.filter((row) => row.date === latestReportDate);
    const monthlyRows = latestRows.filter((row) => isMonthlyDuration(row.standardSubscriptionDuration));
    const yearlyRows = latestRows.filter((row) => isYearlyDuration(row.standardSubscriptionDuration));
    const monthlyActiveSubs = sumRows(monthlyRows, 'activeStandardPriceSubscriptions');
    const yearlyActiveSubs = sumRows(yearlyRows, 'activeStandardPriceSubscriptions');
    const yearlyTrialSubs = sumRows(yearlyRows, 'activeFreeTrialIntroductoryOfferSubscriptions');
    const totalActiveSubs = sumRows(latestRows, 'activeStandardPriceSubscriptions');
    const latestDateLabel = latestReportDate ? `on ${latestReportDate}` : 'at end of period';

    return (
        <ReportPageShell
            title="Apple Subscription Reports"
            description="Fetch active subscription snapshots from App Store Connect and save daily active counts."
            icon={Users}
            accent="violet"
        >
            <ReportControls description="Select a month, fetch daily subscription snapshots, then save compact active counts.">
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={fetchReport} disabled={loading}>
                        <RotateCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Fetch Report
                    </Button>
                     <Button onClick={handleSave} disabled={loading || isSaving || data.length === 0}>
                         {isSaving ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        Save to DB
                    </Button>
            </ReportControls>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Fetching Report</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {loading ? (
                <Skeleton className="h-28" />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        title="Total Active Subscriptions"
                        value={totalActiveSubs.toLocaleString()}
                        change={`Active standard price subscriptions ${latestDateLabel}`}
                        icon={<Users className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Monthly"
                        value={monthlyActiveSubs.toLocaleString()}
                        change={`Monthly active standard subscriptions ${latestDateLabel}`}
                        icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Yearly"
                        value={yearlyActiveSubs.toLocaleString()}
                        change={`Yearly active standard subscriptions ${latestDateLabel}`}
                        icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Yearly Trial"
                        value={yearlyTrialSubs.toLocaleString()}
                        change={`Yearly active free trials ${latestDateLabel}`}
                        icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
            )}
            
            {loading ? (
                <div className="rounded-md border p-4 space-y-4">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-40 w-full" />
                </div>
            ) : (
                <ReportSection
                    title="Subscription Details"
                    description={`${data.length.toLocaleString()} record(s) loaded for ${months.find(m => m.value === month)?.label} ${year}.`}
                >
                    <SubscriptionDataTable
                        columns={columns}
                        data={data}
                        columnVisibility={columnVisibility}
                        onColumnVisibilityChange={setColumnVisibility}
                    />
                </ReportSection>
            )}
        </ReportPageShell>
    );
}

export default function AppleSubscriptionReportsPage() {
    return (
        <React.Suspense fallback={<div className="min-h-[420px]" />}>
            <AppleSubscriptionReportsContent />
        </React.Suspense>
    );
}
