import { StatCard } from '@/components/crash-analysis/stat-card';
import { CrashesOverTimeChart } from '@/components/crash-analysis/crashes-over-time-chart';
import { CrashReportsDataTable } from '@/components/crash-analysis/crash-reports-data-table';
import { columns } from '@/components/crash-analysis/columns';
import { crashReports } from '@/components/crash-analysis/data';
import { AlertCircle, ShieldCheck, Users, GitBranch } from 'lucide-react';

export default function CrashAnalysisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Crash Analysis</h1>
        <p className="text-muted-foreground">
          Monitor and analyze application crashes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Crashes"
          value="1,235"
          change="+20.1% from last month"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Crash-free users"
          value="99.8%"
          change="+0.2% from last month"
          icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Affected users"
          value="897"
          change="-5.2% from last month"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Version with most crashes"
          value="v2.3.1"
          change="Investigate now"
          icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-1">
        <CrashesOverTimeChart />
        <CrashReportsDataTable columns={columns} data={crashReports} />
      </div>
    </div>
  );
}
