
'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { SavingsTransaction } from '@/app/(dashboard)/savings-account-statement/data';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { ArrowUpDown, Banknote } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Badge } from '../ui/badge';

const debitCategories = ['Business', 'Personal', 'Unknown'];
const creditCategories = ['IOS Income', 'Android Income', 'Admob Income', 'Other'];

type Tag = 'Business' | 'Personal' | 'Unknown' | 'Payout' | 'IOS Income' | 'Android Income' | 'Admob Income' | 'Other';


const columns: ColumnDef<SavingsTransaction>[] = [
    {
        accessorKey: 'transactionDate',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => (
            <div className="font-medium max-w-sm truncate" title={row.original.description}>
                {row.original.description}
            </div>
        )
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const isDuplicate = row.original.isDuplicate;
            if (isDuplicate === undefined) return <div className="text-xs text-muted-foreground">Checking...</div>;
            return <Badge variant={isDuplicate ? "secondary" : "outline"}>{isDuplicate ? 'Duplicate' : 'New'}</Badge>;
        }
    },
    {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row, table }) => {
            const transaction = row.original;
            const { updateCategory } = table.options.meta as { updateCategory: (index: number, category: string) => void };
            const options = transaction.debit ? debitCategories : creditCategories;

            if (transaction.isDuplicate) return null;

            if (transaction.category === 'Payout') {
                return <Badge variant="secondary"><Banknote className="w-3 h-3 mr-1"/>Payout</Badge>
            }

            return (
                 <Select
                    value={transaction.category}
                    onValueChange={(newCategory: Tag) => updateCategory(row.index, newCategory)}
                >
                    <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )
        }
    },
    {
        accessorKey: 'debit',
        header: () => <div className="text-right">Debit</div>,
        cell: ({ row }) => {
            const amount = row.original.debit;
            if (amount === undefined) return null;
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: row.original.currency,
            }).format(amount);
            return <div className="text-right text-destructive font-mono">{formatted}</div>;
        }
    },
    {
        accessorKey: 'credit',
        header: () => <div className="text-right">Credit</div>,
        cell: ({ row }) => {
            const amount = row.original.credit;
             if (amount === undefined) return null;
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: row.original.currency,
            }).format(amount);
            return <div className="text-right text-green-600 font-mono">{formatted}</div>;
        }
    },
    {
        accessorKey: 'runningBalance',
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} className="w-full justify-end">
                Balance
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = row.original.runningBalance;
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: row.original.currency,
            }).format(amount);
            return <div className="text-right font-mono">{formatted}</div>;
        }
    }
];

interface StatementTableProps {
  transactions: SavingsTransaction[];
  setParsedData: React.Dispatch<React.SetStateAction<{ fileName: string; transactions: SavingsTransaction[] } | null>>;
}

export function StatementTable({ transactions, setParsedData }: StatementTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
      { id: 'transactionDate', desc: true }
  ]);
  
  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
        updateCategory: (rowIndex: number, category: string) => {
            setParsedData(prev => {
                if (!prev) return null;
                const newTransactions = [...prev.transactions];
                newTransactions[rowIndex].category = category as Tag;
                return { ...prev, transactions: newTransactions };
            });
        }
    }
  });

  return (
    <div className="space-y-4">
      <ScrollArea className="h-96 w-full rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow key={row.id} className={cn(row.original.isDuplicate && "bg-muted/50 text-muted-foreground opacity-70")}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
       <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
