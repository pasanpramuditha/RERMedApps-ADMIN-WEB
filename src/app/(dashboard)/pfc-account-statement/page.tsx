
import { StatementUploader } from "@/components/pfc-account-statement/statement-uploader";

export default function PfcAccountStatementPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold tracking-tight">PFC Account Statement</h1>
          <p className="text-muted-foreground">
            Upload your PFC bank statement CSV file to import transactions.
          </p>
        </div>
      <StatementUploader />
    </div>
  );
}
