

'use client';

import * as React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '../ui/skeleton';
import { DataTablePagination } from '../data-table-pagination';
import { Loader2, Users } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading: boolean;
  meta?: any;
}

export function RegisteredUsersDataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  meta,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'registered_date', desc: true }
  ]);

  const table = useReactTable({
    data,
    columns,
    meta,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-1 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="h-4 w-4 text-emerald-300" />
          User Records
        </div>
        <p className="text-sm text-white/45">
          {isLoading
            ? 'Loading user records for the selected period...'
            : `${data.length.toLocaleString()} row(s) loaded for the selected period.`}
        </p>
      </div>
      <div className="p-5">
      {isLoading && (
        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-200">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Loading registered users</div>
              <div className="text-xs leading-5 text-white/50">
                Please wait while records are fetched. This can take longer on a slow connection.
              </div>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06] sm:w-44">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-300/70" />
          </div>
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-white/10 hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-12 whitespace-nowrap text-xs font-bold uppercase tracking-[0.14em] text-white/45">
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
               [...Array(10)].map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  {columns.map((column, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-8 w-full rounded-lg bg-white/[0.06]" />
                    </TableCell>
                  ))}
                </TableRow>
               ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-white/10 transition-colors hover:bg-white/[0.035]">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 text-white/85">
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
                  className="h-32 text-center text-white/45"
                >
                  No users found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!isLoading && (
        <div className="mt-4">
          <DataTablePagination table={table} />
        </div>
      )}
      </div>
    </section>
  );
}
