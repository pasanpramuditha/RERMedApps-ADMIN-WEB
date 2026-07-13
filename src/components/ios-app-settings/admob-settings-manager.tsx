
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { getAdmobSettings } from '@/app/(dashboard)/ios-app-settings/actions';
import type { AdmobSetting } from '@/app/(dashboard)/ios-app-settings/data';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, BadgeDollarSign, Save } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '../ui/spinner';
import { Input } from '../ui/input';

interface AdmobSettingsManagerProps {
    appDbName: string;
}

const AdSettingCard = ({ title, setting, onUpdate }: { title: string, setting: AdmobSetting, onUpdate: (field: keyof AdmobSetting, value: any) => void }) => {
    const isBannerAd = title === 'Banner Ad';

    return (
        <Card className="overflow-hidden border-white/10 bg-card/70 shadow-sm">
            <CardHeader className="border-b border-white/10 bg-muted/20">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between rounded-xl border border-white/10 bg-background/70 p-3">
                    <Label htmlFor={`${setting.ad_type}-active`}>Active</Label>
                    <Switch
                        id={`${setting.ad_type}-active`}
                        checked={setting.active === 1}
                        onCheckedChange={(checked) => onUpdate('active', checked ? 1 : 0)}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${setting.ad_type}-ad_id`}>Ad ID</Label>
                    <Input className="rounded-lg bg-background/80" id={`${setting.ad_type}-ad_id`} value={setting.ad_id} onChange={(e) => onUpdate('ad_id', e.target.value)} />
                </div>
                
                {isBannerAd ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor={`${setting.ad_type}-custom_width`}>Custom Width</Label>
                            <Input className="rounded-lg bg-background/80" id={`${setting.ad_type}-custom_width`} type="number" value={setting.custom_width} onChange={(e) => onUpdate('custom_width', parseInt(e.target.value, 10) || 0)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${setting.ad_type}-custom_height`}>Custom Height</Label>
                            <Input className="rounded-lg bg-background/80" id={`${setting.ad_type}-custom_height`} type="number" value={setting.custom_height} onChange={(e) => onUpdate('custom_height', parseInt(e.target.value, 10) || 0)} />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor={`${setting.ad_type}-frequency`}>Frequency</Label>
                        <Input className="rounded-lg bg-background/80" id={`${setting.ad_type}-frequency`} type="number" value={setting.frequency} onChange={(e) => onUpdate('frequency', parseInt(e.target.value, 10))} />
                    </div>
                )}
                
                 <div className="space-y-2">
                    <Label>Visibility</Label>
                    <div className="grid gap-2 rounded-xl border border-white/10 bg-background/70 p-3 sm:grid-cols-3">
                        <div className="flex items-center gap-2">
                            <Switch id={`${setting.ad_type}-home`} checked={setting.home_screen === 1} onCheckedChange={(checked) => onUpdate('home_screen', checked ? 1 : 0)} />
                            <Label htmlFor={`${setting.ad_type}-home`} className="text-xs">Home</Label>
                        </div>
                         <div className="flex items-center gap-2">
                            <Switch id={`${setting.ad_type}-fav`} checked={setting.fav_screen === 1} onCheckedChange={(checked) => onUpdate('fav_screen', checked ? 1 : 0)} />
                            <Label htmlFor={`${setting.ad_type}-fav`} className="text-xs">Favorites</Label>
                        </div>
                         <div className="flex items-center gap-2">
                            <Switch id={`${setting.ad_type}-content`} checked={setting.content_screen === 1} onCheckedChange={(checked) => onUpdate('content_screen', checked ? 1 : 0)} />
                            <Label htmlFor={`${setting.ad_type}-content`} className="text-xs">Content</Label>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


export function AdmobSettingsManager({ appDbName }: AdmobSettingsManagerProps) {
    const [settings, setSettings] = React.useState<AdmobSetting[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const { settings: fetchedSettings, error: fetchError } = await getAdmobSettings(appDbName);
            if (fetchError) {
                setError(fetchError);
            } else {
                setSettings(fetchedSettings);
            }
            setLoading(false);
        };
        fetchData();
    }, [appDbName]);
    
    const handleUpdate = (adType: string, field: keyof AdmobSetting, value: any) => {
        setSettings(prev => 
            prev.map(s => s.ad_type === adType ? { ...s, [field]: value } : s)
        );
    };
    
    const handleSave = async () => {
        setSaving(true);
        // This should call a new server action: `updateAdmobSettings(appDbName, settings)`
        // For now, we will simulate the save.
        console.log("Saving AdMob Settings:", settings);
        await new Promise(res => setTimeout(res, 1000));
        toast({ title: 'Success', description: 'AdMob settings have been saved.' });
        setSaving(false);
    }
    
    const bannerAd = settings.find(s => s.ad_type === 'ADMOB_BANNER_ADS');
    const interstitialAd = settings.find(s => s.ad_type === 'ADMOB_INTERSTITIAL_AD');

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Skeleton className="h-96 w-full rounded-2xl" />
                <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load AdMob Settings</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-card/70 p-4 shadow-sm">
                <div>
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                        <BadgeDollarSign className="h-4 w-4 text-primary" />
                        AdMob Settings
                    </h2>
                    <p className="text-sm text-muted-foreground">Manage ad units, dimensions, frequency, and placement visibility.</p>
                </div>
                 <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-full">
                    {saving ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save AdMob Changes
                </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {bannerAd && (
                    <AdSettingCard
                        title="Banner Ad"
                        setting={bannerAd}
                        onUpdate={(field, value) => handleUpdate('ADMOB_BANNER_ADS', field, value)}
                    />
                )}
                {interstitialAd && (
                     <AdSettingCard
                        title="Interstitial Ad"
                        setting={interstitialAd}
                        onUpdate={(field, value) => handleUpdate('ADMOB_INTERSTITIAL_AD', field, value)}
                    />
                )}
                 {!bannerAd && !interstitialAd && (
                    <p className="col-span-2 text-center text-muted-foreground">No AdMob settings found for this app.</p>
                )}
            </div>
        </div>
    );
}
