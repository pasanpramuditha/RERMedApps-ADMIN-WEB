
'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface CompactStatCardProps {
    title: string;
    value: string;
    change: string;
    icon: React.ReactNode;
    isLoading: boolean;
    onClick?: () => void;
    isActive?: boolean;
    chartData?: { name: string, value: number }[];
    chartColor?: string;
}

export function CompactStatCard({ title, value, change, icon, isLoading, onClick, isActive, chartData, chartColor = 'hsl(var(--primary))' }: CompactStatCardProps) {
    if (isLoading) {
        return <Skeleton className="h-24 w-full sm:w-80" />;
    }
    
    const chartId = React.useId().replace(/:/g, '');

    return (
        <Card 
            className={cn(
                "w-full sm:w-80 transition-all relative overflow-hidden",
                 onClick && 'cursor-pointer hover:bg-muted',
                 isActive && 'ring-2'
            )}
            style={isActive ? { '--tw-ring-color': chartColor } as React.CSSProperties : undefined}
            onClick={onClick}
        >
             {chartData && chartData.length > 1 && (
                <div className="absolute bottom-0 left-0 w-full h-1/2 opacity-20">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                             <defs>
                                <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke={chartColor} fillOpacity={1} fill={`url(#gradient-${chartId})`} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{change}</p>
            </CardContent>
        </Card>
    );
};
