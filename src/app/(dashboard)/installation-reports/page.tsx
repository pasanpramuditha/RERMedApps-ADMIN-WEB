
'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, AlertCircle, List, UploadCloud, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { getInstallationReport, listAvailableInstallationReports, saveInstallationReport } from './actions';
import type { InstallationData } from './data';
import type { DebugInfo } from './actions';
import { InstallationDataTable } from '@/components/installation-reports/installation-data-table';
import { columns } from './columns';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

function InstallationReportsContent() {
    const searchParams = useSearchParams();
    const initialYear = searchParams.get('year');
    const initialMonth = searchParams.get('month');
    const shouldAutoFetch = searchParams.get('autofetch') === '1';
    const autoFetchKey = React.useRef<string | null>(null);
    const [year, setYear] = React.useState<string>(isValidReportYear(initialYear) ? initialYear : String(currentYear));
    const [month, setMonth] = React.useState<string>(isValidReportMonth(initialMonth) ? initialMonth : (new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [installations, setInstallations] = React.useState<InstallationData[]>([]);
    const [listing, setListing] = React.useState(false);
    const [availableFiles, setAvailableFiles] = React.useState<string[] | null>(null);
    const [fileName, setFileName] = React.useState<string>('');
    const [debugInfo, setDebugInfo] = React.useState<DebugInfo | null>(null);
    const { toast } = useToast();
    const [canSave, setCanSave] = React.useState(false);

    React.useEffect(() => {
        setCanSave(false);
    }, [year, month]);


    const fetchReport = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        setInstallations([]);
        setAvailableFiles(null);
        setDebugInfo(null);
        setCanSave(false);
        
        const result = await getInstallationReport(year, month);
        if ('error' in result) {
            setError(result.error);
        } else {
            setInstallations(result.installations || []);
            setFileName(result.fileName || `installs_${year}${month}_overview.csv`);
            if (result.installations && result.installations.length > 0) {
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
        setDebugInfo(null);
        const result = await listAvailableInstallationReports();
         if ('error' in result) {
            setError(result.error);
        } else {
            setAvailableFiles(result.files || []);
        }
        setListing(false);
    }
    
    const handleSaveReport = async () => {
        if (installations.length === 0) {
            toast({ title: "No data to save", description: "Fetch a report before saving.", variant: "destructive" });
            return;
        }
        setSaving(true);
        setDebugInfo(null);
        const reportData = {
            fileName,
            reportDate: `${year}-${month}`,
            rows: installations,
        };
        const result = await saveInstallationReport(reportData);
        if ('error' in result) {
            setError(result.error);
            toast({ title: "Save Failed", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Report Saved", description: "The installation report has been saved to the database." });
            if (result.debugInfo) {
                setDebugInfo(result.debugInfo);
            }
        }
        setSaving(false);
    };

    return (
        <ReportPageShell
            title="Android Install Reports"
            description="Fetch Google Play install statistics and save daily package-level rows into MySQL."
            icon={Sheet}
            accent="blue"
        >
            <ReportControls description="Select a month, fetch the install overview, then save the processed daily rows.">
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
                            Found {availableFiles.length} overview.csv file(s) in the `stats/installs/` directory.
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

            {debugInfo && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Save Operation Debug</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">
                           Showing conversion for the first data row for package: 
                           <strong className="ml-2 font-mono">{debugInfo.packageName}</strong>
                        </p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Field Name</TableHead>
                                    <TableHead>Before (String)</TableHead>
                                    <TableHead>After (Number)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {debugInfo.conversions.map(info => (
                                    <TableRow key={info.field}>
                                        <TableCell>{info.field}</TableCell>
                                        <TableCell>"{info.before}"</TableCell>
                                        <TableCell>{info.after}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </AlertDescription>
                </Alert>
            )}
            
            <InstallationDataTable columns={columns} data={installations} isLoading={loading} />
        </ReportPageShell>
    );
}

export default function InstallationReportsPage() {
    return (
        <React.Suspense fallback={<div className="min-h-[420px]" />}>
            <InstallationReportsContent />
        </React.Suspense>
    );
}
