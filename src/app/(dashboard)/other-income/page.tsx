
'use client';

import * as React from 'react';
import { listOtherIncomes, listIncomeCategories, listCurrencyRates } from './actions';
import type { OtherIncome } from './data';
import { BadgeDollarSign, DollarSign, FolderTree, TrendingUp } from 'lucide-react';
import { columns } from '@/components/other-income/columns';
import { OtherIncomeDataTable } from '@/components/other-income/other-income-data-table';
import { AddOtherIncomeDialog } from '@/components/other-income/add-other-income-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SummaryPeriod = 'this-month' | 'this-year' | 'last-year';

const summaryPeriodLabels: Record<SummaryPeriod, string> = {
    'this-month': 'This Month',
    'this-year': 'This Year',
    'last-year': 'Last Year',
};

export default function OtherIncomePage() {
    const [incomes, setIncomes] = React.useState<OtherIncome[]>([]);
    const [categories, setCategories] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({ USD: 1, LKR: 300 });
    const [summaryPeriod, setSummaryPeriod] = React.useState<SummaryPeriod>('this-month');

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        const [fetchedIncomes, fetchedCategories, rates] = await Promise.all([
            listOtherIncomes(),
            listIncomeCategories(),
            listCurrencyRates()
        ]);

        setExchangeRates(rates);
        setIncomes(fetchedIncomes);
        setCategories(fetchedCategories);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const convertToUSD = React.useCallback(
        (income: OtherIncome) => {
          if (income.convertedAmount !== undefined) {
              return income.convertedAmount;
          }
          if (income.currency === 'USD') return income.amount;
          
          const rateToUsd = exchangeRates[income.currency] || 300;
          return income.amount / rateToUsd;
        },
        [exchangeRates]
    );

    const totalIncomeUSD = React.useMemo(() => {
        return incomes.reduce((acc, income) => acc + convertToUSD(income), 0);
    }, [incomes, convertToUSD]);

    const monthlySummary = React.useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const selectedIncomes = incomes.filter((income) => {
            const incomeDate = new Date(income.date);
            const incomeYear = incomeDate.getFullYear();

            if (summaryPeriod === 'this-year') {
                return incomeYear === currentYear;
            }

            if (summaryPeriod === 'last-year') {
                return incomeYear === currentYear - 1;
            }

            return incomeDate.getMonth() === now.getMonth() && incomeYear === currentYear;
        });

        return {
            totalUsd: selectedIncomes.reduce((acc, income) => acc + convertToUSD(income), 0),
            records: selectedIncomes.length,
            label: summaryPeriod === 'this-month'
                ? now.toLocaleString('en-US', { month: 'short', year: 'numeric' })
                : summaryPeriod === 'this-year'
                    ? String(currentYear)
                    : String(currentYear - 1),
        };
    }, [incomes, convertToUSD, summaryPeriod]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);

    return (
        <div className="min-w-0 space-y-6 overflow-x-hidden">
            <div className="min-w-0 rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="rounded-lg border bg-background p-3">
                            <BadgeDollarSign className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Other Income</h1>
                            <p className="text-muted-foreground">
                                Track miscellaneous income sources, categories, and receipts.
                            </p>
                        </div>
                    </div>
                    <AddOtherIncomeDialog onSave={fetchData} categories={categories} />
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[92px] rounded-lg" />
                    <Skeleton className="h-[92px] rounded-lg" />
                    <Skeleton className="h-[92px] rounded-lg" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="min-w-0">
                        <CardContent className="flex min-h-[92px] items-center gap-3 p-4">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            <div>
                                <p className="text-xs text-muted-foreground">Total Other Income</p>
                                <p className="text-2xl font-semibold">{formatCurrency(totalIncomeUSD)}</p>
                                <p className="text-xs text-muted-foreground">Converted to USD</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="min-w-0">
                        <CardContent className="flex min-h-[92px] items-center gap-3 p-4">
                            <FolderTree className="h-5 w-5 text-sky-500" />
                            <div>
                                <p className="text-xs text-muted-foreground">Categories</p>
                                <p className="text-2xl font-semibold">{categories.length}</p>
                                <p className="text-xs text-muted-foreground">Active income groups</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="min-w-0">
                        <CardContent className="flex min-h-[92px] items-center gap-3 p-4">
                            <TrendingUp className="h-5 w-5 text-amber-500" />
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">{summaryPeriodLabels[summaryPeriod]}</p>
                                    <Select value={summaryPeriod} onValueChange={(value) => setSummaryPeriod(value as SummaryPeriod)}>
                                        <SelectTrigger className="h-7 w-[112px] rounded-full px-3 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent align="end">
                                            <SelectItem value="this-month">This Month</SelectItem>
                                            <SelectItem value="this-year">This Year</SelectItem>
                                            <SelectItem value="last-year">Last Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-2xl font-semibold">{formatCurrency(monthlySummary.totalUsd)}</p>
                                <p className="text-xs text-muted-foreground">
                                    {monthlySummary.records} record{monthlySummary.records === 1 ? '' : 's'} in {monthlySummary.label}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            <OtherIncomeDataTable 
                columns={columns} 
                data={incomes}
                isLoading={loading}
                meta={{
                    onAction: fetchData,
                    categories: categories,
                }}
            />
        </div>
    );
}
