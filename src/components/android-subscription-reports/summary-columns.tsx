
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

export interface SubscriptionSummary {
    packageName: string;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    activeSubscriptions: number;
    monthlyActive: number;
    yearlyActive: number;
}

const NumberCell = ({ value }: { value?: number }) => (
    <div className="text-right">{value?.toLocaleString() ?? 'N/A'}</div>
);

export const summaryColumns: ColumnDef<SubscriptionSummary>[] = [
    {
        accessorKey: 'packageName',
        header: 'Package Name',
        cell: ({ row }) => (
            <div className="min-w-[320px] max-w-[520px] whitespace-normal break-words font-medium leading-snug" title={row.original.packageName}>
                {row.original.packageName}
            </div>
        )
    },
    {
        accessorKey: 'newSubscriptions',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
                New
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <NumberCell value={row.original.newSubscriptions} />,
    },
    {
        accessorKey: 'cancelledSubscriptions',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
                Cancelled
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <NumberCell value={row.original.cancelledSubscriptions} />,
    },
    {
        accessorKey: 'activeSubscriptions',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
                Active
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <NumberCell value={row.original.activeSubscriptions} />,
    },
     {
        accessorKey: 'monthlyActive',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
                Monthly Active
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <NumberCell value={row.original.monthlyActive} />,
    },
     {
        accessorKey: 'yearlyActive',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
                Yearly Active
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <NumberCell value={row.original.yearlyActive} />,
    },
];
