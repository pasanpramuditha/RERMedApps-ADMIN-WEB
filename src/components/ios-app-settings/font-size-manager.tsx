
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { getAppFontSizes, saveAppFontSizes } from '@/app/(dashboard)/ios-app-settings/actions';
import type { AppFontSizeSetting } from '@/app/(dashboard)/ios-app-settings/data';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Save, Type } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '../ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface FontSizeManagerProps {
    appDbName: string;
}

const FontSizeInputs = ({ deviceData, handleInputChange }: { deviceData: AppFontSizeSetting, handleInputChange: (device: string, field: keyof AppFontSizeSetting, value: number) => void }) => {
    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-4 rounded-xl border border-white/10 bg-background/70 p-4">
                <h4 className="font-semibold text-center">Small</h4>
                <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-heading-sm`}>Heading</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-heading-sm`} type="number" value={deviceData.heading_font_small_size} onChange={(e) => handleInputChange(deviceData.device, 'heading_font_small_size', parseInt(e.target.value,10))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-subheading-sm`}>Subheading</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-subheading-sm`} type="number" value={deviceData.subheading_font_small_size} onChange={(e) => handleInputChange(deviceData.device, 'subheading_font_small_size', parseInt(e.target.value,10))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-base-sm`}>Base</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-base-sm`} type="number" value={deviceData.base_font_small_size} onChange={(e) => handleInputChange(deviceData.device, 'base_font_small_size', parseInt(e.target.value,10))} />
                </div>
            </div>
             <div className="space-y-4 rounded-xl border border-white/10 bg-background/70 p-4">
                <h4 className="font-semibold text-center">Medium</h4>
                <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-heading-md`}>Heading</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-heading-md`} type="number" value={deviceData.heading_font_medium_size} onChange={(e) => handleInputChange(deviceData.device, 'heading_font_medium_size', parseInt(e.target.value,10))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-subheading-md`}>Subheading</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-subheading-md`} type="number" value={deviceData.subheading_font_medium_size} onChange={(e) => handleInputChange(deviceData.device, 'subheading_font_medium_size', parseInt(e.target.value,10))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-base-md`}>Base</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-base-md`} type="number" value={deviceData.base_font_medium_size} onChange={(e) => handleInputChange(deviceData.device, 'base_font_medium_size', parseInt(e.target.value,10))} />
                </div>
            </div>
             <div className="space-y-4 rounded-xl border border-white/10 bg-background/70 p-4">
                <h4 className="font-semibold text-center">Large</h4>
                <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-heading-lg`}>Heading</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-heading-lg`} type="number" value={deviceData.heading_font_large_size} onChange={(e) => handleInputChange(deviceData.device, 'heading_font_large_size', parseInt(e.target.value,10))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-subheading-lg`}>Subheading</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-subheading-lg`} type="number" value={deviceData.subheading_font_large_size} onChange={(e) => handleInputChange(deviceData.device, 'subheading_font_large_size', parseInt(e.target.value,10))} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor={`${deviceData.device}-base-lg`}>Base</Label>
                    <Input className="rounded-lg bg-background/80" id={`${deviceData.device}-base-lg`} type="number" value={deviceData.base_font_large_size} onChange={(e) => handleInputChange(deviceData.device, 'base_font_large_size', parseInt(e.target.value,10))} />
                </div>
            </div>
        </div>
    )
}

export function FontSizeManager({ appDbName }: FontSizeManagerProps) {
    const [fontSizes, setFontSizes] = React.useState<AppFontSizeSetting[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const { fontSizes: fetchedData, error: fetchError } = await getAppFontSizes(appDbName);
            if (fetchError) {
                setError(fetchError);
            } else {
                setFontSizes(fetchedData);
            }
            setLoading(false);
        };
        fetchData();
    }, [appDbName]);

    const handleInputChange = (device: string, field: keyof AppFontSizeSetting, value: number) => {
        setFontSizes(prev => prev.map(fs => fs.device === device ? { ...fs, [field]: value } : fs));
    }
    
    const handleSave = async () => {
        setSaving(true);
        const result = await saveAppFontSizes(appDbName, fontSizes);
        if (result.error) {
            toast({ title: 'Error', description: 'Failed to save font sizes.', variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Font sizes have been saved.' });
        }
        setSaving(false);
    }

    const phoneData = fontSizes.find(fs => fs.device === 'Phone');
    const tabData = fontSizes.find(fs => fs.device === 'Tab');

    if (loading) {
        return (
            <Card className="border-white/10 bg-card/70 shadow-sm">
                <CardHeader>
                    <CardTitle>Font Sizes</CardTitle>
                    <CardDescription>Manage dynamic font sizes for phone and tablet devices.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load Font Sizes</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }
    
    return (
        <Card className="overflow-hidden border-white/10 bg-card/70 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-white/10 bg-muted/20">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Type className="h-4 w-4 text-primary" />
                        Font Sizes
                    </CardTitle>
                    <CardDescription>Manage dynamic font sizes for phone and tablet devices.</CardDescription>
                </div>
                <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-full">
                    {saving ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Font Sizes
                </Button>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="phone">
                    <TabsList className="rounded-xl border border-white/10 bg-muted/30 p-1">
                        <TabsTrigger value="phone" className="rounded-lg">Phone</TabsTrigger>
                        <TabsTrigger value="tab" className="rounded-lg">Tablet</TabsTrigger>
                    </TabsList>
                    <TabsContent value="phone" className="mt-4">
                        {phoneData ? (
                             <FontSizeInputs deviceData={phoneData} handleInputChange={handleInputChange} />
                        ) : <p className="text-muted-foreground">No font settings found for Phone.</p>}
                    </TabsContent>
                    <TabsContent value="tab" className="mt-4">
                         {tabData ? (
                             <FontSizeInputs deviceData={tabData} handleInputChange={handleInputChange} />
                        ) : <p className="text-muted-foreground">No font settings found for Tablet.</p>}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
