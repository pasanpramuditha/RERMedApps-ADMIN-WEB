
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Trash2, Pencil, Paperclip } from 'lucide-react';
import type { OtherExpense } from '@/app/(dashboard)/other-expenses/data';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { deleteOtherExpense } from '@/app/(dashboard)/other-expenses/actions';
import { AddOtherExpenseDialog } from '@/components/other-expenses/add-other-expense-dialog';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

export const columns: ColumnDef<OtherExpense>[] = [
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
    accessorKey: 'subCategory',
    header: 'Sub Category',
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
    accessorKey: 'recurrence',
    header: 'Recurrence',
    cell: ({ row }) => {
        const recurrence = row.original.recurrence;
        let variant: 'default' | 'secondary' | 'outline' = 'outline';
        if (recurrence === 'Monthly') variant = 'secondary';
        if (recurrence === 'Annually') variant = 'default';
        return <Badge variant={variant}>{recurrence}</Badge>
    }
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
      const expense = row.original;
      const [isDeleting, startDeleteTransition] = useTransition();
      const { toast } = useToast();
      const { getToken } = useAuth();
      const { onAction, categories } = table.options.meta as { onAction: () => void; categories: string[] };

      const handleDelete = () => {
        startDeleteTransition(async () => {
          const idToken = await getToken();
          const result = await deleteOtherExpense(expense.id, !expense.isGenerated, idToken || undefined);
          if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          } else {
            toast({ title: "Success", description: "Expense record deleted." });
            onAction();
          }
        });
      };
      
      return (
        <div className="text-right">
            <AddOtherExpenseDialog isEditMode={true} expenseToEdit={expense} categories={categories} onSave={onAction}>
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Expense</span>
                </Button>
            </AddOtherExpenseDialog>
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                <span className="sr-only">Delete Expense</span>
            </Button>
        </div>
      );
    },
  },
];
