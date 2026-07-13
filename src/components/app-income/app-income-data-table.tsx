
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
import { App } from '@/app/(dashboard)/apps/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DataTablePagination } from '../data-table-pagination';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  apps: App[];
}

export function AppIncomeDataTable<TData, TValue>({
  columns,
  data,
  apps
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center gap-2">
        <Select
            value={(table.getColumn('appName')?.getFilterValue() as string) ?? 'all'}
            onValueChange={(value) => table.getColumn('appName')?.setFilterValue(value === 'all' ? undefined : value)}
        >
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by app..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Apps</SelectItem>
                {apps.map(app => (
                    <SelectItem key={app.id} value={app.name}>{app.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Select
            value={(table.getColumn('category')?.getFilterValue() as string) ?? 'all'}
            onValueChange={(value) => table.getColumn('category')?.setFilterValue(value === 'all' ? undefined : value)}
        >
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="IAP">In-App Purchase</SelectItem>
                <SelectItem value="AdMob">AdMob</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  className="h-24 text-center"
                >
                  No income records found.
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
