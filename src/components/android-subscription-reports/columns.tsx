
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AndroidSubscriptionReportRow } from '@/app/(dashboard)/android-subscription-reports/data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const NumberCell = ({ value }: { value?: number }) => (
    <div className="text-right">{value?.toLocaleString() ?? 'N/A'}</div>
);

export const columns: ColumnDef<AndroidSubscriptionReportRow>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'packageName',
    header: 'Package Name',
    cell: ({ row }) => (
        <div className="min-w-[320px] max-w-[520px] whitespace-normal break-words leading-snug" title={row.original.packageName}>
            {row.original.packageName}
        </div>
    )
  },
  {
    accessorKey: 'productId',
    header: 'Product ID',
  },
   {
    accessorKey: 'country',
    header: 'Country',
  },
  {
    accessorKey: 'newSubscriptions',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            New Subs
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.newSubscriptions} />,
  },
  {
    accessorKey: 'cancelledSubscriptions',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Cancelled Subs
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.cancelledSubscriptions} />,
  },
  {
    accessorKey: 'activeSubscriptions',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Active Subs
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.activeSubscriptions} />,
  },
  {
    accessorKey: 'basePlanId',
    header: 'Base Plan ID',
  },
  {
    accessorKey: 'offerId',
    header: 'Offer ID',
  },
];
