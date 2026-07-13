'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { AppRegistryFamily } from './data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Apple, Copy, MoreHorizontal, Pencil, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const statusMeta: Record<number, { label: string; className: string }> = {
  0: { label: 'Developing', className: 'bg-slate-500/15 text-slate-200 border-slate-500/40' },
  1: { label: 'Testing', className: 'bg-amber-500/15 text-amber-200 border-amber-500/40' },
  2: { label: 'Live', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/40' },
  3: { label: 'Unpublished', className: 'bg-rose-500/15 text-rose-200 border-rose-500/40' },
  4: { label: 'Skip', className: 'bg-zinc-500/15 text-zinc-200 border-zinc-500/40' },
};

const platformMeta: Record<number, { className: string }> = {
  0: { className: 'border-slate-500/50 bg-slate-500/15 text-slate-100' },
  1: { className: 'border-amber-500/50 bg-amber-500/15 text-amber-100' },
  2: { className: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-100' },
  3: { className: 'border-rose-500/50 bg-rose-500/15 text-rose-100' },
  4: { className: 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300' },
};

const availabilityLabel: Record<number, string> = {
  0: 'Development',
  1: 'Pending',
  2: 'Live',
  3: 'Unpublished',
  4: 'Hidden',
  [-1]: 'Removed',
};

function shortUrl(value?: string, max = 34) {
  if (!value) return 'Not set';
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

const AppActionsCell = ({ row }: { row: any }) => {
  const app = row.original as AppRegistryFamily;
  const { toast } = useToast();

  const copyDbName = async () => {
    if (!app.db_name) return;
    await navigator.clipboard.writeText(app.db_name);
    toast({
      title: 'DB name copied',
      description: app.db_name,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/apps/${app.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyDbName} disabled={!app.db_name}>
          <Copy className="mr-2 h-4 w-4" />
          Copy DB name
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<AppRegistryFamily>[] = [
  {
    accessorKey: 'name',
    header: 'App Name',
    cell: ({ row }) => {
      const app = row.original;
      const themeColor = app.theme_color || '#2f6fed';

      return (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-muted">
            <Image
              src={app.icon_url}
              alt={app.name}
              fill
              className="object-cover"
              sizes="44px"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                style={{ backgroundColor: themeColor }}
              />
              <span className="truncate font-medium text-white">{app.name}</span>
            </div>
            <div className="truncate text-xs text-muted-foreground">{app.package_name}</div>
            <div className="truncate text-xs text-muted-foreground">{app.db_name}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'availability',
    header: 'Availability',
    cell: ({ row }) => {
      const app = row.original;
      const androidHidden = !app.availability.android.exists || app.availability.android.status === -1 || app.availability.android.status === 4;
      const iosHidden = !app.availability.ios.exists || app.availability.ios.status === -1 || app.availability.ios.status === 4;
      const androidMeta = platformMeta[app.availability.android.status] || platformMeta[4];
      return (
        <div className="flex flex-wrap gap-2">
          {!androidHidden && (
            <Badge variant="outline" className={androidMeta.className}>
              <Smartphone className="mr-1 h-3.5 w-3.5" />
              Android - {availabilityLabel[app.availability.android.status] || 'Unknown'}
            </Badge>
          )}
          {!iosHidden && (
            <Badge
              variant="outline"
              className={platformMeta[app.availability.ios.status]?.className || platformMeta[4].className}
            >
              <Apple className="mr-1 h-3.5 w-3.5" />
              iOS - {availabilityLabel[app.availability.ios.status] || 'Unknown'}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'url',
    header: 'URL',
    cell: ({ row }) => {
      const app = row.original;
      const androidUrl = app.android?.url;
      const iosUrl = app.ios?.url;
      const hasAndroid = !!androidUrl && app.availability.android.exists && app.availability.android.status !== -1 && app.availability.android.status !== 4;
      const hasIos = !!iosUrl && app.availability.ios.exists && app.availability.ios.status !== -1 && app.availability.ios.status !== 4;

      if (!hasAndroid && !hasIos) {
        return <div className="max-w-[280px] truncate text-sm text-muted-foreground">Not set</div>;
      }

      return (
        <div className="space-y-1 text-sm">
          {hasAndroid && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={platformMeta[app.availability.android.status]?.className || platformMeta[4].className}>
                <Smartphone className="mr-1 h-3.5 w-3.5" />
              </Badge>
              <a
                href={androidUrl}
                target="_blank"
                rel="noreferrer"
                className="max-w-[240px] truncate text-blue-400 underline-offset-4 hover:underline"
                title={androidUrl}
              >
                Open in Google Play
              </a>
            </div>
          )}
          {hasIos && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={platformMeta[app.availability.ios.status]?.className || platformMeta[4].className}>
                <Apple className="mr-1 h-3.5 w-3.5" />
              </Badge>
              <a
                href={iosUrl}
                target="_blank"
                rel="noreferrer"
                className="max-w-[240px] truncate text-blue-400 underline-offset-4 hover:underline"
                title={iosUrl}
              >
                Open in Apple Store
              </a>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'status_label',
    header: 'Status',
    cell: ({ row }) => {
      const app = row.original;
      if ((app.status ?? 4) === 4 || (app.status ?? 4) === -1) {
        return null;
      }
      const meta = statusMeta[app.status ?? 4] || statusMeta[4];

      return (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={meta.className}>
            {meta.label}
          </Badge>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: AppActionsCell,
  },
];
