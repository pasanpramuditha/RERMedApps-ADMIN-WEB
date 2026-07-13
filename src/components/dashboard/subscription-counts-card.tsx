

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSubscriptionCountsForPeriod, type SubscriptionPeriod, type SubscriptionCounts } from '@/app/(dashboard)/dashboard/actions';
import { Skeleton } from '../ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ClipboardList } from 'lucide-react';
import { Spinner } from '../ui/spinner';

const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12" y1="18" y2="18"/></svg>
);

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M12 2a3 3 0 0 0-3 3c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.66-1.34-3-3-3Z"/></svg>
);


const SubscriptionRow = ({ color, label, value }: { color: string, label: string, value: number }) => (
    <li className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }}></span>
            <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-semibold">{value}</span>
    </li>
);

const platformConfig = {
    ios: {
        icon: AppleIcon,
        colors: {
            monthly: 'hsl(var(--chart-1))',
            yearly: 'hsl(var(--chart-2))',
            lifetime: 'hsl(var(--chart-3))',
            lifetime_offer: 'hsl(var(--chart-4))',
        }
    },
    android: {
        icon: AndroidIcon,
        colors: {
            monthly: 'hsl(var(--chart-1))',
            yearly: 'hsl(var(--chart-2))',
            lifetime: 'hsl(var(--chart-3))',
            lifetime_offer: 'hsl(var(--chart-4))',
        }
    }
};

interface SubscriptionCountsCardProps {
    demoMode: boolean;
    initialData: SubscriptionCounts;
    visibilityFlags?: Record<string, boolean>;
}

const demoSubscriptionData: SubscriptionCounts = {
    android: { monthly: 5, yearly: 2, lifetime: 1, lifetime_offer: 3 },
    ios: { monthly: 8, yearly: 4, lifetime: 2, lifetime_offer: 1 },
};

export function SubscriptionCountsCard({ demoMode, initialData, visibilityFlags }: SubscriptionCountsCardProps) {
    const [data, setData] = React.useState<SubscriptionCounts>(initialData);
    const [loading, setLoading] = React.useState(false);
    const [subscriptionPeriod, setSubscriptionPeriod] = React.useState<SubscriptionPeriod>('today');

    React.useEffect(() => {
        async function fetchData() {
            setLoading(true);
            if (demoMode) {
                setData(demoSubscriptionData);
            } else {
                const result = await getSubscriptionCountsForPeriod(subscriptionPeriod, visibilityFlags);
                setData(result);
            }
            setLoading(false);
        }
        
        // Don't fetch on initial mount for 'today' as we already have the data
        if (subscriptionPeriod !== 'today') {
            fetchData();
        }

    }, [demoMode, subscriptionPeriod]);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ClipboardList className="w-4 h-4"/> Subscription Counts
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {loading && <Spinner size="small" />}
                        <Select value={subscriptionPeriod} onValueChange={(v: SubscriptionPeriod) => setSubscriptionPeriod(v)}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="last7days">Last 7 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                     <div className="grid grid-cols-2 gap-x-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <AppleIcon className="w-5 h-5 text-muted-foreground" />
                                <h5 className="font-semibold text-sm">iOS</h5>
                            </div>
                            <ul className="space-y-1">
                                <SubscriptionRow color={platformConfig.ios.colors.monthly} label="Monthly" value={data.ios.monthly} />
                                <SubscriptionRow color={platformConfig.ios.colors.yearly} label="Yearly" value={data.ios.yearly} />
                                <SubscriptionRow color={platformConfig.ios.colors.lifetime} label="Lifetime" value={data.ios.lifetime} />
                                <SubscriptionRow color={platformConfig.ios.colors.lifetime_offer} label="Lifetime Offer" value={data.ios.lifetime_offer} />
                            </ul>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <AndroidIcon className="w-5 h-5 text-muted-foreground" />
                                <h5 className="font-semibold text-sm">Android</h5>
                            </div>
                            <ul className="space-y-1">
                                <SubscriptionRow color={platformConfig.android.colors.monthly} label="Monthly" value={data.android.monthly} />
                                <SubscriptionRow color={platformConfig.android.colors.yearly} label="Yearly" value={data.android.yearly} />
                                <SubscriptionRow color={platformConfig.android.colors.lifetime} label="Lifetime" value={data.android.lifetime} />
                                <SubscriptionRow color={platformConfig.android.colors.lifetime_offer} label="Lifetime Offer" value={data.android.lifetime_offer} />
                            </ul>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

