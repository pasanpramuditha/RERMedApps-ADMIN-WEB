

'use client'

import * as React from 'react';
import { columns } from "./columns";
import { ExpensesDataTable } from "@/components/expenses-tracker/expenses-data-table";
import { StatCard } from "@/components/crash-analysis/stat-card";
import { DollarSign, Repeat } from "lucide-react";
import { AddExpenseDialog } from "@/components/expenses-tracker/add-expense-dialog";
import { listExpenses } from "./actions";
import type { Expense } from './data';
import { Skeleton } from '@/components/ui/skeleton';
import { getGlobalSettings } from '../settings/actions';

export default function ExpensesTrackerPage() {
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({ LKR: 0.0033 });

    React.useEffect(() => {
        async function fetchSettingsAndExpenses() {
            setLoading(true);
            const [settings, fetchedExpenses] = await Promise.all([
                getGlobalSettings(),
                listExpenses()
            ]);

            if (settings.exchange_rates_json) {
                try {
                    const rates = JSON.parse(settings.exchange_rates_json);
                    setExchangeRates(rates);
                } catch (e) {
                    console.error("Failed to parse exchange rates JSON from settings.", e);
                }
            }
            setExpenses(fetchedExpenses);
            setLoading(false);
        };
        fetchSettingsAndExpenses();
    }, []);

    const convertToUSD = React.useCallback(
        (amount: number, fromCurrency: 'USD' | 'LKR') => {
          if (fromCurrency === 'USD') return amount;
          
          const lkrRate = exchangeRates['LKR'] || 0.0033;
          return amount * lkrRate;
        },
        [exchangeRates]
    );
    
    const totalExpensesUSD = React.useMemo(() => {
        return expenses.reduce((acc, expense) => acc + convertToUSD(expense.amount, expense.currency), 0);
    }, [expenses, convertToUSD]);

    const monthlyRecurringUSD = React.useMemo(() => {
        return expenses
            .filter(e => e.category === 'Recurring')
            .reduce((acc, expense) => acc + convertToUSD(expense.amount, expense.currency), 0);
    }, [expenses, convertToUSD]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol',
    }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Expense Tracker</h1>
                    <p className="text-muted-foreground">
                        Track miscellaneous business expenses.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <AddExpenseDialog />
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-[105px] rounded-lg" />
                    <Skeleton className="h-[105px] rounded-lg" />
                    <Skeleton className="h-[105px] rounded-lg" />
                </div>
            ) : (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        title="Total Expenses"
                        value={formatCurrency(totalExpensesUSD)}
                        change="All-time total in USD"
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Monthly Recurring"
                        value={formatCurrency(monthlyRecurringUSD)}
                        change="Total monthly in USD"
                        icon={<Repeat className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
                * Note: Stat cards show totals converted to USD based on the rates in Global Settings.
            </p>

            <ExpensesDataTable 
                columns={columns} 
                data={expenses} 
                isLoading={loading}
            />
        </div>
    );
}
