
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, AlertCircle, UploadCloud, List, Users, UserPlus, UserMinus, CalendarClock, Repeat, Download, Newspaper } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { getSubscriptionReport, saveSubscriptionReport, listAvailableSubscriptionReports } from './actions';
import type { AndroidSubscriptionReportRow, SubscriptionSummary } from './data';
import { SubscriptionDataTable } from '@/components/android-subscription-reports/data-table';
import { columns } from '@/components/android-subscription-reports/columns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { summaryColumns } from '@/components/android-subscription-reports/summary-columns';
import { DataTable } from '@/components/ui/data-table';
import { ReportControls, ReportPageShell, ReportSection } from '@/components/dashboard/report-page-shell';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
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

type DailySubscriptionProductMetric = {
    packageName: string;
    productId: string;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    activeSubscriptions: number;
};

function groupSubscriptionRowsByDate(rows: AndroidSubscriptionReportRow[]) {
    const dayMap = new Map<string, Map<string, DailySubscriptionProductMetric>>();

    rows.forEach((row) => {
        if (!row.date || !row.packageName || !row.productId) {
            return;
        }

        const productMap = dayMap.get(row.date) || new Map<string, DailySubscriptionProductMetric>();
        const key = `${row.packageName}::${row.productId}`;
        const existing = productMap.get(key) || {
            packageName: row.packageName,
            productId: row.productId,
            newSubscriptions: 0,
            cancelledSubscriptions: 0,
            activeSubscriptions: 0,
        };

        existing.newSubscriptions += row.newSubscriptions || 0;
        existing.cancelledSubscriptions += row.cancelledSubscriptions || 0;
        existing.activeSubscriptions += row.activeSubscriptions || 0;

        productMap.set(key, existing);
        dayMap.set(row.date, productMap);
    });

    return Array.from(dayMap.entries())
        .map(([date, productMap]) => {
            const products = Array.from(productMap.values()).sort((a, b) => {
                const packageCompare = a.packageName.localeCompare(b.packageName);
                return packageCompare !== 0 ? packageCompare : a.productId.localeCompare(b.productId);
            });

            return {
                date,
                productCount: products.length,
                totalNewSubscriptions: products.reduce((sum, item) => sum + item.newSubscriptions, 0),
                totalCancelledSubscriptions: products.reduce((sum, item) => sum + item.cancelledSubscriptions, 0),
                totalActiveSubscriptions: products.reduce((sum, item) => sum + item.activeSubscriptions, 0),
                products,
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}

function AndroidSubscriptionReportsContent() {
    const searchParams = useSearchParams();
    const initialYear = searchParams.get('year');
    const initialMonth = searchParams.get('month');
    const shouldAutoFetch = searchParams.get('autofetch') === '1';
    const autoFetchKey = React.useRef<string | null>(null);
    const [year, setYear] = React.useState<string>(isValidReportYear(initialYear) ? initialYear : String(currentYear));
    const [month, setMonth] = React.useState<string>(isValidReportMonth(initialMonth) ? initialMonth : (new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [listing, setListing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [subscriptions, setSubscriptions] = React.useState<AndroidSubscriptionReportRow[]>([]);
    const [summaryData, setSummaryData] = React.useState<SubscriptionSummary[]>([]);
    const [fileName, setFileName] = React.useState<string>('');
    const [availableFiles, setAvailableFiles] = React.useState<string[] | null>(null);
    const [rawCsvContent, setRawCsvContent] = React.useState<string | null>(null);
    const [canSave, setCanSave] = React.useState(false);
    const { toast } = useToast();

    React.useEffect(() => {
        setCanSave(false);
    }, [year, month]);


    const processSummary = (data: AndroidSubscriptionReportRow[]) => {
        if (data.length === 0) {
            setSummaryData([]);
            return;
        }

        const summaryMap = new Map<string, SubscriptionSummary>();
        const latestDate = data.reduce((max, p) => p.date! > max ? p.date! : max, data[0].date!);

        data.forEach(row => {
            if (!row.packageName) return;

            let entry = summaryMap.get(row.packageName);
            if (!entry) {
                entry = {
                    packageName: row.packageName,
                    newSubscriptions: 0,
                    cancelledSubscriptions: 0,
                    activeSubscriptions: 0,
                    monthlyActive: 0,
                    yearlyActive: 0,
                };
            }

            entry.newSubscriptions += row.newSubscriptions || 0;
            entry.cancelledSubscriptions += row.cancelledSubscriptions || 0;
            
            if(row.date === latestDate) {
                entry.activeSubscriptions += row.activeSubscriptions || 0;
                 if (row.productId?.toLowerCase().includes('monthly')) {
                    entry.monthlyActive += row.activeSubscriptions || 0;
                } else if (row.productId?.toLowerCase().includes('yearly')) {
                    entry.yearlyActive += row.activeSubscriptions || 0;
                }
            }
            
            summaryMap.set(row.packageName, entry);
        });

        // Recalculate active subscriptions to ensure we only sum latest date's values
        summaryMap.forEach(entry => {
            const latestDateRows = data.filter(r => r.packageName === entry.packageName && r.date === latestDate);
            entry.activeSubscriptions = latestDateRows.reduce((sum, item) => sum + (item.activeSubscriptions || 0), 0);
            entry.monthlyActive = latestDateRows.filter(s => s.productId?.toLowerCase().includes('monthly')).reduce((sum, item) => sum + (item.activeSubscriptions || 0), 0);
            entry.yearlyActive = latestDateRows.filter(s => s.productId?.toLowerCase().includes('yearly')).reduce((sum, item) => sum + (item.activeSubscriptions || 0), 0);
        });

        setSummaryData(Array.from(summaryMap.values()));
    };

    const fetchReport = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        setSubscriptions([]);
        setFileName('');
        setAvailableFiles(null);
        setRawCsvContent(null);
        setSummaryData([]);
        setCanSave(false);

        const result = await getSubscriptionReport(year, month);
        if ('error' in result) {
            setError(result.error);
             if (result.rawCsv) {
                setRawCsvContent(result.rawCsv);
            }
        } else {
            setSubscriptions(result.subscriptions || []);
            setFileName(result.fileName || `subscriptions_${year}${month}.csv`);
            processSummary(result.subscriptions || []);
             if (result.rawCsv) {
                setRawCsvContent(result.rawCsv);
            }
            if ((result.subscriptions || []).length > 0) {
                setCanSave(true);
            }
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

    const handleListFiles = async () => {
        setListing(true);
        setError(null);
        setAvailableFiles(null);
        setRawCsvContent(null);
        const result = await listAvailableSubscriptionReports();
         if ('error' in result) {
            setError(result.error);
        } else {
            setAvailableFiles(result.files || []);
        }
        setListing(false);
    }

    const handleSaveReport = async () => {
        if (subscriptions.length === 0) {
            toast({ title: "No data to save", description: "Fetch and process a report before saving.", variant: "destructive" });
            return;
        }
        setSaving(true);
        const reportData = {
            fileName,
            reportDate: `${year}-${month}`,
            days: groupSubscriptionRowsByDate(subscriptions),
        };
        const result = await saveSubscriptionReport(reportData);
        if ('error' in result) {
            setError(result.error);
            toast({ title: "Save Failed", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Report Saved", description: "The subscription daily report has been saved to MySQL." });
        }
        setSaving(false);
    };

    const csvEscape = (value: string | number | null | undefined) => {
        const text = String(value ?? '');
        if (/[",\n\r]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    const handleExportSummaryCsv = () => {
        if (summaryData.length === 0) {
            toast({
                title: 'No summary data to export',
                description: 'Fetch a report before exporting the package summary.',
                variant: 'destructive',
            });
            return;
        }

        const headers = ['Package Name', 'New', 'Cancelled', 'Active', 'Monthly Active', 'Yearly Active'];
        const rows = summaryData.map((row) => [
            row.packageName,
            row.newSubscriptions,
            row.cancelledSubscriptions,
            row.activeSubscriptions,
            row.monthlyActive,
            row.yearlyActive,
        ]);
        const csv = [headers, ...rows]
            .map((row) => row.map(csvEscape).join(','))
            .join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `android_subscription_package_summary_${year}_${month}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const totalNewSubs = subscriptions.reduce((sum, item) => sum + (item.newSubscriptions || 0), 0);
    const totalCancelledSubs = subscriptions.reduce((sum, item) => sum + (item.cancelledSubscriptions || 0), 0);
    // Active subscriptions are a snapshot, so we take the sum of the last day's data if available
    const latestDate = subscriptions.length > 0 ? subscriptions.reduce((max, p) => p.date! > max ? p.date! : max, subscriptions[0].date!) : null;
    const latestSubsData = subscriptions.filter(s => s.date === latestDate);
    
    const totalActiveSubs = latestSubsData.reduce((sum, item) => sum + (item.activeSubscriptions || 0), 0);
    const totalMonthlySubs = latestSubsData.filter(s => s.productId?.toLowerCase().includes('monthly')).reduce((sum, item) => sum + (item.activeSubscriptions || 0), 0);
    const totalYearlySubs = latestSubsData.filter(s => s.productId?.toLowerCase().includes('yearly')).reduce((sum, item) => sum + (item.activeSubscriptions || 0), 0);


    return (
        <ReportPageShell
            title="Android Subscription Reports"
            description="Fetch lifecycle subscription metrics from Google Play and save compact daily snapshots."
            icon={Newspaper}
            accent="violet"
        >
            <ReportControls description="Select a month, fetch subscription lifecycle files, export summaries, or save daily aggregates.">
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={month} onValueChange={setMonth}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Button onClick={fetchReport} disabled={loading || saving || listing} className="w-full sm:w-auto">
                        {loading ? <Spinner size="small" className="mr-2" /> : <Sheet className="mr-2 h-4 w-4" />}
                        Fetch Report
                    </Button>
                     <Button onClick={handleListFiles} disabled={loading || listing || saving} variant="outline" className="w-full sm:w-auto">
                        {listing ? <Spinner size="small" className="mr-2" /> : <List className="mr-2 h-4 w-4" />}
                        List Available Reports
                    </Button>
                     <Button onClick={handleSaveReport} disabled={!canSave || loading || saving} variant="secondary" className="w-full sm:w-auto ml-auto">
                        {saving ? <Spinner size="small" className="mr-2" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                        Save to DB
                    </Button>
            </ReportControls>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            {loading && (
                 <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
            )}

            {!loading && summaryData.length > 0 && (
                 <ReportSection
                    title="Package Summary"
                    description="Export the processed package summary as a CSV file."
                    action={
                        <Button variant="outline" size="sm" onClick={handleExportSummaryCsv} className="w-full gap-2 sm:w-auto">
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    }
                 >
                        <DataTable columns={summaryColumns} data={summaryData} />
                </ReportSection>
            )}

            {rawCsvContent && (
                 <ReportSection
                    title="Raw CSV Content"
                    description={
                        <>
                            This is the exact text content fetched from the CSV file(s) in GCS.
                        </>
                    }
                 >
                        <ScrollArea className="h-60 w-full rounded-md border bg-muted p-4">
                           <pre className="text-sm">
                            <code>
                                {rawCsvContent}
                            </code>
                           </pre>
                        </ScrollArea>
                </ReportSection>
            )}
            
            {availableFiles && (
                <ReportSection
                    title="Available Files in GCS Bucket"
                    description={
                        <>
                            Found {availableFiles.length} file(s) in the `financial-stats/subscriptions/` directory.
                        </>
                    }
                >
                        <ScrollArea className="h-60 w-full rounded-md border bg-muted p-4">
                           <pre className="text-sm">
                            <code>
                                {availableFiles.length > 0 ? availableFiles.join('\n') : 'No files found.'}
                            </code>
                           </pre>
                        </ScrollArea>
                </ReportSection>
            )}

            {loading ? (
                <Card>
                    <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                    <CardContent><Skeleton className="h-96 w-full" /></CardContent>
                </Card>
            ) : subscriptions.length > 0 ? (
                <ReportSection
                    title="Subscription Details"
                    description={
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                             <span className="flex items-center">
                                <UserPlus className="w-4 h-4 mr-1.5" />
                                New Subs: 
                                <strong className="text-foreground ml-1">{totalNewSubs.toLocaleString()}</strong>
                            </span>
                             <span className="flex items-center">
                                <UserMinus className="w-4 h-4 mr-1.5" />
                                Cancelled Subs: 
                                <strong className="text-foreground ml-1">{totalCancelledSubs.toLocaleString()}</strong>
                            </span>
                             <span className="flex items-center">
                                <Users className="w-4 h-4 mr-1.5" />
                                Active Subs (end of period): 
                                <strong className="text-foreground ml-1">{totalActiveSubs.toLocaleString()}</strong>
                            </span>
                            <span className="flex items-center">
                                <Repeat className="w-4 h-4 mr-1.5" />
                                Monthly Active: 
                                <strong className="text-foreground ml-1">{totalMonthlySubs.toLocaleString()}</strong>
                            </span>
                            <span className="flex items-center">
                                <CalendarClock className="w-4 h-4 mr-1.5" />
                                Yearly Active: 
                                <strong className="text-foreground ml-1">{totalYearlySubs.toLocaleString()}</strong>
                            </span>
                        </div>
                    }
                >
                        <SubscriptionDataTable columns={columns} data={subscriptions} />
                </ReportSection>
            ) : null}
        </ReportPageShell>
    );
}

export default function AndroidSubscriptionReportsPage() {
    return (
        <React.Suspense fallback={<div className="min-h-[420px]" />}>
            <AndroidSubscriptionReportsContent />
        </React.Suspense>
    );
}
