

'use client';

import * as React from 'react';
import { getApps } from '../apps/actions';
import { getRegisteredCounts, getRegisteredUsers } from './actions';
import type { RegisteredUser } from './data';
import type { App } from '../apps/data';
import { RegisteredUsersDataTable } from '@/components/register-user/register-user-data-table';
import { columns } from '@/components/register-user/columns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CalendarClock, History, RefreshCw, UserRoundCheck, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { AndroidAnalysisHelpDialog } from '@/components/dashboard/android-analysis-help-dialog';
import { differenceInHours } from 'date-fns';

type Period = 'today' | 'yesterday' | 'last7days' | 'this_month' | 'last_month' | 'last3months' | 'last6months' | 'last_year';
type UserFilter = 'all' | 'premium' | 'free';

const periodTabs: Array<{ value: Period; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last3months', label: 'Last 3 Months' },
    { value: 'last6months', label: 'Last 6 Months' },
    { value: 'last_year', label: 'Last Year' },
];

const refreshIntervals = [
    { value: '30', label: '30 seconds' },
    { value: '60', label: '1 minute' },
    { value: '300', label: '5 minutes' },
    { value: '900', label: '15 minutes' },
    { value: '1800', label: '30 minutes' },
];

const isReturningUser = (user: RegisteredUser): boolean => {
    try {
        const registeredDate = new Date(user.registered_date);
        const lastOnlineDate = new Date(user.last_online);
        return differenceInHours(lastOnlineDate, registeredDate) >= 24;
    } catch {
        return false;
    }
};


export default function RegisteredUserPage() {
    const [apps, setApps] = React.useState<App[]>([]);
    const [tabCounts, setTabCounts] = React.useState<Record<Period, number>>({
        today: 0,
        yesterday: 0,
        last7days: 0,
        this_month: 0,
        last_month: 0,
        last3months: 0,
        last6months: 0,
        last_year: 0,
    });
    const [loadedTabs, setLoadedTabs] = React.useState<Record<Period, boolean>>({
        today: false,
        yesterday: false,
        last7days: false,
        this_month: false,
        last_month: false,
        last3months: false,
        last6months: false,
        last_year: false,
    });
    const [allData, setAllData] = React.useState<Record<Period, RegisteredUser[]>>({
        today: [], yesterday: [], last7days: [], this_month: [], last_month: [], last3months: [], last6months: [], last_year: []
    });
    const [loading, setLoading] = React.useState(true);
    const [loadingPeriod, setLoadingPeriod] = React.useState<Period | null>(null);
    const [loadingCounts, setLoadingCounts] = React.useState(true);
    const [loadingApps, setLoadingApps] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [activeTab, setActiveTab] = React.useState<Period>('today');
    const [userFilter, setUserFilter] = React.useState<UserFilter>('all');
    const [autoRefreshInterval, setAutoRefreshInterval] = React.useState<string | null>(null);
    const [isAutoRefreshing, setIsAutoRefreshing] = React.useState(false);
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    const fetchDataForTab = React.useCallback(async (period: Period) => {
        setLoading(true);
        setLoadingPeriod(period);
        setError(null);
        const { users: userList, error: fetchError } = await getRegisteredUsers(period, '', apps);
        if (fetchError) {
            setError(fetchError);
        }
        setAllData(prev => ({...prev, [period]: userList}));
        setLoadedTabs(prev => ({ ...prev, [period]: true }));
        setLoadingPeriod(null);
        setLoading(false);
    }, [apps]);

    React.useEffect(() => {
        let isMounted = true;
        async function fetchAppRegistry() {
            setLoadingApps(true);
            const appList = await getApps();
            if (isMounted) {
                setApps(appList);
                setLoadingApps(false);
                if (appList.length === 0) {
                    setLoading(false);
                    setLoadingCounts(false);
                }
            }
        }
        fetchAppRegistry();
        return () => {
            isMounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!apps.length) {
            setLoadingCounts(false);
            return;
        }

        let isMounted = true;
        async function fetchCounts() {
            setLoadingCounts(true);
            const { counts, error: countsError } = await getRegisteredCounts(apps);
            if (!isMounted) return;
            setTabCounts(counts);
            if (countsError) {
                console.warn('Registered counts load failed:', countsError);
            }
            setLoadingCounts(false);
            setLoading(false);
        }

        fetchCounts();
        return () => {
            isMounted = false;
        };
    }, [apps]);

    React.useEffect(() => {
        if (loadingApps || loadingCounts || apps.length === 0 || loadedTabs[activeTab]) {
            return;
        }

        void fetchDataForTab(activeTab);
    }, [activeTab, apps.length, fetchDataForTab, loadedTabs, loadingApps, loadingCounts]);

    const handleTabChange = React.useCallback((value: string) => {
        const period = value as Period;
        setActiveTab(period);
        if (apps.length > 0 && !loadedTabs[period]) {
            void fetchDataForTab(period);
        }
    }, [apps, loadedTabs, fetchDataForTab]);
    

    React.useEffect(() => {
        if (isAutoRefreshing && autoRefreshInterval) {
            const intervalInMs = parseInt(autoRefreshInterval, 10) * 1000;
            intervalRef.current = setInterval(() => {
                toast({ title: "Auto-refreshing...", description: `Fetching latest data for ${activeTab}.`});
                fetchDataForTab(activeTab);
            }, intervalInMs);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    }, [isAutoRefreshing, autoRefreshInterval, activeTab, fetchDataForTab, toast]);

    const toggleAutoRefresh = () => {
        if (!autoRefreshInterval) {
            toast({ title: "Select an interval", description: "Please choose a refresh interval first.", variant: "destructive" });
            return;
        }
        setIsAutoRefreshing(prev => !prev);
    };

    const users = allData[activeTab];
    const activeTabLoaded = loadedTabs[activeTab];
    const activeTabLoading = loadingApps || loadingPeriod === activeTab || (loading && !activeTabLoaded);

    const visibleUsers = React.useMemo(() => {
        return users.filter((user) => {
            const isPremium = Number(user.purchase_count ?? 0) > 0 || Boolean(user.purchase_premium) || Number(user.premium) === 1;
            if (userFilter === 'premium') return isPremium;
            if (userFilter === 'free') return !isPremium;
            return true;
        });
    }, [users, userFilter]);

    const appInstallCountByEmail = React.useMemo(() => {
        const counts = new Map<string, Set<string>>();

        users.forEach((user) => {
            const email = user.email.trim().toLowerCase();
            if (!email) return;

            const bucket = counts.get(email) ?? new Set<string>();
            bucket.add(user.dbName || user.appId || user.appName);
            counts.set(email, bucket);
        });

        return new Map(Array.from(counts.entries()).map(([email, appsSet]) => [email, appsSet.size]));
    }, [users]);

    const returningUsersCount = React.useMemo(() => users.filter(user => isReturningUser(user)).length, [users]);

    return (
        <div className="min-h-screen space-y-5 bg-black pb-10 text-white">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/30">
                <div className="relative px-5 py-5 lg:px-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(34,197,94,0.22),transparent_34%),radial-gradient(circle_at_94%_5%,rgba(59,130,246,0.14),transparent_34%)]" />
                    <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-200">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-emerald-200/70">Android Registrations</p>
                                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Registered Users</h1>
                                <p className="mt-1 text-sm leading-5 text-white/50">
                                    Review newly registered Android users, return activity, device versions, and premium flags.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <AndroidAnalysisHelpDialog page="registered-users" />
                            <Select value={autoRefreshInterval || ''} onValueChange={setAutoRefreshInterval}>
                                <SelectTrigger className="h-10 w-full rounded-full border-white/10 bg-black/30 px-4 text-white shadow-none sm:w-44">
                                    <SelectValue placeholder="Auto-refresh" />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#101116] text-white">
                                    {refreshIntervals.map(interval => (
                                        <SelectItem key={interval.value} value={interval.value}>{interval.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={toggleAutoRefresh}
                                className="h-10 rounded-full bg-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
                                variant={isAutoRefreshing ? 'destructive' : 'default'}
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
                                {isAutoRefreshing ? 'Stop' : 'Start'}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <MetricCard
                    title="Returning Users"
                    description="Reopened the app after 24 hours"
                    value={returningUsersCount}
                    loading={loading || loadingApps}
                    icon={History}
                    tone="emerald"
                />
                <MetricCard
                    title="Total Registered"
                    description="New users in the selected period"
                    value={users.length}
                    loading={loading || loadingApps}
                    icon={UserRoundCheck}
                    tone="blue"
                />
                <MetricCard
                    title="Active Period"
                    description={periodTabs.find((tab) => tab.value === activeTab)?.label || activeTab}
                    value={loadedTabs[activeTab] ? users.length : tabCounts[activeTab]}
                    loading={loadingCounts || loadingApps}
                    icon={CalendarClock}
                    tone="violet"
                />
            </section>

            {error && (
                <Alert variant="destructive" className="rounded-2xl border-red-500/25 bg-red-500/10 text-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0b0c11] p-2">
                    <TabsList className="grid h-auto min-w-[1080px] grid-cols-8 gap-1 bg-transparent p-0">
                        {periodTabs.map(tab => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="h-10 rounded-xl border border-transparent px-3 text-white/55 data-[state=active]:border-blue-400/25 data-[state=active]:bg-blue-500/15 data-[state=active]:text-white"
                            >
                                {tab.label}
                                <Badge variant="secondary" className="ml-2 rounded-full border border-white/10 bg-black/35 px-2 text-[10px] text-white/75">
                                    {loadedTabs[tab.value] ? allData[tab.value].length : (loadingCounts ? '...' : tabCounts[tab.value])}
                                </Badge>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
                <div className="mt-4">
                    {!activeTabLoaded && !activeTabLoading && !loadingCounts ? (
                        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0b0c11] p-6 text-sm text-white/45">
                                Select another period or refresh to load records.
                        </div>
                    ) : (
                        <RegisteredUsersDataTable
                            totalCount={users.length}
                            activeFilter={userFilter}
                            onFilterChange={setUserFilter}
                            columns={columns({ isReturningUser: isReturningUser, activeTab, appInstallCountByEmail })}
                            data={visibleUsers}
                            isLoading={activeTabLoading || loadingCounts}
                            meta={{ onAction: () => fetchDataForTab(activeTab) }}
                        />
                    )}
                </div>
            </Tabs>
        </div>
    );
}

function MetricCard({
    title,
    description,
    value,
    loading,
    icon: Icon,
    tone,
}: {
    title: string;
    description: string;
    value: number;
    loading: boolean;
    icon: React.ElementType;
    tone: 'emerald' | 'blue' | 'violet';
}) {
    const toneClass = {
        emerald: 'border-emerald-400/20 bg-emerald-500/12 text-emerald-200',
        blue: 'border-blue-400/20 bg-blue-500/12 text-blue-200',
        violet: 'border-violet-400/20 bg-violet-500/12 text-violet-200',
    }[tone];

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0b0c11] p-4 shadow-xl shadow-black/20">
            <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="mt-1 truncate text-sm text-white/45">{description}</div>
                </div>
                {loading ? <Skeleton className="h-8 w-16 rounded-lg bg-white/[0.06]" /> : <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>}
            </div>
        </div>
    );
}
