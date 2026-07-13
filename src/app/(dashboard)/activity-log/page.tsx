
import { listActivityLogs } from '@/lib/activity-log';
import { ActivityLogTable } from '@/components/activity-log/activity-log-table';
import { columns } from '@/components/activity-log/columns';
import { ManagementHelpDialog } from '@/components/dashboard/management-help-dialog';
import { Activity, Database, FileClock, PlusCircle, Pencil, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ActivityLogPage() {
  const logs = await listActivityLogs();
  const insertCount = logs.filter((log) => log.operation === 'insert').length;
  const updateCount = logs.filter((log) => log.operation === 'update').length;
  const deleteCount = logs.filter((log) => log.operation === 'delete').length;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/[0.12] to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-400/25 bg-amber-500/[0.15] text-amber-100">
              <FileClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Audit Trail
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Activity Log</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Review dashboard changes by user, operation type, target entity, and timestamp.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Database className="h-3.5 w-3.5" />
                  {logs.length} recent logs
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.10] px-2.5 py-1 text-emerald-100">
                  <PlusCircle className="h-3.5 w-3.5" />
                  {insertCount} inserts
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.10] px-2.5 py-1 text-blue-100">
                  <Pencil className="h-3.5 w-3.5" />
                  {updateCount} updates
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/[0.10] px-2.5 py-1 text-rose-100">
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteCount} deletes
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.10] px-2.5 py-1 text-amber-100">
                  <Activity className="h-3.5 w-3.5" />
                  MySQL backed
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <ManagementHelpDialog page="activity-log" />
          </div>
        </div>
      </div>
      <ActivityLogTable columns={columns} data={logs} />
    </div>
  );
}
