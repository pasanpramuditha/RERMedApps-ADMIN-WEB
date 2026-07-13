'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Trash2, Paperclip, Pencil } from 'lucide-react';
import type { Expense } from './data';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteExpense } from './actions';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { AddExpenseDialog } from '@/components/expenses-tracker/add-expense-dialog';

type DisplayExpense = Expense;

export const columns: ColumnDef<DisplayExpense>[] = [
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
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Expense Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as string;
      const variant = category === 'Recurring' ? 'secondary' : 'outline';
      return <Badge variant={variant}>{category}</Badge>;
    },
  },
  {
    accessorKey: 'date',
    header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full justify-end"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = Number(row.getValue('amount'));
      
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: row.original.currency || 'USD',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'attachmentUrl',
    header: 'Attachment',
    cell: ({ row }) => {
      const url = row.getValue('attachmentUrl') as string | undefined;
      if (!url) return null;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex justify-center">
            <Paperclip className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </a>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const expense = row.original;
      const [isDeleting, startDeleteTransition] = useTransition();
      const { toast } = useToast();

      const handleDelete = () => {
        startDeleteTransition(async () => {
          const result = await deleteExpense(expense.id);
          if (result.error) {
            toast({
              title: 'Error',
              description: result.error,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Success',
              description: `Expense "${expense.name}" deleted successfully.`,
            });
          }
        });
      };

      return (
        <div className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
                    <span className="sr-only">Open menu</span>
                    {isDeleting ? <Spinner size="small" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <AddExpenseDialog isEditMode={true} expenseToEdit={expense}>
                    <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                       <Pencil className="mr-2 h-4 w-4" />
                       Edit
                    </button>
                  </AddExpenseDialog>
                  <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                  >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      );
    },
  },
];
