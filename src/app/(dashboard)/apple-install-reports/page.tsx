
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getAppleInstallReports, saveInstallReport } from './actions';
import { InstallReportTable } from '@/components/apple-install-reports/report-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RotateCw, Download, Save } from 'lucide-react';
import { subMonths, getYear, getMonth } from 'date-fns';
import type { AppleInstallRow } from './data';
import { columns } from '@/components/apple-install-reports/columns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/crash-analysis/stat-card';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
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

type AppleInstallDailyItem = {
    appleId: string;
    units: number;
};

function groupAppleInstallRowsByDate(rows: AppleInstallRow[]) {
    const dayMap = new Map<string, Map<string, AppleInstallDailyItem>>();

    rows.forEach((row) => {
        const date = row.date;
        const appleId = row.appleId || '';
        if (!date || !appleId) {
            return;
        }

        const itemMap = dayMap.get(date) || new Map<string, AppleInstallDailyItem>();
        const existing = itemMap.get(appleId) || {
            appleId,
            units: 0,
        };

        existing.units += row.units || 0;

        itemMap.set(appleId, existing);
        dayMap.set(date, itemMap);
    });

    return Array.from(dayMap.entries())
        .map(([date, itemMap]) => {
            const items = Array.from(itemMap.values()).sort((a, b) => a.appleId.localeCompare(b.appleId));
            return {
                date,
                itemCount: items.length,
                totalUnits: items.reduce((sum, item) => sum + item.units, 0),
                items,
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}


function AppleInstallReportsContent() {
    const searchParams = useSearchParams();
    const initialYear = searchParams.get('year');
    const initialMonth = searchParams.get('month');
    const shouldAutoFetch = searchParams.get('autofetch') === '1';
    const autoFetchKey = React.useRef<string | null>(null);
    const lastMonth = subMonths(new Date(), 1);
    const [year, setYear] = React.useState<string>(isValidReportYear(initialYear) ? initialYear : String(getYear(lastMonth)));
    const [month, setMonth] = React.useState<string>(isValidReportMonth(initialMonth) ? initialMonth : String(getMonth(lastMonth) + 1).padStart(2, '0'));
    const [data, setData] = React.useState<AppleInstallRow[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();
    
    const fetchReport = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        const reportDate = `${year}-${month}`;
        const result = await getAppleInstallReports(reportDate);
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
            days: groupAppleInstallRowsByDate(data),
        };
        
        const result = await saveInstallReport(reportToSave);

        if ('error' in result) {
            toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Report Saved!', description: `Report for ${reportDate} has been saved.`});
        }
        setIsSaving(false);
    };

    const totalUnits = data.reduce((sum, row) => sum + (row.units || 0), 0);

    return (
        <ReportPageShell
            title="Apple Install Reports"
            description="Fetch App Store Connect install data and save daily app-level units for graphing."
            icon={Download}
            accent="emerald"
        >
            <ReportControls description="Select a month, fetch daily install reports, then save compact daily totals.">
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
                <div className="grid grid-cols-1">
                    <StatCard
                        title="Total Units"
                        value={totalUnits.toLocaleString()}
                        change="Total downloads and updates for the period"
                        icon={<Download className="h-4 w-4 text-muted-foreground" />}
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
                    title="Install Details"
                    description={`${data.length.toLocaleString()} record(s) loaded for ${months.find(m => m.value === month)?.label} ${year}.`}
                >
                    <InstallReportTable columns={columns} data={data} />
                </ReportSection>
            )}
        </ReportPageShell>
    );
}

export default function AppleInstallReportsPage() {
    return (
        <React.Suspense fallback={<div className="min-h-[420px]" />}>
            <AppleInstallReportsContent />
        </React.Suspense>
    );
}
