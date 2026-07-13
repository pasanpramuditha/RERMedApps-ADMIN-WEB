
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import type { CashAccount } from '@/app/(dashboard)/wealth-tracker/data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { AddCashAccountDialog } from './add-cash-account-dialog';

interface CashAccountColumnsProps {
  onDelete: (id: string) => Promise<void>;
  onEdit: () => void;
}

export const cashAccountColumns = ({ onDelete, onEdit }: CashAccountColumnsProps): ColumnDef<CashAccount>[] => [
  {
    accessorKey: 'bankName',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Bank Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue('bankName')}</div>,
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end">
          Balance (LKR)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('balance'));
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
      }).format(amount);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const account = row.original;
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
                  <AddCashAccountDialog isEditMode={true} account={account} onSave={onEdit}>
                    <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                       <Pencil className="mr-2 h-4 w-4" />
                       Edit
                    </button>
                  </AddCashAccountDialog>
                  <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => startDeleteTransition(() => onDelete(account.id))}
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
