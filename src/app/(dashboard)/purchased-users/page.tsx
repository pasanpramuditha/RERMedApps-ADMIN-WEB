'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle, X } from 'lucide-react';
import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import { getPurchasedCounts, getPurchasedUsers } from '../purchased-users/actions';
import type { PurchasedUser } from '../purchased-users/data';
import { PurchasedUsersDataTable } from '@/components/purchased-users/data-table';
import { columns } from '@/components/purchased-users/columns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type Period = 'today' | 'yesterday' | 'last7days';

const emptyCounts: Record<Period, number> = {
    today: 0,
    yesterday: 0,
    last7days: 0,
};

export default function AppPurchasesPage() {
    const [emailSearch, setEmailSearch] = React.useState('');
    const [apps, setApps] = React.useState<App[]>([]);
    const [counts, setCounts] = React.useState<Record<Period, number>>(emptyCounts);
    const [allUsers, setAllUsers] = React.useState<Record<Period, PurchasedUser[]>>({ today: [], yesterday: [], last7days: [] });
    const [loadedPeriods, setLoadedPeriods] = React.useState<Record<Period, boolean>>({ today: false, yesterday: false, last7days: false });
    const [filteredUsers, setFilteredUsers] = React.useState<PurchasedUser[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [activeTab, setActiveTab] = React.useState<Period>('today');
    const [isEmailSearchActive, setIsEmailSearchActive] = React.useState(false);

    const loadPeriod = React.useCallback(async (period: Period, appList: App[] = apps) => {
        if (loadedPeriods[period]) {
            setFilteredUsers(allUsers[period]);
            return;
        }

        if (!appList.length) {
            setError('App registry is still loading.');
            setLoading(false);
            return;
        }

        setLoading(true);
        const { users, error: fetchError } = await getPurchasedUsers(period, undefined, appList);
        if (fetchError) {
            setError(fetchError);
        }

        setAllUsers((prev) => ({ ...prev, [period]: users }));
        setLoadedPeriods((prev) => ({ ...prev, [period]: true }));
        setFilteredUsers(users);
        setLoading(false);
    }, [allUsers, apps, loadedPeriods]);

    const handleEmailSearch = React.useCallback(async (email: string) => {
        if (!email) return;
        setLoading(true);
        setError(null);
        setIsEmailSearchActive(true);

        const { users: userList, error: fetchError } = await getPurchasedUsers(undefined, email, apps);
        if (fetchError) {
            setError(fetchError);
        }
        setFilteredUsers(userList);
        setLoading(false);
    }, [apps]);

    const handleTabChange = React.useCallback((value: string) => {
        const period = value as Period;
        setActiveTab(period);
        if (isEmailSearchActive) {
            return;
        }
        void loadPeriod(period);
    }, [isEmailSearchActive, loadPeriod]);

    const handleClearSearch = React.useCallback(() => {
        setIsEmailSearchActive(false);
        setEmailSearch('');
        setFilteredUsers(allUsers[activeTab] || []);
    }, [activeTab, allUsers]);

    React.useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            setError(null);

            const appList = await getApps();
            setApps(appList);
            if (!appList.length) {
                setLoading(false);
                return;
            }

            void (async () => {
                const countsRes = await getPurchasedCounts(appList);
                if (countsRes.counts) {
                    setCounts(countsRes.counts);
                }
                if (countsRes.error) {
                    console.warn(countsRes.error);
                }
            })();

            const todayRes = await getPurchasedUsers('today', undefined, appList);
            setAllUsers((prev) => ({ ...prev, today: todayRes.users }));
            setLoadedPeriods((prev) => ({ ...prev, today: true }));
            setFilteredUsers(todayRes.users);

            if (todayRes.error) {
                setError(todayRes.error);
            }

            setLoading(false);
        };

        void fetchInitialData();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">App Purchases</h1>
                <p className="text-muted-foreground">
                    View users who have made purchases.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Search</CardTitle>
                    <CardDescription>
                        Search for a specific user by email across all time periods.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={(e) => { e.preventDefault(); void handleEmailSearch(emailSearch); }} className="flex flex-col sm:flex-row items-center gap-4">
                        <Input
                            placeholder="Search by email..."
                            value={emailSearch}
                            onChange={(e) => setEmailSearch(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <Button type="submit" disabled={loading || !emailSearch} className="w-full sm:w-auto">
                            <Search className="mr-2 h-4 w-4" />
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isEmailSearchActive ? (
                <div className="mt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Search Results for &quot;{emailSearch}&quot;</h2>
                        <Button variant="outline" onClick={handleClearSearch}>
                            <X className="mr-2 h-4 w-4" />
                            Clear Search
                        </Button>
                    </div>
                    <PurchasedUsersDataTable columns={columns} data={filteredUsers} isLoading={loading} />
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="today" className="flex items-center gap-2">
                            Today <Badge variant={activeTab === 'today' ? 'default' : 'secondary'}>{counts.today}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="yesterday" className="flex items-center gap-2">
                            Yesterday <Badge variant={activeTab === 'yesterday' ? 'default' : 'secondary'}>{counts.yesterday}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="last7days" className="flex items-center gap-2">
                            Last 7 Days <Badge variant={activeTab === 'last7days' ? 'default' : 'secondary'}>{counts.last7days}</Badge>
                        </TabsTrigger>
                    </TabsList>
                    <div className="mt-4">
                        <PurchasedUsersDataTable columns={columns} data={filteredUsers} isLoading={loading} />
                    </div>
                </Tabs>
            )}
        </div>
    );
}
