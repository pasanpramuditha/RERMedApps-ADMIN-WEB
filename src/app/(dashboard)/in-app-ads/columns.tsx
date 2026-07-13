

'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { InAppAd } from './data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlayCircle, Eye, Trash2, Pencil, Rocket, Undo, PauseCircle, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTransition } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { deleteInAppAd, activateInAppAd, revertAdToDevelopment, publishInAppAdToProduction, stopInAppAd, pauseInAppAd, resumeInAppAd } from './actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AdPreviewDialog } from '@/components/in-app-ads/ad-preview-dialog';
import Link from 'next/link';
import { EditActiveAdDialog } from '@/components/in-app-ads/edit-active-ad-dialog';


const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M12 2a3 3 0 0 0-3 3c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.66-1.34-3-3-3Z"/></svg>
);

const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12" y1="18" y2="18"/></svg>
);


const ActionsCell = ({ row, table }: { row: { original: InAppAd }, table: any }) => {
    const ad = row.original;
    const { toast } = useToast();
    const [isPending, startTransition] = React.useTransition();
    const [isReplyDialogOpen, setIsReplyDialogOpen] = React.useState(false);
    const { setLastApiResponse, refreshData } = table.options.meta;

    const handleActivate = () => {
        startTransition(async () => {
            const result = await activateInAppAd(ad.id);
            if (result.error) {
                toast({ title: "Activation Error", description: result.error, variant: "destructive" });
                setLastApiResponse({ error: result.error });
            } else {
                toast({ title: "Success", description: `Ad has been activated for testing.` });
                setLastApiResponse(result.apiResponse);
                refreshData();
            }
        });
    };
    
    const handlePublishToProduction = () => {
        startTransition(async () => {
            const result = await publishInAppAdToProduction(ad.id);
            if (result.error) {
                toast({ title: "Publish Error", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "Success", description: "Ad has been published to production." });
                refreshData();
            }
        });
    };

    const handleRevertToDevelopment = () => {
        startTransition(async () => {
            const result = await revertAdToDevelopment(ad);
             if (result.error) {
                toast({ title: "Revert Error", description: result.error, variant: "destructive" });
                setLastApiResponse({ error: result.error });
            } else {
                toast({ title: "Success", description: `Ad has been reverted to 'Pending' status.` });
                setLastApiResponse(result.apiResponse);
                refreshData();
            }
        });
    };
    
    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteInAppAd(ad);
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "Success", description: `Ad has been deleted.` });
                refreshData();
            }
        });
    };
    
    const handlePauseOrResume = () => {
        startTransition(async () => {
            let result;
            if (ad.status === 'Paused') {
                result = await resumeInAppAd(ad);
            } else {
                result = await pauseInAppAd(ad);
            }

            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "Success", description: `Ad has been ${ad.status === 'Paused' ? 'resumed' : 'paused'}.` });
                refreshData();
            }
        });
    };
    
    const handleStop = () => {
        startTransition(async () => {
            const result = await stopInAppAd(ad);
            if (result.error) {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            } else {
                toast({ title: "Success", description: "Ad has been stopped and archived." });
                refreshData();
            }
        });
    };

    return (
        <>
            <AdPreviewDialog ad={ad} isOpen={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen} />
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
                        
                        {ad.status === 'Active' ? (
                            <EditActiveAdDialog ad={ad} onSave={refreshData}>
                                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </button>
                            </EditActiveAdDialog>
                         ) : (ad.status === 'Paused' || ad.status === 'Pending') && (
                            <DropdownMenuItem asChild>
                                <Link href={`/in-app-ads/${ad.id}/edit`}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                </Link>
                            </DropdownMenuItem>
                         )}
                         
                         <DropdownMenuItem onSelect={() => setIsReplyDialogOpen(true)}>
                            <Eye className="mr-2 h-4 w-4" /> Preview
                        </DropdownMenuItem>

                        {ad.status === 'Pending' && (
                            <DropdownMenuItem onClick={handleActivate} disabled={isPending}>
                                <PlayCircle className="mr-2 h-4 w-4" /> Publish for Testing
                            </DropdownMenuItem>
                        )}

                        {ad.status === 'Internal Testing' && (
                            <>
                                <DropdownMenuItem onClick={handlePublishToProduction} disabled={isPending}>
                                    <Rocket className="mr-2 h-4 w-4" /> Publish to Production
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleRevertToDevelopment} disabled={isPending}>
                                    <Undo className="mr-2 h-4 w-4" /> Revert to Development
                                </DropdownMenuItem>
                            </>
                        )}
                        
                        {(ad.status === 'Active' || ad.status === 'Paused') && (
                           <>
                             <DropdownMenuItem onClick={handlePauseOrResume} disabled={isPending}>
                                {ad.status === 'Paused' ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                                {ad.status === 'Paused' ? 'Resume' : 'Pause'}
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()} disabled={isPending}>
                                    <StopCircle className="mr-2 h-4 w-4" /> Stop
                                </DropdownMenuItem>
                             </AlertDialogTrigger>
                           </>
                        )}
                        
                        {(ad.status === 'Archived' || ad.status === 'Pending' || ad.status === 'Expired' || ad.status === 'Internal Testing') && (
                            <>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()} disabled={isPending}>
                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                           This action cannot be undone. This will permanently {ad.status === 'Active' || ad.status === 'Paused' ? 'stop and archive' : 'delete'} this ad campaign.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={ad.status === 'Active' || ad.status === 'Paused' ? handleStop : handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export const columns: ColumnDef<InAppAd>[] = [
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
            <div className="flex flex-col">
                <span className="font-medium">{row.original.appName}</span>
                 <div className="flex items-center justify-start">
                    {row.original.platform === 'iOS' ? <AppleIcon className="w-4 h-4 text-muted-foreground" /> : <AndroidIcon className="w-4 h-4 text-muted-foreground" />}
                </div>
            </div>
          </div>
        ),
    },
    {
        accessorKey: 'templateName',
        header: 'Template',
    },
    {
        accessorKey: 'startDate',
        header: 'Start Date',
    },
    {
        accessorKey: 'endDate',
        header: 'End Date',
    },
    {
        accessorKey: 'targetGroup',
        header: 'Target Group',
        cell: ({ row }) => <Badge variant="outline">{row.original.targetGroup}</Badge>,
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.original.status;
            let variant: "default" | "secondary" | "outline" | "destructive" = "outline";
            let className = "";
            if (status === 'Active') variant = 'default';
            if (status === 'Paused') variant = 'secondary';
            if (status === 'Pending') variant = 'destructive';
            if (status === 'Expired') variant = 'secondary';
            if (status === 'Internal Testing') {
                variant = 'outline';
                className = "bg-yellow-500/10 text-yellow-700 border-yellow-500/50";
            }

            return <Badge variant={variant} className={className}>{status}</Badge>;
        }
    },
    {
        id: 'actions',
        cell: ActionsCell,
    }
];
