'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AddOtherIncomeDialog } from '@/components/other-income/add-other-income-dialog';
import { deleteOtherIncome, listIncomeCategories } from '@/app/(dashboard)/other-income/actions';
import type { OtherIncome } from '@/app/(dashboard)/other-income/data';
import { CalendarDays, DollarSign, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

type OtherIncomeQuickPanelProps = {
  children: React.ReactNode;
  incomes?: OtherIncome[];
  dataReady?: boolean;
};

function formatAmount(income: OtherIncome) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: income.currency,
  }).format(income.amount);
}

function formatUsd(amount?: number) {
  if (amount === undefined) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function OtherIncomeQuickPanel({ children, incomes: initialIncomes = [], dataReady = false }: OtherIncomeQuickPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [incomes, setIncomes] = React.useState<OtherIncome[]>(initialIncomes);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { getToken } = useAuth();

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    const fetchedCategories = dataReady ? await listIncomeCategories() : [];
    setIncomes(initialIncomes);
    setCategories(fetchedCategories);
    setLoading(false);
  }, [dataReady, initialIncomes]);

  React.useEffect(() => {
    setIncomes(initialIncomes);
  }, [initialIncomes]);

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

  const handleDelete = async (income: OtherIncome) => {
    setDeletingId(income.id);
    const idToken = await getToken();
    const result = await deleteOtherIncome(income.id, idToken);
    setDeletingId(null);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Deleted', description: 'Other income record deleted.' });
    setIncomes((current) => current.filter((item) => item.id !== income.id));
    window.dispatchEvent(new Event('finance-hub:refresh'));
  };

  const totalUsd = incomes.reduce((sum, income) => sum + (income.convertedAmount ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[86vh] overflow-hidden rounded-3xl border-white/10 bg-[#0D0D11] p-0 text-white shadow-2xl sm:max-w-4xl">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 py-5 pl-6 pr-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.16] to-transparent" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-400/25 bg-violet-500/[0.18] text-violet-100">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-black italic tracking-tight">Other Income</DialogTitle>
                  <Badge variant="outline" className="h-8 rounded-full border-white/10 bg-white/[0.04] px-3 text-white/70">
                    {incomes.length} record{incomes.length === 1 ? '' : 's'}
                  </Badge>
                  <Badge variant="outline" className="h-8 rounded-full border-emerald-400/20 bg-emerald-500/[0.10] px-3 text-emerald-100">
                    {formatUsd(totalUsd) || '$0.00'} USD
                  </Badge>
                </div>
                <DialogDescription className="mt-1 text-white/45">
                  View, edit, or delete income records already added to the finance system.
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
              <AddOtherIncomeDialog categories={categories} onSave={fetchData}>
                <Button className="h-9 rounded-full bg-violet-600 px-3 text-white hover:bg-violet-500">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </AddOtherIncomeDialog>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-2xl bg-white/[0.08]" />
              ))}
            </div>
          ) : incomes.length ? (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div key={income.id} className="group grid gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:bg-white/[0.06] md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full border-violet-400/25 bg-violet-500/[0.12] text-violet-100">
                        {income.category}
                      </Badge>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {income.date}
                      </span>
                    </div>
                    <p className="truncate text-sm font-semibold text-white">{income.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1.5 font-black italic text-white">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-300" />
                        {formatAmount(income)}
                      </span>
                      {income.convertedAmount !== undefined && (
                        <span className="text-xs font-semibold text-white/35">{formatUsd(income.convertedAmount)} USD</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <AddOtherIncomeDialog isEditMode incomeToEdit={income} categories={categories} onSave={fetchData}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </AddOtherIncomeDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full border border-rose-400/20 bg-rose-500/[0.08] text-rose-100 hover:bg-rose-500/[0.16] hover:text-rose-50"
                      onClick={() => handleDelete(income)}
                      disabled={deletingId === income.id}
                    >
                      {deletingId === income.id ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] text-center">
              <div>
                <Zap className="mx-auto mb-3 h-8 w-8 text-white/25" />
                <p className="text-sm font-semibold text-white">No other income records yet.</p>
                <p className="mt-1 text-xs text-white/40">Use Add to create the first record.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
