
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Clock, Database, Mail, UserRound } from 'lucide-react';
import type { ActivityLog } from '@/lib/activity-log';
import { Badge } from '../ui/badge';

const operationClass: Record<ActivityLog['operation'], string> = {
  insert: 'border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100',
  update: 'border-blue-400/25 bg-blue-500/[0.10] text-blue-100',
  delete: 'border-rose-400/25 bg-rose-500/[0.10] text-rose-100',
  action: 'border-amber-400/25 bg-amber-500/[0.10] text-amber-100',
};

export const columns: ColumnDef<ActivityLog>[] = [
  {
    accessorKey: 'timestamp',
    header: ({ column }) => (
      <Button variant="ghost" className="px-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Timestamp
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        {row.original.timestamp}
      </div>
    ),
  },
  {
    accessorKey: 'userEmail',
    header: 'User',
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{row.original.userEmail}</div>
          {row.original.userUid ? (
            <div className="truncate text-xs text-muted-foreground">{row.original.userUid}</div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              no uid
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'operation',
    header: 'Operation',
    cell: ({ row }) => (
      <Badge variant="outline" className={operationClass[row.original.operation]}>
        {row.original.operation}
      </Badge>
    ),
  },
  {
    accessorKey: 'action',
    header: ({ column }) => (
      <Button variant="ghost" className="px-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Action
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const action = row.getValue('action') as string;
        return <div className="max-w-[220px] text-sm font-medium text-foreground">{action}</div>
    }
  },
   {
    accessorKey: 'entityName',
    header: 'Entity',
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">{row.original.entityName}</div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Database className="h-3 w-3" />
          {row.original.entityType}
          {row.original.entityId ? <span className="truncate">#{row.original.entityId}</span> : null}
        </div>
      </div>
    ),
  },
];
