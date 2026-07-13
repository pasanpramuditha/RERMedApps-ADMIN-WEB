import { StatementUploader } from "@/components/bank-statements/statement-uploader";

export default function BankStatementsPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Statements</h1>
          <p className="text-muted-foreground">
            Upload your OFX bank statement to automatically import transactions.
          </p>
        </div>
      <StatementUploader />
    </div>
  );
}
