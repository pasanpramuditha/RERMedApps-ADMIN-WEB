
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Trash2, Pencil, Paperclip } from 'lucide-react';
import type { OtherIncome } from './data';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { deleteOtherIncome } from './actions';
import { AddOtherIncomeDialog } from '@/components/other-income/add-other-income-dialog';
import { useAuth } from '@/hooks/use-auth';

export const columns: ColumnDef<OtherIncome>[] = [
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'description',
    header: 'Description',
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
    accessorKey: 'convertedAmount',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end">
        Amount (USD)
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.original.convertedAmount;
      if (amount === undefined) return null;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      return <div className="text-right font-medium text-muted-foreground">{formatted}</div>;
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
            <Button variant="ghost" size="icon">
                <Paperclip className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </Button>
        </a>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const income = row.original;
      const [isDeleting, startDeleteTransition] = useTransition();
      const { toast } = useToast();
      const { getToken } = useAuth();
      const { onAction, categories } = table.options.meta as { onAction: () => void; categories: string[] };

      const handleDelete = () => {
        startDeleteTransition(async () => {
          const idToken = await getToken();
          const result = await deleteOtherIncome(income.id, idToken);
          if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          } else {
            toast({ title: "Success", description: "Income record deleted." });
            onAction();
          }
        });
      };

      return (
        <div className="text-right">
            <AddOtherIncomeDialog isEditMode={true} incomeToEdit={income} categories={categories} onSave={onAction}>
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Income</span>
                </Button>
            </AddOtherIncomeDialog>
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                <span className="sr-only">Delete Income</span>
            </Button>
        </div>
      );
    },
  },
];
