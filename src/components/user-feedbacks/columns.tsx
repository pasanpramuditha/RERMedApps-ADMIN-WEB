
'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Feedback } from '@/app/(dashboard)/user-feedbacks/data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal, Reply, Archive, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReplyDialog } from '@/components/user-feedbacks/reply-dialog';
import { useToast } from '@/hooks/use-toast';
import { updateFeedbackStatus } from '@/app/(dashboard)/user-feedbacks/actions';
import { Spinner } from '@/components/ui/spinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const languageFlags: Record<string, string> = {
  EN: '🇺🇸',
  ES: '🇪🇸',
  PT: '🇵🇹',
  FR: '🇫🇷',
  RU: '🇷🇺',
  DE: '🇩🇪',
  ZH: '🇨🇳',
  KO: '🇰🇷',
  JA: '🇯🇵',
  ID: '🇮🇩',
  IT: '🇮🇹',
  TR: '🇹🇷',
  VI: '🇻🇳',
  TH: '🇹🇭',
};

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M12 2a3 3 0 0 0-3 3c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.66-1.34-3-3-3Z"/></svg>
);

const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12" y1="18" y2="18"/></svg>
);


const ActionsCell = ({ row }: { row: { original: Feedback } }) => {
    const feedback = row.original;
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const [isReplyDialogOpen, setIsReplyDialogOpen] = React.useState(false);

    const handleAction = (tag: 'SET_FEEDBACK_ARCHIVED' | 'DELETE_FEEDBACK') => {
        startTransition(async () => {
            const result = await updateFeedbackStatus(feedback.id, feedback.appId, tag);
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "Success", description: `Feedback has been ${tag === 'SET_FEEDBACK_ARCHIVED' ? 'archived' : 'deleted'}.` });
            }
        });
    };

    return (
        <>
            <ReplyDialog feedback={feedback} isOpen={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen} />
            <AlertDialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isPending}>
                        <span className="sr-only">Open menu</span>
                        {isPending ? <Spinner size="small" /> :<MoreHorizontal className="h-4 w-4" />}
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setIsReplyDialogOpen(true)}>
                            <Reply className="mr-2 h-4 w-4" />
                            Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('SET_FEEDBACK_ARCHIVED')} disabled={isPending}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()} disabled={isPending}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the feedback from &quot;{feedback.email}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('DELETE_FEEDBACK')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


export const columns: ColumnDef<Feedback>[] = [
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
    accessorKey: 'appName',
    header: 'App',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Image
          src={row.original.appIcon}
          alt={row.original.appName}
          width={32}
          height={32}
          className="rounded-md"
          data-ai-hint="app icon"
        />
        <div className="flex flex-col max-w-[150px] truncate">
            <span className="font-medium text-sm truncate">{row.original.appName}</span>
            <span className="text-xs text-muted-foreground">v{row.original.appVersion}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'dateTime',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date & Time
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
     cell: ({ row }) => (
      <div className="text-xs">{row.original.dateTime}</div>
    ),
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ row }) => {
      const platform = row.getValue('platform') as string;
      return (
        <div className="flex items-center justify-center">
          {platform === 'iOS' ? <AppleIcon className="w-5 h-5" /> : platform === 'Android' ? <AndroidIcon className="w-5 h-5" /> : 'N/A'}
        </div>
      );
    },
  },
  {
    accessorKey: 'languageCode',
    header: 'Language',
    cell: ({ row }) => {
      const lang = String(row.original.languageCode || 'N/A').toUpperCase();
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-base leading-none">{languageFlags[lang] || '🏳️'}</span>
          <span>{lang}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    filterFn: 'includesString'
  },
  {
    accessorKey: 'feedback',
    header: 'Feedback',
    cell: ({ row }) => (
        <div className="max-w-xs truncate">{row.original.feedback}</div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant = {
        Pending: 'default',
        Replied: 'secondary',
        Archived: 'outline',
        Resolved: 'outline',
      }[status] as "default" | "secondary" | "outline" | null;
      
      if (!variant) return null;

      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ActionsCell,
  },
];
