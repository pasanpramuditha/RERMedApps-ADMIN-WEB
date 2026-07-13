
'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
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
import { Badge } from '@/components/ui/badge';
import type { BankTransaction, BankStatementUpload } from '@/app/(dashboard)/bank-statements/data';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';
import { Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type Tag = 'Business' | 'Personal' | 'Unknown';

const columns: ColumnDef<BankTransaction>[] = [
    {
        accessorKey: 'postedDate',
        header: 'Date',
        cell: ({ row }) => {
            const dateStr = row.original.postedDate;
            return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
        }
    },
    {
        accessorKey: 'name',
        header: 'Description',
        cell: ({ row }) => (
            <div className="flex flex-col">
                <span className="font-medium max-w-sm truncate">{row.original.name}</span>
                <span className="text-xs text-muted-foreground">{row.original.memo}</span>
            </div>
        )
    },
     {
        accessorKey: 'tag',
        header: 'Tag',
        cell: ({ row, table }) => {
            const transaction = row.original;
            const { updateTag } = table.options.meta as { updateTag: (fitId: string, newTag: Tag) => void };

            if (transaction.isDuplicate) {
                return <Badge variant="secondary">Duplicate</Badge>;
            }

            if (!transaction.tag) return <div className="text-xs text-muted-foreground">Categorizing...</div>;

            return (
                <Select
                    value={transaction.tag}
                    onValueChange={(newTag: Tag) => {
                        updateTag(transaction.fitId, newTag);
                    }}
                >
                    <SelectTrigger className="w-36 h-8">
                        <SelectValue>
                           <Badge variant={transaction.tag === 'Business' ? 'default' : (transaction.tag === 'Personal' ? 'secondary' : 'outline')}>
                                <Wand2 className="w-3 h-3 mr-1" />
                                {transaction.tag}
                            </Badge>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Business">Business</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                    </SelectContent>
                </Select>
            );
        }
    },
    {
        accessorKey: 'transactionType',
        header: 'Type',
        cell: ({ row }) => {
            const type = row.original.transactionType;
            const isDebit = type === 'DEBIT';
            return <Badge variant={isDebit ? "destructive" : "default"} className={cn(isDebit ? "bg-red-500/10 text-red-700" : "bg-green-500/10 text-green-700")}>{type}</Badge>
        }
    },
    {
        accessorKey: 'amount',
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => {
            const amount = row.original.amount;
            const currency = row.original.currency;
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
            }).format(amount);
            return <div className={cn("text-right font-mono", amount < 0 ? "text-destructive" : "text-green-600")}>{formatted}</div>;
        }
    }
];

interface BankStatementTableProps {
  transactions: BankTransaction[];
  setParsedData: React.Dispatch<React.SetStateAction<BankStatementUpload | null>>;
}

export function BankStatementTable({ transactions, setParsedData }: BankStatementTableProps) {
  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
        updateTag: (fitId: string, newTag: Tag) => {
            setParsedData(currentData => {
                if (!currentData) return null;
                const newTransactions = currentData.transactions.map(t =>
                    t.fitId === fitId ? { ...t, tag: newTag } : t
                );
                return { ...currentData, transactions: newTransactions };
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
