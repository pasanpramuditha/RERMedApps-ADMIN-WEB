'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChromePicker, type ColorResult } from 'react-color';
import { Palette, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

import { createApp, updateApp } from './actions';
import type { App, AppFormValues } from './data';
import { appFormSchema, appStatusOptions } from './data';

interface AppFormProps {
  app?: App;
}

const DEFAULT_ICON = 'https://placehold.co/128x128.png';

function toDateInputValue(value?: string) {
  if (!value || value === '0000-00-00') {
    return '';
  }

  return value.slice(0, 10);
}

function isImageUrl(value?: string): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

export function AppForm({ app }: AppFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { getToken } = useAuth();
  const isEditMode = !!app;

  const form = useForm<AppFormValues>({
    resolver: zodResolver(appFormSchema),
    defaultValues: app
      ? {
          package_name: app.package_name,
          app_id: app.app_id || '',
          db_name: app.db_name,
          name: app.name,
          theme_color: app.theme_color || app.themeColor || '#2f6fed',
          current_ver: app.current_ver || '',
          release_date: toDateInputValue(app.release_date),
          paid: app.paid ? 1 : 0,
          os: app.os || 'Android',
          url: app.url || '',
          private_key: app.private_key || '',
          endpoint: app.endpoint || '',
          client_id: app.client_id || '',
          client_email: app.client_email || '',
          app_order: app.app_order ?? 0,
          icon_url: app.icon_url || '',
          landscapeSupport: app.landscapeSupport ? 1 : 0,
          status: app.status ?? 4,
          log_level: app.log_level ?? 0,
          server_folder: app.server_folder || '',
          auth_account: app.auth_account || '',
          nav_param: app.nav_param || '',
        }
      : {
          package_name: '',
          app_id: '',
          db_name: '',
          name: '',
          theme_color: '#2f6fed',
          current_ver: '',
          release_date: '',
          paid: 0,
          os: 'Android',
          url: '',
          private_key: '',
          endpoint: '',
          client_id: '',
          client_email: '',
          app_order: 0,
          icon_url: '',
          landscapeSupport: 0,
          status: 4,
          log_level: 0,
          server_folder: '',
          auth_account: '',
          nav_param: '',
        },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const iconUrl = form.watch('icon_url');

  const onSubmit = async (data: AppFormValues) => {
    setIsSubmitting(true);
    const idToken = await getToken();

    const result = isEditMode
      ? await updateApp(app.id, data, idToken || undefined)
      : await createApp(data, idToken || undefined);

    setIsSubmitting(false);

    if (result.error) {
      toast({
        title: `Error ${isEditMode ? 'updating' : 'creating'} app`,
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: `App ${isEditMode ? 'Updated' : 'Created'}`,
      description: `${data.name} has been saved successfully.`,
    });
    router.push('/apps');
    router.refresh();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle>App Details</CardTitle>
                <CardDescription>
                  Core registry fields stored in <code>fnd_app_details_tab</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>App Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Auscultation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="package_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package Name</FormLabel>
                        <FormControl>
                          <Input placeholder="com.rermedapps.auscultation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="app_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apple App ID</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="db_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DB Name</FormLabel>
                        <FormControl>
                          <Input placeholder="rermedap_FND_AUSCULTATION" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="os"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform</FormLabel>
                        <FormControl>
                          <Input placeholder="Android / IOS" {...field} />
                        </FormControl>
                        <FormDescription>Use the same platform value stored in MySQL.</FormDescription>
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
                          <Input type="number" min={0} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="current_ver"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Version</FormLabel>
                        <FormControl>
                          <Input placeholder="1.0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="release_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Release Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://play.google.com/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle>Server Credentials</CardTitle>
                <CardDescription>Values used by the backend to connect to app-specific services.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endpoint</FormLabel>
                      <FormControl>
                        <Input placeholder="https://fcm.googleapis.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="client_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Email</FormLabel>
                        <FormControl>
                          <Input placeholder="service-account@project.iam.gserviceaccount.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="private_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private Key</FormLabel>
                      <FormControl>
                        <Textarea rows={7} placeholder="Paste service account private key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle>State</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
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
                <FormField
                  control={form.control}
                  name="paid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid</FormLabel>
                      <Select onValueChange={field.onChange} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
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
                <FormField
                  control={form.control}
                  name="log_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Log Level</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={4} {...field} />
                      </FormControl>
                      <FormDescription>0 off, 1 error, 2 info, 3 trace, 4 debug.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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

            <Card className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="theme_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme Color</FormLabel>
                      <div className="flex items-center gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="w-full justify-start gap-2">
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
                          className="h-10 w-14 p-1"
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
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormDescription>Paste the icon URL used in the app list.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-4 rounded-lg border border-white/10 p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-white/10 bg-muted">
                    <Image
                      src={isImageUrl(iconUrl) ? iconUrl : DEFAULT_ICON}
                      alt="App icon preview"
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Preview</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {isImageUrl(iconUrl) ? iconUrl : DEFAULT_ICON}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/20">
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="server_folder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server Folder</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} />
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
                        <Input placeholder="service-account" {...field} />
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
                        <Input placeholder="nav=..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <Spinner size="small" /> : <Save className="h-4 w-4" />}
            {isEditMode ? 'Save Changes' : 'Create App'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
