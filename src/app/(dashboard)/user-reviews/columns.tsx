'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Review } from './data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Star, Trash2, MessageSquare } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );
};


export const columns: ColumnDef<Review>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'authorName',
    header: 'Author',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
            <AvatarFallback>{row.original.authorName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
            <span className="font-medium">{row.original.authorName}</span>
            <span className="text-xs text-muted-foreground">v{row.original.appVersion}</span>
        </div>
      </div>
    ),
  },
   {
    accessorKey: 'rating',
    header: ({ column }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
            Rating
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
    cell: ({ row }) => <StarRating rating={row.original.rating} />,
  },
  {
    accessorKey: 'text',
    header: 'Review',
    cell: ({ row }) => (
        <div className="max-w-md truncate" title={row.original.text}>{row.original.text}</div>
    )
  },
   {
    accessorKey: 'lastModified',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
     cell: ({ row }) => {
        const date = new Date(row.original.lastModified);
        return <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
     },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const review = row.original;

      return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert(`Replying to review ${review.id}`)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Reply
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => alert(`Deleting review ${review.id}`)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      );
    },
  },
];
