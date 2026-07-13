'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Database, Hash, Save, Search, Settings2, SlidersHorizontal, Type, Zap } from 'lucide-react';
import type { App } from '@/app/(dashboard)/apps/data';
import { updateAndroidAppSettings } from '@/app/(dashboard)/android-app-settings/actions';
import { androidAppSettingUpdateSchema, type AndroidAppSetting } from '@/app/(dashboard)/android-app-settings/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type FormValues = {
  appId: string;
  settings: AndroidAppSetting[];
};

interface AndroidSettingsFormProps {
  app: App;
  initialSettings: AndroidAppSetting[];
  apiError?: string;
}

const preferredCategoryOrder = ['Application', 'Security', 'Admob', 'Navigation', 'Premium', 'IAP', 'Admin'];
const categoryTones: Record<string, { accent: string; dot: string; icon: string; chip: string; soft: string }> = {
  Application: {
    accent: 'before:bg-sky-400',
    dot: 'bg-sky-400',
    icon: 'text-sky-300',
    chip: 'border-sky-400/20 bg-sky-500/[0.10] text-sky-100',
    soft: 'from-sky-500/[0.10]',
  },
  Security: {
    accent: 'before:bg-rose-400',
    dot: 'bg-rose-400',
    icon: 'text-rose-300',
    chip: 'border-rose-400/20 bg-rose-500/[0.10] text-rose-100',
    soft: 'from-rose-500/[0.10]',
  },
  Admob: {
    accent: 'before:bg-amber-400',
    dot: 'bg-amber-400',
    icon: 'text-amber-300',
    chip: 'border-amber-400/20 bg-amber-500/[0.10] text-amber-100',
    soft: 'from-amber-500/[0.10]',
  },
  Navigation: {
    accent: 'before:bg-violet-400',
    dot: 'bg-violet-400',
    icon: 'text-violet-300',
    chip: 'border-violet-400/20 bg-violet-500/[0.10] text-violet-100',
    soft: 'from-violet-500/[0.10]',
  },
  Premium: {
    accent: 'before:bg-emerald-400',
    dot: 'bg-emerald-400',
    icon: 'text-emerald-300',
    chip: 'border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-100',
    soft: 'from-emerald-500/[0.10]',
  },
  IAP: {
    accent: 'before:bg-blue-400',
    dot: 'bg-blue-400',
    icon: 'text-blue-300',
    chip: 'border-blue-400/20 bg-blue-500/[0.10] text-blue-100',
    soft: 'from-blue-500/[0.10]',
  },
  Admin: {
    accent: 'before:bg-fuchsia-400',
    dot: 'bg-fuchsia-400',
    icon: 'text-fuchsia-300',
    chip: 'border-fuchsia-400/20 bg-fuchsia-500/[0.10] text-fuchsia-100',
    soft: 'from-fuchsia-500/[0.10]',
  },
  Uncategorized: {
    accent: 'before:bg-slate-400',
    dot: 'bg-slate-400',
    icon: 'text-slate-300',
    chip: 'border-white/10 bg-white/[0.06] text-muted-foreground',
    soft: 'from-white/[0.06]',
  },
};

function getCategory(setting: AndroidAppSetting) {
  return setting.category?.trim() || 'Uncategorized';
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function compareCategories(a: string, b: string) {
  const aIndex = preferredCategoryOrder.indexOf(a);
  const bIndex = preferredCategoryOrder.indexOf(b);
  if (aIndex !== -1 || bIndex !== -1) {
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  }

  return a.localeCompare(b);
}

function isToggleSetting(setting: AndroidAppSetting) {
  return (setting.int_value === 0 || setting.int_value === 1) && !setting.string_value;
}

function hasIntValue(setting: AndroidAppSetting) {
  return setting.int_value !== null && setting.int_value !== undefined;
}

function hasStringValue(setting: AndroidAppSetting) {
  return setting.string_value !== null && setting.string_value !== undefined;
}

function getCategoryTone(category: string) {
  return categoryTones[category] || categoryTones.Uncategorized;
}

function getSettingKind(setting: AndroidAppSetting) {
  if (isToggleSetting(setting)) {
    return { label: 'Flag', Icon: Zap };
  }

  if (hasIntValue(setting)) {
    return { label: 'Number', Icon: Hash };
  }

  return { label: 'Text', Icon: Type };
}

function SettingField({
  setting,
  index,
  control,
}: {
  setting: AndroidAppSetting;
  index: number;
  control: ReturnType<typeof useForm<FormValues>>['control'];
}) {
  const toggle = isToggleSetting(setting);
  const category = getCategory(setting);
  const tone = getCategoryTone(category);
  const kind = getSettingKind(setting);
  const KindIcon = kind.Icon;

  return (
    <div
      className={cn(
        'relative grid gap-3 border-b border-white/10 bg-background/40 px-4 py-3.5 last:border-b-0 before:absolute before:left-0 before:top-3 before:h-[calc(100%-24px)] before:w-0.5 before:rounded-full hover:bg-white/[0.035] md:grid-cols-[minmax(280px,1fr)_190px_minmax(260px,0.9fr)] md:items-center',
        tone.accent
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold leading-tight text-foreground">{formatLabel(setting.name)}</h3>
          <Badge variant="outline" className="max-w-full truncate border-white/10 bg-white/[0.04] px-2 py-0 font-mono text-[10px] leading-5 text-muted-foreground">
            {setting.name}
          </Badge>
          <span className={cn('inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold uppercase tracking-wide', tone.chip)}>
            <KindIcon className="h-3 w-3" />
            {kind.label}
          </span>
        </div>
        {setting.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{setting.description}</p>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">Integer</div>
        {hasIntValue(setting) ? (
          <FormField
            control={control}
            name={`settings.${index}.int_value`}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  {toggle ? (
                    <div className={cn('flex h-9 items-center justify-between gap-3 rounded-lg border px-3 shadow-inner', field.value === 1 ? 'border-emerald-400/20 bg-emerald-500/[0.08]' : 'border-white/10 bg-background/80')}>
                      <span className="text-xs font-semibold text-muted-foreground">{field.value === 1 ? 'On' : 'Off'}</span>
                      <Switch
                        className="h-5 w-9 data-[state=checked]:bg-emerald-500"
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      />
                    </div>
                  ) : (
                    <Input
                      type="number"
                      value={field.value ?? ''}
                      onChange={(event) => field.onChange(event.target.value === '' ? null : event.target.valueAsNumber)}
                      placeholder="Integer value"
                      className="h-9 rounded-lg border-white/10 bg-background/80 font-mono text-sm focus-visible:ring-emerald-500/60"
                    />
                  )}
                </FormControl>
              </FormItem>
            )}
          />
        ) : (
          <div className="flex h-9 items-center rounded-lg border border-dashed border-white/10 bg-white/[0.015] px-3 text-xs text-muted-foreground/70">Not used</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:hidden">String</div>
        {hasStringValue(setting) ? (
          <FormField
            control={control}
            name={`settings.${index}.string_value`}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  {(field.value || '').length > 90 ? (
                    <Textarea
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="String value"
                      className="min-h-16 rounded-lg border-white/10 bg-background/80 text-xs focus-visible:ring-emerald-500/60"
                    />
                  ) : (
                    <Input
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="String value"
                      className="h-9 rounded-lg border-white/10 bg-background/80 font-mono text-xs focus-visible:ring-emerald-500/60"
                    />
                  )}
                </FormControl>
              </FormItem>
            )}
          />
        ) : (
          <div className="flex h-9 items-center rounded-lg border border-dashed border-white/10 bg-white/[0.015] px-3 text-xs text-muted-foreground/70">Not used</div>
        )}
      </div>
    </div>
  );
}

export function AndroidSettingsForm({ app, initialSettings, apiError }: AndroidSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(androidAppSettingUpdateSchema),
    defaultValues: {
      appId: app.id,
      settings: initialSettings,
    },
  });

  const settings = form.watch('settings');
  const categories = React.useMemo(
    () => Array.from(new Set(settings.map(getCategory))).sort(compareCategories),
    [settings]
  );
  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    settings.forEach((setting) => {
      const key = getCategory(setting);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [settings]);

  const filteredSettings = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return settings
      .map((setting, index) => ({ setting, index }))
      .filter(({ setting }) => category === 'All' || getCategory(setting) === category)
      .filter(({ setting }) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          setting.name,
          setting.category,
          setting.description,
          setting.string_value,
          setting.int_value === null ? '' : String(setting.int_value),
        ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
      });
  }, [settings, category, query]);

  const groupedSettings = React.useMemo(() => {
    const groups = new Map<string, Array<{ setting: AndroidAppSetting; index: number }>>();
    filteredSettings.forEach((item) => {
      const key = getCategory(item.setting);
      groups.set(key, [...(groups.get(key) || []), item]);
    });

    return Array.from(groups.entries()).sort(([a], [b]) => compareCategories(a, b));
  }, [filteredSettings]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    const result = await updateAndroidAppSettings(values);
    setIsSubmitting(false);

    if ('error' in result && result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `${app.name} Android settings updated.` });
  };

  const selectedCategoryTone = getCategoryTone(category === 'All' ? 'Premium' : category);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-4 shadow-sm">
          <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent', selectedCategoryTone.soft)} />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Image src={app.icon_url} alt={app.name} width={56} height={56} className="rounded-2xl border border-white/10 bg-white/[0.04] shadow-sm" data-ai-hint="app icon" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
                <Badge variant="outline" className="border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-100">
                  Android
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Database className="h-3.5 w-3.5" />
                  <code className="font-mono">{app.db_name}</code>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <Settings2 className="h-3.5 w-3.5" />
                  <code className="font-mono">{app.package_name}</code>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {settings.length} settings
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="h-10 rounded-full border-white/10 bg-white/[0.035] px-4 hover:bg-white/[0.07]">
              <Link href="/android-app-settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to List
              </Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || settings.length === 0} className="h-10 rounded-full bg-blue-600 px-5 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500">
              {isSubmitting ? <Spinner size="small" className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </div>
          </div>
        </div>

        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Android Settings</AlertTitle>
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <Card className="overflow-hidden border-white/10 bg-card/80 shadow-sm">
          <CardHeader className="gap-4 border-b border-white/10 bg-gradient-to-r from-white/[0.045] to-transparent px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge variant="outline" className={cn('gap-1.5 border px-2.5 py-1 text-xs', selectedCategoryTone.chip)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {category === 'All' ? `${settings.length} total` : `${filteredSettings.length} visible`}
                </Badge>
              </div>
              <CardTitle className="text-xl">Android App Settings</CardTitle>
              <CardDescription>Update feature flags, AdMob, navigation URLs, premium offers, and security values.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search settings..."
                  className="h-10 rounded-full border-white/10 bg-background/70 pl-9 focus-visible:ring-emerald-500/60"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-full border-white/10 bg-background/70 sm:w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All categories</SelectItem>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <Tabs value={category} onValueChange={setCategory}>
              <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-1 rounded-2xl bg-white/[0.04] p-1">
                <TabsTrigger value="All" className="gap-2 rounded-xl px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  All
                  <span className="rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[10px]">{settings.length}</span>
                </TabsTrigger>
                {categories.map((item) => (
                  <TabsTrigger key={item} value={item} className="gap-2 rounded-xl px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    {item}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', category === item ? getCategoryTone(item).chip : 'bg-white/[0.08] text-muted-foreground')}>
                      {categoryCounts.get(item) || 0}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={category} className="mt-0 space-y-5">
                {groupedSettings.length > 0 ? (
                  groupedSettings.map(([group, items]) => (
                    <section key={group} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h2 className={cn('inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]', getCategoryTone(group).icon)}>
                          <span className={cn('h-2 w-2 rounded-full', getCategoryTone(group).dot)} />
                          {group}
                        </h2>
                        <Badge variant="outline" className={cn('border px-2 py-0 text-[11px]', getCategoryTone(group).chip)}>{items.length}</Badge>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/10 shadow-sm">
                        <div className="hidden grid-cols-[minmax(280px,1fr)_190px_minmax(260px,0.9fr)] border-b border-white/10 bg-white/[0.045] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                          <div>Setting</div>
                          <div>Integer</div>
                          <div>String</div>
                        </div>
                        {items.map(({ setting, index }) => (
                          <SettingField key={setting.name} setting={setting} index={index} control={form.control} />
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/10 bg-background/60 p-10 text-center text-sm text-muted-foreground">
                    No settings match the current filters.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
