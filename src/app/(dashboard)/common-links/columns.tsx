
'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Link as LinkIcon, Trash2, Pencil } from 'lucide-react';
import type { CommonLink } from './data';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { deleteCommonLink } from './actions';
import { AddLinkDialog } from '@/components/common-links/add-link-dialog';
import { useAuth } from '@/hooks/use-auth';

interface ColumnsProps {
    onAction: () => void;
}

function ActionsCell({ link, onAction }: { link: CommonLink; onAction: () => void }) {
  const [isDeleting, startDeleteTransition] = React.useTransition();
  const { toast } = useToast();
  const { getToken } = useAuth();

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const idToken = await getToken();
      const result = await deleteCommonLink(link.id, idToken);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Link deleted." });
        onAction();
      }
    });
  };

  return (
    <div className="text-right">
        <AddLinkDialog isEditMode={true} linkToEdit={link} onSave={onAction}>
            <Button variant="ghost" size="icon" className="rounded-lg hover:bg-white/[0.06]" disabled={isDeleting}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Link</span>
            </Button>
        </AddLinkDialog>
        <Button variant="ghost" size="icon" className="rounded-lg text-rose-300 hover:bg-rose-500/[0.10] hover:text-rose-100" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
            <span className="sr-only">Delete Link</span>
        </Button>
    </div>
  );
}

export const columns = ({ onAction }: ColumnsProps): ColumnDef<CommonLink>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button variant="ghost" className="px-2" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium text-foreground">{row.original.name}</div>
    ),
  },
  {
    accessorKey: 'link',
    header: 'Link',
    cell: ({ row }) => {
        const link = row.original.link;
        return (
            <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline" title={link}>
                <span className="max-w-md truncate rounded-full border border-sky-400/15 bg-sky-500/[0.08] px-2.5 py-1 text-xs text-sky-100">{link}</span>
                <LinkIcon className="h-4 w-4 shrink-0 text-sky-300" />
            </a>
        );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => <ActionsCell link={row.original} onAction={onAction} />,
  },
];
