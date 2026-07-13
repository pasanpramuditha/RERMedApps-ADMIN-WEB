
import { AddAdExpenseDialog } from '@/components/ad-expenses/add-ad-expense-dialog';
import { AdExpensesDataTable } from '@/components/ad-expenses/ad-expenses-data-table';
import { columns } from '@/components/ad-expenses/columns';
import { listAdExpenses } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdExpensesPage() {
  const expenses = await listAdExpenses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ad Expenses</h1>
          <p className="text-muted-foreground">
            Track your monthly Google Ads expenses.
          </p>
        </div>
        <AddAdExpenseDialog />
      </div>
      <AdExpensesDataTable columns={columns} data={expenses} />
    </div>
  );
}
