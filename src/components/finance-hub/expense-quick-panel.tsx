'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AddOtherExpenseDialog } from '@/components/other-expenses/add-other-expense-dialog';
import { listExpenseCategories } from '@/app/(dashboard)/other-expenses/actions';
import { deleteFinanceExpense, type FinanceExpense } from '@/app/(dashboard)/finance-hub/actions';
import { Briefcase, CalendarDays, CreditCard, DollarSign, Pencil, Plus, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

type ExpenseQuickPanelKind = 'business' | 'other';

type ExpenseQuickPanelProps = {
  children: React.ReactNode;
  kind: ExpenseQuickPanelKind;
  expenses?: FinanceExpense[];
  dataReady?: boolean;
  readOnly?: boolean;
};

const panelConfig = {
  business: {
    title: 'Business Ops',
    description: 'Business-related operating expenses.',
    icon: Briefcase,
    accent: 'emerald',
  },
  other: {
    title: 'Other Costs',
    description: 'Personal and uncategorized costs outside business operations.',
    icon: CreditCard,
    accent: 'slate',
  },
} as const;

function isBusinessExpense(expense: FinanceExpense) {
  return expense.category.toLowerCase() === 'business';
}

function formatAmount(expense: FinanceExpense) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: expense.currency,
  }).format(expense.amount);
}

function formatUsd(amount?: number) {
  if (amount === undefined) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function ExpenseQuickPanel({ children, kind, expenses: initialExpenses = [], dataReady = false, readOnly = false }: ExpenseQuickPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [expenses, setExpenses] = React.useState<FinanceExpense[]>(initialExpenses);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();
  const config = panelConfig[kind];
  const Icon = config.icon;

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((expense) => (kind === 'business' ? isBusinessExpense(expense) : !isBusinessExpense(expense)));
  }, [expenses, kind]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const fetchedCategories = !readOnly && dataReady ? await listExpenseCategories() : [];
    setExpenses(initialExpenses);
    setCategories(fetchedCategories);
    setLoading(false);
  }, [dataReady, initialExpenses, readOnly]);

  React.useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  React.useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  React.useEffect(() => {
    const handleRefresh = () => {
      if (open) {
        fetchData();
      }
    };
    window.addEventListener('finance-hub:refresh', handleRefresh);
    return () => window.removeEventListener('finance-hub:refresh', handleRefresh);
  }, [fetchData, open]);

  const handleDelete = async (expense: FinanceExpense) => {
    setDeletingId(expense.id);
    const idToken = await getToken();
    const result = await deleteFinanceExpense(expense.id, idToken);
    setDeletingId(null);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Deleted', description: 'Expense record deleted.' });
    setExpenses((current) => current.filter((item) => item.id !== expense.id));
    window.dispatchEvent(new Event('finance-hub:refresh'));
  };

  const totalUsd = filteredExpenses.reduce((sum, expense) => sum + (expense.convertedAmount ?? 0), 0);
  const accentClasses = kind === 'business'
    ? 'border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-100'
    : 'border-slate-400/20 bg-slate-500/[0.12] text-slate-100';
  const buttonClass = kind === 'business' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-600 hover:bg-slate-500';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[86vh] overflow-hidden rounded-3xl border-white/10 bg-[#0D0D11] p-0 text-white shadow-2xl sm:max-w-4xl">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 py-5 pl-6 pr-16">
          <div className={`pointer-events-none absolute inset-0 ${kind === 'business' ? 'bg-gradient-to-br from-emerald-500/[0.14] to-transparent' : 'bg-gradient-to-br from-slate-500/[0.14] to-transparent'}`} />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${accentClasses}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-black italic tracking-tight">{config.title}</DialogTitle>
                  <Badge variant="outline" className="h-8 rounded-full border-white/10 bg-white/[0.04] px-3 text-white/70">
                    {filteredExpenses.length} record{filteredExpenses.length === 1 ? '' : 's'}
                  </Badge>
                  <Badge variant="outline" className={`h-8 rounded-full px-3 ${accentClasses}`}>
                    {formatUsd(totalUsd) || '$0.00'} USD
                  </Badge>
                </div>
                <DialogDescription className="mt-1 text-white/45">{config.description}</DialogDescription>
              </div>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                <AddOtherExpenseDialog categories={categories} onSave={fetchData}>
                  <Button className={`h-9 rounded-full px-3 text-white ${buttonClass}`}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </AddOtherExpenseDialog>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl bg-white/[0.08]" />
              ))}
            </div>
          ) : filteredExpenses.length ? (
            <div className="space-y-3">
              {filteredExpenses.map((expense) => (
                <div key={expense.id} className="group grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.06] md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`rounded-full ${accentClasses}`}>
                        {expense.category}
                      </Badge>
                      {expense.subCategory && (
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/[0.04] text-white/55">
                          {expense.subCategory}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {expense.date}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-white">{expense.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-black italic text-white">
                        <DollarSign className="h-3.5 w-3.5 text-rose-300" />
                        {formatAmount(expense)}
                      </span>
                      {expense.convertedAmount !== undefined && (
                        <span className="text-xs font-semibold text-white/35">{formatUsd(expense.convertedAmount)} USD</span>
                      )}
                      <span className="text-xs font-semibold text-white/30">{expense.recurrence}</span>
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center justify-end gap-2">
                      <AddOtherExpenseDialog isEditMode expenseToEdit={expense} categories={categories} onSave={fetchData}>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      </AddOtherExpenseDialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full border border-rose-400/20 bg-rose-500/[0.08] text-rose-100 hover:bg-rose-500/[0.16] hover:text-rose-50"
                        onClick={() => handleDelete(expense)}
                        disabled={deletingId === expense.id}
                      >
                        {deletingId === expense.id ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] text-center">
              <div>
                <Icon className="mx-auto mb-3 h-8 w-8 text-white/25" />
                <p className="text-sm font-semibold text-white">No {config.title.toLowerCase()} records yet.</p>
                <p className="mt-1 text-xs text-white/40">
                  {readOnly ? 'No matching tax ledger expenses in the selected range.' : 'Use Add to create the first record.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
