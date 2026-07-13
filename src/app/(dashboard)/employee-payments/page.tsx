

'use client';

import * as React from 'react';
import { listEmployeePayments } from './actions';
import type { EmployeePayment } from './data';
import { columns } from './columns';
import { AddEmployeePaymentDialog } from '@/components/employee-payments/add-employee-payment-dialog';
import { EmployeePaymentsDataTable } from '@/components/employee-payments/employee-payments-data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign, User } from 'lucide-react';
import { financeEmployeeNames } from '@/lib/finance-employees';

const employeeNames = financeEmployeeNames;

export default function EmployeePaymentsPage() {
    const [payments, setPayments] = React.useState<EmployeePayment[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        const fetchedPayments = await listEmployeePayments();
        setPayments(fetchedPayments);
        setLoading(false);
    }, []);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // Note: This calculation assumes a fixed exchange rate for summary.
    // A more robust implementation would use dynamic rates.
    const totalPaidUSD = payments
        .filter(p => p.currency === 'USD')
        .reduce((acc, p) => acc + p.amount, 0);
    const totalPaidLKR = payments
        .filter(p => p.currency === 'LKR')
        .reduce((acc, p) => acc + p.amount, 0);

    const calculateTotalForEmployee = (name: string) => {
        return payments
            .filter(p => p.employeeName === name && p.currency === 'LKR')
            .reduce((acc, p) => acc + p.amount, 0);
    }
    
    const calculateOtherPayments = () => {
         return payments
            .filter(p => !employeeNames.includes(p.employeeName) && p.currency === 'LKR')
            .reduce((acc, p) => acc + p.amount, 0);
    }

    const virajTotal = calculateTotalForEmployee('Viraj Sandaruwan');
    const rajithTotal = calculateTotalForEmployee('Rajith Eranga');
    const pasanTotal = calculateTotalForEmployee('Pasan Pramuditha');
    const otherTotal = calculateOtherPayments();

    const formatCurrency = (amount: number, currency: 'USD' | 'LKR') => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Business Payouts</h1>
                    <p className="text-muted-foreground">
                        Track all business-related payouts and payments.
                    </p>
                </div>
                <AddEmployeePaymentDialog onSave={fetchData} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Paid (USD)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalPaidUSD, 'USD')}</div>}
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Paid (LKR)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(totalPaidLKR, 'LKR')}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Viraj Sandaruwan</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(virajTotal, 'LKR')}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rajith Eranga</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(rajithTotal, 'LKR')}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pasan Pramuditha</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(pasanTotal, 'LKR')}</div>}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Other Payments</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{formatCurrency(otherTotal, 'LKR')}</div>}
                    </CardContent>
                </Card>
            </div>
            
            <EmployeePaymentsDataTable 
                columns={columns} 
                data={payments}
                isLoading={loading}
                meta={{ onAction: fetchData }}
            />
        </div>
    );
}
