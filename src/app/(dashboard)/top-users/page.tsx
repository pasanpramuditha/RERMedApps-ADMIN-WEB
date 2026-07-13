
import { TopUsersDataTable } from '@/components/top-users/top-users-data-table';
import { columns } from './columns';
import { getTopPurchaseUsers } from './actions';
import { getApps } from '../apps/actions';
import { AndroidAnalysisHelpDialog } from '@/components/dashboard/android-analysis-help-dialog';
import { Crown, Gem, PackageCheck, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TopUsersPage() {
  const apps = await getApps();
  const users = await getTopPurchaseUsers(apps);
  const topUser = users[0];
  const totalPurchases = users.reduce((sum, user) => sum + user.appsPurchased, 0);
  const uniquePackages = new Set(users.flatMap((user) => user.packages.map((pkg) => pkg.name))).size;

  return (
    <div className="min-h-screen space-y-5 bg-black pb-10 text-white">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/30">
        <div className="relative px-5 py-5 lg:px-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(245,158,11,0.22),transparent_34%),radial-gradient(circle_at_94%_5%,rgba(59,130,246,0.13),transparent_34%)]" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/15 text-amber-200">
                <Crown className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-amber-200/70">Purchase Leaders</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Platinum Users</h1>
                <p className="mt-1 text-sm leading-5 text-white/50">
                  Users ranked by the number of apps purchased across the active app registry.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:min-w-[430px] sm:flex-row sm:items-center xl:justify-end">
              <AndroidAnalysisHelpDialog page="platinum-users" className="self-start sm:self-auto" />
              <div className="grid w-full grid-cols-3 gap-2">
                {[
                  { label: 'Users', value: users.length.toLocaleString(), icon: Users },
                  { label: 'Purchases', value: totalPurchases.toLocaleString(), icon: Gem },
                  { label: 'Apps', value: uniquePackages.toLocaleString(), icon: PackageCheck },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                        <Icon className="h-3.5 w-3.5 text-amber-200/65" />
                        {item.label}
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-white">{item.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {topUser && (
            <div className="relative mt-5 rounded-2xl border border-amber-400/15 bg-amber-500/[0.08] px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-100/50">Current Leader</div>
                  <div className="mt-1 text-sm font-semibold text-white">{topUser.email}</div>
                </div>
                <div className="rounded-full border border-amber-400/20 bg-black/20 px-3 py-1 text-sm font-semibold text-amber-100">
                  {topUser.appsPurchased.toLocaleString()} app(s)
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <TopUsersDataTable columns={columns} data={users} />
    </div>
  );
}
