
'use client';

import * as React from 'react';
import { listReceivedPayments } from './actions';
import type { ReceivedPayment } from './data';
import { columns } from '@/components/received-payments/columns';
import { AddPaymentDialog } from '@/components/received-payments/add-payment-dialog';
import { PaymentsDataTable } from '@/components/received-payments/payments-data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/crash-analysis/stat-card';
import { DollarSign } from 'lucide-react';
import { getGlobalSettings } from '../settings/actions';

export default function ReceivedPaymentsPage() {
    const [payments, setPayments] = React.useState<ReceivedPayment[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({ LKR: 300 });

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        const [fetchedPayments, settings] = await Promise.all([
            listReceivedPayments(),
            getGlobalSettings()
        ]);
        
        if (settings.exchange_rates_json) {
            try {
                const rates = JSON.parse(settings.exchange_rates_json);
                setExchangeRates(rates);
            } catch (e) {
                console.error("Failed to parse exchange rates JSON from settings.", e);
            }
        }

        setPayments(fetchedPayments);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalIncomeUSD = React.useMemo(() => {
        return payments.reduce((acc, income) => {
          if (income.currency === 'USD') return acc + income.amount;
          const rateToUsd = 1 / (exchangeRates[income.currency] || 300);
          return acc + income.amount * rateToUsd;
        }, 0);
      }, [payments, exchangeRates]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Received Payments</h1>
                    <p className="text-muted-foreground">
                        Track all received payments from various sources.
                    </p>
                </div>
                <AddPaymentDialog onSave={fetchData} />
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[105px] rounded-lg" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        title="Total Received (USD)"
                        value={formatCurrency(totalIncomeUSD)}
                        change={`Across ${payments.length} transactions`}
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
            )}
            
            <PaymentsDataTable 
                columns={columns} 
                data={payments}
                isLoading={loading}
                meta={{ onAction: fetchData }}
            />
        </div>
    );
}
