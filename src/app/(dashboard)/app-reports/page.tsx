import { ReportUploader } from "@/components/app-reports/report-uploader";

export default function AppReportsPage() {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold tracking-tight">App Reports</h1>
          <p className="text-muted-foreground">
            Upload your sales and installs reports from App Store Connect and Google Play Console.
          </p>
        </div>
      <ReportUploader />
    </div>
  );
}
