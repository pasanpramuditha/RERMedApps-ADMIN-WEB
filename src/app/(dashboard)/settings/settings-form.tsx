
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { saveGlobalSettings } from './actions';
import type { GlobalSettings } from './data';
import { DashboardCustomizationForm } from '@/components/settings/dashboard-customization-form';
import { defaultDashboardConfig } from '@/components/settings/dashboard-customization-form';
import { NavigationCustomizationForm } from '@/components/settings/navigation-customization-form';
import { CompanyBrandingForm } from '@/components/settings/company-branding-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { navSections } from '@/components/dashboard/nav-sections';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Bug,
  Code2,
  Database,
  Eye,
  Home,
  KeyRound,
  LayoutDashboard,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';


const jsonValidator = (val: string | undefined) => {
    if (!val) return true; // Optional field
    try {
        JSON.parse(val);
        return true;
    } catch (e) {
        return false;
    }
}

const settingsFormSchema = z.object({
  google_services_json: z.string().optional(),
  service_account_json: z.string().optional(),
  dashboard_cards_json: z.string().refine(jsonValidator, { message: "Must be valid JSON. Please check syntax." }),
  navigation_visibility_json: z.string().refine(jsonValidator, { message: "Must be valid JSON. Please check syntax." }),
  exchange_rates_json: z.string().optional().refine(jsonValidator, { message: "Must be valid JSON. Please check syntax." }),
  company_logo_url: z.string().url().optional().or(z.literal('')),
  initial_screen: z.string().optional(),
  demo_mode_info_cards: z.boolean().optional(),
  demo_mode_app_charts: z.boolean().optional(),
  demo_mode_financial_summary: z.boolean().optional(),
  debug_info_visibility: z.boolean().optional(),
  php_auth_token: z.string().optional(),
  in_app_ad_upload_path: z.string().optional(),
  in_app_ad_upload_url: z.string().optional(),
  finance_upload_path: z.string().optional(),
  finance_upload_url: z.string().optional(),
  app_store_connect_api_key_id: z.string().optional(),
  app_store_connect_api_issuer_id: z.string().optional(),
  app_store_connect_api_private_key: z.string().optional(),
  app_store_connect_vendor_number: z.string().optional(),
  admob_client_id: z.string().optional(),
  admob_client_secret: z.string().optional(),
  admob_refresh_token: z.string().optional(),
  admob_publisher_id: z.string().optional(),
  google_ads_client_id: z.string().optional(),
  google_ads_client_secret: z.string().optional(),
  google_ads_refresh_token: z.string().optional(),
  google_ads_developer_token: z.string().optional(),
  google_ads_customer_id: z.string().optional(),
  google_ads_login_customer_id: z.string().optional(),
  google_ads_api_version: z.string().optional(),
  tax_gmail_client_id: z.string().optional(),
  tax_gmail_client_secret: z.string().optional(),
  tax_gmail_refresh_token: z.string().optional(),
  tax_gmail_mailbox: z.string().optional(),
  tax_gmail_income_label: z.string().optional(),
  tax_gmail_expense_label: z.string().optional(),
  tax_gmail_approved_label: z.string().optional(),
  tax_imap_host: z.string().optional(),
  tax_imap_port: z.string().optional(),
  tax_imap_encryption: z.string().optional(),
  tax_imap_mailbox: z.string().optional(),
  tax_imap_username: z.string().optional(),
  tax_imap_password: z.string().optional(),
  tax_veryfi_enabled: z.boolean().optional(),
  tax_veryfi_client_id: z.string().optional(),
  tax_veryfi_username: z.string().optional(),
  tax_veryfi_api_key: z.string().optional(),
  tax_veryfi_client_secret: z.string().optional(),
  tax_veryfi_environment_url: z.string().optional(),
  tax_ocr_space_enabled: z.boolean().optional(),
  tax_ocr_space_api_key: z.string().optional(),
  tax_ocr_space_endpoint: z.string().optional(),
  tax_ocr_space_language: z.string().optional(),
  tax_ocr_space_engine: z.string().optional(),
  tax_evidence_save_enabled: z.boolean().optional(),
  tax_evidence_storage_provider: z.string().optional(),
  tax_uploadcare_public_key: z.string().optional(),
  tax_uploadcare_secret_key: z.string().optional(),
  tax_uploadcare_store: z.string().optional(),
  tax_drive_save_enabled: z.boolean().optional(),
  tax_drive_folder_id: z.string().optional(),
});

type FormValues = z.infer<typeof settingsFormSchema>;

interface SettingsFormProps {
  initialSettings: GlobalSettings;
}

const settingSections = [
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'startup', label: 'Startup', icon: Home },
  { id: 'developer', label: 'Developer', icon: Code2 },
  { id: 'navigation', label: 'Navigation', icon: Eye },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'integrations', label: 'Integrations', icon: KeyRound },
] as const;

type SettingSectionId = (typeof settingSections)[number]['id'];

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      google_services_json: initialSettings.google_services_json || '',
      service_account_json: initialSettings.service_account_json || '',
      dashboard_cards_json: initialSettings.dashboard_cards_json || JSON.stringify(defaultDashboardConfig, null, 2),
      navigation_visibility_json: initialSettings.navigation_visibility_json || '{}',
      exchange_rates_json: initialSettings.exchange_rates_json || '',
      company_logo_url: initialSettings.company_logo_url || '',
      initial_screen: initialSettings.initial_screen || '/dashboard',
      demo_mode_info_cards: initialSettings.demo_mode_info_cards || false,
      demo_mode_app_charts: initialSettings.demo_mode_app_charts || false,
      demo_mode_financial_summary: initialSettings.demo_mode_financial_summary || false,
      debug_info_visibility: initialSettings.debug_info_visibility || false,
      php_auth_token: initialSettings.php_auth_token || '',
      in_app_ad_upload_path: initialSettings.in_app_ad_upload_path || '',
      in_app_ad_upload_url: initialSettings.in_app_ad_upload_url || '',
      finance_upload_path: initialSettings.finance_upload_path || '',
      finance_upload_url: initialSettings.finance_upload_url || '',
      app_store_connect_api_key_id: initialSettings.app_store_connect_api_key_id || '',
      app_store_connect_api_issuer_id: initialSettings.app_store_connect_api_issuer_id || '',
      app_store_connect_api_private_key: initialSettings.app_store_connect_api_private_key || '',
      app_store_connect_vendor_number: initialSettings.app_store_connect_vendor_number || '',
      admob_client_id: initialSettings.admob_client_id || '',
      admob_client_secret: initialSettings.admob_client_secret || '',
      admob_refresh_token: initialSettings.admob_refresh_token || '',
      admob_publisher_id: initialSettings.admob_publisher_id || '',
      google_ads_client_id: initialSettings.google_ads_client_id || '',
      google_ads_client_secret: initialSettings.google_ads_client_secret || '',
      google_ads_refresh_token: initialSettings.google_ads_refresh_token || '',
      google_ads_developer_token: initialSettings.google_ads_developer_token || '',
      google_ads_customer_id: initialSettings.google_ads_customer_id || '',
      google_ads_login_customer_id: initialSettings.google_ads_login_customer_id || '',
      google_ads_api_version: initialSettings.google_ads_api_version || 'v24',
      tax_gmail_client_id: initialSettings.tax_gmail_client_id || '',
      tax_gmail_client_secret: initialSettings.tax_gmail_client_secret || '',
      tax_gmail_refresh_token: initialSettings.tax_gmail_refresh_token || '',
      tax_gmail_mailbox: initialSettings.tax_gmail_mailbox || 'rermedapps.tax@gmail.com',
      tax_gmail_income_label: initialSettings.tax_gmail_income_label || 'Income',
      tax_gmail_expense_label: initialSettings.tax_gmail_expense_label || 'Expenses',
      tax_gmail_approved_label: initialSettings.tax_gmail_approved_label || 'Tax/Approved',
      tax_imap_host: initialSettings.tax_imap_host || 'mail.rermedapps.com',
      tax_imap_port: initialSettings.tax_imap_port || '993',
      tax_imap_encryption: initialSettings.tax_imap_encryption || 'ssl',
      tax_imap_mailbox: initialSettings.tax_imap_mailbox || 'INBOX',
      tax_imap_username: initialSettings.tax_imap_username || 'tax@rermedapps.com',
      tax_imap_password: initialSettings.tax_imap_password || '',
      tax_veryfi_enabled: !!initialSettings.tax_veryfi_enabled,
      tax_veryfi_client_id: initialSettings.tax_veryfi_client_id || '',
      tax_veryfi_username: initialSettings.tax_veryfi_username || '',
      tax_veryfi_api_key: initialSettings.tax_veryfi_api_key || '',
      tax_veryfi_client_secret: initialSettings.tax_veryfi_client_secret || '',
      tax_veryfi_environment_url: initialSettings.tax_veryfi_environment_url || 'https://api.veryfi.com',
      tax_ocr_space_enabled: !!initialSettings.tax_ocr_space_enabled,
      tax_ocr_space_api_key: initialSettings.tax_ocr_space_api_key || '',
      tax_ocr_space_endpoint: initialSettings.tax_ocr_space_endpoint || 'https://api.ocr.space/parse/image',
      tax_ocr_space_language: initialSettings.tax_ocr_space_language || 'eng',
      tax_ocr_space_engine: initialSettings.tax_ocr_space_engine || '2',
      tax_evidence_save_enabled: initialSettings.tax_evidence_save_enabled ?? true,
      tax_evidence_storage_provider: 'uploadcare',
      tax_uploadcare_public_key: initialSettings.tax_uploadcare_public_key || '',
      tax_uploadcare_secret_key: initialSettings.tax_uploadcare_secret_key || '',
      tax_uploadcare_store: initialSettings.tax_uploadcare_store || '1',
      tax_drive_save_enabled: !!initialSettings.tax_drive_save_enabled,
      tax_drive_folder_id: initialSettings.tax_drive_folder_id || '',
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<SettingSectionId>('branding');

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    const result = await saveGlobalSettings(data);
    setIsSubmitting(false);

    if (result.error) {
      console.error('SAVE_GLOBAL_SETTINGS failed:', result);
      const debugText = 'debug' in result && result.debug
        ? `\n\nResponse: ${JSON.stringify(result.debug).slice(0, 700)}`
        : '';

      toast({
        title: 'Error Saving Settings',
        description: `${result.error}${debugText}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Settings Saved',
        description: 'Your global configurations have been successfully saved.',
      });
    }
  };

  const navItems = navSections.flatMap(section => section.items);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-24 space-y-3 rounded-2xl border border-white/10 bg-card/75 p-3 shadow-sm">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settings menu</p>
                <p className="mt-1 text-xs text-muted-foreground/80">Choose a section to edit.</p>
              </div>
              <nav className="space-y-1.5">
                {settingSections.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-white/[0.055] hover:text-foreground",
                      activeSection === id && "bg-blue-500/[0.15] text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28)] hover:bg-blue-500/[0.18] hover:text-white"
                    )}
                  >
                    <span className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/5 bg-white/[0.035] transition-colors group-hover:bg-white/[0.07]",
                      activeSection === id && "border-blue-300/20 bg-blue-500/20 text-blue-100"
                    )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-card/75 p-2 shadow-sm sm:grid-cols-3 xl:hidden">
              {settingSections.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/[0.055] hover:text-foreground",
                    activeSection === id && "bg-blue-500/[0.15] text-white shadow-[inset_0_0_0_1px_rgba(59,130,246,0.28)] hover:bg-blue-500/[0.18] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {activeSection === 'branding' && (
              <section id="branding">
                <CompanyBrandingForm form={form} />
              </section>
            )}
            
            {activeSection === 'startup' && (
            <section id="startup">
              <Card className="overflow-hidden border-white/10 bg-card/75 shadow-sm">
                <CardHeader className="border-b border-white/10 bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-white/10 bg-background/70 p-2">
                      <Home className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle>Initial Login Screen</CardTitle>
                      <CardDescription>
                        Choose the page users see immediately after logging in.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="initial_screen"
                    render={({ field }) => (
                      <FormItem className="max-w-md">
                        <FormLabel>Default Page</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl border-white/10 bg-background/60">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {navItems.map(item => (
                              <SelectItem key={item.href} value={item.href}>{item.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>
            )}

            {activeSection === 'developer' && (
            <section id="developer">
              <Card className="overflow-hidden border-white/10 bg-card/75 shadow-sm">
                <CardHeader className="border-b border-white/10 bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-white/10 bg-background/70 p-2">
                      <Code2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle>Developer Settings</CardTitle>
                      <CardDescription>
                        Control debug output and demo data across dashboard modules.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="debug_info_visibility"
                    render={({ field }) => (
                      <FormItem className="flex min-h-32 flex-row items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Bug className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-base">Show Debug Information</FormLabel>
                          </div>
                          <FormDescription>Display calculation traces and API responses on the dashboard.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demo_mode_info_cards"
                    render={({ field }) => (
                      <FormItem className="flex min-h-32 flex-row items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-base">Info Cards Demo Mode</FormLabel>
                          </div>
                          <FormDescription>Enable demo data for the 15 summary cards.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demo_mode_app_charts"
                    render={({ field }) => (
                      <FormItem className="flex min-h-32 flex-row items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-base">App Charts Demo Mode</FormLabel>
                          </div>
                          <FormDescription>Enable demo data for app revenue and best selling app charts.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="demo_mode_financial_summary"
                    render={({ field }) => (
                      <FormItem className="flex min-h-32 flex-row items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-base">Financial Summary Demo Mode</FormLabel>
                          </div>
                          <FormDescription>Enable demo data for the financial summary chart and stats.</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </section>
            )}
            
            {activeSection === 'navigation' && (
              <section id="navigation">
                <NavigationCustomizationForm form={form} />
              </section>
            )}

            {activeSection === 'dashboard' && (
              <section id="dashboard">
                <DashboardCustomizationForm form={form} />
              </section>
            )}

            {activeSection === 'integrations' && (
            <section id="integrations">
              <Card className="overflow-hidden border-white/10 bg-card/75 shadow-sm">
                <CardHeader className="border-b border-white/10 bg-muted/10">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-white/10 bg-background/70 p-2">
                      <KeyRound className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle>Integrations</CardTitle>
                      <CardDescription>
                        Manage shared service credentials and API configuration.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <FormField
                      control={form.control}
                      name="php_auth_token"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <FormLabel>PHP Backend Auth Token</FormLabel>
                          </div>
                          <FormControl>
                            <Input className="rounded-xl border-white/10 bg-background/60" placeholder="Enter your secret token" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-4">
                      <h4 className="text-base font-semibold">In-App Ad Uploads</h4>
                      <p className="text-sm text-muted-foreground">Server folder and public URL used for uploaded ad images.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="in_app_ad_upload_path"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server Upload Path</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="/home/rermedap/admin.rermedapps.com/web/1.0/uploads/in-app-ads" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="in_app_ad_upload_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Public Upload URL</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="https://admin.rermedapps.com/web/1.0/uploads/in-app-ads" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-4">
                      <h4 className="text-base font-semibold">Finance Attachments</h4>
                      <p className="text-sm text-muted-foreground">Server folder and public URL used for income and expense attachments.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="finance_upload_path"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server Upload Path</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="/home/rermedap/admin.rermedapps.com/web/1.0/uploads/finance" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="finance_upload_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Public Upload URL</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="https://admin.rermedapps.com/web/1.0/uploads/finance" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/[0.045] p-4">
                    <div className="mb-4">
                      <h4 className="text-base font-semibold">Tax Email IMAP</h4>
                      <p className="text-sm text-muted-foreground">Mailbox used by the Tax Returns email queue. Google Gmail and Drive integrations are not required for this workflow.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="tax_imap_host"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IMAP Host</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="mail.rermedapps.com" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_imap_port"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Port</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="993" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_imap_encryption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Encryption</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="ssl" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_imap_mailbox"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailbox</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="INBOX" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_imap_username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="tax@rermedapps.com" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_imap_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" className="rounded-xl border-white/10 bg-background/60" placeholder="Mailbox password" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
	                    </div>
	                  </div>

	                  <div className="rounded-2xl border border-sky-300/20 bg-sky-400/[0.045] p-4">
	                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
	                      <div>
	                        <h4 className="text-base font-semibold">Veryfi Document Extract API</h4>
	                        <p className="text-sm text-muted-foreground">Used by Tax Returns Extract to read receipts and invoices from server email attachments.</p>
	                      </div>
	                      <FormField
	                        control={form.control}
	                        name="tax_veryfi_enabled"
	                        render={({ field }) => (
	                          <FormItem className="flex items-center gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-2">
	                            <FormLabel className="m-0 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Use Veryfi</FormLabel>
	                            <FormControl>
	                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
	                            </FormControl>
	                          </FormItem>
	                        )}
	                      />
	                    </div>
	                    <div className="grid gap-4 md:grid-cols-2">
	                      <FormField
	                        control={form.control}
	                        name="tax_veryfi_client_id"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>Client ID</FormLabel>
	                            <FormControl>
	                              <Input type="password" className="rounded-xl border-white/10 bg-background/60" placeholder="Veryfi CLIENT_ID" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                      <FormField
	                        control={form.control}
	                        name="tax_veryfi_username"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>Username</FormLabel>
	                            <FormControl>
	                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="Veryfi username" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                      <FormField
	                        control={form.control}
	                        name="tax_veryfi_api_key"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>API Key</FormLabel>
	                            <FormControl>
	                              <Input type="password" className="rounded-xl border-white/10 bg-background/60" placeholder="Veryfi API Key" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                      <FormField
	                        control={form.control}
	                        name="tax_veryfi_client_secret"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>Client Secret</FormLabel>
	                            <FormControl>
	                              <Input type="password" className="rounded-xl border-white/10 bg-background/60" placeholder="Veryfi CLIENT_SECRET" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                      <FormField
	                        control={form.control}
	                        name="tax_veryfi_environment_url"
	                        render={({ field }) => (
	                          <FormItem className="md:col-span-2">
	                            <FormLabel>Environment URL</FormLabel>
	                            <FormControl>
	                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="https://api.veryfi.com" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormDescription>Default production URL is https://api.veryfi.com.</FormDescription>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
		                    </div>
		                  </div>

	                  <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.045] p-4">
	                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
	                      <div>
	                        <h4 className="text-base font-semibold">OCR.space Backup OCR</h4>
	                        <p className="text-sm text-muted-foreground">Backup text OCR for scanned PDFs/images when Veryfi is unavailable or returns no amount.</p>
	                      </div>
	                      <FormField
	                        control={form.control}
	                        name="tax_ocr_space_enabled"
	                        render={({ field }) => (
	                          <FormItem className="flex items-center gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-2">
	                            <FormLabel className="m-0 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Use Backup</FormLabel>
	                            <FormControl>
	                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
	                            </FormControl>
	                          </FormItem>
	                        )}
	                      />
	                    </div>
	                    <div className="grid gap-4 md:grid-cols-2">
	                      <FormField
	                        control={form.control}
	                        name="tax_ocr_space_api_key"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>API Key</FormLabel>
	                            <FormControl>
	                              <Input type="password" className="rounded-xl border-white/10 bg-background/60" placeholder="OCR.space API key" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                      <FormField
	                        control={form.control}
	                        name="tax_ocr_space_endpoint"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>Endpoint</FormLabel>
	                            <FormControl>
	                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="https://api.ocr.space/parse/image" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                      <FormField
	                        control={form.control}
	                        name="tax_ocr_space_language"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>Language</FormLabel>
	                            <FormControl>
	                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="eng" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormDescription>Use 3-letter OCR.space language code, e.g. eng or auto.</FormDescription>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                      <FormField
	                        control={form.control}
	                        name="tax_ocr_space_engine"
	                        render={({ field }) => (
	                          <FormItem>
	                            <FormLabel>OCR Engine</FormLabel>
	                            <FormControl>
	                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="2" {...field} value={field.value ?? ''} />
	                            </FormControl>
	                            <FormDescription>OCR.space supports 1, 2, or 3. Engine 2 is the default backup.</FormDescription>
	                            <FormMessage />
	                          </FormItem>
	                        )}
	                      />
	                    </div>
	                  </div>

	                  <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.045] p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold">Tax Evidence Storage</h4>
                        <p className="text-sm text-muted-foreground">Approved tax email bills are uploaded to Uploadcare and linked from the ledger.</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="tax_evidence_save_enabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-2">
                            <FormLabel className="m-0 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Save Bills</FormLabel>
                            <FormControl>
                              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="tax_uploadcare_public_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Uploadcare Public Key</FormLabel>
                            <FormControl>
                              <Input type="password" className="rounded-xl border-white/10 bg-background/60" placeholder="demopublickey" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription>Required for all approved tax evidence uploads.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_uploadcare_secret_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Uploadcare Secret Key</FormLabel>
                            <FormControl>
                              <Input type="password" className="rounded-xl border-white/10 bg-background/60" placeholder="Optional secret key" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormDescription>Saved for authenticated Uploadcare API operations.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tax_uploadcare_store"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Uploadcare Store</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || '1'}>
                              <FormControl>
                                <SelectTrigger className="rounded-xl border-white/10 bg-background/60">
                                  <SelectValue placeholder="Store mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">Store Permanently</SelectItem>
                                <SelectItem value="auto">Auto</SelectItem>
                                <SelectItem value="0">Temporary</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Use permanent storage for approved tax evidence.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-4">
                      <h4 className="text-base font-semibold">AdMob API</h4>
                      <p className="text-sm text-muted-foreground">OAuth and publisher credentials used for AdMob monthly reports.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="admob_client_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client ID</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="Google OAuth client ID" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admob_client_secret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Client Secret</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" type="password" placeholder="Google OAuth client secret" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admob_publisher_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Publisher ID</FormLabel>
                            <FormControl>
                              <Input className="rounded-xl border-white/10 bg-background/60" placeholder="pub-1234567890123456" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="admob_refresh_token"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Refresh Token</FormLabel>
                            <FormControl>
                              <Textarea className="rounded-xl border-white/10 bg-background/60 font-mono text-xs" placeholder="Google OAuth refresh token" {...field} value={field.value ?? ''} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <h4 className="text-base font-semibold">Google Ads API Removed</h4>
                    <p className="mt-1 text-sm text-muted-foreground">Campaign cost, impressions, and clicks are no longer fetched through Google Ads API.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-semibold">App Store Connect API</h4>
                      <p className="text-sm text-muted-foreground">Credentials used for Apple sales and subscription reports.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField control={form.control} name="app_store_connect_api_key_id" render={({ field }) => ( <FormItem> <FormLabel>Key ID</FormLabel> <FormControl><Input className="rounded-xl border-white/10 bg-background/60" placeholder="e.g. 2X9R4HXF34" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name="app_store_connect_api_issuer_id" render={({ field }) => ( <FormItem> <FormLabel>Issuer ID</FormLabel> <FormControl><Input className="rounded-xl border-white/10 bg-background/60" placeholder="e.g. 69a6de70-5b65-47e3-e053-5b8c7c11a4d1" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )}/>
                      <FormField control={form.control} name="app_store_connect_vendor_number" render={({ field }) => ( <FormItem> <FormLabel>Vendor Number</FormLabel> <FormControl><Input className="rounded-xl border-white/10 bg-background/60" placeholder="e.g. 85152258" {...field} value={field.value ?? ''} /></FormControl> <FormMessage /> </FormItem> )}/>
                    </div>
                    <FormField control={form.control} name="app_store_connect_api_private_key" render={({ field }) => ( <FormItem> <FormLabel>Private Key (.p8)</FormLabel> <FormControl><Textarea className="rounded-xl border-white/10 bg-background/60 font-mono text-xs" placeholder="Paste your private key content here" {...field} value={field.value ?? ''} rows={7} /></FormControl> <FormMessage /> </FormItem> )}/>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base font-semibold">Google and Firebase</h4>
                      <p className="text-sm text-muted-foreground">Firebase configuration is retained for authentication. Google Play service account configuration has been removed.</p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="google_services_json"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Firebase Configuration</FormLabel>
                            <FormControl>
                              <Textarea className="rounded-xl border-white/10 bg-background/60 font-mono text-xs"
                                placeholder='Paste the content of your google-services.json file here.' 
                                {...field} 
                                rows={10} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
            )}

            <div className="sticky bottom-0 z-10 rounded-2xl border border-white/10 bg-card/90 px-4 py-4 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Ready to apply settings?</p>
                  <p className="text-xs text-muted-foreground">Changes are saved globally for the admin dashboard.</p>
                </div>
                <Button type="submit" disabled={isSubmitting} className="rounded-xl sm:w-auto">
                  {isSubmitting ? <Spinner size="small" className="mr-2"/> : <Save className="mr-2 h-4 w-4" />}
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
