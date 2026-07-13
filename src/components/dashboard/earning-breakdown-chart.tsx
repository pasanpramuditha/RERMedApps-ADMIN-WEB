
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
import { getMonthlyEarningsBreakdown, type MonthlyBreakdown } from '@/app/(dashboard)/dashboard/actions';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format, subMonths } from 'date-fns';

const chartConfig = {
  apple: {
    label: 'Apple',
    color: 'hsl(var(--chart-1))',
  },
  android: {
    label: 'Android',
    color: 'hsl(var(--chart-2))',
  },
  admob: {
    label: 'AdMob',
    color: 'hsl(var(--chart-3))',
  },
};

export function EarningBreakdownChart() {
  const [chartData, setChartData] = React.useState<MonthlyBreakdown[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState<string>('6');

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const months = parseInt(timeRange, 10);
      const data = await getMonthlyEarningsBreakdown(months);
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
            <CardTitle>Earning Breakdown</CardTitle>
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
              <Bar dataKey="apple" fill="var(--color-apple)" radius={4} />
              <Bar dataKey="android" fill="var(--color-android)" radius={4} />
              <Bar dataKey="admob" fill="var(--color-admob)" radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
