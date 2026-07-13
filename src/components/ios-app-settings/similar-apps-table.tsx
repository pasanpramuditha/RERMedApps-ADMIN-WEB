

'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { getSimilarApps, updateSimilarAppVisibility } from '@/app/(dashboard)/ios-app-settings/actions';
import type { SimilarApp } from '@/app/(dashboard)/ios-app-settings/data';
import { Skeleton } from '../ui/skeleton';
import { Switch } from '../ui/switch';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Pencil, PlusCircle, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { EditSimilarAppDialog } from './edit-similar-app-dialog';
import { Input } from '../ui/input';

interface SimilarAppsTableProps {
    appDbName: string;
}

export function SimilarAppsTable({ appDbName }: SimilarAppsTableProps) {
    const [similarApps, setSimilarApps] = React.useState<SimilarApp[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [query, setQuery] = React.useState('');
    const { toast } = useToast();

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        const { similarApps: fetchedApps, error: fetchError } = await getSimilarApps(appDbName);
        if (fetchError) {
            setError(fetchError);
        } else {
            setSimilarApps(fetchedApps);
        }
        setLoading(false);
    }, [appDbName]);

    React.useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleVisibilityChange = async (appId: number, visible: boolean) => {
        const originalApps = [...similarApps];
        // Optimistic update
        setSimilarApps(prev => prev.map(app => app.id === appId ? { ...app, visible: visible ? 1 : 0 } : app));

        const result = await updateSimilarAppVisibility(appDbName, appId, visible);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
            // Revert on error
            setSimilarApps(originalApps);
        } else {
            toast({ title: 'Success', description: 'Visibility updated.' });
        }
    };

    const filteredApps = similarApps.filter(app =>
        app.app_name.toLowerCase().includes(query.toLowerCase()) ||
        String(app.apple_id).includes(query)
    );

    if (loading) {
        return (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-card/70 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
        )
    }

    if (error) {
        return (
             <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load Similar Apps</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return (
         <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/70 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-white/10 bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-base font-semibold">Similar Apps</h2>
                    <p className="text-sm text-muted-foreground">{filteredApps.length} of {similarApps.length} app(s)</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative min-w-[260px]">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search app or Apple ID..."
                            className="h-10 rounded-full border-white/10 bg-background/70 pl-9"
                        />
                    </div>
                <EditSimilarAppDialog onSave={fetchData} appDbName={appDbName}>
                    <Button className="rounded-full px-4">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Similar App
                    </Button>
                </EditSimilarAppDialog>
                </div>
            </div>
            <div className="flow-root overflow-x-auto">
                <div className="min-w-[760px] divide-y divide-white/10">
                    {/* Header */}
                    <div className="flex items-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <div className="flex-1 min-w-0">App</div>
                        <div className="w-36 text-left">Apple ID</div>
                        <div className="w-24 text-center">Visible</div>
                        <div className="w-20 text-right">Actions</div>
                    </div>
                    {/* Body */}
                    {filteredApps.map(app => (
                        <div key={app.id} className="flex items-center px-5 py-4 transition-colors hover:bg-muted/25">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <Image src={app.app_icon_url} alt={app.app_name} width={40} height={40} className="h-10 w-10 rounded-xl border border-white/10 object-cover" />
                                    <div className="min-w-0">
                                        <span className="block truncate font-medium">{app.app_name}</span>
                                        <span className="text-xs text-muted-foreground">iOS related app</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-36 text-left font-mono text-sm text-muted-foreground">{app.apple_id}</div>
                            <div className="w-24 flex justify-center">
                                <Switch
                                    checked={app.visible === 1}
                                    onCheckedChange={(checked) => handleVisibilityChange(app.id, checked)}
                                />
                            </div>
                            <div className="w-20 flex justify-end">
                                <EditSimilarAppDialog appDbName={appDbName} onSave={fetchData} isEditMode={true} appToEdit={app}>
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                </EditSimilarAppDialog>
                            </div>
                        </div>
                    ))}
                    {filteredApps.length === 0 && (
                        <div className="py-14 text-center text-sm text-muted-foreground">
                            {similarApps.length === 0 ? 'No similar apps configured.' : 'No apps match your search.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
