
import { StatementUploader } from "@/components/savings-account-statement/statement-uploader";

export default function SavingsAccountStatementPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold tracking-tight">MM Account Statement</h1>
          <p className="text-muted-foreground">
            Upload your MM account statement CSV file to import transactions.
          </p>
        </div>
      <StatementUploader />
    </div>
  );
}
