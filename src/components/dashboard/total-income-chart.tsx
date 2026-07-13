
'use client';

import * as React from 'react';
import { Pie, PieChart, Cell } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { getTotalIncomeStats, type TotalIncomeStats } from '@/app/(dashboard)/dashboard/actions';
import { Skeleton } from '../ui/skeleton';

const chartConfig = {
  Android: { label: 'Play Store', color: 'hsl(var(--chart-2))' },
  Apple: { label: 'App Store', color: 'hsl(var(--chart-1))' },
  AdMob: { label: 'AdMob', color: 'hsl(var(--chart-3))' },
};

function formatCurrency(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
}

export function TotalIncomeChart() {
  const [stats, setStats] = React.useState<TotalIncomeStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const data = await getTotalIncomeStats();
      const chartData = data.breakdown.map(item => ({
          ...item,
          fill: (chartConfig as any)[item.source]?.color || 'hsl(var(--muted))'
      }));
      setStats({ ...data, breakdown: chartData });
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
       <Card className="flex flex-col h-full">
            <CardHeader className="items-center pb-0">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-1" />
            </CardHeader>
             <CardContent className="flex-1 flex items-center justify-center">
                <Skeleton className="w-48 h-48 rounded-full" />
            </CardContent>
            <CardFooter className="flex-col gap-4 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-center">
                    <Skeleton className="h-5 w-20 mx-auto" />
                    <Skeleton className="h-5 w-20 mx-auto" />
                    <Skeleton className="h-5 w-24 mx-auto" />
                    <Skeleton className="h-5 w-24 mx-auto" />
                    <Skeleton className="h-5 w-20 mx-auto" />
                    <Skeleton className="h-5 w-20 mx-auto" />
                </div>
            </CardFooter>
       </Card>
    )
  }

  if (!stats) return null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Total Income</CardTitle>
        <CardDescription>Lifetime, Monthly, and Yearly</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel 
                formatter={(value, name) => (
                    <div className="flex flex-col">
                        <span className="font-bold">{name}</span>
                        <span>{formatCurrency(value as number)}</span>
                    </div>
                )}
              />}
            />
            <Pie
              data={stats.breakdown}
              dataKey="value"
              nameKey="source"
              innerRadius={60}
              strokeWidth={5}
            >
                {stats.breakdown.map((entry) => (
                    <Cell key={entry.source} fill={entry.fill} />
                ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-4 text-sm">
        <div className="flex flex-col items-center w-full gap-2 text-center">
            <div className="text-foreground">Lifetime</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.lifetime)}</div>
        </div>
        <div className="grid grid-cols-2 w-full text-center">
            <div>
                <div className="text-muted-foreground">Last Month</div>
                <div className="font-semibold">{formatCurrency(stats.lastMonth)}</div>
            </div>
             <div>
                <div className="text-muted-foreground">This Year</div>
                <div className="font-semibold">{formatCurrency(stats.currentYear)}</div>
            </div>
        </div>
        <Separator className="my-2" />
        <div className="leading-none text-muted-foreground">
          Showing total income for all platforms.
        </div>
      </CardFooter>
    </Card>
  );
}
