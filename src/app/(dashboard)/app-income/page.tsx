
import { AddAppIncomeDialog } from '@/components/app-income/add-app-income-dialog';
import { AppIncomeDataTable } from '@/components/app-income/app-income-data-table';
import { columns } from '@/components/app-income/columns';
import { getApps } from '../apps/actions';
import { listAppIncomes } from './actions';

export const dynamic = 'force-dynamic';

export default async function AppIncomePage() {
  const [incomes, apps] = await Promise.all([
    listAppIncomes(),
    getApps()
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">App Income</h1>
          <p className="text-muted-foreground">
            Track your monthly income from IAPs and AdMob.
          </p>
        </div>
        <AddAppIncomeDialog apps={apps} />
      </div>
      <AppIncomeDataTable columns={columns} data={incomes} apps={apps} />
    </div>
  );
}
