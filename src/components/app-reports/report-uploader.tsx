
'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle, AlertCircle, UploadCloud, ChevronDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { saveAppleSalesReport } from '@/app/(dashboard)/app-reports/actions';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';
import type { AppleSalesReport } from '@/app/(dashboard)/app-reports/data';
import { AppleReportRowSchema } from '@/app/(dashboard)/app-reports/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { z } from 'zod';
import { useRouter } from 'next/navigation';

// Dynamically import pako for decompression on the client-side
const pako = import('pako');

type ReportRow = z.infer<typeof AppleReportRowSchema>;

export function ReportUploader() {
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'parsing' | 'preview' | 'saving' | 'success' | 'error'>('idle');
  const [parsedData, setParsedData] = React.useState<AppleSalesReport | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const { toast } = useToast();
  const router = useRouter();
  const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
      provider: false,
      providerCountry: false,
      developer: false,
      version: false,
      productTypeIdentifier: false,
      units: false,
      endDate: false,
      customerCurrency: false,
      countryCode: false,
      currencyOfProceeds: false,
      appleIdentifier: false,
      customerPrice: false,
      promoCode: false,
      parentIdentifier: false,
      category: false,
      cmb: false,
      device: false,
      supportedPlatforms: false,
      proceedsReason: false,
      preservedPricing: false,
      client: false,
      orderType: false,
  });

  React.useEffect(() => {
    async function fetchSettings() {
        try {
            const settings = await getGlobalSettings();
            if (settings.exchange_rates_json) {
                setExchangeRates(JSON.parse(settings.exchange_rates_json));
            }
        } catch (e) {
            console.error("Failed to fetch or parse exchange rates from settings", e);
            toast({
                title: 'Warning',
                description: 'Could not load custom exchange rates. Using fallback values.',
                variant: 'destructive'
            });
        }
    }
    fetchSettings();
  }, [toast]);

  const convertToUSD = (amount: number, currency: string): number => {
    if (currency === 'USD') return amount;
    const rate = exchangeRates[currency.toUpperCase()];
    if (rate) return amount * rate;
    console.warn(`Missing exchange rate for ${currency}. Returning original amount.`);
    return amount; 
  }

  const parseReport = (reportData: string, fileName: string): AppleSalesReport => {
      const parsed = Papa.parse<string[]>(reportData, { delimiter: '\t', skipEmptyLines: true });
      const rows = parsed.data;
      if (rows.length < 2) throw new Error("Report must have at least a header and one data row.");
      
      const header = rows[0].map(h => h.trim());
      const dataRows = rows.slice(1);

      const requiredColumns = ['SKU', 'Title', 'Developer Proceeds', 'Begin Date', 'Customer Currency', 'Units'];
      const missingColumns = requiredColumns.filter(col => !header.includes(col));
      if (missingColumns.length > 0) throw new Error(`Report is missing required columns: ${missingColumns.join(', ')}`);

      const headerMap = new Map(header.map((h, i) => [h, i]));
      const getIndex = (name: string) => headerMap.get(name);
      
      let totalProceedsUSD = 0;
      let totalUnits = 0;
      const parsedRows: ReportRow[] = [];

      dataRows.forEach(row => {
          const originalProceeds = parseFloat(row[getIndex('Developer Proceeds')!]) || 0;
          const customerCurrency = row[getIndex('Customer Currency')!] || 'USD';
          const units = parseInt(row[getIndex('Units')!], 10) || 0;
          const proceedsInUSD = convertToUSD(originalProceeds, customerCurrency);
          
          totalProceedsUSD += proceedsInUSD;
          totalUnits += units;

          parsedRows.push({
            provider: row[getIndex('Provider')!],
            providerCountry: row[getIndex('Provider Country')!],
            sku: row[getIndex('SKU')!],
            developer: row[getIndex('Developer')!],
            title: row[getIndex('Title')!],
            version: row[getIndex('Version')!],
            productTypeIdentifier: row[getIndex('Product Type Identifier')!],
            units,
            developerProceeds: originalProceeds,
            developerProceedsUSD: proceedsInUSD,
            beginDate: row[getIndex('Begin Date')!],
            endDate: row[getIndex('End Date')!],
            customerCurrency,
            countryCode: row[getIndex('Country Code')!],
            currencyOfProceeds: row[getIndex('Currency of Proceeds')!],
            appleIdentifier: row[getIndex('Apple Identifier')!],
            customerPrice: parseFloat(row[getIndex('Customer Price')!]) || 0,
            promoCode: row[getIndex('Promo Code')!],
            parentIdentifier: row[getIndex('Parent Identifier')!],
            subscription: row[getIndex('Subscription')!],
            period: row[getIndex('Period')!],
            category: row[getIndex('Category')!],
            cmb: row[getIndex('CMB')!],
            device: row[getIndex('Device')!],
            supportedPlatforms: row[getIndex('Supported Platforms')!],
            proceedsReason: row[getIndex('Proceeds Reason')!],
            preservedPricing: row[getIndex('Preserved Pricing')!],
            client: row[getIndex('Client')!],
            orderType: row[getIndex('Order Type')!],
          });
      });
      
      const firstDateStr = parsedRows[0]?.beginDate;
      let reportDate = 'YYYY-MM';
      if (firstDateStr) {
          const [month, day, year] = firstDateStr.split('/');
          if (year && month) {
              reportDate = `${year}-${month.padStart(2, '0')}`;
          }
      }

      return {
          fileName,
          reportDate,
          summary: { totalProceedsUSD, totalUnits },
          rows: parsedRows,
      };
  }

  const handleFile = async (file: File) => {
    setStatus('parsing');
    setFile(file);
    try {
        const pakoInstance = await pako;
        const buffer = await file.arrayBuffer();
        const decompressed = pakoInstance.inflate(new Uint8Array(buffer), { to: 'string' });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/gzip': ['.gz'] },
    maxFiles: 1,
  });

  const handleSave = async () => {
    if (!parsedData) return;
    setStatus('saving');

    const dataToSave = {
        ...parsedData,
        rows: JSON.stringify(parsedData.rows),
    };

    const result = await saveAppleSalesReport(dataToSave);

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

  const columns = React.useMemo<ColumnDef<ReportRow>[]>(() => [
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'developerProceedsUSD', header: 'Proceeds (USD)', cell: info => `$${(info.getValue() as number).toFixed(2)}` },
    { accessorKey: 'beginDate', header: 'Begin Date' },
    { accessorKey: 'subscription', header: 'Subscription' },
    { accessorKey: 'period', header: 'Period' },
    { accessorKey: 'provider', header: 'Provider' },
    { accessorKey: 'providerCountry', header: 'Provider Country' },
    { accessorKey: 'developer', header: 'Developer' },
    { accessorKey: 'version', header: 'Version' },
    { accessorKey: 'productTypeIdentifier', header: 'Product Type ID' },
    { accessorKey: 'units', header: 'Units' },
    { accessorKey: 'endDate', header: 'End Date' },
    { accessorKey: 'customerCurrency', header: 'Customer Currency' },
    { accessorKey: 'countryCode', header: 'Country Code' },
    { accessorKey: 'currencyOfProceeds', header: 'Proceeds Currency' },
    { accessorKey: 'appleIdentifier', header: 'Apple ID' },
    { accessorKey: 'customerPrice', header: 'Customer Price' },
    { accessorKey: 'promoCode', header: 'Promo Code' },
    { accessorKey: 'parentIdentifier', header: 'Parent ID' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'cmb', header: 'CMB' },
    { accessorKey: 'device', header: 'Device' },
    { accessorKey: 'supportedPlatforms', header: 'Supported Platforms' },
    { accessorKey: 'proceedsReason', header: 'Proceeds Reason' },
    { accessorKey: 'preservedPricing', header: 'Preserved Pricing' },
    { accessorKey: 'client', header: 'Client' },
    { accessorKey: 'orderType', header: 'Order Type' },
  ], []);

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
            <p className="font-semibold">Drag & drop your Apple Sales Report .gz file</p>
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
                <div><strong>Total Units:</strong> {parsedData.summary.totalUnits.toLocaleString()}</div>
                <div><strong>Total Proceeds (USD):</strong> ${parsedData.summary.totalProceedsUSD.toFixed(2)}</div>
                <div className="md:col-start-4 md:justify-self-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <ChevronDown className="mr-2 h-4 w-4" /> Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
            <ScrollArea className="h-96 w-full rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id} className="whitespace-nowrap">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map(row => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id} className="whitespace-nowrap max-w-xs truncate">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
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
              <div className="flex justify-center pt-4 gap-2">
                  <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
                  <Button variant="ghost" onClick={handleReset}>Upload Another Report</Button>
              </div>
          </div>
        );
      case 'error':
        return (
           <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
              <h3 className="font-semibold text-xl">An Error Occurred</h3>
              <p className="text-sm text-red-900 break-words">{errorMessage}</p>
              <div className="flex justify-center pt-2">
                  <Button variant="ghost" onClick={handleReset}>Try Again</Button>
              </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs text-center text-muted-foreground mb-4">
            Note: Currency conversion to USD is based on the rates defined in the Global Settings page.
        </p>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
