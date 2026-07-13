

'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { User } from './data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, UserX, UserCheck, Pencil, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateUserStatus } from './actions';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EditUserDialog } from '@/components/user-control/edit-user-dialog';
import { useAuth } from '@/hooks/use-auth';
import { PermissionsDialog } from '@/components/user-control/permissions-dialog';

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
            <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} data-ai-hint="user avatar" />
                <AvatarFallback className="bg-blue-500/[0.12] text-blue-100">{initial}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="font-medium text-foreground">{`${user.firstName} ${user.lastName}`}</span>
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
      return (
        <Badge
          variant="outline"
          className={status === 'Active'
            ? 'border-emerald-400/25 bg-emerald-500/[0.10] text-emerald-100'
            : 'border-rose-400/25 bg-rose-500/[0.10] text-rose-100'}
        >
          {status}
        </Badge>
      );
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
              <Button variant="ghost" className="h-8 w-8 rounded-lg p-0 hover:bg-white/[0.06]" disabled={isPending}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <EditUserDialog user={user}>
                <button className="relative flex w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit User
                </button>
              </EditUserDialog>
              <PermissionsDialog user={user}>
                 <button className="relative flex w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Permissions
                </button>
              </PermissionsDialog>
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
