

'use client';

import * as React from 'react';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
  } from '@/components/ui/card';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
  import Image from 'next/image';
import { getBestsellingApps, type AppRevenue } from '@/app/(dashboard)/dashboard/actions';
import { Skeleton } from '../ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Button } from '../ui/button';
import { Code } from 'lucide-react';
import { getGlobalSettings } from '@/app/(dashboard)/settings/actions';

  const formatDateRange = (start: Date, end: Date) => {
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };
  
interface BestSellingAppsProps {}

  export function BestSellingApps({}: BestSellingAppsProps) {
    const [period, setPeriod] = React.useState<'last-month' | 'this-year' | 'last-year'>('last-month');
    const [dateRangeText, setDateRangeText] = React.useState('');
    const [appData, setAppData] = React.useState<AppRevenue[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [showDebug, setShowDebug] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            setLoading(true);
            
            const settings = await getGlobalSettings();
            if (cancelled) return;
            setShowDebug(settings.debug_info_visibility || false);

            const timeZone = 'Asia/Colombo';
            const nowInColombo = toZonedTime(new Date(), timeZone);
            let start, end;

            switch (period) {
                case 'this-year':
                    start = startOfYear(nowInColombo);
                    end = endOfYear(nowInColombo);
                    break;
                case 'last-year':
                    const lastYear = subYears(nowInColombo, 1);
                    start = startOfYear(lastYear);
                    end = endOfYear(lastYear);
                    break;
                case 'last-month':
                default:
                    const lastMonth = subMonths(nowInColombo, 1);
                    start = startOfMonth(lastMonth);
                    end = endOfMonth(lastMonth);
                    break;
            }
            if (cancelled) return;
            setDateRangeText(formatDateRange(start, end));

            const fetchedData = await getBestsellingApps(period);
            if (cancelled) return;
            setAppData(fetchedData);
            setLoading(false);
        }

        fetchData();
        return () => {
            cancelled = true;
        };
    }, [period]);
    
    const topApps = appData.slice(0, 10);
    const maxRevenue = topApps.length > 0 ? Math.max(...topApps.map(app => app.revenue)) : 1;

    const BarSkeleton = () => (
        <div className="flex flex-col justify-end w-full h-full p-2 bg-muted rounded-lg">
            <Skeleton className="w-1/2 h-4 mx-auto mb-2" />
            <Skeleton className="w-full h-6" />
        </div>
    );

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Best Selling Apps</CardTitle>
              <CardDescription>
                <p className="text-xs text-muted-foreground/80 mt-1">{dateRangeText}</p>
              </CardDescription>
            </div>
            <Select
              value={period}
              onValueChange={(value) => setPeriod(value as 'last-month' | 'this-year' | 'last-year')}
              disabled={loading}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="this-year">This Year</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <div className="h-64 w-full flex items-end justify-between gap-2">
            {loading ? (
                Array.from({ length: 10 }).map((_, index) => <BarSkeleton key={index} />)
            ) : topApps.length > 0 ? (
                topApps.map((app, index) => (
                <div
                    key={app.name}
                    className="flex flex-col w-full text-white rounded-lg p-2 md:p-4 justify-center items-center text-center space-y-1 md:space-y-2"
                    style={{ 
                        height: `${Math.max((app.revenue / maxRevenue) * 100, 10)}%`,
                        backgroundColor: app.themeColor || '#3b82f6'
                    }}
                >
                    <div className="bg-white/20 p-1 md:p-2 rounded-full">
                        <Image src={app.icon} alt={app.name} width={24} height={24} className="rounded-full w-4 h-4 md:w-6 md:h-6" data-ai-hint="app icon" />
                    </div>
                    
                    <p className="text-sm md:text-lg font-bold">${Math.round(app.revenue)}</p>
                </div>
                ))
            ) : (
                <div className="w-full text-center text-muted-foreground">No sales data for this period.</div>
            )}
          </div>
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
                    <div className="mt-2 p-2 border rounded bg-muted/50 text-xs font-mono max-h-48 overflow-y-auto">
                        {appData?.map(app => (
                            <div key={app.name} className="mt-1">
                                <p><strong>{app.name}:</strong></p>
                                <ul className="pl-4">
                                    <li>Source Docs: {JSON.stringify(app.debug.docIds)}</li>
                                    <li>Values: {app.debug.values || '0'}</li>
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
