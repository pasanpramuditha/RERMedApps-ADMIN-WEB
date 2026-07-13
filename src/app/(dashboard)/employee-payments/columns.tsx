
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Paperclip, Trash2, Pencil } from 'lucide-react';
import type { EmployeePayment } from './data';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { deleteEmployeePayment } from './actions';
import { AddEmployeePaymentDialog } from '@/components/employee-payments/add-employee-payment-dialog';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<EmployeePayment>[] = [
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
    accessorKey: 'employeeName',
    header: 'Employee Name',
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.remarks}>
            {row.original.remarks}
        </div>
    )
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
    accessorKey: 'transactionType',
    header: 'Transaction Type',
    cell: ({ row }) => {
      const type = row.original.transactionType;
      if (!type) return null;
      return <Badge variant="outline">{type}</Badge>;
    }
  },
  {
    accessorKey: 'paymentSlipUrl',
    header: 'Payment Slip',
    cell: ({ row }) => {
      const url = row.getValue('paymentSlipUrl') as string | undefined;
      if (!url) return <div className="text-center">-</div>;
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
      const payment = row.original;
      const [isDeleting, startDeleteTransition] = useTransition();
      const { toast } = useToast();
      const { onAction } = table.options.meta as { onAction: () => void; };

      const handleDelete = () => {
        startDeleteTransition(async () => {
          const result = await deleteEmployeePayment(payment.id);
          if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          } else {
            toast({ title: "Success", description: "Payment record deleted." });
            onAction();
          }
        });
      };

      return (
        <div className="text-right">
            <AddEmployeePaymentDialog isEditMode={true} paymentToEdit={payment} onSave={onAction}>
                <Button variant="ghost" size="icon" disabled={isDeleting}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Payment</span>
                </Button>
            </AddEmployeePaymentDialog>
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                <span className="sr-only">Delete Payment</span>
            </Button>
        </div>
      );
    },
  },
];
