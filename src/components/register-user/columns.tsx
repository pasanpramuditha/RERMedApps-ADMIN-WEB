
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { RegisteredUser } from '@/app/(dashboard)/registered-user/data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Pencil } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { EditUserDialog } from './edit-user-dialog';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const languageFlags: Record<string, string> = {
    'EN': '🇺🇸', 'ES': '🇪🇸', 'PT': '🇵🇹', 'FR': '🇫🇷', 'RU': '🇷🇺', 'DE': '🇩🇪',
    'ZH': '🇨🇳', 'KO': '🇰🇷', 'JA': '🇯🇵', 'ID': '🇮🇩', 'IT': '🇮🇹', 'TR': '🇹🇷', 'VI': '🇻🇳'
};

const hasPurchasePremium = (user: RegisteredUser): boolean => Number(user.purchase_count ?? 0) > 0 || user.purchase_premium === true;
const hasRegistrationPremium = (user: RegisteredUser): boolean => Number(user.premium) === 1;

interface ColumnsProps {
  isReturningUser: (user: RegisteredUser) => boolean;
  activeTab: string;
  appInstallCountByEmail?: Map<string, number>;
}

export const columns = ({ isReturningUser, activeTab, appInstallCountByEmail = new Map() }: ColumnsProps): ColumnDef<RegisteredUser>[] => [
  {
    accessorKey: 'appName',
    header: 'App',
    cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <div className="rounded-full border border-white/10 bg-white/[0.04] p-1">
            <Image 
                src={row.original.appIcon}
                alt={row.original.appName}
                width={34}
                height={34}
                className="rounded-full"
                data-ai-hint="app icon"
            />
          </div>
        </div>
    )
  },
  {
    accessorKey: 'email',
    header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        const isToday = activeTab === 'today';
        const userType = user.userType;
        const purchasePremium = hasPurchasePremium(user);
        const registrationPremium = hasRegistrationPremium(user);
        const appCount = appInstallCountByEmail.get(user.email.trim().toLowerCase()) ?? 1;
        
        let avatarBgClass = 'bg-muted';
        let avatarTextClass = 'text-muted-foreground';

        if(isToday) {
            switch(userType) {
                case 'brand_new':
                    avatarTextClass = 'text-white';
                    break;
                case 'existing_no_purchase':
                    avatarTextClass = 'text-yellow-400';
                    break;
                case 'existing_with_purchase':
                    avatarBgClass = 'bg-yellow-400';
                    avatarTextClass = 'text-white';
                    break;
                default:
                    break;
            }
        }
        
        return (
            <div className="flex min-w-0 items-center gap-3">
                <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarFallback className={cn(avatarBgClass, avatarTextClass)} title={user.appName}>
                        {appCount > 99 ? '99+' : appCount}
                    </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold text-white">{user.email}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-white/40">
                        {purchasePremium && (
                            <span className="rounded-full border border-amber-400/35 bg-amber-400/12 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                                Premium
                            </span>
                        )}
                        {registrationPremium && (
                            <span className="rounded-full border border-red-500/35 bg-red-500/12 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-red-200">
                                Force Premium
                            </span>
                        )}
                        <span className="truncate">{user.appName}</span>
                    </span>
                </div>
            </div>
        )
    }
  },
  {
    accessorKey: 'language',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Language
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const lang = row.original.language || 'N/A';
        return (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm">
                <span>{languageFlags[lang] || '🏳️'}</span>
                <span className="font-semibold text-white/85">{lang}</span>
            </div>
        )
    }
  },
  {
    accessorKey: 'registered_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Registered Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const date = row.original.registered_date;
        if (!date) return null;
        try {
            const dateObj = new Date(date);
            return (
                <div>
                    <span className="font-medium text-white">{date}</span>
                    <p className="text-xs text-white/40">
                        {formatDistanceToNow(dateObj, { addSuffix: true })}
                    </p>
                </div>
            );
        } catch (e) {
            return <span>{date}</span>;
        }
    }
  },
  {
    accessorKey: 'last_online',
    header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Last Online
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.original.last_online;
        const returning = isReturningUser(row.original);
        if (!date) return null;
        try {
            const dateObj = new Date(date);
            return (
                <div>
                    <span className="font-medium text-white">{date}</span>
                    <p className="flex items-center gap-1 text-xs text-white/40">
                        {returning && <span title="Returning User">🟢</span>}
                        {formatDistanceToNow(dateObj, { addSuffix: true })}
                    </p>
                </div>
            );
        } catch (e) {
            return <span>{date}</span>;
        }
    }
  },
  {
    accessorKey: 'device',
    header: 'Device',
    cell: ({ row }) => <span className="text-sm font-medium text-white/85">{row.original.device || '-'}</span>,
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => (
      <span className="inline-flex min-w-8 justify-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-white/75">
        {row.original.version || '-'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row, table }) => {
      const user = row.original;
      const { onAction } = table.options.meta as { onAction: () => void; };

      return (
        <EditUserDialog user={user} onSave={onAction}>
          <Button variant="ghost" size="icon" className="rounded-full border border-white/10 bg-white/[0.04] text-white/60 hover:bg-blue-500/10 hover:text-blue-200">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit User</span>
          </Button>
        </EditUserDialog>
      );
    },
  },
];
