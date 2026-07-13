'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import type { AdExpense } from '@/app/(dashboard)/ad-expenses/data';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { deleteAdExpense } from '@/app/(dashboard)/ad-expenses/actions';
import { AddAdExpenseDialog } from './add-ad-expense-dialog';
import { Checkbox } from '../ui/checkbox';

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const columns: ColumnDef<AdExpense>[] = [
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
    accessorKey: 'year',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Year
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue('year')}</div>,
  },
  {
    accessorKey: 'month',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Month
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const monthIndex = row.getValue('month') as number - 1;
        return <div className="font-medium">{months[monthIndex]}</div>
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
    cell: ({ row }) => {
      const expense = row.original;
      const [isDeleting, startDeleteTransition] = useTransition();
      const { toast } = useToast();

      const handleDelete = () => {
        startDeleteTransition(async () => {
          const result = await deleteAdExpense(expense.id);
          if (result.error) {
            toast({
              title: "Error Deleting Expense",
              description: result.error,
              variant: "destructive",
            });
          } else {
            toast({ title: "Expense Deleted", description: "The ad expense has been deleted." });
          }
        });
      };

      return (
        <div className="text-right">
            <AddAdExpenseDialog isEditMode={true} expense={expense}>
                 <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Expense</span>
                </Button>
            </AddAdExpenseDialog>
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                <span className="sr-only">Delete Expense</span>
            </Button>
        </div>
      );
    },
  },
];
