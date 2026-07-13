
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { getAppUpdateInfo, saveAppUpdateInfo } from '@/app/(dashboard)/ios-app-settings/actions';
import type { AppVersionSetting } from '@/app/(dashboard)/ios-app-settings/data';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Save, ShieldCheck } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '../ui/spinner';

interface AppVersionManagerProps {
    appDbName: string;
}

export function AppVersionManager({ appDbName }: AppVersionManagerProps) {
    const [versions, setVersions] = React.useState<AppVersionSetting[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const { versions: fetchedVersions, error: fetchError } = await getAppUpdateInfo(appDbName);
            if (fetchError) {
                setError(fetchError);
            } else {
                setVersions(fetchedVersions);
            }
            setLoading(false);
        };
        fetchData();
    }, [appDbName]);

    const handleToggle = (index: number, key: 'app_update' | 'mandatory' | 'maintenance', value: boolean) => {
        setVersions(prev => {
            const newVersions = [...prev];
            newVersions[index] = { ...newVersions[index], [key]: value ? 1 : 0 };
            return newVersions;
        });
    };
    
    const handleSave = async () => {
        setSaving(true);
        const result = await saveAppUpdateInfo(appDbName, versions);
        if (result.error) {
            toast({ title: 'Error', description: 'Failed to save app version settings.', variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'App version settings have been saved.' });
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <Card className="border-white/10 bg-card/70 shadow-sm">
                <CardHeader>
                    <CardTitle>Manage App Versions</CardTitle>
                    <CardDescription>Control update behavior for different app versions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load App Version Info</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }
    
    return (
        <Card className="overflow-hidden border-white/10 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-white/10 bg-muted/20">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Manage App Versions
                    </CardTitle>
                    <CardDescription>Control update behavior for different app versions.</CardDescription>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-full">
                    {saving ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="flow-root overflow-x-auto">
                    <div className="min-w-[640px] divide-y divide-white/10">
                        <div className="flex items-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <div className="w-24">Version</div>
                            <div className="flex-1 text-center">App Update</div>
                            <div className="flex-1 text-center">Mandatory</div>
                            <div className="flex-1 text-center">Maintenance</div>
                        </div>
                        {versions.map((version, index) => (
                             <div key={version.ver} className="flex items-center px-5 py-4 transition-colors hover:bg-muted/25">
                                <div className="w-24 font-medium">{version.ver.replace(/_/g, ' ')}</div>
                                <div className="flex-1 flex justify-center">
                                    <Switch
                                        checked={version.app_update === 1}
                                        onCheckedChange={(checked) => handleToggle(index, 'app_update', checked)}
                                    />
                                </div>
                                <div className="flex-1 flex justify-center">
                                     <Switch
                                        checked={version.mandatory === 1}
                                        onCheckedChange={(checked) => handleToggle(index, 'mandatory', checked)}
                                    />
                                </div>
                                <div className="flex-1 flex justify-center">
                                     <Switch
                                        checked={version.maintenance === 1}
                                        onCheckedChange={(checked) => handleToggle(index, 'maintenance', checked)}
                                    />
                                </div>
                            </div>
                        ))}
                         {versions.length === 0 && (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                No version settings found.
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
