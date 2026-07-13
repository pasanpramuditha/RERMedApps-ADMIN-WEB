
'use client';

import * as React from 'react';
import { listFixedDeposits, listCashAccounts, deleteFixedDeposit, deleteCashAccount } from './actions';
import type { FixedDeposit, CashAccount } from './data';
import { StatCard } from '@/components/crash-analysis/stat-card';
import { DollarSign, Banknote, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AddFixedDepositDialog } from '@/components/wealth-tracker/add-fixed-deposit-dialog';
import { AddCashAccountDialog } from '@/components/wealth-tracker/add-cash-account-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FixedDepositsDataTable } from '@/components/wealth-tracker/fixed-deposits-data-table';
import { CashAccountsDataTable } from '@/components/wealth-tracker/cash-accounts-data-table';
import { fixedDepositColumns } from '@/components/wealth-tracker/fixed-deposit-columns';
import { cashAccountColumns } from '@/components/wealth-tracker/cash-account-columns';
import { useToast } from '@/hooks/use-toast';

export default function WealthTrackerPage() {
    const [fixedDeposits, setFixedDeposits] = React.useState<FixedDeposit[]>([]);
    const [cashAccounts, setCashAccounts] = React.useState<CashAccount[]>([]);
    const [loading, setLoading] = React.useState(true);
    const { toast } = useToast();

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        const [deposits, accounts] = await Promise.all([
            listFixedDeposits(),
            listCashAccounts()
        ]);
        setFixedDeposits(deposits);
        setCashAccounts(accounts);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalFixedDeposits = fixedDeposits.reduce((acc, deposit) => acc + deposit.amount, 0);
    const totalCashOnHand = cashAccounts.reduce((acc, account) => acc + account.balance, 0);
    const totalWealth = totalFixedDeposits + totalCashOnHand;

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'LKR',
    }).format(amount);

    const handleDeleteFixedDeposit = async (id: string) => {
        const result = await deleteFixedDeposit(id);
        if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Fixed deposit deleted." });
            fetchData();
        }
    };

    const handleDeleteCashAccount = async (id: string) => {
        const result = await deleteCashAccount(id);
        if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Cash account deleted." });
            fetchData();
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Wealth Tracker</h1>
                <p className="text-muted-foreground">
                    Monitor your company's fixed deposits and cash on hand. All values in LKR.
                </p>
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-[105px] rounded-lg" />
                    <Skeleton className="h-[105px] rounded-lg" />
                    <Skeleton className="h-[105px] rounded-lg" />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        title="Total Wealth"
                        value={formatCurrency(totalWealth)}
                        change="Fixed Deposits + On-Hand Cash"
                        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Total in Fixed Deposits"
                        value={formatCurrency(totalFixedDeposits)}
                        change={`${fixedDeposits.length} active deposits`}
                        icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
                    />
                    <StatCard
                        title="Total On-Hand Cash"
                        value={formatCurrency(totalCashOnHand)}
                        change={`Across ${cashAccounts.length} bank accounts`}
                        icon={<Banknote className="h-4 w-4 text-muted-foreground" />}
                    />
                </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Fixed Deposits</CardTitle>
                            <CardDescription>All your term deposit investments.</CardDescription>
                        </div>
                        <AddFixedDepositDialog onSave={fetchData} />
                    </CardHeader>
                    <CardContent>
                        <FixedDepositsDataTable 
                            columns={fixedDepositColumns({ onDelete: handleDeleteFixedDeposit, onEdit: fetchData })} 
                            data={fixedDeposits} 
                            isLoading={loading}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>On-Hand Cash</CardTitle>
                            <CardDescription>Cash available in your bank accounts.</CardDescription>
                        </div>
                        <AddCashAccountDialog onSave={fetchData} />
                    </CardHeader>
                    <CardContent>
                        <CashAccountsDataTable 
                            columns={cashAccountColumns({ onDelete: handleDeleteCashAccount, onEdit: fetchData })} 
                            data={cashAccounts} 
                            isLoading={loading}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
