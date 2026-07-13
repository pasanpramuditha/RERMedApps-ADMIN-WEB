
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { App } from '@/app/(dashboard)/apps/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Database, ExternalLink, Settings, Smartphone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ColumnsProps {
  onAction: () => void;
}

export const columns = ({ onAction }: ColumnsProps): ColumnDef<App>[] => [
  {
    accessorKey: 'name',
    header: 'App',
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={row.original.icon_url}
          alt={row.original.name}
          width={40}
          height={40}
          className="rounded-xl border border-white/10 bg-white/[0.04]"
          data-ai-hint="app icon"
        />
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{row.original.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone className="h-3 w-3" />
            {row.original.os || 'iOS'}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'package_name',
    header: 'Bundle ID',
    cell: ({ row }) => (
      <span className="block truncate font-mono text-xs text-muted-foreground">
        {row.original.package_name || 'Not set'}
      </span>
    ),
  },
  {
    accessorKey: 'db_name',
    header: 'Database',
    cell: ({ row }) => (
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-muted-foreground">
        <Database className="h-3.5 w-3.5" />
        <span className="truncate font-mono">{row.original.db_name || 'Not mapped'}</span>
      </div>
    ),
  },
  {
    accessorKey: 'status_label',
    header: 'Status',
    cell: ({ row }) => {
      const active = row.original.isActive;
      return (
        <Badge
          variant="outline"
          className={cn(
            'border-white/10 bg-white/[0.04]',
            active ? 'border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-100' : 'text-muted-foreground'
          )}
        >
          {row.original.status_label || (active ? 'Active' : 'Inactive')}
        </Badge>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const app = row.original;
      return (
        <div className="text-right">
          <Button asChild variant="outline" size="sm" className="border-sky-400/20 bg-sky-500/[0.08] px-2.5 text-sky-100 hover:bg-sky-500/[0.16]">
            <Link href={`/ios-app-settings/${app.id}/edit`}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      );
    },
  },
];
