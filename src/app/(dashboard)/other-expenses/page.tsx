

'use client';

import * as React from 'react';
import { listOtherExpenses, listExpenseCategories } from './actions';
import type { OtherExpense } from './data';
import { StatCard } from '@/components/crash-analysis/stat-card';
import { DollarSign, Repeat, CalendarClock, Briefcase, User, Calendar as CalendarIcon } from 'lucide-react';
import { columns } from './columns';
import { OtherExpensesDataTable } from '@/components/other-expenses/other-expenses-data-table';
import { AddOtherExpenseDialog } from '@/components/other-expenses/add-other-expense-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getGlobalSettings } from '../settings/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function OtherExpensesPage() {
    const [expenses, setExpenses] = React.useState<OtherExpense[]>([]);
    const [categories, setCategories] = React.useState<string[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [showOriginalsOnly, setShowOriginalsOnly] = React.useState(false);
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
    const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({ LKR: 0.0033 });

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        const [fetchedExpenses, fetchedCategories, settings] = await Promise.all([
            listOtherExpenses(),
            listExpenseCategories(),
            getGlobalSettings()
        ]);
        
       if (settings.exchange_rates_json) {
            try {
                const raw = JSON.parse(settings.exchange_rates_json);
                const parsed = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Number(v)]));
                setExchangeRates(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse exchange rates JSON from settings.", e);
            }
        }

        setExpenses(fetchedExpenses);
        setCategories(fetchedCategories);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const convertToUSD = React.useCallback(
        (expense: OtherExpense) => {
          if (expense.convertedAmount !== undefined) {
              return expense.convertedAmount;
          }
          if (expense.currency === 'USD') return expense.amount;
          
          const lkrRate = exchangeRates['LKR'] || 0.0033;
          return expense.amount * lkrRate;
        },
        [exchangeRates]
    );

    const filteredExpenses = React.useMemo(() => {
        let filtered = expenses;
        if (showOriginalsOnly) {
            filtered = filtered.filter(e => !e.isGenerated);
        }
        if (dateRange?.from) {
             const fromDate = dateRange.from;
             const toDate = dateRange.to || fromDate;
             filtered = filtered.filter(expense => {
                const expenseDate = parseISO(expense.date);
                return expenseDate >= fromDate && expenseDate <= toDate;
             });
        }
        return filtered;
    }, [expenses, showOriginalsOnly, dateRange]);
    
    const totalExpensesUSD = React.useMemo(() => {
        return filteredExpenses.reduce((acc, expense) => acc + convertToUSD(expense), 0);
    }, [filteredExpenses, convertToUSD]);

    const totalBusinessExpensesUSD = React.useMemo(() => {
        return filteredExpenses
            .filter(e => e.category === 'Business')
            .reduce((acc, expense) => acc + convertToUSD(expense), 0);
    }, [filteredExpenses, convertToUSD]);

    const totalPersonalExpensesUSD = React.useMemo(() => {
        return filteredExpenses
            .filter(e => e.category === 'Personal')
            .reduce((acc, expense) => acc + convertToUSD(expense), 0);
    }, [filteredExpenses, convertToUSD]);

    const monthlyRecurringUSD = React.useMemo(() => {
        return filteredExpenses
            .filter(e => e.recurrence === 'Monthly' && !e.isGenerated)
            .reduce((acc, expense) => acc + convertToUSD(expense), 0);
    }, [filteredExpenses, convertToUSD]);

    const annualRecurringUSD = React.useMemo(() => {
        return filteredExpenses
            .filter(e => e.recurrence === 'Annually' && !e.isGenerated)
            .reduce((acc, expense) => acc + convertToUSD(expense), 0);
    }, [filteredExpenses, convertToUSD]);


    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
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
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "w-[300px] justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                                ) : (
                                format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                <span>Pick a date range</span>
                            )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <AddOtherExpenseDialog onSave={fetchData} categories={categories} />
                </div>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[105px] rounded-lg" />)}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <StatCard
                        title="Total Expenses"
                        value={formatCurrency(totalExpensesUSD)}
                        change={`Across ${categories.length} categories`}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Business Expenses"
                        value={formatCurrency(totalBusinessExpensesUSD)}
                        change="Total business-related expenses"
                        icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Personal Expenses"
                        value={formatCurrency(totalPersonalExpensesUSD)}
                        change="Total personal expenses"
                        icon={<User className="h-4 w-4 text-muted-foreground" />}
                    />
                     <StatCard
                        title="Monthly Recurring"
                        value={formatCurrency(monthlyRecurringUSD)}
                        change="Total of original monthly expenses"
                        icon={<Repeat className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Annual Recurring"
                        value={formatCurrency(annualRecurringUSD)}
                        change="Total of original annual expenses"
                        icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
                * Note: Stat cards show totals converted to USD based on the rates in Global Settings.
            </p>

            <OtherExpensesDataTable 
                columns={columns} 
                data={filteredExpenses}
                isLoading={loading}
                meta={{
                    onAction: fetchData,
                    categories: categories,
                }}
                showOriginalsOnly={showOriginalsOnly}
                setShowOriginalsOnly={setShowOriginalsOnly}
            />
        </div>
    );
}
