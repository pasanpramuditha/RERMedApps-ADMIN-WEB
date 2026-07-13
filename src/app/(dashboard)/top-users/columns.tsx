
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Crown } from 'lucide-react';
import type { TopUser } from './data';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export const columns: ColumnDef<TopUser>[] = [
  {
    id: 'rank',
    header: 'Rank',
    cell: ({ row }) => {
      const rank = row.index + 1;
      const isTopThree = rank <= 3;

      return (
        <div className="flex justify-center">
          <div className={[
            'flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-sm font-bold',
            isTopThree
              ? 'border-amber-400/25 bg-amber-500/15 text-amber-100'
              : 'border-white/10 bg-white/[0.04] text-white/70',
          ].join(' ')}>
            {isTopThree ? <Crown className="mr-1 h-3.5 w-3.5" /> : null}
            {rank}
          </div>
        </div>
      );
    },
    size: 50,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-semibold text-white">{row.getValue('email')}</div>
        <div className="mt-0.5 text-xs text-white/35">Customer account</div>
      </div>
    ),
  },
  {
    accessorKey: 'appsPurchased',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end">
        Apps Purchased
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        <span className="inline-flex min-w-12 justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-100">
          {row.getValue('appsPurchased')}
        </span>
      </div>
    ),
    size: 150, // Set a smaller size for this column
  },
  {
    accessorKey: 'packages',
    header: 'Packages',
    cell: ({ row }) => {
      const packages = row.original.packages;
      if (!packages || packages.length === 0) return null;

      return (
        <TooltipProvider>
          <div className="flex max-w-[620px] flex-wrap items-center gap-1.5">
            {packages.map((pkg) => (
              <Tooltip key={pkg.name}>
                <TooltipTrigger asChild>
                  <div className="rounded-full border border-white/10 bg-white/[0.04] p-0.5 transition-transform hover:scale-110">
                    <Image
                      src={pkg.iconUrl}
                      alt={pkg.name}
                      width={26}
                      height={26}
                      className="rounded-full"
                      data-ai-hint="app icon"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{pkg.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      );
    },
  },
];
