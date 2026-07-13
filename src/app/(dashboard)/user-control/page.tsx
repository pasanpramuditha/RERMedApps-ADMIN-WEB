
import { format } from 'date-fns';
import { AddUserDialog } from '@/components/user-control/add-user-dialog';
import { ManagementHelpDialog } from '@/components/dashboard/management-help-dialog';
import { UsersDataTable } from '@/components/user-control/users-data-table';
import { columns } from './columns';
import { listAllUsers, getUserNavVisibility } from './actions';
import type { User } from './data';
import { ShieldCheck, UserCheck, UserCog, Users, UserX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UserControlPage() {
  const usersResult = await listAllUsers();

  const formattedUsers: User[] = await Promise.all(usersResult.map(async (user) => {
      const navVisibility = await getUserNavVisibility(user.uid);
      return {
        id: user.uid,
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ')[1] || '',
        email: user.email || '',
        mobile: user.phoneNumber || '',
        avatarUrl: user.photoURL || `https://placehold.co/40x40.png`,
        createdDate: user.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'yyyy-MM-dd') : 'N/A',
        lastLogin: user.metadata.lastSignInTime ? format(new Date(user.metadata.lastSignInTime), 'yyyy-MM-dd HH:mm') : 'N/A',
        status: user.disabled ? 'Disabled' : 'Active',
        navigation_visibility_json: navVisibility,
      };
  }));
  const activeCount = formattedUsers.filter((user) => user.status === 'Active').length;
  const disabledCount = formattedUsers.length - activeCount;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.12] to-transparent" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-violet-400/25 bg-violet-500/[0.15] text-violet-100">
              <UserCog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Access Control
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">User Control</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Manage dashboard users, profile details, account status, and navigation permissions.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Users className="h-3.5 w-3.5" />
                  {formattedUsers.length} total users
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.10] px-2.5 py-1 text-emerald-100">
                  <UserCheck className="h-3.5 w-3.5" />
                  {activeCount} active
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/[0.10] px-2.5 py-1 text-rose-100">
                  <UserX className="h-3.5 w-3.5" />
                  {disabledCount} disabled
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.10] px-2.5 py-1 text-blue-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Permissions managed
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <ManagementHelpDialog page="user-control" />
            <AddUserDialog />
          </div>
        </div>
      </div>
      <UsersDataTable columns={columns} data={formattedUsers} />
    </div>
  );
}
