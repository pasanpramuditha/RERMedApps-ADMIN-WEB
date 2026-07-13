
'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { Feedback } from './data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Archive, CalendarClock, Languages, MoreHorizontal, Reply, Trash2, MonitorSmartphone, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReplyDialog } from '@/components/user-feedbacks/reply-dialog';
import { useToast } from '@/hooks/use-toast';
import { updateFeedbackStatus } from './actions';
import { Spinner } from '@/components/ui/spinner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
                window.dispatchEvent(new Event('user-feedbacks:refresh'));
            }
        });
    };

    return (
        <>
            <ReplyDialog feedback={feedback} isOpen={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen} />
            <AlertDialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 rounded-lg p-0 hover:bg-white/[0.06]" disabled={isPending}>
                        <span className="sr-only">Open menu</span>
                        {isPending ? <Spinner size="small" /> :<MoreHorizontal className="h-4 w-4" />}
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 rounded-xl border-white/10 bg-popover/95 p-1">
                        <DropdownMenuLabel className="px-2 text-xs text-muted-foreground">Feedback Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setIsReplyDialogOpen(true)} className="rounded-lg">
                            <Reply className="mr-2 h-4 w-4" />
                            Reply
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction('SET_FEEDBACK_ARCHIVED')} disabled={isPending} className="rounded-lg">
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                        </DropdownMenuItem>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="rounded-lg text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()} disabled={isPending}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent className="overflow-hidden rounded-2xl border-white/10 p-0 sm:max-w-lg">
                    <div className="border-b border-white/10 bg-rose-500/[0.08] px-6 py-5">
                    <AlertDialogHeader>
                        <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl border border-rose-400/25 bg-rose-500/[0.15] text-rose-100">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <AlertDialogTitle>Delete feedback?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            This will permanently delete the feedback from &quot;{feedback.email}&quot;. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    </div>
                    <AlertDialogFooter className="px-6 py-4">
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction('DELETE_FEEDBACK')} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
    accessorKey: 'appName',
    header: 'App',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          <Image
            src={row.original.appIcon}
            alt={row.original.appName}
            width={32}
            height={32}
            className="rounded-lg"
            data-ai-hint="app icon"
          />
        </div>
        <div className="flex max-w-[180px] flex-col truncate">
            <span className="truncate text-sm font-medium text-foreground">{row.original.appName}</span>
            <span className="truncate text-xs text-muted-foreground">v{row.original.appVersion || 'N/A'}</span>
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
        className="h-8 rounded-lg px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-white/[0.06]"
      >
        Date & Time
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
     cell: ({ row }) => (
      <div className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {row.original.dateTime}
      </div>
    ),
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    cell: ({ row }) => {
      const platform = row.getValue('platform') as string;
      const isIos = platform === 'iOS';
      const isAndroid = platform === 'Android';
      const badgeClassName = isIos
        ? 'border-sky-500/40 bg-sky-500/10 text-sky-200'
        : isAndroid
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
          : 'border-muted-foreground/30 text-muted-foreground';

      return (
        <Badge variant="outline" className={`h-8 rounded-full px-2.5 gap-1.5 whitespace-nowrap ${badgeClassName}`}>
          {isIos ? <Smartphone className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />}
          {isIos ? 'iOS' : isAndroid ? 'Android' : 'Unknown'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'languageCode',
    header: 'Language',
    cell: ({ row }) => {
      const lang = String(row.original.languageCode || 'N/A').toUpperCase();
      return (
        <Badge variant="outline" className="h-8 gap-1.5 rounded-full border-white/10 bg-white/[0.04] px-2.5 text-muted-foreground">
          <Languages className="h-3.5 w-3.5" />
          {lang}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <div className="max-w-[220px] truncate text-sm text-muted-foreground">{row.original.email}</div>
    ),
    filterFn: 'includesString'
  },
  {
    accessorKey: 'feedback',
    header: 'Feedback',
    cell: ({ row }) => (
        <div className="max-w-sm truncate text-sm text-foreground/90">{row.original.feedback}</div>
    )
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const className = {
        Pending: 'border-amber-400/30 bg-amber-500/[0.12] text-amber-100',
        Replied: 'border-blue-400/30 bg-blue-500/[0.12] text-blue-100',
        Archived: 'border-white/10 bg-white/[0.04] text-muted-foreground',
        Resolved: 'border-emerald-400/30 bg-emerald-500/[0.12] text-emerald-100',
      }[status];

      if (!className) return null;

      return <Badge variant="outline" className={`h-8 rounded-full px-2.5 ${className}`}>{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ActionsCell,
  },
];
