
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
import { Search, Smartphone } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading: boolean;
}

export function IosAppsDataTable<TData, TValue>({
  columns,
  data,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">iOS Apps</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isLoading ? 'Loading app registry...' : `${data.length} app(s) available for iOS settings`}
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by app name..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn('name')?.setFilterValue(event.target.value)
            }
            className="h-10 border-white/10 bg-background/60 pl-9"
          />
        </div>
      </div>
      <div className="min-w-0">
        <Table className="min-w-[820px] table-fixed">
          <colgroup>
            <col className="w-[26%]" />
            <col className="w-[26%]" />
            <col className="w-[24%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-white/10 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  {columns.map((column, j) => (
                    <TableCell key={j} className="py-4">
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-white/10 hover:bg-white/[0.03]">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-44 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">No iOS apps found</div>
                      <p className="mt-1 text-xs">Check the Apps registry and make sure the platform contains iOS.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-white/10 p-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
