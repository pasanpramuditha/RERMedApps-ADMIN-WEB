'use client';

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
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
} from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"

const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: `Day ${i + 1}`,
    crashes: Math.floor(Math.random() * (50 - 5 + 1)) + 5,
  }));

const chartConfig = {
  crashes: {
    label: 'Crashes',
    color: 'hsl(var(--destructive))',
  },
};

export function CrashesOverTimeChart() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Crashes Over Time</CardTitle>
            <CardDescription>Showing data for the last 30 days.</CardDescription>
        </div>
        <Select defaultValue="30">
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a range" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="crashes"
              type="monotone"
              stroke="var(--color-crashes)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
