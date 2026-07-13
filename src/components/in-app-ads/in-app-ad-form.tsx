

'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { getTemplateDetails, createInAppAd, updateInAppAd } from '@/app/(dashboard)/in-app-ads/actions';
import type { App } from '@/app/(dashboard)/apps/data';
import type { AdTemplate, InAppAd } from '@/app/(dashboard)/in-app-ads/data';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Info } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { inAppAdFormSchema, type InAppAdForm as InAppAdFormValues } from '@/app/(dashboard)/in-app-ads/data';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AdTemplatePreview } from '@/components/in-app-ads/ad-template-preview';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { MultiSelect } from '../ui/multi-select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';


const languages = [
    { code: 'all', name: 'All Languages' },
    { code: 'en', name: '🇺🇸 English' },
    { code: 'de', name: '🇩🇪 German' },
    { code: 'es', name: '🇪🇸 Spanish' },
    { code: 'fr', name: '🇫🇷 French' },
    { code: 'pt', name: '🇵🇹 Portuguese' },
    { code: 'ru', name: '🇷🇺 Russian' },
    { code: 'zh', name: '🇨🇳 Chinese' },
    { code: 'ja', name: '🇯🇵 Japanese' },
    { code: 'ko', name: '🇰🇷 Korean' },
    { code: 'it', name: '🇮🇹 Italian' },
    { code: 'id', name: '🇮🇩 Indonesian' },
    { code: 'vi', name: '🇻🇳 Vietnamese' },
    { code: 'tr', name: '🇹🇷 Turkish' },
    { code: 'th', name: '🇹🇭 Thai' },
];

const targetGroups = [
    { value: 'ALL', label: 'All Users' },
    { value: 'PREMIUM', label: 'Premium Users' },
    { value: 'PREMIUM_ACTIVE', label: 'Premium Active Users' },
    { value: 'NONPREMIUM', label: 'Non-Premium Users' },
    { value: 'NONPREMIUM_ACTIVE', label: 'Non-Premium Active Users' },
];

interface InAppAdFormProps {
    apps: App[];
    templates: AdTemplate[];
    isEditMode?: boolean;
    ad?: InAppAd;
}


export function InAppAdForm({ apps, templates, isEditMode = false, ad }: InAppAdFormProps) {
    const [templateDetails, setTemplateDetails] = React.useState<Pick<AdTemplate, 'platform' | 'android' | 'ios' | 'name'> | null>(null);
    const [loadingDetails, setLoadingDetails] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const [selectedPlatform, setSelectedPlatform] = React.useState<'android' | 'ios' | 'all'>(isEditMode ? ad!.platform.toLowerCase().split(' & ')[0] as 'android' | 'ios' : 'android');
    
    const { toast } = useToast();
    const router = useRouter();
    const { getToken } = useAuth();
    
    const isEditingActiveAd = isEditMode && ad?.status === 'Active';

    const form = useForm<InAppAdFormValues>({
        resolver: zodResolver(inAppAdFormSchema),
        defaultValues: isEditMode && ad ? {
            targetApps: [ad.appId],
            templateId: ad.templateId,
            templateName: ad.templateName,
            startDate: ad.startDate,
            endDate: ad.endDate,
            oneTime: ad.oneTime,
            targetGroup: ad.targetGroup as InAppAdFormValues['targetGroup'],
            language: ad.language as InAppAdFormValues['language'],
            android: ad.android,
            ios: ad.ios,
        } : {
            targetApps: [],
            templateId: '',
            templateName: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: addDays(new Date(), 1).toISOString().split('T')[0],
            oneTime: false,
            targetGroup: 'ALL',
            language: 'all',
            android: undefined,
            ios: undefined,
        }
    });

    const selectedTemplateId = form.watch('templateId');

    React.useEffect(() => {
        async function fetchTemplateDetails() {
            if (!selectedTemplateId) {
                setTemplateDetails(null);
                return;
            }
            setLoadingDetails(true);
            const details = await getTemplateDetails(selectedTemplateId);
            const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
            
            if (details && selectedTemplate) {
                 setTemplateDetails({ ...details, name: selectedTemplate.name });
                 form.setValue('templateName', selectedTemplate.name);
                 form.setValue('android', details.android);
                 form.setValue('ios', details.ios);
            }
           
            setLoadingDetails(false);
        }
        fetchTemplateDetails();
    }, [selectedTemplateId, form, templates]);

    const handlePlatformChange = (platform: 'android' | 'ios') => {
        setSelectedPlatform(platform);
        form.setValue('targetApps', []);
        form.setValue('templateId', '');
    };

    const filteredApps = React.useMemo(() => {
        if (selectedPlatform === 'all') return apps;
        const platformKey = selectedPlatform === 'ios' ? 'iOS' : 'Android';
        return apps.filter(app => app.os === platformKey || app.os === 'Android & iOS');
    }, [apps, selectedPlatform]);
    

    const filteredTemplates = React.useMemo(() => {
        if (selectedPlatform === 'all') return templates;
        return templates.filter(template => template.platform === selectedPlatform);
    }, [templates, selectedPlatform]);
    
    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        const idToken = await getToken();
        
        const result = isEditMode
            ? await updateInAppAd(ad!.id, data, idToken)
            : await createInAppAd(data, idToken);
            
        setIsSubmitting(false);
        if (result.error) {
            toast({ title: 'Error', description: `Failed to ${isEditMode ? 'update' : 'create'} in-app ad.`, variant: 'destructive' });
        } else {
            toast({ title: 'Success!', description: `In-app ad ${isEditMode ? 'updated' : 'created'} successfully.` });
            router.push('/in-app-ads');
            router.refresh();
        }
    };
    
    const appOptions = React.useMemo(() => {
        return filteredApps.map(app => ({
            value: app.id,
            label: app.name,
            icon: <Image src={app.icon_url} alt={app.name} width={20} height={20} className="rounded-sm" data-ai-hint="app icon" />
        }));
    }, [filteredApps]);

     const StatusBadge = () => {
        if (!isEditMode || !ad) return null;

        const { status } = ad;
        let variant: "default" | "secondary" | "outline" | "destructive" = "outline";
        let className = "";

        if (status === 'Active') {
            variant = 'default';
            className = "bg-green-500/20 text-green-700 border-green-500/50";
        }
        if (status === 'Paused') variant = 'secondary';
        if (status === 'Pending') {
            variant = 'outline';
            className = "bg-yellow-500/10 text-yellow-700 border-yellow-500/50";
        }
        if (status === 'Expired') variant = 'secondary';
        if (status === 'Archived') variant = 'destructive';
        
        return <Badge variant={variant} className={className}>{status}</Badge>;
    }

    return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                   {isEditMode && ad && (
                        <div className="flex items-center gap-2">
                             <StatusBadge />
                        </div>
                   )}
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline" asChild><Link href="/in-app-ads">Cancel</Link></Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Spinner size="small" className="mr-2" />}
                        {isEditingActiveAd ? "Deploy Changes to Live" : (isEditMode ? "Save Changes" : "Create Ad")}
                    </Button>
                 </div>
            </div>
            
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>How It Works</AlertTitle>
                <AlertDescription>
                   When you click &quot;Create Ad&quot;, a new ad campaign record is created for each app you target. These campaigns start in a &quot;Pending&quot; state. You can then go to the main In-App Ads page to activate them for testing or publish them to production.
                </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                            <CardDescription>Select the platform, app, and template for your new ad.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <FormItem>
                                <FormLabel>Platform</FormLabel>
                                <Select onValueChange={(value: 'android' | 'ios') => handlePlatformChange(value)} value={selectedPlatform as string} disabled={isEditMode}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a platform..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="android">Android</SelectItem>
                                        <SelectItem value="ios">iOS</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>

                           <FormField
                                control={form.control}
                                name="targetApps"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target App(s)</FormLabel>
                                         <MultiSelect
                                            options={appOptions}
                                            selected={field.value}
                                            onChange={field.onChange}
                                            className="w-full"
                                            placeholder="Select apps to target..."
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            

                            <FormField control={form.control} name="templateId" render={({ field }) => ( <FormItem> <FormLabel>Template</FormLabel> <Select onValueChange={field.onChange} value={field.value} disabled={!templates || isEditMode}> <FormControl><SelectTrigger><SelectValue placeholder={!templates ? "Loading templates..." : "Select a template..."} /></SelectTrigger></FormControl> <SelectContent> {filteredTemplates.map(template => ( <SelectItem key={template.id || template.name} value={template.id || ''}>{template.name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                            
                             {isEditingActiveAd && templateDetails?.android && (
                                <FormField control={form.control} name="android.htmlContent" render={({ field }) => ( <FormItem> <FormLabel>HTML Content (Locked)</FormLabel> <FormControl><Textarea {...field} rows={10} readOnly /></FormControl> </FormItem> )}/>
                            )}
                             {isEditingActiveAd && templateDetails?.ios && (
                                <FormField control={form.control} name="ios.htmlContent" render={({ field }) => ( <FormItem> <FormLabel>HTML Content (Locked)</FormLabel> <FormControl><Textarea {...field} rows={10} readOnly /></FormControl> </FormItem> )}/>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valid From</FormLabel>
                                            <FormControl>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={new Date(field.value)} onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valid To</FormLabel>
                                            <FormControl>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={new Date(field.value)} onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField control={form.control} name="targetGroup" render={({ field }) => ( <FormItem> <FormLabel>Target Group</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select target group..." /></SelectTrigger></FormControl> <SelectContent> {targetGroups.map(group => (<SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="language" render={({ field }) => ( <FormItem> <FormLabel>Language</FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select language..." /></SelectTrigger></FormControl> <SelectContent> {languages.map(lang => (<SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>

                            <FormField
                                control={form.control}
                                name="oneTime"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                                    <FormLabel className="font-normal">Show as a one-time ad</FormLabel>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    </FormItem>
                                )}
                            />


                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Live Preview</CardTitle>
                            <CardDescription>This is how your ad will appear to users.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-2" style={{ height: '800px' }}>
                             <AdTemplatePreview 
                                isLoading={loadingDetails}
                                templateDetails={templateDetails}
                                selectedPlatform={selectedPlatform}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </form>
    </Form>
    );
}
