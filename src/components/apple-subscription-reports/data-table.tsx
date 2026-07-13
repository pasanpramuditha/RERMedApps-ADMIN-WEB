
'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
  type SortingState,
  type VisibilityState,
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
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: React.Dispatch<React.SetStateAction<VisibilityState>>;
}

export function SubscriptionDataTable<TData, TValue>({
  columns,
  data,
  columnVisibility,
  onColumnVisibilityChange
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const totalRows = tableSafeLength(data);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onColumnVisibilityChange,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pagination = table.getState().pagination;
  const pageCount = table.getPageCount();
  const currentPageRows = table.getRowModel().rows.length;
  const pageStart = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const pageEnd = totalRows === 0 ? 0 : pageStart + currentPageRows - 1;

  return (
    <div className="space-y-4">
        <ScrollArea className="h-96 w-full rounded-md border">
            <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                    ))}
                </TableRow>
                ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="whitespace-nowrap max-w-xs truncate">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    ))}
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </ScrollArea>
        <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
            <div>
                Showing {pageStart.toLocaleString()}-{pageEnd.toLocaleString()} of {totalRows.toLocaleString()} record(s)
            </div>
            <div className="flex items-center gap-4">
                <span className="text-foreground">
                    Page {pageCount === 0 ? 0 : pagination.pageIndex + 1} of {pageCount}
                </span>
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
    </div>
  );
}

function tableSafeLength<TData>(rows: TData[]) {
  return Array.isArray(rows) ? rows.length : 0;
}
