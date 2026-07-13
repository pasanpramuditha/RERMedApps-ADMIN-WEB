
'use client';

import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card';
  import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
  } from '@/components/ui/chart';
import { getMonthlyExpensesBreakdown, type MonthlyExpenseBreakdown } from '@/app/(dashboard)/dashboard/actions';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format, subMonths } from 'date-fns';

const chartConfig = {
  adExpenses: {
    label: 'Ad Expenses',
    color: 'hsl(var(--chart-1))',
  },
  businessExpenses: {
    label: 'Business Expenses',
    color: 'hsl(var(--chart-2))',
  },
  personalExpenses: {
    label: 'Personal Expenses',
    color: 'hsl(var(--chart-3))',
  },
};

export function AdExpensesChart() {
    const [chartData, setChartData] = React.useState<MonthlyExpenseBreakdown[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [timeRange, setTimeRange] = React.useState<string>('6');
  
    React.useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        const months = parseInt(timeRange, 10);
        const data = await getMonthlyExpensesBreakdown(months);
        setChartData(data);
        setLoading(false);
      };
      fetchData();
    }, [timeRange]);

    const getDescription = () => {
        const today = new Date();
        const months = parseInt(timeRange, 10);
        const endDate = subMonths(today, 1);
        const startDate = subMonths(today, months);
        return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
      };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Monthly Expenses Breakdown</CardTitle>
                    <CardDescription>{getDescription()}</CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="6">Last 6 Months</SelectItem>
                        <SelectItem value="12">Last 12 Months</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                {loading ? (
                    <div className="w-full h-[300px] flex items-center justify-center p-6">
                        <Skeleton className="w-full h-full" />
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <YAxis
                                tickFormatter={(value) => {
                                if (typeof value === 'number') {
                                    if (value >= 1000) return `$${value / 1000}k`;
                                    return `$${value}`;
                                }
                                return String(value);
                                }}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="adExpenses" stackId="a" fill="var(--color-adExpenses)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="businessExpenses" stackId="a" fill="var(--color-businessExpenses)" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="personalExpenses" stackId="a" fill="var(--color-personalExpenses)" radius={[0, 0, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    )
}
