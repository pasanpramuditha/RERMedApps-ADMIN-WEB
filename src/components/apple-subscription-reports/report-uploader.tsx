
'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle, AlertCircle, UploadCloud, ChevronDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { saveAppleSubscriptionReport } from '@/app/(dashboard)/apple-subscription-reports/actions';
import type { AppleSubscriptionReport, AppleSubscriptionReportRow } from '@/app/(dashboard)/apple-subscription-reports/data';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table';

import JSZip from 'jszip';
import Papa from 'papaparse';
import { columns } from './columns';
import { SubscriptionDataTable } from './data-table';

const pako = import('pako');

export function ReportUploader() {
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'parsing' | 'preview' | 'saving' | 'success' | 'error'>('idle');
  const [parsedData, setParsedData] = React.useState<AppleSubscriptionReport | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const { toast } = useToast();

  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    'appAppleId': false,
    'subscriptionAppleId': false,
    'subscriptionGroupId': false,
    'standardSubscriptionDuration': false,
    'promotionalOfferId': false,
    'preservedPricing': false,
    'proceedsReason': false,
    'client': false,
    'state': false,
    'activeFreeTrialIntroductoryOfferSubscriptions': false,
    'activePayUpFrontIntroductoryOfferSubscriptions': false,
    'activePayAsYouGoIntroductoryOfferSubscriptions': false,
    'freeTrialPromotionalOfferSubscriptions': false,
    'payUpFrontPromotionalOfferSubscriptions': false,
    'payAsYouGoPromotionalOfferSubscriptions': false,
    'freeTrialOfferCodeSubscriptions': false,
    'payUpFrontOfferCodeSubscriptions': false,
    'payAsYouGoOfferCodeSubscriptions': false,
    'marketingOptIns': false,
    'freeTrialWinBackOffers': false,
    'payUpFrontWinBackOffers': false,
    'payAsYouGoWinBackOffers': false,
  });

  const parseNumber = (value: string | undefined): number | undefined => {
    if (value === undefined || value === null || value.trim() === '') return undefined;
    const num = parseInt(value.replace(/,/g, ''), 10);
    return isNaN(num) ? undefined : num;
  };
  
  const parseFloatNumber = (value: string | undefined): number | undefined => {
    if (value === undefined || value === null || value.trim() === '') return undefined;
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  };

  const parseReport = (reportData: string, fileName: string): AppleSubscriptionReport => {
      const parsed = Papa.parse<any>(reportData, { header: true, skipEmptyLines: true, delimiter: '\t' });
      const { data: rows } = parsed;

      if (rows.length === 0) throw new Error("No data found in the report.");
      
      const headerMap: { [key: string]: keyof AppleSubscriptionReportRow } = {
        'App Name': 'appName', 'App Apple ID': 'appAppleId', 'Subscription Name': 'subscriptionName',
        'Subscription Apple ID': 'subscriptionAppleId', 'Subscription Group ID': 'subscriptionGroupId',
        'Standard Subscription Duration': 'standardSubscriptionDuration', 'Subscription Offer Name': 'subscriptionOfferName',
        'Promotional Offer ID': 'promotionalOfferId', 'Customer Price': 'customerPrice', 'Customer Currency': 'customerCurrency',
        'Developer Proceeds': 'developerProceeds', 'Proceeds Currency': 'proceedsCurrency', 'Preserved Pricing': 'preservedPricing',
        'Proceeds Reason': 'proceedsReason', 'Client': 'client', 'Device': 'device', 'State': 'state', 'Country': 'country',
        'Active Standard Price Subscriptions': 'activeStandardPriceSubscriptions',
        'Active Free Trial Introductory Offer Subscriptions': 'activeFreeTrialIntroductoryOfferSubscriptions',
        'Active Pay Up Front Introductory Offer Subscriptions': 'activePayUpFrontIntroductoryOfferSubscriptions',
        'Active Pay As You Go Introductory Offer Subscriptions': 'activePayAsYouGoIntroductoryOfferSubscriptions',
        'Free Trial Promotional Offer Subscriptions': 'freeTrialPromotionalOfferSubscriptions',
        'Pay Up Front Promotional Offer Subscriptions': 'payUpFrontPromotionalOfferSubscriptions',
        'Pay As You Go Promotional Offer Subscriptions': 'payAsYouGoPromotionalOfferSubscriptions',
        'Free Trial Offer Code Subscriptions': 'freeTrialOfferCodeSubscriptions',
        'Pay Up Front Offer Code Subscriptions': 'payUpFrontOfferCodeSubscriptions',
        'Pay As You Go Offer Code Subscriptions': 'payAsYouGoOfferCodeSubscriptions',
        'Marketing Opt-Ins': 'marketingOptIns', 'Billing Retry': 'billingRetry', 'Grace Period': 'gracePeriod',
        'Subscribers': 'subscribers', 'Free Trial Win-back Offers': 'freeTrialWinBackOffers',
        'Pay Up Front Win-back Offers': 'payUpFrontWinBackOffers', 'Pay As You Go Win-back Offers': 'payAsYouGoWinBackOffers',
      };
      
      const parsedRows: AppleSubscriptionReportRow[] = rows.map(row => {
          const newRow: { [key: string]: any } = {};
          for (const key in row) {
              if (headerMap[key]) {
                  const newKey = headerMap[key];
                  newRow[newKey] = row[key];
              }
          }

          // Convert all numeric fields
          return {
              ...newRow,
              customerPrice: parseFloatNumber(newRow.customerPrice),
              developerProceeds: parseFloatNumber(newRow.developerProceeds),
              activeStandardPriceSubscriptions: parseNumber(newRow.activeStandardPriceSubscriptions),
              activeFreeTrialIntroductoryOfferSubscriptions: parseNumber(newRow.activeFreeTrialIntroductoryOfferSubscriptions),
              activePayUpFrontIntroductoryOfferSubscriptions: parseNumber(newRow.activePayUpFrontIntroductoryOfferSubscriptions),
              activePayAsYouGoIntroductoryOfferSubscriptions: parseNumber(newRow.activePayAsYouGoIntroductoryOfferSubscriptions),
              freeTrialPromotionalOfferSubscriptions: parseNumber(newRow.freeTrialPromotionalOfferSubscriptions),
              payUpFrontPromotionalOfferSubscriptions: parseNumber(newRow.payUpFrontPromotionalOfferSubscriptions),
              payAsYouGoPromotionalOfferSubscriptions: parseNumber(newRow.payAsYouGoPromotionalOfferSubscriptions),
              freeTrialOfferCodeSubscriptions: parseNumber(newRow.freeTrialOfferCodeSubscriptions),
              payUpFrontOfferCodeSubscriptions: parseNumber(newRow.payUpFrontOfferCodeSubscriptions),
              payAsYouGoOfferCodeSubscriptions: parseNumber(newRow.payAsYouGoOfferCodeSubscriptions),
              marketingOptIns: parseNumber(newRow.marketingOptIns),
              billingRetry: parseNumber(newRow.billingRetry),
              gracePeriod: parseNumber(newRow.gracePeriod),
              subscribers: parseNumber(newRow.subscribers),
              freeTrialWinBackOffers: parseNumber(newRow.freeTrialWinBackOffers),
              payUpFrontWinBackOffers: parseNumber(newRow.payUpFrontWinBackOffers),
              payAsYouGoWinBackOffers: parseNumber(newRow.payAsYouGoWinBackOffers),
          };
      });

      const dateMatch = fileName.match(/_(\d{8})\.zip/);
      let reportDate = 'YYYY-MM';
      if (dateMatch) {
          const dateString = dateMatch[1]; // e.g., "20250731"
          const year = dateString.substring(0, 4);
          const month = dateString.substring(4, 6);
          reportDate = `${year}-${month}`;
      }


      return { fileName, reportDate, rows: parsedRows };
  }

  const handleFile = async (file: File) => {
    setStatus('parsing');
    setFile(file);
    try {
        const pakoInstance = await pako;
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        
        const reportFile = Object.values(zip.files).find(
            f => f.name.startsWith('Subscription_') && !f.name.startsWith('Subscription_Event_') && f.name.endsWith('.gz')
        );

        if (!reportFile) {
             throw new Error("Could not find a 'Subscription_*.gz' file in the archive.");
        }

        const gzBuffer = await reportFile.async('uint8array');
        const decompressed = pakoInstance.inflate(gzBuffer, { to: 'string' });
        
        const result = parseReport(decompressed, file.name);
        setParsedData(result);
        setStatus('preview');
    } catch(err: any) {
        setErrorMessage(err.message || 'Failed to parse the report.');
        setStatus('error');
    }
  }

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) handleFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/zip': ['.zip'] },
    maxFiles: 1,
  });

  const handleSave = async () => {
    if (!parsedData) return;
    setStatus('saving');
    const result = await saveAppleSubscriptionReport(parsedData);

    if ('error' in result) {
      setStatus('error');
      setErrorMessage(result.error);
      toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
    } else {
      setStatus('success');
      toast({ title: 'Report Saved!', description: `Report "${parsedData.fileName}" has been successfully saved.`});
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setParsedData(null);
    setErrorMessage('');
  };

  const table = useReactTable({
    data: parsedData?.rows ?? [],
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const renderContent = () => {
    switch(status) {
      case 'idle':
        return (
          <div {...getRootProps()} className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${ isDragActive ? 'border-primary bg-accent/20' : 'border-border hover:border-primary/50' }`}>
            <input {...getInputProps()} />
            <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="font-semibold">Drag & drop your Apple Subscription Report .zip file</p>
            <p className="text-muted-foreground text-sm">or click to select a file</p>
          </div>
        );
      case 'parsing':
         return (
             <div className="flex flex-col items-center justify-center p-12">
                 <Spinner size="large" />
                 <p className="mt-4 text-muted-foreground">Decompressing and parsing report...</p>
             </div>
         );
      case 'preview':
        if (!parsedData) return null;
        return (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h3 className="font-semibold text-lg mb-2">Report Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div><strong>File:</strong> {parsedData.fileName}</div>
                <div><strong>Report Date:</strong> {parsedData.reportDate}</div>
                <div><strong>Total Rows:</strong> {parsedData.rows.length.toLocaleString()}</div>
                <div className="md:col-start-4 md:justify-self-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <ChevronDown className="mr-2 h-4 w-4" /> Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
                            {table.getAllColumns().map(column => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize"
                                    checked={column.getIsVisible()}
                                    onCheckedChange={value => column.toggleVisibility(!!value)}
                                >
                                    {column.id.replace(/([A-Z])/g, ' $1').trim()}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </div>
            </div>
            
            <SubscriptionDataTable columns={columns} data={parsedData.rows} columnVisibility={columnVisibility} onColumnVisibilityChange={setColumnVisibility}/>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>Cancel</Button>
              <Button onClick={handleSave}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Save Report
              </Button>
            </div>
          </div>
        );
      case 'saving':
          return (
             <div className="flex flex-col items-center justify-center p-12">
                 <Spinner size="large" />
                 <p className="mt-4 text-muted-foreground">Saving to database...</p>
             </div>
         );
      case 'success':
        return (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <h3 className="font-semibold text-xl">Report Saved!</h3>
              <p className="text-green-900">The report has been successfully saved to the database.</p>
              <div className="flex justify-center pt-2"><Button variant="ghost" onClick={handleReset}>Upload Another Report</Button></div>
          </div>
        );
      case 'error':
        return (
           <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
              <h3 className="font-semibold text-xl">An Error Occurred</h3>
              <p className="text-sm text-red-900 break-words">{errorMessage}</p>
              <div className="flex justify-center pt-2"><Button variant="ghost" onClick={handleReset}>Try Again</Button></div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Card>
      <CardContent className="p-6">{renderContent()}</CardContent>
    </Card>
  );
}
