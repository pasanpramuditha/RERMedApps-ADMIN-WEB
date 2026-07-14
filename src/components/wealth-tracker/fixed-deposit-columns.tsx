
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import type { FixedDeposit } from '@/app/(dashboard)/wealth-tracker/data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { AddFixedDepositDialog } from './add-fixed-deposit-dialog';

interface FixedDepositColumnsProps {
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
}

export const fixedDepositColumns = ({ onDelete, onEdit }: FixedDepositColumnsProps): ColumnDef<FixedDeposit>[] => [
  {
    accessorKey: 'bankName',
    header: 'Bank',
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end px-0">
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const currency = row.original.currency || 'LKR';
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'interestRate',
    header: 'Rate',
    cell: ({ row }) => <div className="text-center">{row.getValue('interestRate')}%</div>,
  },
  {
    accessorKey: 'startDate',
    header: 'Start Date',
  },
  {
    accessorKey: 'endDate',
    header: 'End Date',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const deposit = row.original;
      const [isDeleting, startDeleteTransition] = useTransition();

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
                  <AddFixedDepositDialog isEditMode={true} deposit={deposit} onSave={onEdit}>
                    <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                       <Pencil className="mr-2 h-4 w-4" />
                       Edit
                    </button>
                  </AddFixedDepositDialog>
                  <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => startDeleteTransition(() => onDelete(deposit.id))}
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
