
'use client';

import * as React from 'react';
import Image from 'next/image';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Pencil } from 'lucide-react';
import type { AdSettings } from './data';
import { EditAdSettingsDialog } from '@/components/admob-ads/edit-ad-settings-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ColumnsProps {
    platform: 'android' | 'ios';
}

const AdStatusBadge = ({ status }: { status: boolean | undefined }) => {
    let text: string;
    let className: string;

    switch(status) {
        case true:
            text = 'ON';
            className = "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
            break;
        case false:
            text = 'OFF';
            className = "border-slate-400/30 bg-slate-500/10 text-slate-400";
            break;
        default: // undefined
            text = 'N/I';
            className = "border-amber-500/40 bg-amber-500/10 text-amber-300";
            break;
    }

    return (
        <Badge
            variant="outline"
            className={cn("h-7 w-14 justify-center rounded-lg border text-[11px] font-bold", className)}
            title={text === 'N/I' ? 'Not Implemented' : ''}
        >
            {text}
        </Badge>
    );
};


const AdTypeCell = ({ row, adType }: { row: any, adType: keyof AdSettings['settings'] }) => {
    return (
        <div className="flex justify-center">
            <AdStatusBadge status={row.original.settings[adType]} />
        </div>
    )
};


export const columns = ({ platform }: ColumnsProps): ColumnDef<AdSettings>[] => {
    const allColumns: ColumnDef<AdSettings>[] = [
      {
        accessorKey: 'name',
        header: 'App',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Image
              src={row.original.icon_url}
              alt={row.original.name}
              width={40}
              height={40}
              className="rounded-xl border border-white/10 bg-muted"
              data-ai-hint="app icon"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{row.original.name}</span>
                {row.original.error && (
                <Badge variant="outline" className="gap-1 rounded-lg border-destructive/40 bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    API
                  </Badge>
                )}
              </div>
              {row.original.error && (
                <p className="mt-1 max-w-[280px] truncate text-xs text-destructive" title={row.original.error}>
                  {row.original.error}
                </p>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'frequency',
        accessorKey: 'settings.nativeInterval',
        header: () => <div className="text-center">Frequency</div>,
        cell: ({ row }) => {
            const { nativeInterval, rewardInterval } = row.original.settings;
            const displayValue = platform === 'android' 
                ? `Native: ${nativeInterval ?? 'N/A'} | Reward: ${rewardInterval ?? 'N/A'}`
                : nativeInterval ?? 'N/A';
            return (
              <div className="flex justify-center">
                <Badge variant="secondary" className="max-w-56 whitespace-normal rounded-lg border border-white/10 bg-white/[0.06] font-mono text-xs leading-5 text-muted-foreground">{displayValue}</Badge>
              </div>
            );
        },
      },
      {
        id: 'banner',
        header: () => <div className="text-center">Banner Ad</div>,
        cell: ({ row }) => <AdTypeCell row={row} adType="banner" />,
      },
      {
        id: 'interstitial',
        header: () => <div className="text-center">Interstitial Ad</div>,
        cell: ({ row }) => <AdTypeCell row={row} adType="interstitial" />,
      },
      {
        id: 'nativeAd',
        header: () => <div className="text-center">Native Ad</div>,
        cell: ({ row }) => <AdTypeCell row={row} adType="nativeAd" />,
      },
      {
        id: 'appOpen',
        header: () => <div className="text-center">App Open Ad</div>,
        cell: ({ row }) => <AdTypeCell row={row} adType="appOpen" />,
      },
      {
        id: 'actions',
        cell: ({ row, table }) => {
          const app = row.original;
          const { platform, refreshData } = (table.options.meta as { platform: 'android' | 'ios', refreshData: () => void });
          return (
            <div className="text-center">
                <EditAdSettingsDialog appSettings={app} platform={platform} onSuccess={refreshData}>
                    <Button variant="outline" size="sm" className="h-8 gap-2 rounded-xl border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                </EditAdSettingsDialog>
            </div>
          );
        },
      },
    ];

    if (platform === 'ios') {
        const iosColumnsToKeep = new Set(['name', 'banner', 'interstitial', 'actions']);
        return allColumns.filter((col) => iosColumnsToKeep.has((col.id || (col as { accessorKey?: string }).accessorKey) as string));
    }

    return allColumns;
};
