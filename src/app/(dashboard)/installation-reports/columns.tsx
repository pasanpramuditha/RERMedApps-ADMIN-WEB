
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { InstallationData } from './data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

const formatInteger = (value: string | undefined) => {
    const numericValue = Number(String(value || '0').replace(/\D/g, ''));
    return Number.isFinite(numericValue) ? numericValue.toLocaleString('en-US') : '0';
};

const NumberCell = ({ value }: { value: string | undefined }) => {
    return <div className="text-right tabular-nums tracking-normal">{formatInteger(value)}</div>;
};


export const columns: ColumnDef<InstallationData>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="whitespace-nowrap tabular-nums tracking-normal">{row.original.date}</div>,
  },
  {
    accessorKey: 'packageName',
    header: 'Package Name',
    cell: ({ row }) => (
        <div className="max-w-xs truncate tracking-normal" title={row.original.packageName}>
            {row.original.packageName}
        </div>
    )
  },
  {
    accessorKey: 'dailyUserInstalls',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Daily User Installs
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.dailyUserInstalls} />,
  },
  {
    accessorKey: 'dailyUserUninstalls',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Daily User Uninstalls
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.dailyUserUninstalls} />,
  },
  {
    accessorKey: 'activeDeviceInstalls',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Active Device Installs
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.activeDeviceInstalls} />,
  },
   {
    accessorKey: 'dailyDeviceInstalls',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Daily Device Installs
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.dailyDeviceInstalls} />,
  },
   {
    accessorKey: 'dailyDeviceUninstalls',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Daily Device Uninstalls
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.dailyDeviceUninstalls} />,
  },
  {
    accessorKey: 'dailyDeviceUpgrades',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Daily Device Upgrades
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.dailyDeviceUpgrades} />,
  },
  {
    accessorKey: 'totalUserInstalls',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Total User Installs
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.totalUserInstalls} />,
  },
  {
    accessorKey: 'installEvents',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Install Events
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.installEvents} />,
  },
   {
    accessorKey: 'updateEvents',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Update Events
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.updateEvents} />,
  },
  {
    accessorKey: 'uninstallEvents',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-2">
            Uninstall Events
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <NumberCell value={row.original.uninstallEvents} />,
  },
];
