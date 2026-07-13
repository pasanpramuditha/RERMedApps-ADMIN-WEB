

'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Rectangle,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAppRevenueBreakdown, type AppRevenueBreakdown } from '@/app/(dashboard)/dashboard/actions';
import { Skeleton } from '../ui/skeleton';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { Code } from 'lucide-react';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';

const chartConfig = {
  iosRevenue: {
    label: 'iOS (Apple)',
    color: 'hsl(var(--chart-1))',
  },
  androidRevenue: {
    label: 'Android (Google Play)',
    color: 'hsl(var(--chart-2))',
  },
  admobRevenue: {
    label: 'AdMob (Ads)',
    color: 'hsl(var(--chart-3))',
  },
};

type ChartData = {
    data: AppRevenueBreakdown[];
    docIds: { apple: string[]; android: string[]; admob: string[], adExpense: string[] };
};

const demoChartData: ChartData = {
    data: [
        { label: 'App A', iosRevenue: 2500, androidRevenue: 4500, admobRevenue: 1200, iosAdExpense: 400, androidAdExpense: 400, total: 8200, debug: { ios: { docId: '', values: '' }, android: { docId: '', values: '' }, admob: { docId: '', values: '' }, adExpense: {docId: '', values: '', logs: []} } },
        { label: 'App B', iosRevenue: 1500, androidRevenue: 3500, admobRevenue: 800, iosAdExpense: 200, androidAdExpense: 300, total: 5800, debug: { ios: { docId: '', values: '' }, android: { docId: '', values: '' }, admob: { docId: '', values: '' }, adExpense: {docId: '', values: '', logs: []} } },
        { label: 'App C', iosRevenue: 3500, androidRevenue: 2500, admobRevenue: 1500, iosAdExpense: 600, androidAdExpense: 400, total: 7500, debug: { ios: { docId: '', values: '' }, android: { docId: '', values: '' }, admob: { docId: '', values: '' }, adExpense: {docId: '', values: '', logs: []} } },
    ],
    docIds: { apple: ['earnings_2023_01'], android: ['earnings_2023_01'], admob: ['earnings_2023_01'], adExpense: ['ads_2023_01'] }
};


interface AppRevenueChartProps {
    demoMode?: boolean;
}

const CustomizedBar = (props: any) => {
  const { x, y, width, height, payload, dataKey } = props;
  
  if (width <= 0) return null;

  const totalRevenueForBar = payload[dataKey];
  if (totalRevenueForBar <= 0) return null;
  
  let adExpenseForBar = 0;
  if (dataKey === 'iosRevenue') {
      adExpenseForBar = payload.iosAdExpense || 0;
  } else if (dataKey === 'androidRevenue') {
      adExpenseForBar = payload.androidAdExpense || 0;
  }
  
  const expenseRatio = adExpenseForBar / totalRevenueForBar;
  const expenseWidth = width * expenseRatio;
  const profitWidth = width - expenseWidth;

  return (
    <g>
      <Rectangle {...props} width={profitWidth} />
      {expenseWidth > 0 && (
          <>
            <defs>
                <pattern id="pattern-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="4" height="8" transform="translate(0,0)" fill="hsl(var(--muted-foreground))" fillOpacity={0.5}></rect>
                </pattern>
            </defs>
            <rect
                x={x + profitWidth}
                y={y}
                width={expenseWidth}
                height={height}
                fill="url(#pattern-stripe)"
            />
          </>
      )}
    </g>
  );
};

export function AppRevenueChart({ demoMode = false }: AppRevenueChartProps) {
  const [chartData, setChartData] = React.useState<ChartData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<'last-month' | 'this-year' | 'last-year'>('last-month');
  const [dateRangeText, setDateRangeText] = React.useState('');
  const [showDebug, setShowDebug] = React.useState(false);


  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const settings = await getGlobalSettings();
      setShowDebug(settings.debug_info_visibility || false);

      const now = new Date();
      let start, end;

      switch (period) {
        case 'this-year':
            start = startOfYear(now);
            end = endOfYear(now);
            break;
        case 'last-year':
            const lastYear = subYears(now, 1);
            start = startOfYear(lastYear);
            end = endOfYear(lastYear);
            break;
        case 'last-month':
        default:
            const lastMonth = subMonths(now, 1);
            start = startOfMonth(lastMonth);
            end = endOfMonth(lastMonth);
            break;
      }
      setDateRangeText(`${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`);

      if (demoMode) {
        setChartData(demoChartData);
      } else {
        const result = await getAppRevenueBreakdown(period);
        setChartData(result);
      }
      setLoading(false);
    };
    fetchData();
  }, [period, demoMode]);
  
  const formatCurrency = (value: number) => {
    if (value === 0) return '$0';
    if (value < 1000) return `$${value.toFixed(2)}`;
    return `$${(value / 1000).toFixed(1)}K`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalExpense = (data.iosAdExpense || 0) + (data.androidAdExpense || 0);
      const totalRevenue = data.total;
      const net = totalRevenue - totalExpense;
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
          <div className="font-bold mb-1">{label}</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span>iOS Revenue:</span> <span className="font-mono">{formatCurrency(data.iosRevenue)}</span></div>
            <div className="flex justify-between"><span>Android Revenue:</span> <span className="font-mono">{formatCurrency(data.androidRevenue)}</span></div>
            <div className="flex justify-between"><span>AdMob Revenue:</span> <span className="font-mono">{formatCurrency(data.admobRevenue)}</span></div>
            <div className="border-t my-1"></div>
            <div className="flex justify-between font-medium"><span>Gross Revenue:</span> <span className="font-mono">{formatCurrency(totalRevenue)}</span></div>
            <div className="flex justify-between text-destructive"><span>Ad Expense:</span> <span className="font-mono">{formatCurrency(totalExpense)}</span></div>
            <div className="border-t my-1"></div>
            <div className="flex justify-between font-bold text-base"><span>Net Revenue:</span> <span className="font-mono">{formatCurrency(net)}</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>App Revenue Breakdown</CardTitle>
            <CardDescription>
            {dateRangeText}
            </CardDescription>
        </div>
        <Select value={period} onValueChange={(value) => setPeriod(value as any)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading || !chartData ? (
            <Skeleton className="h-[400px] w-full" />
        ) : (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                data={chartData.data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis 
                    type="category" 
                    dataKey="label" 
                    width={120} 
                    tick={{ fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} />
                <Legend />
                <Bar dataKey="iosRevenue" stackId="a" fill={chartConfig.iosRevenue.color} name={chartConfig.iosRevenue.label} shape={<CustomizedBar />} />
                <Bar dataKey="androidRevenue" stackId="a" fill={chartConfig.androidRevenue.color} name={chartConfig.androidRevenue.label} shape={<CustomizedBar />} />
                <Bar dataKey="admobRevenue" stackId="a" fill={chartConfig.admobRevenue.color} name={chartConfig.admobRevenue.label} shape={<CustomizedBar />} />
                </BarChart>
            </ResponsiveContainer>
        )}
      </CardContent>
       {showDebug && (
        <Collapsible className="px-6 pb-4">
              <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      <Code className="mr-2 h-3 w-3" />
                      Show/Hide Debug Info
                  </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                  <div className="mt-2 p-2 border rounded bg-muted/50 text-xs font-mono">
                      <h4 className="font-bold mb-1">Source Documents:</h4>
                      <p><strong>Apple Earnings:</strong> {JSON.stringify(chartData?.docIds.apple)}</p>
                      <p><strong>Android Earnings:</strong> {JSON.stringify(chartData?.docIds.android)}</p>
                      <p><strong>AdMob Earnings:</strong> {JSON.stringify(chartData?.docIds.admob)}</p>
                      <p><strong>Ad Expenses:</strong> {JSON.stringify(chartData?.docIds.adExpense)}</p>
                      <h4 className="font-bold mt-2 mb-1">Calculation Trace:</h4>
                      {chartData?.data.map(app => (
                          <div key={app.label} className="mt-1">
                              <p><strong>{app.label}:</strong></p>
                              <ul className="pl-4">
                                  <li>iOS: {app.debug.ios.values || '0'}</li>
                                  <li>Android: {app.debug.android.values || '0'}</li>
                                  <li>AdMob: {app.debug.admob.values || '0'}</li>
                                  <li>Ad Expense: {app.debug.adExpense.values || '0'}</li>
                                  {app.debug.adExpense.logs && app.debug.adExpense.logs.length > 0 && (
                                      <li>
                                          <p><strong>Ad Expense Logs:</strong></p>
                                          <ul className="pl-4">
                                              {app.debug.adExpense.logs.map((log, i) => <li key={i}>{log}</li>)}
                                          </ul>
                                      </li>
                                  )}
                              </ul>
                          </div>
                      ))}
                  </div>
              </CollapsibleContent>
          </Collapsible>
       )}
    </Card>
  );
}
