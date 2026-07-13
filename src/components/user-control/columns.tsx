
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '@/app/(dashboard)/user-control/data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, UserX, UserCheck, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateUserStatus } from '@/app/(dashboard)/user-control/actions';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EditUserDialog } from '@/components/user-control/edit-user-dialog';
import { useAuth } from '@/hooks/use-auth';

export const columns: ColumnDef<User>[] = [
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
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const user = row.original;
      const initial = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
      return (
        <div className="flex items-center gap-3">
            <Avatar>
                <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} data-ai-hint="user avatar" />
                <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="font-medium">{`${user.firstName} ${user.lastName}`}</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'createdDate',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Created Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'lastLogin',
    header: ({ column }) => (
        <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
            Last Login
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant = status === 'Active' ? 'default' : 'secondary';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;
      const [isPending, startTransition] = useTransition();
      const { toast } = useToast();
      const { getToken } = useAuth();

      const handleStatusChange = (disabled: boolean) => {
        startTransition(async () => {
          const idToken = await getToken();
          const result = await updateUserStatus(user.id, disabled, idToken || undefined);
          if (result.error) {
            toast({
              title: 'Error',
              description: result.error,
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Success',
              description: `User ${disabled ? 'disabled' : 'enabled'} successfully.`,
            });
          }
        });
      };

      return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <EditUserDialog user={user}>
                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit User
                </button>
              </EditUserDialog>
              <DropdownMenuSeparator />
              {user.status === 'Active' ? (
                <DropdownMenuItem onClick={() => handleStatusChange(true)} disabled={isPending}>
                    <UserX className="mr-2 h-4 w-4" />
                    Disable User
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleStatusChange(false)} disabled={isPending}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Enable User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
      );
    },
  },
];
