
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, AlertCircle, List, UploadCloud } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { getEarningsReport, listAvailableReports, saveEarningsReport } from './actions';
import type { Earning } from './data';
import { EarningsDataTable } from '@/components/google-play-reports/earnings-data-table';
import { SummaryDataTable } from '@/components/google-play-reports/summary-data-table';
import { columns as earningsColumns } from './columns';
import { columns as summaryColumns } from '@/components/google-play-reports/summary-columns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
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

export interface EarningSummary {
    sku: string;
    totalAmount: number;
    currency: string;
}

function GooglePlayReportsContent() {
    const searchParams = useSearchParams();
    const initialYear = searchParams.get('year');
    const initialMonth = searchParams.get('month');
    const shouldAutoFetch = searchParams.get('autofetch') === '1';
    const autoFetchKey = React.useRef<string | null>(null);
    const [year, setYear] = React.useState<string>(isValidReportYear(initialYear) ? initialYear : String(currentYear));
    const [month, setMonth] = React.useState<string>(isValidReportMonth(initialMonth) ? initialMonth : String(new Date().getMonth() + 1).padStart(2, '0'));
    const [loading, setLoading] = React.useState(false);
    const [listing, setListing] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [earnings, setEarnings] = React.useState<Earning[]>([]);
    const [earningSummary, setEarningSummary] = React.useState<EarningSummary[]>([]);
    const [availableFiles, setAvailableFiles] = React.useState<string[] | null>(null);
    const [fileName, setFileName] = React.useState<string>('');
    const [canSave, setCanSave] = React.useState(false);
    const { toast } = useToast();

    const processSummary = (data: Earning[]) => {
        const summary = data.reduce((acc, earning) => {
            if (!earning.skuId) return acc;
            if (!acc[earning.skuId]) {
                acc[earning.skuId] = {
                    sku: earning.skuId,
                    totalAmount: 0,
                    currency: earning.merchantCurrency || 'USD',
                };
            }
            acc[earning.skuId].totalAmount += earning.amountMerchantCurrency || 0;
            return acc;
        }, {} as Record<string, EarningSummary>);

        setEarningSummary(Object.values(summary));
    };

    React.useEffect(() => {
        setCanSave(false);
    }, [year, month]);


    const fetchReport = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        setEarnings([]);
        setEarningSummary([]);
        setAvailableFiles(null);
        setCanSave(false);
        setFileName(`earnings_${year}${month}.zip`);

        const result = await getEarningsReport(year, month);
        if ('error' in result) {
            setError(result.error);
        } else {
            setEarnings(result.earnings || []);
            processSummary(result.earnings || []);
            if (result.earnings && result.earnings.length > 0) {
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
        const result = await listAvailableReports();
         if ('error' in result) {
            setError(result.error);
        } else {
            setAvailableFiles(result.files || []);
        }
        setListing(false);
    }
    
    const handleSaveReport = async () => {
        if (earnings.length === 0) {
            toast({ title: "No data to save", description: "Fetch a report before saving.", variant: "destructive" });
            return;
        }
        setSaving(true);
        setError(null);
        const reportData = {
            fileName,
            reportDate: `${year}-${month}`,
            rows: earnings,
        };
        const result = await saveEarningsReport(reportData);
        if (result.error) {
            setError(result.error);
            toast({ title: "Save Failed", description: result.error, variant: "destructive" });
        } else {
            setCanSave(false);
            toast({ title: "Report Saved", description: "The earnings report has been saved to MySQL." });
        }
        setSaving(false);
    };


    const totalRevenue = earnings.reduce((sum, item) => sum + (item.amountMerchantCurrency || 0), 0);

    return (
        <ReportPageShell
            title="Android Sales Report"
            description="Fetch Google Play earnings, review daily transactions, and save the month into MySQL."
            icon={Sheet}
            accent="emerald"
        >
            <ReportControls description="Select a month, fetch the Google Play earnings ZIP, then save the processed daily rows.">
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
                     <Button onClick={fetchReport} disabled={loading || listing || saving} className="w-full sm:w-auto">
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

            {availableFiles && (
                <ReportSection
                    title="Available Files in GCS Bucket"
                    description={
                        <>
                            Found {availableFiles.length} file(s) in the `earnings/` and `stats/installs` directories.
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
            
            {loading && (
                 <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
                    </Card>
                 </div>
            )}

            {!loading && earnings.length > 0 && (
                <div className="space-y-6">
                    <ReportSection
                        title="Earnings Details"
                        description={
                            <>
                                All transactions for this period. Total:
                                <span className="font-bold text-foreground ml-2">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: earnings[0]?.merchantCurrency || 'USD' }).format(totalRevenue)}
                                </span>
                            </>
                        }
                    >
                            <EarningsDataTable columns={earningsColumns} data={earnings} />
                    </ReportSection>
                    <ReportSection
                        title="Total Income by Product"
                        description={
                            <>
                                Summary of earnings for {months.find(m => m.value === month)?.label} {year}.
                            </>
                        }
                    >
                            <SummaryDataTable columns={summaryColumns} data={earningSummary} />
                    </ReportSection>
                </div>
            )}
        </ReportPageShell>
    );
}

export default function GooglePlayReportsPage() {
    return (
        <React.Suspense fallback={<div className="min-h-[420px]" />}>
            <GooglePlayReportsContent />
        </React.Suspense>
    );
}
