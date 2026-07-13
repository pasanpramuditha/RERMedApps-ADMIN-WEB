'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { getAppleSales, saveAppleSalesReport } from './actions';
import { AppleSalesDataTable } from '@/components/apple-sales-reports/report-uploader';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RotateCw, Save, DollarSign, Package } from 'lucide-react';
import { subMonths, getYear, getMonth } from 'date-fns';
import type { AppleSalesReportRow } from './data';
import { ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { StatCard } from '@/components/crash-analysis/stat-card';
import { ReportControls, ReportPageShell, ReportSection } from '@/components/dashboard/report-page-shell';

export const columns: ColumnDef<AppleSalesReportRow>[] = [
  { accessorKey: 'beginDate', header: 'Date' },
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'sku', header: 'SKU' },
  { accessorKey: 'appleIdentifier', header: 'Apple ID' },
  { accessorKey: 'countryCode', header: 'Country' },
  { accessorKey: 'device', header: 'Device' },
  { accessorKey: 'productTypeIdentifier', header: 'Type' },
  { 
    accessorKey: 'units', 
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Units
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right">{row.original.units}</div>
  },
  { 
    accessorKey: 'developerProceeds', 
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Original Proceeds
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: row.original.customerCurrency || 'USD' }).format(row.original.developerProceeds || 0)}
      </div>
    )
  },
  { 
    accessorKey: 'developerProceedsUSD', 
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Proceeds (USD)
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(row.original.developerProceedsUSD || 0)}
      </div>
    )
  },
];

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

type AppleSalesDailyItem = {
    sku: string;
    appleIdentifier: string;
    salesUSD: number;
    proceedsUSD: number;
};

function groupAppleSalesRowsByDate(rows: AppleSalesReportRow[]) {
    const dayMap = new Map<string, Map<string, AppleSalesDailyItem>>();

    rows.forEach((row) => {
        const date = row.beginDate || row.endDate;
        const sku = row.sku || '';
        const appleIdentifier = row.appleIdentifier || '';
        if (!date || !sku || !appleIdentifier) {
            return;
        }

        const itemMap = dayMap.get(date) || new Map<string, AppleSalesDailyItem>();
        const key = `${sku}::${appleIdentifier}`;
        const existing = itemMap.get(key) || {
            sku,
            appleIdentifier,
            salesUSD: 0,
            proceedsUSD: 0,
        };

        existing.salesUSD += (row.customerPriceUSD || 0) * (row.units || 0);
        existing.proceedsUSD += row.developerProceedsUSD || 0;

        itemMap.set(key, existing);
        dayMap.set(date, itemMap);
    });

    return Array.from(dayMap.entries())
        .map(([date, itemMap]) => {
            const items = Array.from(itemMap.values())
                .map((item) => ({
                    ...item,
                    salesUSD: parseFloat(item.salesUSD.toFixed(2)),
                    proceedsUSD: parseFloat(item.proceedsUSD.toFixed(2)),
                }))
                .sort((a, b) => {
                    const skuCompare = a.sku.localeCompare(b.sku);
                    return skuCompare !== 0 ? skuCompare : a.appleIdentifier.localeCompare(b.appleIdentifier);
                });

            return {
                date,
                itemCount: items.length,
                totalSalesUSD: parseFloat(items.reduce((sum, item) => sum + item.salesUSD, 0).toFixed(2)),
                totalProceedsUSD: parseFloat(items.reduce((sum, item) => sum + item.proceedsUSD, 0).toFixed(2)),
                items,
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));
}


function AppleSalesReportsContent() {
    const searchParams = useSearchParams();
    const initialYear = searchParams.get('year');
    const initialMonth = searchParams.get('month');
    const shouldAutoFetch = searchParams.get('autofetch') === '1';
    const autoFetchKey = React.useRef<string | null>(null);
    const lastMonth = subMonths(new Date(), 1);
    const [year, setYear] = React.useState<string>(isValidReportYear(initialYear) ? initialYear : String(getYear(lastMonth)));
    const [month, setMonth] = React.useState<string>(isValidReportMonth(initialMonth) ? initialMonth : String(getMonth(lastMonth) + 1).padStart(2, '0'));
    const [data, setData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const { toast } = useToast();
    const [summary, setSummary] = React.useState<{ totalUnits: number, totalProceedsUSD: number } | null>(null);

    const fetchReport = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        setSummary(null);
        const reportDate = `${year}-${month}`;
        const result = await getAppleSales(reportDate);
        if (result.error) {
            setError(result.error);
            setData([]);
        } else {
            setData(result.rows);
            const totalUnits = result.rows.reduce((sum, row) => sum + (row.units || 0), 0);
            const totalProceedsUSD = result.rows.reduce((sum, row) => sum + (row.developerProceedsUSD || 0), 0);
            setSummary({ totalUnits, totalProceedsUSD });
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
            days: groupAppleSalesRowsByDate(data),
        };
        
        const result = await saveAppleSalesReport(reportToSave);

        if (result.error) {
            toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Report Saved!', description: `Report for ${reportDate} has been saved.`});
        }
        setIsSaving(false);
    };

    return (
        <ReportPageShell
            title="Apple Sales Reports"
            description="Fetch sales and proceeds from App Store Connect and save compact daily sales snapshots."
            icon={DollarSign}
            accent="blue"
        >
            <ReportControls description="Select a month, fetch App Store Connect daily sales, then save the grouped daily result.">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
             ) : summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatCard
                        title="Total Units Sold"
                        value={summary.totalUnits.toLocaleString()}
                        change="Total units including paid and free apps"
                        icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Total Proceeds (USD)"
                        value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.totalProceedsUSD)}
                        change="Estimated earnings after Apple's cut"
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
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
                    title="Sales Details"
                    description={`${data.length.toLocaleString()} record(s) loaded for ${months.find(m => m.value === month)?.label} ${year}.`}
                >
                    <AppleSalesDataTable columns={columns} data={data} />
                </ReportSection>
            )}
        </ReportPageShell>
    );
}

export default function AppleSalesReportsPage() {
    return (
        <React.Suspense fallback={<div className="min-h-[420px]" />}>
            <AppleSalesReportsContent />
        </React.Suspense>
    );
}
