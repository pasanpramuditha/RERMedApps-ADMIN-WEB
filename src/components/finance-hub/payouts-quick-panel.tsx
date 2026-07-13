'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AddEmployeePaymentDialog } from '@/components/employee-payments/add-employee-payment-dialog';
import { deleteFinancePayout, type FinancePayout } from '@/app/(dashboard)/finance-hub/actions';
import { useAuth } from '@/hooks/use-auth';
import { CalendarDays, DollarSign, HandCoins, Pencil, Plus, Trash2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { financeEmployeeNames, type FinanceEmployeeName } from '@/lib/finance-employees';

type PayoutsQuickPanelProps = {
  children: React.ReactNode;
  payments?: FinancePayout[];
  dataReady?: boolean;
};

type PayoutFilter = 'All' | FinanceEmployeeName;

function formatAmount(payment: FinancePayout) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: payment.currency,
  }).format(payment.amount);
}

function summarizePayments(payments: FinancePayout[]) {
  return payments.reduce(
    (summary, payment) => {
      if (payment.currency === 'LKR') summary.lkr += payment.amount;
      if (payment.currency === 'USD') summary.usd += payment.amount;
      summary.count += 1;
      return summary;
    },
    { count: 0, lkr: 0, usd: 0 }
  );
}

function formatCompactCurrency(amount: number, currency: 'USD' | 'LKR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: amount >= 100000 ? 1 : 0,
  }).format(amount);
}

function formatSummaryTotal(summary: ReturnType<typeof summarizePayments>) {
  if (summary.lkr > 0) return formatCompactCurrency(summary.lkr, 'LKR');
  if (summary.usd > 0) return formatCompactCurrency(summary.usd, 'USD');
  return formatCompactCurrency(0, 'LKR');
}

export function PayoutsQuickPanel({ children, payments: initialPayments = [], dataReady = false }: PayoutsQuickPanelProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [payments, setPayments] = React.useState<FinancePayout[]>(initialPayments);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = React.useState<PayoutFilter>('All');
  const { toast } = useToast();
  const { getToken } = useAuth();

  const fetchData = React.useCallback(async () => {
    setLoading(!dataReady);
    setPayments(initialPayments);
    if (dataReady) setLoading(false);
  }, [dataReady, initialPayments]);

  React.useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  React.useEffect(() => {
    if (open) {
      setSelectedEmployee('All');
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

  const handleDelete = async (payment: FinancePayout) => {
    setDeletingId(payment.id);
    const idToken = await getToken();
    const result = await deleteFinancePayout(payment.id, idToken);
    setDeletingId(null);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Deleted', description: 'Payout record deleted.' });
    setPayments((current) => current.filter((item) => item.id !== payment.id));
    window.dispatchEvent(new Event('finance-hub:refresh'));
  };

  const totalLkr = payments.filter((payment) => payment.currency === 'LKR').reduce((sum, payment) => sum + payment.amount, 0);
  const totalUsd = payments.filter((payment) => payment.currency === 'USD').reduce((sum, payment) => sum + payment.amount, 0);
  const filterCards = React.useMemo(
    () => [
      { key: 'All' as const, label: 'All', summary: summarizePayments(payments) },
      ...financeEmployeeNames.map((name) => ({
        key: name,
        label: name,
        summary: summarizePayments(payments.filter((payment) => payment.employeeName === name)),
      })),
    ],
    [payments]
  );
  const filteredPayments = React.useMemo(
    () => selectedEmployee === 'All' ? payments : payments.filter((payment) => payment.employeeName === selectedEmployee),
    [payments, selectedEmployee]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[86vh] overflow-hidden rounded-3xl border-white/10 bg-[#0D0D11] p-0 text-white shadow-2xl sm:max-w-4xl">
        <DialogHeader className="relative overflow-hidden border-b border-white/10 py-5 pl-6 pr-16">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/[0.16] to-transparent" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-400/25 bg-rose-500/[0.16] text-rose-100">
                <HandCoins className="h-5 w-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-black italic tracking-tight">Payouts</DialogTitle>
                  <Badge variant="outline" className="h-8 rounded-full border-white/10 bg-white/[0.04] px-3 text-white/70">
                    {filteredPayments.length} / {payments.length} record{payments.length === 1 ? '' : 's'}
                  </Badge>
                  <Badge variant="outline" className="h-8 rounded-full border-rose-400/20 bg-rose-500/[0.10] px-3 text-rose-100">
                    LKR {totalLkr.toLocaleString('en-US')}
                  </Badge>
                  <Badge variant="outline" className="h-8 rounded-full border-blue-400/20 bg-blue-500/[0.10] px-3 text-blue-100">
                    USD {totalUsd.toLocaleString('en-US')}
                  </Badge>
                </div>
                <DialogDescription className="mt-1 text-white/45">
                  Business withdrawals and payout records.
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
              <AddEmployeePaymentDialog onSave={fetchData}>
                <Button className="h-9 rounded-full bg-rose-600 px-3 text-white hover:bg-rose-500">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </AddEmployeePaymentDialog>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl bg-white/[0.08]" />
              ))}
            </div>
          ) : payments.length ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                {filterCards.map((card) => {
                  const selected = selectedEmployee === card.key;
                  return (
                    <button
                      key={card.key}
                      type="button"
                      aria-pressed={selected}
                      data-payout-filter={card.key}
                      onClick={() => setSelectedEmployee(card.key)}
                      className={cn(
                        'min-h-[66px] rounded-2xl border p-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/40',
                        selected
                          ? 'border-rose-300/45 bg-rose-500/[0.16] shadow-[0_10px_30px_rgba(244,63,94,0.14)]'
                          : 'border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]'
                      )}
                    >
                      <span className={cn('block truncate text-[10px] font-black uppercase tracking-[0.16em]', selected ? 'text-rose-100' : 'text-white/42')}>
                        {card.label}
                      </span>
                      <span className="mt-1 block truncate text-sm font-black italic tracking-tight text-white">
                        {formatSummaryTotal(card.summary)}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-semibold text-white/38">
                        {card.summary.count} payment{card.summary.count === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredPayments.length ? filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  data-payout-row={payment.employeeName}
                  className="group grid gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5 transition-colors hover:bg-white/[0.06] md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="h-6 rounded-full border-rose-400/25 bg-rose-500/[0.12] px-2 py-0 text-[11px] text-rose-100">
                        {payment.employeeName}
                      </Badge>
                      {payment.transactionType && (
                        <Badge variant="outline" className="h-6 rounded-full border-white/10 bg-white/[0.04] px-2 py-0 text-[11px] text-white/55">
                          {payment.transactionType}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/40">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {payment.date}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="truncate text-sm font-semibold text-white">{payment.remarks || 'Payout record'}</p>
                      <div className="inline-flex items-center gap-1.5 text-sm font-black italic text-white">
                        <DollarSign className="h-3.5 w-3.5 text-rose-300" />
                        {formatAmount(payment)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <AddEmployeePaymentDialog isEditMode paymentToEdit={payment} onSave={fetchData}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </AddEmployeePaymentDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full border border-rose-400/20 bg-rose-500/[0.08] text-rose-100 hover:bg-rose-500/[0.16] hover:text-rose-50"
                      onClick={() => handleDelete(payment)}
                      disabled={deletingId === payment.id}
                    >
                      {deletingId === payment.id ? <Spinner size="small" /> : <Trash2 className="h-4 w-4" />}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="grid min-h-[150px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] text-center">
                  <div>
                    <HandCoins className="mx-auto mb-3 h-8 w-8 text-white/25" />
                    <p className="text-sm font-semibold text-white">No payouts for {selectedEmployee}.</p>
                    <p className="mt-1 text-xs text-white/40">Select All to view every payout record.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025] text-center">
              <div>
                <HandCoins className="mx-auto mb-3 h-8 w-8 text-white/25" />
                <p className="text-sm font-semibold text-white">No payout records yet.</p>
                <p className="mt-1 text-xs text-white/40">Use Add to create the first payout.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
