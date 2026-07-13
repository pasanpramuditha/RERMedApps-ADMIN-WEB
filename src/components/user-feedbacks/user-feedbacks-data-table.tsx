
'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '../ui/skeleton';
import { DataTablePagination } from '../data-table-pagination';
import { MessageSquareText, Search } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading: boolean;
  initialGlobalFilter?: string;
}

export function UserFeedbacksDataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  initialGlobalFilter = '',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');

  React.useEffect(() => {
    setGlobalFilter(initialGlobalFilter);
  }, [initialGlobalFilter]);

  const table = useReactTable({
    data,
    columns,
    autoResetPageIndex: false,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-card/75 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by email, app, or feedback..."
            value={globalFilter}
            onChange={(event) =>
              setGlobalFilter(event.target.value)
            }
            className="h-10 rounded-xl border-white/10 bg-background/60 pl-9"
          />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-muted-foreground">
          <MessageSquareText className="h-4 w-4" />
          {table.getFilteredRowModel().rows.length} feedback(s)
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-white/10 bg-white/[0.025] hover:bg-white/[0.025]">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-12 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
               [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  {columns.map((column, j) => (
                    <TableCell key={j} className="py-4">
                      <Skeleton className="h-9 w-full rounded-xl bg-white/[0.08]" />
                    </TableCell>
                  ))}
                </TableRow>
               ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-white/10 transition-colors hover:bg-white/[0.035]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquareText className="h-5 w-5" />
                    <span>No feedback found.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
