
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import type { EarningSummary } from '@/app/(dashboard)/google-play-reports/page';

export const columns: ColumnDef<EarningSummary>[] = [
  {
    accessorKey: 'sku',
    header: 'Product ID',
    cell: ({ row }) => (
      <div className="font-medium truncate" title={row.original.sku}>
        {row.original.sku}
      </div>
    )
  },
  {
    accessorKey: 'totalAmount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full justify-end px-2"
        >
          Total Income
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('totalAmount'));
      let currency = row.original.currency;

      if (!currency || currency.length !== 3) {
          currency = 'USD';
      }
      
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
];
