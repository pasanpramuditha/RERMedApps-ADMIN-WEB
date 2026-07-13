'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { PurchasedUser } from '@/app/(dashboard)/purchased-users/data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';

export const columns: ColumnDef<PurchasedUser>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
   {
    accessorKey: 'appName',
    header: 'App',
    cell: ({ row }) => (
        <div className="flex items-center justify-center">
            <Image 
                src={row.original.appIcon}
                alt={row.original.appName}
                width={32}
                height={32}
                className="rounded-md"
                data-ai-hint="app icon"
            />
        </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Email
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'orderId',
    header: 'Order ID'
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
  },
  {
    accessorKey: 'appVersion',
    header: 'App Version',
  },
  {
    accessorKey: 'purchasedDate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Purchased Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
];
