

'use client';

import * as React from 'react';
import { useForm, useFormContext, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { updateIosAppSettings, getIosAppSettings, getAppConfigSettings } from '@/app/(dashboard)/ios-app-settings/actions';
import type { App } from '@/app/(dashboard)/apps/data';
import type { IosAppSetting } from '@/app/(dashboard)/ios-app-settings/data';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Database,
  Hash,
  Megaphone,
  Navigation,
  Palette,
  Package,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Type,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChromePicker, type ColorResult } from 'react-color';
import { SimilarAppsTable } from './similar-apps-table';
import { AppVersionManager } from './app-version-manager';
import { FontSizeManager } from './font-size-manager';
import { Skeleton } from '../ui/skeleton';
import { Switch } from '../ui/switch';
import { cn } from '@/lib/utils';
import { AdmobSettingsManager } from './admob-settings-manager';
import { NavigationSettingsManager } from './navigation-settings-manager';
import { PromoSettingsManager } from './promo-settings-manager';

const formSchema = z.object({
  settings: z.array(
    z.object({
      id: z.any(),
      param: z.string(),
      category: z.string().nullable().optional(),
      int_value: z.coerce.number().nullable(),
      string_value: z.string().nullable(),
      date_value: z.string().nullable().optional(),
      comment: z.string().nullable(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

function formatSettingLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function hasIntValue(setting: IosAppSetting) {
  return setting.int_value !== null && setting.int_value !== undefined;
}

function hasStringValue(setting: IosAppSetting) {
  return setting.string_value !== null && setting.string_value !== undefined;
}

function isToggleSetting(setting: IosAppSetting) {
  return (setting.int_value === 0 || setting.int_value === 1) && !hasStringValue(setting);
}

function getSettingKind(setting: IosAppSetting) {
  if (isToggleSetting(setting)) {
    return { label: 'Flag', Icon: Zap };
  }

  if (hasIntValue(setting)) {
    return { label: 'Number', Icon: Hash };
  }

  return { label: 'Text', Icon: Type };
}

interface SettingsGroupProps {
    title: string;
    description: string;
    paramFilter?: string[];
    excludeParams?: string[];
    appDbName: string;
    fetcher: (dbName: string) => Promise<{ settings: IosAppSetting[], error?: string }>;
}

const SettingsGroup = ({
    title,
    description,
    paramFilter,
    excludeParams,
    appDbName,
    fetcher
}: SettingsGroupProps) => {
    const [fields, setFields] = React.useState<IosAppSetting[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const { control, setValue, getValues } = useFormContext<FormValues>();

    React.useEffect(() => {
        const fetchAndSetSettings = async () => {
            setLoading(true);
            setError(null);
            let result: Awaited<ReturnType<typeof fetcher>>;
            try {
                result = await fetcher(appDbName);
            } catch (error: any) {
                setError(error?.message || `Failed to load ${title}.`);
                setLoading(false);
                return;
            }

            if (!result || !Array.isArray(result.settings)) {
                setError(`Failed to load ${title}. Invalid settings response.`);
                setLoading(false);
                return;
            }

            const { settings, error: fetchError } = result;
            if (fetchError) {
                setError(fetchError);
            } else {
                let filteredSettings = settings;

                if (paramFilter) {
                    filteredSettings = settings.filter(s => paramFilter.includes(s.param));
                } else if (excludeParams) {
                    filteredSettings = settings.filter(s => !excludeParams.includes(s.param));
                }

                setFields(filteredSettings);

                const allFormSettings = getValues('settings') || [];
                let newFormSettings = [...allFormSettings];

                filteredSettings.forEach(setting => {
                    const uniqueId = setting.id || setting.param;
                    const existingIndex = newFormSettings.findIndex(s => (s.id || s.param) === uniqueId);
                    
                    const newSetting = {
                        id: uniqueId,
                        param: setting.param,
                        category: setting.category ?? null,
                        int_value: setting.int_value,
                        string_value: setting.string_value,
                        date_value: setting.date_value ?? null,
                        comment: setting.comment,
                    };

                    if (existingIndex > -1) {
                        newFormSettings[existingIndex] = newSetting;
                    } else {
                        newFormSettings.push(newSetting);
                    }
                });
                setValue('settings', newFormSettings, { shouldDirty: true });
            }
            setLoading(false);
        };

        fetchAndSetSettings();
    }, [appDbName, paramFilter, excludeParams, setValue, getValues, fetcher]);


    const isColor = (value: string | null | undefined): boolean => {
        if (!value) return false;
        return /^#([0-9A-F]{3}){1,2}$/i.test(value);
    };

    const isImageUrl = (value: string | null | undefined): boolean => {
        if (!value) return false;
        return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(value.toLowerCase());
    }
    
    if (loading) {
        return (
            <Card className="overflow-hidden rounded-2xl border-white/10 bg-card/80 shadow-sm">
                <CardHeader className="border-b border-white/10 bg-gradient-to-r from-white/[0.045] to-transparent px-5 py-4">
                    <CardTitle>{title}</CardTitle>
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
                <CardContent className="p-4">
                    <Skeleton className="h-28 w-full rounded-2xl" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
         return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load {title}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )
    }

     const isGeneralConfig = title === 'General App Configuration';
    
    return (
     <Card className="overflow-hidden rounded-2xl border-white/10 bg-card/80 shadow-sm">
        <CardHeader className="gap-4 border-b border-white/10 bg-gradient-to-r from-white/[0.045] to-transparent px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1.5 border-blue-400/20 bg-blue-500/[0.10] px-2.5 py-1 text-xs text-blue-100">
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        {fields.length} settings
                    </Badge>
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </div>
            {isGeneralConfig && (
                <Button size="sm" type="submit" className="h-10 rounded-full bg-blue-600 px-4 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500">
                    <Save className="mr-2 h-4 w-4" />
                    Save General Config
                </Button>
            )}
        </CardHeader>
        <CardContent className={cn("p-4", !isGeneralConfig && "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3")}>
	             {isGeneralConfig ? (
	                 <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 shadow-sm">
                        <div className="hidden grid-cols-[minmax(280px,1fr)_minmax(260px,0.9fr)] border-b border-white/10 bg-white/[0.045] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                            <div>Setting</div>
                            <div>Value</div>
                        </div>
	                     {fields.map(field => {
	                         const uniqueId = field.id || field.param;
	                         const originalIndex = getValues('settings').findIndex(f => (f.id || f.param) === uniqueId);
	                         if (originalIndex === -1) return null;

	                         const isToggle = isToggleSetting(field);
                             const kind = getSettingKind(field);
                             const KindIcon = kind.Icon;

	                         return (
	                            <div key={uniqueId} className="relative grid gap-3 border-b border-white/10 bg-background/40 px-4 py-3.5 last:border-b-0 before:absolute before:left-0 before:top-3 before:h-[calc(100%-24px)] before:w-0.5 before:rounded-full before:bg-blue-400 hover:bg-white/[0.035] md:grid-cols-[minmax(280px,1fr)_minmax(260px,0.9fr)] md:items-center">
	                                <div className="min-w-0 space-y-1">
	                                    <div className="flex flex-wrap items-center gap-2">
	                                        <h3 className="text-sm font-semibold leading-tight text-foreground">{formatSettingLabel(field.param)}</h3>
                                            <Badge variant="outline" className="max-w-full truncate border-white/10 bg-white/[0.04] px-2 py-0 font-mono text-[10px] leading-5 text-muted-foreground">
                                                {field.param}
                                            </Badge>
	                                        {field.category && <span className="rounded-full border border-white/10 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{field.category}</span>}
                                            <span className="inline-flex h-5 items-center gap-1 rounded-full border border-blue-400/20 bg-blue-500/[0.10] px-2 text-[10px] font-semibold uppercase tracking-wide text-blue-100">
                                                <KindIcon className="h-3 w-3" />
                                                {kind.label}
                                            </span>
	                                    </div>
	                                    {field.comment && <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{field.comment}</p>}
	                                </div>
	                                <div className="min-w-0">
                                        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Value</div>
	                                    <div className="flex items-center gap-3">
	                                     {field.string_value !== null && !isColor(field.string_value) && !isImageUrl(field.string_value) && (
	                                         <FormField
	                                            control={control}
	                                            name={`settings.${originalIndex}.string_value`}
	                                            render={({ field: formField }) => (
	                                                <FormItem className="flex-1">
	                                                    <FormControl><Input className="h-9 rounded-lg border-white/10 bg-background/80 font-mono text-xs focus-visible:ring-blue-500/60" {...formField} value={formField.value ?? ''} placeholder="String Value" /></FormControl>
	                                                </FormItem>
	                                            )}
	                                        />
                                     )}
                                     {field.int_value !== null && (
                                         isToggle ? (
                                              <FormField
                                                control={control}
	                                                name={`settings.${originalIndex}.int_value`}
	                                                render={({ field: formField }) => (
	                                                    <FormItem className="w-full space-y-0">
	                                                        <FormControl>
                                                                <div className={cn('flex h-9 items-center justify-between gap-3 rounded-lg border px-3 shadow-inner', formField.value === 1 ? 'border-emerald-400/20 bg-emerald-500/[0.08]' : 'border-white/10 bg-background/80')}>
                                                                    <span className="text-xs font-semibold text-muted-foreground">{formField.value === 1 ? 'On' : 'Off'}</span>
	                                                                <Switch
	                                                                    className="h-5 w-9 data-[state=checked]:bg-emerald-500"
	                                                                    checked={formField.value === 1}
	                                                                    onCheckedChange={(checked) => formField.onChange(checked ? 1 : 0)}
	                                                                />
                                                                </div>
	                                                        </FormControl>
	                                                    </FormItem>
	                                                )}
                                            />
                                         ) : (
                                            <FormField
                                                control={control}
	                                                name={`settings.${originalIndex}.int_value`}
	                                                render={({ field: formField }) => (
	                                                    <FormItem className="flex-1">
	                                                        <FormControl><Input className="h-9 rounded-lg border-white/10 bg-background/80 font-mono text-sm focus-visible:ring-blue-500/60" type="number" {...formField} value={formField.value ?? ''} placeholder="Integer Value" onChange={e => formField.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl>
	                                                    </FormItem>
	                                                )}
	                                            />
                                         )
                                     )}
	                                    </div>
	                                </div>
	                            </div>
	                         )
	                     })}
                 </div>
            ) : (
                fields.map((field) => {
                    const uniqueId = field.id || field.param;
                    const originalIndex = getValues('settings').findIndex(f => (f.id || f.param) === uniqueId);
                    if (originalIndex === -1) return null;
                    
	                    return (
	                        <div key={uniqueId} className="space-y-3 rounded-xl border border-white/10 bg-background/60 p-4 shadow-sm transition-colors hover:border-blue-400/20 hover:bg-white/[0.035]">
	                            <div className="flex flex-wrap items-center gap-2">
	                                <h3 className="text-sm font-semibold leading-tight">{formatSettingLabel(field.param)}</h3>
                                    <Badge variant="outline" className="max-w-full truncate border-white/10 bg-white/[0.04] px-2 py-0 font-mono text-[10px] leading-5 text-muted-foreground">
                                        {field.param}
                                    </Badge>
	                                {field.category && <span className="rounded-full border border-white/10 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{field.category}</span>}
	                            </div>
	                            {field.comment && <p className="min-h-8 text-xs text-muted-foreground">{field.comment}</p>}
                            
                            <FormField
                                control={control}
                                name={`settings.${originalIndex}.string_value`}
                                render={({ field: formField }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">String Value</FormLabel>
	                                        {isColor(formField.value) ? (
	                                            <Popover>
	                                                <PopoverTrigger asChild>
	                                                    <FormControl>
	                                                        <Button
	                                                            variant="outline"
	                                                            className="h-9 w-full justify-start rounded-lg border-white/10 bg-background/80 font-mono text-xs hover:bg-white/[0.06]"
	                                                        >
	                                                            <div className="flex items-center gap-2">
	                                                                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: formField.value || undefined }} />
                                                                {formField.value}
                                                            </div>
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 border-0">
                                                    <ChromePicker
                                                        color={formField.value || ''}
                                                        onChange={(color: ColorResult) => formField.onChange(color.hex)}
                                                        disableAlpha
                                                    />
                                                </PopoverContent>
	                                            </Popover>
	                                        ) : isImageUrl(formField.value) ? (
	                                            <div className="flex items-center gap-2">
	                                                <Image src={formField.value!} alt="logo" width={40} height={40} className="h-10 w-10 rounded-lg border border-white/10 object-cover" />
	                                                <FormControl><Input className="h-9 rounded-lg border-white/10 bg-background/80 font-mono text-xs focus-visible:ring-blue-500/60" {...formField} value={formField.value ?? ''} /></FormControl>
	                                            </div>
	                                        ) : (
	                                            <FormControl><Input className="h-9 rounded-lg border-white/10 bg-background/80 font-mono text-xs focus-visible:ring-blue-500/60" {...formField} value={formField.value ?? ''} /></FormControl>
	                                        )}
                                    </FormItem>
                                )}
                            />
                            
                            {field.int_value !== null && (
                                <FormField control={control} name={`settings.${originalIndex}.int_value`} render={({ field: formField }) => (
	                                    <FormItem>
	                                        <FormLabel className="text-xs">Integer Value</FormLabel>
	                                        <FormControl><Input className="h-9 rounded-lg border-white/10 bg-background/80 font-mono text-sm focus-visible:ring-blue-500/60" type="number" {...formField} value={formField.value ?? ''} onChange={e => formField.onChange(e.target.value === '' ? null : e.target.valueAsNumber)} /></FormControl>
	                                    </FormItem>
                                )}/>
                            )}
                        </div>
                    )
                })
            )}
            {fields.length === 0 && <p className="col-span-full rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">No specific settings found for this group.</p>}
        </CardContent>
    </Card>
    )
};


interface IosSettingsFormProps {
  app: App;
  initialSettings: IosAppSetting[];
  apiError?: string;
}

const adMobParams = ['ADMOB_APP_ID', 'ADMOB_BANNER_ADS_ID', 'ADMOB_INTERSTITIAL_AD_ID', 'ADMOB_NATIVE_ADS_ID', 'ADMOB_REWARD_ADS_ID', 'ADMOB_APP_OPEN_AD_ID'];
const themeParams = ['APP_THEME_COLOR', 'COMPANY_LOGO', 'SPLASH_RERMEDAPPS_TEXT_COLOR_LIGHT', 'SPLASH_RERMEDAPPS_TEXT_COLOR_DARK', 'SPLASH_APP_NAME_TEXT_COLOR_LIGHT', 'SPLASH_APP_NAME_TEXT_COLOR_DARK', 'HOME_TOPBAR_RERMEDAPPS_TEXT_COLOR_LIGHT', 'HOME_TOPBAR_RERMEDAPPS_TEXT_COLOR_DARK', 'HOME_BOTTOMBAR_APP_NAME_TEXT_COLOR_LIGHT', 'HOME_BOTTOMBAR_APP_NAME_TEXT_COLOR_DARK', 'HOME_CARD_IMAGE_BACKGROUND_COLOR', 'HOME_CARD_BUTTON_BACKGROUND_COLOR', 'HOME_CARD_BUTTON_TEXT_COLOR', 'DIALOG_BUTTON_BACKGROUND_COLOR'];
const localizationParams = ['APP_NAME_ENGLISH', 'APP_NAME_GERMAN', 'APP_NAME_SPANISH', 'APP_NAME_FRENCH', 'APP_NAME_PORTUGAL', 'APP_NAME_RUSSIAN', 'APP_NAME_CHINESE', 'APP_NAME_JAPANESE', 'APP_NAME_KOREAN', 'APP_NAME_ITALIAN', 'APP_NAME_INDONESIAN', 'APP_NAME_VIETNAMESE', 'APP_NAME_TURKISH'];

const allCategorizedParams = [...adMobParams, ...themeParams, ...localizationParams];

function IosSettingsFormContent({ app, apiError: formApiError }: IosSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();
  const form = useFormContext<FormValues>();
  const tabs = [
    { value: 'app-config', label: 'App Config', icon: Smartphone },
    { value: 'admob', label: 'AdMob', icon: ShieldCheck },
    { value: 'branding', label: 'Branding', icon: Palette },
    { value: 'promo', label: 'Promo', icon: Megaphone },
    { value: 'navigation', label: 'Navigation', icon: Navigation },
    { value: 'similar_apps', label: 'Similar Apps', icon: Package },
  ];

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const result = await updateIosAppSettings({ dbName: app.id, settings: data.settings });
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Settings have been updated.' });
    }
    setIsSubmitting(false);
  };

	  return (
	    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
	        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-4 shadow-sm">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/[0.14] via-transparent to-transparent" />
	            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
	                <div className="flex min-w-0 items-center gap-4">
	                    <Image src={app.icon_url} alt={app.name} width={56} height={56} className="h-14 w-14 rounded-2xl border border-white/10 bg-white/[0.04] object-cover shadow-sm" data-ai-hint="app icon" />
	                    <div className="min-w-0">
	                        <div className="flex flex-wrap items-center gap-2">
	                            <h1 className="truncate text-2xl font-bold tracking-tight">{app.name}</h1>
	                            <Badge variant="outline" className="gap-1 border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-100">
	                                <BadgeCheck className="h-3.5 w-3.5" />
	                                Live iOS
	                            </Badge>
                                <Badge variant="outline" className="gap-1 border-blue-400/20 bg-blue-500/[0.10] text-blue-100">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    iOS Control
                                </Badge>
	                        </div>
	                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
	                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
	                                <Database className="h-3.5 w-3.5 shrink-0" />
	                                <code className="truncate font-mono">{app.db_name}</code>
	                            </span>
	                            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
	                                <Settings2 className="h-3.5 w-3.5 shrink-0" />
	                                <code className="truncate font-mono">{app.package_name}</code>
	                            </span>
                                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                                    <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                                    {form.watch('settings').length} settings
                                </span>
	                        </div>
	                    </div>
	                </div>
	                <div className="flex shrink-0 items-center gap-2">
	                <Button variant="outline" className="h-10 rounded-full border-white/10 bg-white/[0.035] px-4 hover:bg-white/[0.07]" asChild>
	                    <Link href="/ios-app-settings">
	                        <ArrowLeft className="mr-2 h-4 w-4" />
	                        Back to List
	                    </Link>
	                </Button>
	                <Button type="submit" disabled={isSubmitting} className="h-10 rounded-full bg-blue-600 px-5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500">
	                    {isSubmitting ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
	                    Save Changes
	                </Button>
	                </div>
	            </div>
	        </div>

        {formApiError && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to Load Initial Settings</AlertTitle>
                <AlertDescription>{formApiError}</AlertDescription>
            </Alert>
        )}

	        <Tabs defaultValue="app-config" className="space-y-5">
	            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-card/80 p-1 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
	                {tabs.map(({ value, label, icon: Icon }) => (
	                    <TabsTrigger key={value} value={value} className="h-10 rounded-xl text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-600/20">
	                        <Icon className="mr-2 h-4 w-4" />
	                        {label}
	                    </TabsTrigger>
                ))}
            </TabsList>
             <TabsContent value="app-config" className="space-y-6">
                <AppVersionManager appDbName={app.id} />
                 <SettingsGroup 
                    title="General App Configuration" 
                    description="General application settings and feature flags."
                    excludeParams={allCategorizedParams}
                    appDbName={app.id}
                    fetcher={getIosAppSettings}
                 />
            </TabsContent>
            <TabsContent value="admob">
                <AdmobSettingsManager appDbName={app.id} />
            </TabsContent>
            <TabsContent value="branding" className="space-y-6">
                 <SettingsGroup 
                    title="App Theme" 
                    description="Settings for splash screen and theme colors."
                    paramFilter={themeParams}
                    appDbName={app.id}
                    fetcher={getAppConfigSettings}
                />
                <FontSizeManager appDbName={app.id} />
                <SettingsGroup 
                    title="App Localization" 
                    description="Translations for the application name."
                    paramFilter={localizationParams}
                    appDbName={app.id}
                    fetcher={getAppConfigSettings}
                />
            </TabsContent>
            <TabsContent value="promo">
                <PromoSettingsManager appDbName={app.id} />
            </TabsContent>
            <TabsContent value="navigation">
                <NavigationSettingsManager appDbName={app.id} />
            </TabsContent>
            <TabsContent value="similar_apps">
                <SimilarAppsTable appDbName={app.id} />
            </TabsContent>
        </Tabs>
      </form>
  )
}


export function IosSettingsForm(props: IosSettingsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { settings: props.initialSettings || [] },
  });

  return (
    <FormProvider {...form}>
      <IosSettingsFormContent {...props} />
    </FormProvider>
  )
}

    

    
