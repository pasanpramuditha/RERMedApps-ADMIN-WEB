
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import type { AppleInstallRow } from '@/app/(dashboard)/apple-install-reports/data';

export const columns: ColumnDef<AppleInstallRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'name', header: 'App/Product Name' },
  { accessorKey: 'appleId', header: 'Apple ID' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'platforms', header: 'Platforms' },
  { 
    accessorKey: 'units', 
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end">
        Units
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right">{row.original.units?.toLocaleString()}</div>
  },
];
