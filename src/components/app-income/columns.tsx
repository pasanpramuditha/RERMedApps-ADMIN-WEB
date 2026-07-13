'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import type { AppIncome } from '@/app/(dashboard)/app-income/data';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { deleteAppIncome } from '@/app/(dashboard)/app-income/actions';
import { AddAppIncomeDialog } from './add-app-income-dialog';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Badge } from '../ui/badge';
import { App } from '@/app/(dashboard)/apps/data';

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

interface ColumnsProps {
    apps: App[];
}

export const columns: ColumnDef<AppIncome>[] = [
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
      <div className="flex items-center gap-3">
        <Image
          src={row.original.appIcon}
          alt={row.original.appName}
          width={32}
          height={32}
          className="rounded-md"
          data-ai-hint="app icon"
        />
        <span className="font-medium">{row.original.appName}</span>
      </div>
    ),
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
    }
  },
  {
    accessorKey: 'category',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Category
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <Badge variant="outline">{row.getValue('category')}</Badge>,
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
    }
  },
  {
    id: 'period',
    header: 'Period',
    cell: ({ row }) => {
        const monthIndex = (row.original.month || 0) - 1;
        return <div>{months[monthIndex]} {row.original.year}</div>
    },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end">
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const currency = row.original.currency;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const income = row.original;
      const [isDeleting, startDeleteTransition] = useTransition();
      const { toast } = useToast();
      const apps = (table.options.meta as any)?.apps as App[] || [];

      const handleDelete = () => {
        startDeleteTransition(async () => {
          const result = await deleteAppIncome(income.id);
          if (result.error) {
            toast({
              title: "Error Deleting Income",
              description: result.error,
              variant: "destructive",
            });
          } else {
            toast({ title: "Income Deleted", description: "The income record has been deleted." });
          }
        });
      };

      return (
        <div className="text-right">
            <AddAppIncomeDialog isEditMode={true} income={income} apps={apps}>
                 <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Income</span>
                </Button>
            </AddAppIncomeDialog>
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                <span className="sr-only">Delete Income</span>
            </Button>
        </div>
      );
    },
  },
];
