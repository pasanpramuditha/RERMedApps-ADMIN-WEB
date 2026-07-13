
'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle, AlertCircle, UploadCloud } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import type { SavingsTransaction } from '@/app/(dashboard)/savings-account-statement/data';
import { saveSavingsStatement, getExistingSavingsTransactionIds } from '@/app/(dashboard)/savings-account-statement/actions';
import { StatementTable } from './statement-table';
import Papa from 'papaparse';

interface StatementUpload {
    fileName: string;
    transactions: SavingsTransaction[];
}

type RawSavingsTransaction = Omit<SavingsTransaction, 'category' | 'isDuplicate'>;

const safeParseFloat = (value: string | undefined): number | undefined => {
    if (value === undefined || value === null || value.trim() === '') return undefined;
    const cleanedValue = value.replace(/,/g, '').trim();
    const num = parseFloat(cleanedValue);
    return isNaN(num) ? undefined : num;
}

const isDate = (s: string) => s && /^\d{2}\/\d{2}\/\d{4}$/.test(s);
const isCurrencyCode = (s: string) => s && /^[A-Z]{3}$/.test(s);

const getCategoryFromDescription = (description: string, isDebit: boolean): string => {
    const desc = description.toUpperCase();

    if (desc.includes('PAYOUT')) return 'Payout';

    if (isDebit) {
        if (desc.includes('CHATGPT')) return 'Business';
        if (desc.includes('GOOGLE ONE')) return 'Business';
        if (desc.includes('APPSCREENS.COM')) return 'Business';
        if (desc.includes('SHENDUQRWEA')) return 'Business';
        if (desc.includes('GOOGLE AD')) return 'Business';
        return 'Unknown';
    } else { // isCredit
        if (desc.includes('GOOGLE ASIA PAC')) return 'Admob Income';
        if (desc.includes('GOOGLE PAYMENT')) return 'Android Income';
        if (desc.includes('APPLE INC')) return 'IOS Income';
        return 'Other';
    }
};


export function StatementUploader() {
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'parsing' | 'preview' | 'saving' | 'success' | 'error'>('idle');
  const [parsedData, setParsedData] = React.useState<StatementUpload | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const { toast } = useToast();

  const parseCsv = async (csvContent: string, fileName: string): Promise<StatementUpload> => {
    const parsed = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true,
    });

    if (parsed.errors.length) {
      console.error('CSV Parsing Errors:', parsed.errors);
      throw new Error(`Failed to parse CSV file: ${parsed.errors[0].message}`);
    }

    const rawTransactions: RawSavingsTransaction[] = (parsed.data as any[]).map((row): RawSavingsTransaction | null => {
        if(!row || row.length < 9) return null;
        
        const transactionDate = row[1]?.trim();
        const currency = row[5]?.trim();
        const description = row[3]?.trim() || '';

        if (!isDate(transactionDate) || !isCurrencyCode(currency)) {
            return null;
        }
        
        return {
            transactionDate: transactionDate,
            description: description,
            currency: currency,
            debit: safeParseFloat(row[6]),
            credit: safeParseFloat(row[7]),
            runningBalance: safeParseFloat(row[8]) ?? 0,
        }
    }).filter((t): t is RawSavingsTransaction => t !== null);

    if (rawTransactions.length === 0) {
        throw new Error("No valid transaction rows found in the CSV file. Please ensure the file has rows with dates in column 2 and currency codes (e.g., USD) in column 6.");
    }
    
    // Set preliminary data for preview (without isDuplicate status yet)
    const preliminaryTransactions = rawTransactions.map(t => ({
        ...t, 
        category: getCategoryFromDescription(t.description, !!t.debit),
        isDuplicate: undefined,
    }));

    setParsedData({ fileName, transactions: preliminaryTransactions });

    // Check for duplicates
    const transactionIds = rawTransactions.map(t => `${t.transactionDate.replace(/\//g, '')}-${t.description.substring(0, 10)}-${t.debit || t.credit}`);
    const existingIds = await getExistingSavingsTransactionIds(transactionIds);
    const existingIdSet = new Set(existingIds);
    
    const finalTransactions = preliminaryTransactions.map(t => ({
        ...t,
        isDuplicate: existingIdSet.has(`${t.transactionDate.replace(/\//g, '')}-${t.description.substring(0, 10)}-${t.debit || t.credit}`)
    }));
    
    setParsedData({ fileName, transactions: finalTransactions });

    return { fileName, transactions: finalTransactions };
  };

  const handleFileRead = async (fileContent: string, fileName: string) => {
    setStatus('parsing');
    try {
      await parseCsv(fileContent, fileName);
      setStatus('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse CSV file.');
      setStatus('error');
    }
  };

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const currentFile = acceptedFiles[0];
      setFile(currentFile);
      setParsedData(null);
      setErrorMessage('');
      const reader = new FileReader();
      reader.onload = (event) => handleFileRead(event.target?.result as string, currentFile.name);
      reader.readAsText(currentFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  });

  const handleSave = async () => {
    if (!parsedData) return;
    setStatus('saving');

    const result = await saveSavingsStatement(parsedData);

    if (result.error) {
      setStatus('error');
      setErrorMessage(result.error);
      toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
    } else {
      setStatus('success');
      toast({ title: 'Statement Processed!', description: `${result.transactionCount} transactions have been saved.` });
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('idle');
    setParsedData(null);
    setErrorMessage('');
  };

  const newTransactionCount = parsedData?.transactions.filter(t => !t.isDuplicate).length || 0;

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <div {...getRootProps()} className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-accent/20' : 'border-border hover:border-primary/50'}`}>
            <input {...getInputProps()} />
            <FileUp className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="font-semibold">Drag & drop your MM account statement CSV here</p>
            <p className="text-muted-foreground text-sm">or click to select a file</p>
          </div>
        );
      case 'parsing': return <div className="flex flex-col items-center justify-center p-12"><Spinner size="large" /><p className="mt-4 text-muted-foreground">Parsing statement & checking for duplicates...</p></div>;
      case 'preview':
        if (!parsedData) return null;
        return (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50 text-sm">
                <h3 className="font-semibold text-lg mb-2">Statement Preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><strong>File:</strong> <span className="font-mono">{parsedData.fileName}</span></div>
                    <div><strong>Transactions Found:</strong> {parsedData.transactions.length}</div>
                    <div><strong>New Transactions:</strong> {newTransactionCount}</div>
                </div>
            </div>
            <StatementTable transactions={parsedData.transactions} setParsedData={setParsedData} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>Cancel</Button>
              <Button onClick={handleSave} disabled={newTransactionCount === 0}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Save {newTransactionCount} New Transactions
              </Button>
            </div>
          </div>
        );
      case 'saving': return <div className="flex flex-col items-center justify-center p-12"><Spinner size="large" /><p className="mt-4 text-muted-foreground">Saving transactions...</p></div>;
      case 'success':
        return (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
            <h3 className="font-semibold text-xl">Statement Processed!</h3>
            <p className="text-green-900">Transactions have been saved to the database.</p>
            <div className="flex justify-center pt-2"><Button variant="ghost" onClick={handleReset}>Upload Another Statement</Button></div>
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
      default: return null;
    }
  };

  return <Card><CardContent className="p-6">{renderContent()}</CardContent></Card>;
}
