
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { getNavigationSettings, saveNavigationSettings } from '@/app/(dashboard)/ios-app-settings/actions';
import type { NavigationSetting } from '@/app/(dashboard)/ios-app-settings/data';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Navigation, Save } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '../ui/spinner';

interface NavigationSettingsManagerProps {
    appDbName: string;
}

export function NavigationSettingsManager({ appDbName }: NavigationSettingsManagerProps) {
    const [settings, setSettings] = React.useState<NavigationSetting[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const { settings: fetchedSettings, error: fetchError } = await getNavigationSettings(appDbName);
            if (fetchError) {
                setError(fetchError);
            } else {
                setSettings(fetchedSettings);
            }
            setLoading(false);
        };
        fetchData();
    }, [appDbName]);

    const handleToggle = (param: string, value: boolean) => {
        setSettings(prev => 
            prev.map(s => s.param === param ? { ...s, active: value ? 1 : 0 } : s)
        );
    };
    
    const handleSave = async () => {
        setSaving(true);
        
        const result = await saveNavigationSettings(appDbName, settings);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Navigation settings have been saved.' });
        }
        setSaving(false);
    }

    if (loading) {
        return (
            <Card className="border-white/10 bg-card/70 shadow-sm">
                <CardHeader>
                    <CardTitle>Navigation Visibility</CardTitle>
                    <CardDescription>Control which navigation items are visible in the app.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load Navigation Settings</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }
    
    return (
        <Card className="overflow-hidden border-white/10 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-white/10 bg-muted/20">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Navigation className="h-4 w-4 text-primary" />
                        Navigation Visibility
                    </CardTitle>
                    <CardDescription>Control which navigation items are visible in the app.</CardDescription>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-full">
                    {saving ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                    {settings.map((setting) => (
                        <div key={setting.param} className="flex items-center justify-between rounded-xl border border-white/10 bg-background/70 p-4">
                            <div className="min-w-0">
                                <Label htmlFor={setting.param} className="block truncate text-sm font-semibold capitalize">
                                    {setting.param.replace(/_/g, ' ').toLowerCase()}
                                </Label>
                                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{setting.param}</p>
                            </div>
                            <Switch
                                id={setting.param}
                                checked={setting.active === 1}
                                onCheckedChange={(checked) => handleToggle(setting.param, checked)}
                            />
                        </div>
                    ))}
                    {settings.length === 0 && (
                        <p className="col-span-full rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">No navigation settings found for this app.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
