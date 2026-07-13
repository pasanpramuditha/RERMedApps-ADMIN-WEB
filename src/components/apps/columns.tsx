
'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { App, PlatformVersion } from '@/app/(dashboard)/apps/data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { deleteApp } from '@/app/(dashboard)/apps/actions';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Progress } from '../ui/progress';

const ActionsCell = ({ row }: { row: any }) => {
  const app = row.original as App;
  const [isDeleting, startDeleteTransition] = React.useTransition();
  const { toast } = useToast();
  const { getToken } = useAuth();

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const idToken = await getToken();
      const result = await deleteApp(app.id, idToken || undefined);
      if (result.error) {
        toast({
          title: "Error Deleting App",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "App Deleted",
          description: `"${app.name}" has been successfully deleted.`,
        });
      }
    });
  };

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
            <span className="sr-only">Open menu</span>
             {isDeleting ? <Spinner size="small" /> : <MoreHorizontal className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/apps/${app.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the app
            <span className="font-semibold"> {app.name}</span> and remove its data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const PlatformVersionCell = ({ platformData, platformIcon }: { platformData?: PlatformVersion, platformIcon: React.ReactNode }) => {
    if (!platformData || !platformData.current_version) {
        return <div className="text-xs text-muted-foreground">Not set</div>
    }
    return (
        <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
                {platformIcon}
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{platformData.current_version}</span>
                <span className="text-muted-foreground">{platformData.release_date}</span>
            </div>
             <div className="flex items-center gap-2">
                <span className="font-semibold w-16">{platformData.status}</span>
                <Progress value={platformData.rollout || 0} className="w-20" />
                <span className="text-muted-foreground w-8 text-right">{platformData.rollout || 0}%</span>
            </div>
        </div>
    )
}

export const columns: ColumnDef<App>[] = [
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
    header: 'App Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Image
          src={row.original.icon_url}
          alt={row.original.name}
          width={32}
          height={32}
          className="rounded-md"
          data-ai-hint="app icon"
        />
        <div className="flex flex-col">
            <span className="font-medium">{row.original.name}</span>
            <span className="text-xs text-muted-foreground">{row.original.package_name}</span>
        </div>
      </div>
    ),
  },
  {
    id: 'versionInfo',
    header: 'Version Info',
    cell: ({ row, table }) => {
        const app = row.original;
        const { platformIcons } = (table.options.meta as { platformIcons: { apple: string, android: string }});

        return (
            <div className="space-y-2">
                {(app.os === 'Android' || app.os === 'Android & iOS') && (
                    <PlatformVersionCell platformData={app.android} platformIcon={<Image src={platformIcons.android} alt="Android" width={16} height={16} data-ai-hint="android logo" />} />
                )}
                 {(app.os === 'iOS' || app.os === 'Android & iOS') && (
                    <PlatformVersionCell platformData={app.ios} platformIcon={<Image src={platformIcons.apple} alt="iOS" width={16} height={16} data-ai-hint="apple logo" />} />
                )}
            </div>
        )
    }
  },
  {
    accessorKey: 'remark',
    header: 'Remark',
    cell: ({ row }) => <div className="text-sm text-muted-foreground truncate max-w-xs">{row.original.remark}</div>
  },
  {
    accessorKey: 'isActive',
    header: () => <div className="text-center">Status</div>,
    cell: ({ row }) => {
      const isActive = row.getValue('isActive') as boolean;
      return (
        <div className="flex items-center justify-center">
            <Badge variant={isActive ? "default" : "secondary"} className={cn(isActive ? "bg-green-500/20 text-green-700 border-green-500/50" : "bg-gray-500/20 text-gray-700 border-gray-500/50", "border-2")}>
                {isActive ? 'Active' : 'Inactive'}
            </Badge>
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ActionsCell,
  },
];
