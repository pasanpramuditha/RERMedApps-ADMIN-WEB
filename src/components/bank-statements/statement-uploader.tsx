
'use client';

import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, CheckCircle, AlertCircle, UploadCloud } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { XMLParser } from 'fast-xml-parser';
import type { BankTransaction, BankStatementUpload } from '@/app/(dashboard)/bank-statements/data';
import { saveBankStatement, getExistingTransactionIds } from '@/app/(dashboard)/bank-statements/actions';
import { BankStatementTable } from './bank-statement-table';
import { categorizeTransaction } from '@/ai/flows/categorize-transaction-flow';

export function StatementUploader() {
  const [file, setFile] = React.useState<File | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'parsing' | 'preview' | 'saving' | 'success' | 'error'>('idle');
  const [parsedData, setParsedData] = React.useState<BankStatementUpload | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const { toast } = useToast();

  const parseOfx = async (ofxContent: string, fileName: string): Promise<BankStatementUpload> => {
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const json = parser.parse(ofxContent);
    const statementResponse = json.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS;

    if (!statementResponse) {
      throw new Error("Could not find a valid bank statement response in the OFX file.");
    }
    
    const accountInfo = statementResponse.BANKACCTFROM;
    const transactionList = statementResponse.BANKTRANLIST.STMTTRN;
    const ledgerBalance = statementResponse.LEDGERBAL;

    const account = {
        bankId: accountInfo.BANKID,
        accountId: accountInfo.ACCTID,
        accountType: accountInfo.ACCTTYPE,
        currency: statementResponse.CURDEF,
        ledgerBalance: parseFloat(ledgerBalance.BALAMT),
        balanceDate: ledgerBalance.DTASOF.substring(0, 8),
    };

    const rawTransactions: Omit<BankTransaction, 'tag' | 'isDuplicate'>[] = (Array.isArray(transactionList) ? transactionList : [transactionList]).map((trn: any, index: number) => ({
      id: trn.FITID || `${trn.DTPOSTED}-${index}`,
      transactionType: trn.TRNTYPE,
      postedDate: trn.DTPOSTED.substring(0, 8), // YYYYMMDD
      amount: parseFloat(trn.TRNAMT),
      fitId: trn.FITID,
      name: trn.NAME,
      memo: trn.MEMO,
      currency: statementResponse.CURDEF,
      accountId: accountInfo.ACCTID,
    }));
    
    // Set preliminary data for preview (without tags or duplicate status yet)
    const preliminaryTransactions = rawTransactions.map(t => ({...t, tag: undefined, isDuplicate: undefined }));
    setParsedData({ fileName, transactions: preliminaryTransactions, account });
    
    // Check for duplicates
    const fitIds = rawTransactions.map(t => t.fitId);
    const existingIds = await getExistingTransactionIds(fitIds);
    const existingIdSet = new Set(existingIds);
    
    // Asynchronously categorize each transaction and mark duplicates
    const categorizedTransactions = await Promise.all(
        rawTransactions.map(async (trn) => {
            const isDuplicate = existingIdSet.has(trn.fitId);
            try {
                const result = await categorizeTransaction({ description: trn.name });
                const taggedTransaction = { ...trn, tag: result.tag, isDuplicate };
                
                // Update the state progressively as each transaction is categorized
                setParsedData(currentData => {
                    if (!currentData) return null;
                    return {
                        ...currentData,
                        transactions: currentData.transactions.map(t => t.fitId === taggedTransaction.fitId ? taggedTransaction : t)
                    };
                });
                return taggedTransaction;

            } catch (e) {
                console.error(`Failed to categorize transaction: ${trn.name}`, e);
                const errorTransaction = { ...trn, tag: 'Unknown' as const, isDuplicate };
                
                setParsedData(currentData => {
                    if (!currentData) return null;
                    return {
                        ...currentData,
                        transactions: currentData.transactions.map(t => t.fitId === errorTransaction.fitId ? errorTransaction : t)
                    };
                });
                return errorTransaction;
            }
        })
    );

    return { fileName, transactions: categorizedTransactions, account };
  };

  const handleFileRead = async (fileContent: string, fileName: string) => {
    setStatus('parsing');
    try {
      await parseOfx(fileContent, fileName);
      setStatus('preview');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse OFX file.');
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
    accept: { 'application/ofx': ['.ofx'] },
    maxFiles: 1,
  });

  const handleSave = async () => {
    if (!parsedData) return;
    setStatus('saving');

    // The save action will now receive ALL transactions and handle filtering internally
    const result = await saveBankStatement(parsedData);

    if (result.error) {
      setStatus('error');
      setErrorMessage(result.error);
      toast({ title: 'Save Failed', description: result.error, variant: 'destructive' });
    } else {
      setStatus('success');
      toast({ title: 'Statement Processed!', description: `${result.transactionCount} new transactions have been saved.` });
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
            <p className="font-semibold">Drag & drop your OFX bank statement file here</p>
            <p className="text-muted-foreground text-sm">or click to select a file</p>
          </div>
        );
      case 'parsing': return <div className="flex flex-col items-center justify-center p-12"><Spinner size="large" /><p className="mt-4 text-muted-foreground">Parsing statement & categorizing transactions...</p></div>;
      case 'preview':
        if (!parsedData) return null;
        return (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50 text-sm">
                <h3 className="font-semibold text-lg mb-2">Statement Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><strong>File:</strong> <span className="font-mono">{parsedData.fileName}</span></div>
                    <div><strong>Account:</strong> {parsedData.account.accountId}</div>
                    <div><strong>Currency:</strong> {parsedData.account.currency}</div>
                    <div><strong>Transactions:</strong> {parsedData.transactions.length}</div>
                </div>
            </div>
            <BankStatementTable transactions={parsedData.transactions} setParsedData={setParsedData} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>Cancel</Button>
              <Button onClick={handleSave} disabled={newTransactionCount === 0}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Process {newTransactionCount} New Transaction(s)
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
            <p className="text-green-900">Transactions have been saved to the database and categorized into income/expenses.</p>
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
