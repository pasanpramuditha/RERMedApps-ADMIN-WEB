

'use client';

import * as React from 'react';
import { columns } from './columns';
import { UserReviewsDataTable } from '@/components/user-reviews/user-reviews-data-table';
import { getApps } from '../apps/actions';
import { getReviewsForApp } from './actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RotateCw } from 'lucide-react';
import type { Review } from './data';
import type { App } from '../apps/data';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';


export default function UserReviewsPage() {
    const [apps, setApps] = React.useState<App[]>([]);
    const [reviews, setReviews] = React.useState<Review[]>([]);
    
    const [loadingApps, setLoadingApps] = React.useState(true);
    const [loadingReviews, setLoadingReviews] = React.useState(false);

    const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchApps = async () => {
            setLoadingApps(true);
            const fetchedApps = await getApps();
            const androidApps = fetchedApps.filter(app => app.os === 'Android');
            setApps(androidApps);
            if (androidApps.length > 0) {
                setSelectedAppId(androidApps[0].id);
            }
            setLoadingApps(false);
        };
        fetchApps();
    }, []);


     
    const fetchReviews = React.useCallback(async () => {
        if (!selectedAppId) return;
        const selectedApp = apps.find(app => app.id === selectedAppId);
        if (!selectedApp) return;

        setLoadingReviews(true);
        setError(null);
        setReviews([]);

        const result = await getReviewsForApp(selectedApp);

        if ('error' in result) {
            setError(result.error);
        } else if ('reviews' in result) {
            setReviews(result.reviews);
            toast({
                title: "Reviews Fetched",
                description: `${result.reviews.length} review(s) loaded.`,
            });
        }

        setLoadingReviews(false);
    }, [selectedAppId, apps, toast]);

    React.useEffect(() => {
        if (selectedAppId) {
            fetchReviews();
        }
    }, [selectedAppId, fetchReviews]);


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">User Reviews</h1>
                <p className="text-muted-foreground">
                    Manage and respond to user reviews from the Google Play Store.
                </p>
            </div>

            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                     {loadingApps ? (
                        <Skeleton className="h-10 w-full sm:w-64" />
                    ) : (
                        <Select
                            value={selectedAppId ?? ''}
                            onValueChange={(value) => setSelectedAppId(value)}
                            disabled={apps.length === 0}
                        >
                            <SelectTrigger className="w-full sm:w-64">
                                <SelectValue placeholder="Select an Android App" />
                            </SelectTrigger>
                            <SelectContent>
                                {apps.map(app => (
                                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                     <Button onClick={fetchReviews} disabled={loadingReviews || !selectedAppId} className="w-full sm:w-auto sm:ml-auto">
                        <RotateCw className={`mr-2 h-4 w-4 ${loadingReviews ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Fetching Reviews</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <UserReviewsDataTable columns={columns} data={reviews} isLoading={loadingReviews} />
        </div>
    );
}
