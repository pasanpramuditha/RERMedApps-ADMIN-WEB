'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChromePicker, type ColorResult } from 'react-color';
import { Database, FileKey2, Layers3, Palette, Save, Smartphone, MonitorSmartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

import { createApp, updateApp } from './actions';
import type { App, AppRegistryFamily, AppFamilyEditorValues } from './data';
import { appFamilyEditorSchema, appStatusOptions } from './data';

interface AppFamilyFormProps {
  family: AppRegistryFamily;
}

const DEFAULT_ICON = 'https://placehold.co/128x128.png';
const panelClassName = 'min-w-0 overflow-hidden border-white/10 bg-card/80 shadow-sm';
const fieldInputClassName = 'h-11 min-w-0 rounded-xl border-white/10 bg-black/30 px-4 text-sm shadow-inner shadow-black/10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0';
const sectionHeaderClassName = 'border-b border-white/10 bg-white/[0.025] p-5';
const sectionContentClassName = 'space-y-5 p-5';

function toDateInputValue(value?: string) {
  if (!value || value === '0000-00-00') {
    return '';
  }

  return value.slice(0, 10);
}

function variantToDefaults(app?: App): AppFamilyEditorValues['android'] {
  if (!app) {
    return {
      id: '',
      package_name: '',
      app_id: '',
      os: 'Android',
      current_ver: '',
      release_date: '',
      url: '',
      private_key: '',
      endpoint: '',
      client_id: '',
      client_email: '',
      status: 4,
      log_level: 0,
    };
  }

  return {
    id: app.id,
    package_name: app.package_name || '',
    app_id: app.app_id || '',
    os: app.os || 'Android',
    current_ver: app.current_ver || '',
    release_date: toDateInputValue(app.release_date),
    url: app.url || '',
    private_key: app.private_key || '',
    endpoint: app.endpoint || '',
    client_id: app.client_id || '',
    client_email: app.client_email || '',
    status: app.status ?? 4,
    log_level: app.log_level ?? 0,
  };
}

function isBlankVariant(variant?: AppFamilyEditorValues['android']) {
  if (!variant) {
    return true;
  }

  const meaningful = [
    variant.package_name,
    variant.app_id,
    variant.current_ver,
    variant.release_date,
    variant.url,
    variant.private_key,
    variant.endpoint,
    variant.client_id,
    variant.client_email,
  ].some((value) => (value || '').trim() !== '');

  return !meaningful && Number(variant.status ?? 4) === 4 && Number(variant.log_level ?? 0) === 0;
}

function variantPayload(base: AppFamilyEditorValues, variant: NonNullable<AppFamilyEditorValues['android']>) {
  return {
    package_name: variant.package_name,
    app_id: variant.app_id || '',
    db_name: base.db_name,
    name: base.name,
    theme_color: base.theme_color,
    current_ver: variant.current_ver || '',
    release_date: variant.release_date || '',
    paid: base.paid,
    os: variant.os,
    url: variant.url || '',
    private_key: variant.private_key || '',
    endpoint: variant.endpoint || '',
    client_id: variant.client_id || '',
    client_email: variant.client_email || '',
    app_order: base.app_order,
    icon_url: base.icon_url || '',
    landscapeSupport: base.landscapeSupport,
    status: variant.status,
    log_level: variant.log_level,
    server_folder: base.server_folder || '',
    auth_account: base.auth_account || '',
    nav_param: base.nav_param || '',
  };
}

export function AppFamilyForm({ family }: AppFamilyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { getToken } = useAuth();

  const form = useForm<AppFamilyEditorValues>({
    resolver: zodResolver(appFamilyEditorSchema),
    defaultValues: {
      db_name: family.db_name,
      name: family.name,
      theme_color: family.theme_color || '#2f6fed',
      icon_url: family.icon_url || '',
      app_order: family.app_order ?? 0,
      paid: family.paid ?? 0,
      landscapeSupport: family.landscapeSupport ? 1 : 0,
      server_folder: family.server_folder || '',
      auth_account: family.auth_account || family.android?.auth_account || family.ios?.auth_account || '',
      nav_param: family.nav_param || family.android?.nav_param || family.ios?.nav_param || '',
      android: variantToDefaults(family.android),
      ios: {
        ...variantToDefaults(family.ios),
        os: 'IOS',
      },
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const iconUrl = form.watch('icon_url');

  const onSubmit = async (data: AppFamilyEditorValues) => {
    setIsSubmitting(true);
    const idToken = await getToken();

    try {
      const jobs: Promise<unknown>[] = [];

      if (data.android && (family.android || !isBlankVariant(data.android))) {
        jobs.push(
          family.android
            ? updateApp(family.android.id, variantPayload(data, data.android), idToken || undefined)
            : createApp(variantPayload(data, data.android), idToken || undefined)
        );
      }

      if (data.ios && (family.ios || !isBlankVariant(data.ios))) {
        jobs.push(
          family.ios
            ? updateApp(family.ios.id, variantPayload(data, data.ios), idToken || undefined)
            : createApp(variantPayload(data, data.ios), idToken || undefined)
        );
      }

      const results = await Promise.all(jobs);
      const failure = results.find((result) => Boolean((result as { error?: string })?.error)) as { error?: string } | undefined;

      if (failure) {
        toast({
          title: 'Error saving app',
          description: failure.error || 'Failed to save one of the platform rows.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      toast({
        title: 'App updated',
        description: `${data.name} has been saved successfully.`,
      });
      router.push('/apps');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error saving app',
        description: 'Failed to save the app family.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const platformTab = (platform: 'android' | 'ios', icon: React.ReactNode) => (
    <TabsContent value={platform} className="mt-0">
      <Card className="rounded-t-none border-white/10 bg-black/20 shadow-none">
        <CardHeader className="border-b border-white/10 bg-white/[0.02] p-5">
          <CardTitle className="flex items-center gap-2 text-xl">
            {icon}
            {platform === 'android' ? 'Android' : 'iOS'}
          </CardTitle>
          <CardDescription>Platform-specific row stored in `fnd_app_details_tab`.</CardDescription>
        </CardHeader>
        <CardContent className={sectionContentClassName}>
          <FormField
            control={form.control}
            name={`${platform}.package_name`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Package Name</FormLabel>
                <FormControl>
                  <Input className={fieldInputClassName} placeholder={platform === 'android' ? 'com.example.android' : 'com.example.ios'} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {platform === 'ios' && (
            <FormField
              control={form.control}
              name={`${platform}.app_id`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apple App ID</FormLabel>
                  <FormControl>
                    <Input className={fieldInputClassName} placeholder="1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name={`${platform}.current_ver`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Version</FormLabel>
                  <FormControl>
                    <Input className={fieldInputClassName} placeholder="1.0.0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`${platform}.release_date`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Release Date</FormLabel>
                  <FormControl>
                    <Input className={fieldInputClassName} type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name={`${platform}.url`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store URL</FormLabel>
                  <FormControl>
                    <Input className={fieldInputClassName} placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`${platform}.status`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className={fieldInputClassName}>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name={`${platform}.client_email`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email</FormLabel>
                  <FormControl>
                    <Input className={fieldInputClassName} placeholder="service-account@project.iam.gserviceaccount.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`${platform}.client_id`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input className={fieldInputClassName} placeholder="1234567890..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`${platform}.endpoint`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endpoint</FormLabel>
                <FormControl>
                  <Input className={fieldInputClassName} placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${platform}.private_key`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Private Key</FormLabel>
                <FormControl>
                  <Textarea rows={6} placeholder="Paste service account private key" className="rounded-xl border-white/10 bg-black/30 px-4 py-3 text-sm shadow-inner shadow-black/10 focus-visible:ring-1 focus-visible:ring-offset-0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${platform}.log_level`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Log Level</FormLabel>
                <FormControl>
                  <Input className={fieldInputClassName} type="number" min={0} max={4} {...field} />
                </FormControl>
                <FormDescription>0 off, 1 error, 2 info, 3 trace, 4 debug.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </TabsContent>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 max-w-full space-y-6">
        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="min-w-0 space-y-6">
            <Card className={panelClassName}>
              <CardHeader className={sectionHeaderClassName}>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Database className="h-5 w-5 text-blue-300" />
                  Shared Details
                </CardTitle>
                <CardDescription>Values shared by the Android and iOS rows.</CardDescription>
              </CardHeader>
              <CardContent className={sectionContentClassName}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Name</FormLabel>
                      <FormControl>
                        <Input className={fieldInputClassName} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid min-w-0 gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="db_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DB Name</FormLabel>
                        <FormControl>
                          <Input className={fieldInputClassName} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="app_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Order</FormLabel>
                        <FormControl>
                          <Input className={fieldInputClassName} type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paid</FormLabel>
                        <Select onValueChange={field.onChange} value={String(field.value)}>
                          <FormControl>
                            <SelectTrigger className={fieldInputClassName}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Free</SelectItem>
                            <SelectItem value="1">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={panelClassName}>
              <CardHeader className={sectionHeaderClassName}>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Layers3 className="h-5 w-5 text-blue-300" />
                  Platform Tabs
                </CardTitle>
                <CardDescription>Edit Android and iOS rows inside one screen.</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <Tabs defaultValue="android" className="w-full">
                  <TabsList className="grid h-12 w-full grid-cols-2 rounded-t-xl rounded-b-none border border-b-0 border-white/10 bg-white/[0.04] p-1">
                    <TabsTrigger value="android" className="h-10 gap-2 rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                      <MonitorSmartphone className="h-4 w-4" />
                      Android
                    </TabsTrigger>
                    <TabsTrigger value="ios" className="h-10 gap-2 rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                      <Smartphone className="h-4 w-4" />
                      iOS
                    </TabsTrigger>
                  </TabsList>
                  {platformTab('android', <MonitorSmartphone className="h-4 w-4" />)}
                  {platformTab('ios', <Smartphone className="h-4 w-4" />)}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Card className={panelClassName}>
              <CardHeader className={sectionHeaderClassName}>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Palette className="h-5 w-5 text-blue-300" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className={sectionContentClassName}>
                <FormField
                  control={form.control}
                  name="theme_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme Color</FormLabel>
                      <div className="flex min-w-0 items-center gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="h-11 min-w-0 w-full justify-start rounded-xl border-white/10 bg-black/30 px-4 hover:bg-white/[0.06]">
                              <Palette className="h-4 w-4" />
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="h-4 w-4 rounded-full border border-white/20"
                                  style={{ backgroundColor: field.value }}
                                />
                                {field.value}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 border-white/10 bg-black">
                            <ChromePicker
                              color={field.value}
                              onChange={(color: ColorResult) => field.onChange(color.hex)}
                              disableAlpha
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="color"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          className="h-11 w-14 rounded-xl border-white/10 bg-black/30 p-1"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon URL</FormLabel>
                      <FormControl>
                        <Input className={fieldInputClassName} placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex min-w-0 items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-muted">
                    <Image
                      src={iconUrl || DEFAULT_ICON}
                      alt="App icon preview"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Preview</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {iconUrl || DEFAULT_ICON}
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="landscapeSupport"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-white/10 p-4">
                      <div className="space-y-1">
                        <FormLabel>Landscape Support</FormLabel>
                        <FormDescription>Store as 1 when landscape mode is supported.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={Number(field.value) === 1}
                          onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className={panelClassName}>
              <CardHeader className={sectionHeaderClassName}>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileKey2 className="h-5 w-5 text-blue-300" />
                  Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className={sectionContentClassName}>
                <FormField
                  control={form.control}
                  name="server_folder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server Folder</FormLabel>
                      <FormControl>
                        <Input className={fieldInputClassName} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="auth_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auth Account</FormLabel>
                      <FormControl>
                        <Input className={fieldInputClassName} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nav_param"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nav Param</FormLabel>
                      <FormControl>
                        <Input className={fieldInputClassName} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 flex min-w-0 items-center justify-end gap-3 border-t border-white/10 bg-background/90 px-1 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl border-white/10 bg-white/[0.03]">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2 rounded-xl px-5 shadow-lg shadow-blue-950/25">
            {isSubmitting ? <Spinner size="small" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
