'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, CheckCircle2, CircleHelp, Copy, Crown, Eye, Loader2, Megaphone, PackageCheck, PackageMinus, Pencil, Plus, Search, Send, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportPageShell } from '@/components/dashboard/report-page-shell';
import { AndroidAnalysisHelpDialog } from '@/components/dashboard/android-analysis-help-dialog';
import { useToast } from '@/hooks/use-toast';
import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import { createAndroidPromotionCampaign, getAndroidPromotionCampaigns, getAndroidPromotionNotificationTemplates, getAndroidPromotionRewardValues, getAndroidPromotionTemplates, getAndroidPromotionUserProfile, getAndroidPromotionUsers, updateAndroidPromotionCampaignStatus } from './actions';
import type { CreatePromotionCampaignInput, PromotionAppStatus, PromotionCampaign, PromotionNotificationTemplate, PromotionPeriod, PromotionRewardValue, PromotionTemplate, PromotionUser, PromotionUserProfile } from './data';

const periods: Array<{ key: PromotionPeriod; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7days', label: 'Last 7 Days' },
];

const promotionLanguages = [
  { code: 'all', name: 'All' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'it', name: 'Italian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'tr', name: 'Turkish' },
  { code: 'th', name: 'Thai' },
];

const promotionUserTypes = [
  { value: 'all', label: 'All' },
  { value: 'PREMIUM', label: 'Premium Only' },
  { value: 'FREE', label: 'Free Only' },
];

const promotionRewardTypes = [
  { value: 'IAP_DISCOUNT', label: 'IAP Discount' },
  { value: 'PREMIUM_ACCES', label: 'Premium Access' },
  { value: 'ADS_FREE', label: 'Ads Free' },
];

const PROMO_DEFAULT_TITLE_KEY = 'PROMO_DEFAULT_TITLE';
const PROMO_DEFAULT_BODY_KEY = 'PROMO_DEFAULT_BODY';
const PROMO_DEFAULT_NOTIFICATION_TEMPLATE_ID = -900001;

const formatDate = (value?: string | null) => {
  if (!value) return 'Not set';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const dateSortValue = (value?: string | null) => {
  if (!value) return 0;
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const buildPromotionPreviewHtml = (template?: PromotionTemplate | null) => {
  const html = template?.promo_html || '<p>No preview available.</p>';
  const packageName = template?.package_name?.trim();

  if (!packageName) return html;

  const previewValues: Record<string, string | number> = {
    hostAppName: 'RER MedApps',
    targetPackage: packageName,
    sourceApp: 'RERMedAppsAdmin',
    campaignId: `preview-${template?.id || 'template'}`,
    referral: 'admin-preview',
    type: 'offer',
    theme: 'light',
    country: 'LK',
    lang: 'en',
    Proof: 82,
    expirySeconds: 1000,
  };

  const isPlaceholderValue = (value: string) => {
    const normalized = value.trim();
    return normalized === '' || normalized.toUpperCase() === 'TEST' || /\{\{[^}]+}}/.test(normalized);
  };

  const replaceStringConfigValue = (nextHtml: string, key: string, value: string | number) =>
    nextHtml.replace(
      new RegExp(`(\\b${key}\\s*:\\s*)(['"])([^'"]*)(['"])`),
      (match, prefix, _openQuote, currentValue) => (
        isPlaceholderValue(currentValue) ? `${prefix}${JSON.stringify(String(value))}` : match
      )
    );

  const replaceNumberConfigValue = (nextHtml: string, key: string, value: string | number) =>
    nextHtml.replace(
      new RegExp(`(\\b${key}\\s*:\\s*)([^,\\n]+)`),
      (match, prefix, currentValue) => (
        isPlaceholderValue(currentValue) || Number.isNaN(Number(currentValue.trim()))
          ? `${prefix}${Number(value)}`
          : match
      )
    );

  let previewHtml = html;
  previewHtml = replaceStringConfigValue(previewHtml, 'hostAppName', previewValues.hostAppName);
  previewHtml = replaceStringConfigValue(previewHtml, 'targetPackage', previewValues.targetPackage);
  previewHtml = replaceStringConfigValue(previewHtml, 'sourceApp', previewValues.sourceApp);
  previewHtml = replaceStringConfigValue(previewHtml, 'campaignId', previewValues.campaignId);
  previewHtml = replaceStringConfigValue(previewHtml, 'referral', previewValues.referral);
  previewHtml = replaceStringConfigValue(previewHtml, 'type', previewValues.type);
  previewHtml = replaceStringConfigValue(previewHtml, 'theme', previewValues.theme);
  previewHtml = replaceStringConfigValue(previewHtml, 'country', previewValues.country);
  previewHtml = replaceStringConfigValue(previewHtml, 'lang', previewValues.lang);
  previewHtml = replaceNumberConfigValue(previewHtml, 'Proof', previewValues.Proof);
  previewHtml = replaceNumberConfigValue(previewHtml, 'expirySeconds', previewValues.expirySeconds);

  if (!/\btargetPackage\s*:/.test(previewHtml)) {
    previewHtml = previewHtml.replace(
      /(const\s+CONFIG\s*=\s*\{)/,
      (_match, prefix) => `${prefix}\n            targetPackage: ${JSON.stringify(packageName)},`
    );
  }

  return previewHtml;
};

const copyPromotionPreviewHtml = async (
  template: PromotionTemplate | null | undefined,
  notify: (props: { title: string; description?: string; variant?: 'destructive' }) => void
) => {
  if (!template) return;

  const html = buildPromotionPreviewHtml(template);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(html);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = html;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    notify({
      title: 'Preview HTML copied',
      description: `${template.template_name} edited preview HTML is on the clipboard.`,
    });
  } catch {
    notify({
      title: 'Copy failed',
      description: 'Browser blocked clipboard access. Try again after clicking inside the page.',
      variant: 'destructive',
    });
  }
};

function AndroidAppPromotionContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [period, setPeriod] = React.useState<PromotionPeriod>('today');
  const [users, setUsers] = React.useState<PromotionUser[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<PromotionUser | null>(null);
  const [profile, setProfile] = React.useState<PromotionUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardUserEmail, setWizardUserEmail] = React.useState(initialEmail);
  const [wizardUserEmailLocked, setWizardUserEmailLocked] = React.useState(false);
  const [campaigns, setCampaigns] = React.useState<PromotionCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = React.useState(true);
  const [campaignError, setCampaignError] = React.useState<string | null>(null);
  const didOpenInitialUser = React.useRef(false);
  const isPageMountedRef = React.useRef(false);

  React.useEffect(() => {
    isPageMountedRef.current = true;

    return () => {
      isPageMountedRef.current = false;
    };
  }, []);

  const loadCampaigns = React.useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignError(null);
    const result = await getAndroidPromotionCampaigns();
    if (!isPageMountedRef.current) return;
    setCampaigns(result.campaigns);
    setCampaignError(result.error || null);
    setCampaignsLoading(false);
  }, []);

  const loadUsers = React.useCallback(async (nextPeriod: PromotionPeriod) => {
    setLoading(true);
    setError(null);
    const result = await getAndroidPromotionUsers(nextPeriod);
    if (!isPageMountedRef.current) return;
    setUsers(result.users);
    setError(result.error || null);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void loadUsers(period);
  }, [loadUsers, period]);

  React.useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const filteredUsers = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return users;
    return users.filter((user) =>
      user.email.toLowerCase().includes(text) ||
      user.purchased_apps.some((app) => app.app_name.toLowerCase().includes(text) || app.sku.toLowerCase().includes(text))
    );
  }, [query, users]);

  const openUser = React.useCallback(async (user: PromotionUser) => {
    setSelectedUser(user);
    setProfile(null);
    setProfileLoading(true);
    const result = await getAndroidPromotionUserProfile(user.email);
    if (!isPageMountedRef.current) return;
    setProfile(result.profile);
    setError(result.error || null);
    setProfileLoading(false);
  }, []);

  const openUserPromotionWizard = React.useCallback((email: string, locked = true) => {
    setWizardUserEmail(email);
    setWizardUserEmailLocked(locked);
    setWizardOpen(true);
  }, []);

  React.useEffect(() => {
    if (didOpenInitialUser.current || !initialEmail) return;
    didOpenInitialUser.current = true;
    const seededUser: PromotionUser = {
      email: initialEmail,
      latest_purchase_date: '',
      purchase_count: 0,
      purchased_apps: [],
    };
    setQuery(initialEmail);
    void openUser(seededUser);
  }, [initialEmail, openUser]);

  return (
    <ReportPageShell
      title="Android App Promotion"
      description="Manage live cross-promotion campaigns and find Android buyers for new opportunities."
      icon={Megaphone}
      accent="emerald"
      actions={
        <>
          <AndroidAnalysisHelpDialog page="android-app-promotion" />
          <Button
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={() => {
              setWizardUserEmail('');
              setWizardUserEmailLocked(false);
              setWizardOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Promotion
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setTemplatesOpen(true)}>
            <Eye className="h-4 w-4" />
            Templates
          </Button>
        </>
      }
    >

      <ActiveCampaignsPanel campaigns={campaigns} loading={campaignsLoading} error={campaignError} onRefresh={loadCampaigns} />

      <Card>
        <CardHeader className="gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <CardTitle>Recent Android Purchases</CardTitle>
            <CardDescription>User-wise list. Click a user to inspect promotion opportunities.</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center 2xl:w-auto">
            <Tabs value={period} onValueChange={(value) => setPeriod(value as PromotionPeriod)}>
              <TabsList className="w-full justify-start sm:w-auto">
                {periods.map((item) => (
                  <TabsTrigger key={item.key} value={item.key}>{item.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => void loadUsers(period)} disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search email, app, or SKU..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <div className="min-w-[1180px]">
            <div className="grid grid-cols-[1.2fr_0.45fr_1.1fr_1.35fr_0.75fr] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>User</span>
              <span>Purchases</span>
              <span>Latest Purchased Apps</span>
              <span>Other Purchased Apps</span>
              <span className="text-right">Action</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading recent purchases
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No Android purchases found for this period.</div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((user) => {
                  const purchasedApps = Array.from(new Map(user.purchased_apps.map((app) => [app.db_name, app])).values());
                  const latestAppKeys = new Set(user.purchased_apps.slice(0, 3).map((app) => app.db_name));
                  const otherPurchasedApps = purchasedApps.filter((app) => !latestAppKeys.has(app.db_name));
                  return (
                    <div
                      key={user.email}
                      className="grid w-full grid-cols-[1.2fr_0.45fr_1.1fr_1.35fr_0.75fr] gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
                    >
                      <button type="button" onClick={() => void openUser(user)} className="min-w-0 text-left">
                        <div className="font-medium">{user.email}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{formatDate(user.latest_purchase_date)}</div>
                      </button>
                      <div className="flex items-center">
                        <Badge variant="secondary">{user.purchase_count}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user.purchased_apps.slice(0, 3).map((app) => (
                          <Badge key={`${app.db_name}-${app.order_id}`} variant="outline" className="gap-2 py-1 pl-1 pr-2">
                            <img
                              src={app.app_icon || 'https://placehold.co/40x40.png'}
                              alt=""
                              className="h-5 w-5 rounded-md object-cover"
                            />
                            <span className="max-w-32 truncate">{app.app_name}</span>
                          </Badge>
                        ))}
                        {user.purchased_apps.length > 3 && <Badge variant="outline">+{user.purchased_apps.length - 3}</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {otherPurchasedApps.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Not available</span>
                        ) : (
                          <>
                            {otherPurchasedApps.slice(0, 8).map((app) => (
                              <Badge key={app.db_name} variant="secondary" className="px-1 py-1" title={app.app_name}>
                                <img
                                  src={app.app_icon || 'https://placehold.co/40x40.png'}
                                  alt={app.app_name}
                                  className="h-5 w-5 rounded-md object-cover"
                                />
                              </Badge>
                            ))}
                            {otherPurchasedApps.length > 8 && <Badge variant="secondary">+{otherPurchasedApps.length - 8}</Badge>}
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-2 text-emerald-400 hover:text-emerald-300"
                          onClick={() => openUserPromotionWizard(user.email, true)}
                        >
                          <Plus className="h-4 w-4" />
                          Create Promotion
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </CardContent>
      </Card>

      <PromotionProfileDialog
        user={selectedUser}
        profile={profile}
        loading={profileLoading}
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setProfile(null);
          }
        }}
      />
      <PromotionTemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <CreatePromotionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreated={loadCampaigns}
        userEmail={wizardUserEmail}
        lockUserEmail={wizardUserEmailLocked}
      />
    </ReportPageShell>
  );
}

export default function AndroidAppPromotionPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[420px]" />}>
      <AndroidAppPromotionContent />
    </React.Suspense>
  );
}

function ActiveCampaignsPanel({
  campaigns,
  loading,
  error,
  onRefresh,
}: {
  campaigns: PromotionCampaign[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const liveCampaigns = campaigns.filter((campaign) => campaign.status.toUpperCase() === 'LIVE');
  const [editingCampaign, setEditingCampaign] = React.useState<PromotionCampaign | null>(null);
  const [nextStatus, setNextStatus] = React.useState('LIVE');
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  const openStatusEditor = React.useCallback((campaign: PromotionCampaign) => {
    setEditingCampaign(campaign);
    setNextStatus(campaign.status || 'LIVE');
    setStatusError(null);
  }, []);

  const saveStatus = React.useCallback(async () => {
    if (!editingCampaign) return;
    setStatusSaving(true);
    setStatusError(null);
    const result = await updateAndroidPromotionCampaignStatus(editingCampaign.id, nextStatus);
    setStatusSaving(false);
    if (!result.success) {
      setStatusError(result.error || 'Unable to update status.');
      return;
    }
    setEditingCampaign(null);
    onRefresh();
  }, [editingCampaign, nextStatus, onRefresh]);

  return (
    <>
    <Card className="overflow-hidden border-white/10 bg-card/80">
      <CardHeader className="gap-4 border-b border-white/10 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-400" />
            Active Promotion Campaigns
          </CardTitle>
          <CardDescription>Loaded from rermedap_admin.fnd_global_promotion_campaign_tab.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/15">{liveCampaigns.length} live</Badge>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error && <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading campaigns
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No promotion campaigns found.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1040px]">
              <div className="grid grid-cols-[0.8fr_1.2fr_1fr_1fr_1fr_0.6fr_0.25fr] gap-4 border-b border-white/10 bg-white/[0.025] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Campaign</span>
                <span>Target Package</span>
                <span>Reward</span>
                <span>Audience</span>
                <span>Validity</span>
                <span>Status</span>
                <span className="text-right">Edit</span>
              </div>
              <div className="divide-y divide-white/10">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="grid grid-cols-[0.8fr_1.2fr_1fr_1fr_1fr_0.6fr_0.25fr] gap-4 px-5 py-4 text-sm">
                    <div>
                      <div className="font-semibold text-foreground">{campaign.campaign_id}</div>
                      <div className="text-xs text-muted-foreground">Template #{campaign.template_id}</div>
                    </div>
                    <div className="truncate text-muted-foreground">{campaign.target_package_name}</div>
                    <div>
                      <div className="font-medium">{campaign.reward_type}</div>
                      <div className="text-xs text-muted-foreground">{campaign.reward_value}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>Email: {campaign.target_email || '*'}</div>
                      <div>{campaign.target_country || '*'} / {campaign.target_lang || '*'}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div>{formatDate(campaign.valid_from)}</div>
                      <div>{formatDate(campaign.valid_to)}</div>
                    </div>
                    <div>
                      <Badge className={campaign.status.toUpperCase() === 'LIVE' ? 'bg-emerald-500 text-white hover:bg-emerald-500' : ''} variant={campaign.status.toUpperCase() === 'LIVE' ? 'default' : 'outline'}>
                        {campaign.status || 'N/A'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-300"
                        onClick={() => openStatusEditor(campaign)}
                        aria-label={`Edit ${campaign.campaign_id} status`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    <Dialog open={!!editingCampaign} onOpenChange={(open) => !open && setEditingCampaign(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit campaign status</DialogTitle>
          <DialogDescription>{editingCampaign?.campaign_id}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {statusError && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{statusError}</div>}
          <Field label="Status">
            <Select value={nextStatus} onValueChange={setNextStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">DRAFT</SelectItem>
                <SelectItem value="TEST">TEST</SelectItem>
                <SelectItem value="LIVE">LIVE</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingCampaign(null)} disabled={statusSaving}>Cancel</Button>
            <Button onClick={saveStatus} disabled={statusSaving} className="bg-emerald-600 text-white hover:bg-emerald-500">
              {statusSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Update
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function toLocalDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toSqlDateTime(value: string) {
  return value ? `${value.replace('T', ' ')}:00` : '';
}

function toAudienceApiValue(value: string) {
  const trimmed = value.trim();
  return !trimmed || trimmed === '*' || trimmed.toLowerCase() === 'all' ? '*' : trimmed;
}

function toAudienceDisplayValue(value: string) {
  return value === '*' || value.toLowerCase() === 'all' ? 'All' : value;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function notificationLanguageCode(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === '*' || normalized === 'all') return 'all';
  return normalized.split('-')[0];
}

function getNotificationTemplateText(template: PromotionNotificationTemplate, field: 'title' | 'body', language: string) {
  const key = field === 'title' ? template.key_title : template.key_body;
  const directFallback = String((field === 'title' ? template.title : template.body) || '').trim();
  const translations = template.translations?.[field] || {};
  const english = translations.en?.trim() || '';
  const fallback = directFallback && directFallback !== key ? directFallback : english || directFallback || key;
  const code = notificationLanguageCode(language);
  if (code === 'all') return fallback;
  return translations[code]?.trim() || fallback;
}

function isPromoDefaultNotificationTemplate(template: PromotionNotificationTemplate) {
  return template.key_title === PROMO_DEFAULT_TITLE_KEY && template.key_body === PROMO_DEFAULT_BODY_KEY;
}

function getNotificationQueueTitle(template: PromotionNotificationTemplate) {
  return template.key_title || PROMO_DEFAULT_TITLE_KEY;
}

function getNotificationQueueBody(template: PromotionNotificationTemplate) {
  return template.key_body || PROMO_DEFAULT_BODY_KEY;
}

function buildPromoDefaultNotificationTemplate(packageName: string, source?: PromotionNotificationTemplate | null): PromotionNotificationTemplate {
  const titleTranslations = source?.translations?.title || {};
  const bodyTranslations = source?.translations?.body || {};
  const title = titleTranslations.en?.trim() || source?.title?.trim() || PROMO_DEFAULT_TITLE_KEY;
  const body = bodyTranslations.en?.trim() || source?.body?.trim() || PROMO_DEFAULT_BODY_KEY;

  return {
    id: PROMO_DEFAULT_NOTIFICATION_TEMPLATE_ID,
    package_name: packageName,
    notification_type: 'PROMO',
    key_title: PROMO_DEFAULT_TITLE_KEY,
    key_body: PROMO_DEFAULT_BODY_KEY,
    title,
    body,
    created_at: '',
    translations: {
      title: titleTranslations,
      body: bodyTranslations,
    },
  };
}

function toCampaignIdToken(value: string) {
  const packageSuffix = value.split('.').filter(Boolean).pop() || value;
  return packageSuffix
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 28) || 'APP';
}

function buildPromotionCampaignId(promoteApp: string, placementApp: string) {
  const date = toLocalDateTimeValue(new Date()).slice(0, 10).replace(/-/g, '');
  return `${toCampaignIdToken(promoteApp)}_${toCampaignIdToken(placementApp)}_${date}`.slice(0, 96);
}

type PromotionType = 'global' | 'user';

const promotionHelpSections = [
  {
    title: '1. වර්ගය',
    summary: 'මෙම campaign එක සියලු userලාට පෙන්වන එකක්ද, නැත්නම් එක් user කෙනෙකුට target කරන එකක්ද තෝරන තැන.',
    items: [
      'Global promotion එක email, country, language, user type වැනි audience filters භාවිතා කරයි.',
      'Global promotion එකේ Notification step එක පෙන්වන්නේ නැහැ; notification queue rows සෑදෙන්නේ නැහැ.',
      'User based promotion එක email එකෙන් එක් user කෙනෙකු load කර, ඔහුගේ Android app profile එක භාවිතා කරයි.',
    ],
  },
  {
    title: '2. ප්‍රමෝට් කරන App එක',
    summary: 'මෙම campaign එකෙන් offer/promotion පෙන්වන්න යන Android app එක තෝරන තැන.',
    items: [
      'මෙහි තෝරන app එක අනුව promotion templates සහ reward values load වෙයි.',
      'User campaign එකකදී installed apps සහ not-installed apps වෙන වෙනම පෙන්වයි.',
    ],
  },
  {
    title: '3. Template',
    summary: 'Placement apps ඇතුළත පෙන්වන HTML promotion template එක තෝරන තැන.',
    items: [
      'Templates load වෙන්නේ fnd_global_promotion_template_tab table එකෙන්.',
      'Save කිරීමට කලින් View button එකෙන් HTML preview එක බලන්න පුළුවන්.',
    ],
  },
  {
    title: '4. Placement',
    summary: 'Promotion එක පෙන්විය යුතු apps තෝරන තැන.',
    items: [
      'තෝරාගන්නා සෑම placement app එකකටම campaign row එකක් සෑදෙයි.',
      'User campaign වලදී placement apps ලෙස පෙන්වන්නේ එම user install කර ඇති apps පමණි.',
    ],
  },
  {
    title: '5. Distribution',
    summary: 'Campaign ID, audience, reward, valid dates සහ live status සකසන තැන.',
    items: [
      'Campaign ID එක promoted app, placement app සහ අද දිනය භාවිතා කර generate වෙයි.',
      'IAP discount campaign එකකදී Next button එක enable වීමට reward value එකක් අනිවාර්යයි.',
    ],
  },
  {
    title: '6. Notification / Confirm',
    summary: 'DB එකට data ලියන්නේ Confirm step එකේදී පමණි.',
    items: [
      'Confirm & Save click කළාම campaign rows rermedap_admin.fnd_global_promotion_campaign_tab වෙත save වෙයි.',
      'User based promotions වලදී PROMO_DEFAULT_TITLE සහ PROMO_DEFAULT_BODY fnd_notification_queuee_tab එකට queue වෙයි.',
      'Global promotions වලට notifications queue වෙන්නේ නැහැ.',
    ],
  },
] as const;

function PromotionWizardHelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden border-emerald-400/20 bg-card p-0 text-foreground shadow-2xl">
        <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%),linear-gradient(135deg,rgba(47,111,237,0.10),transparent)] px-6 py-5">
          <div className="flex items-start gap-3 pr-10">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/15 text-emerald-200">
              <CircleHelp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80">ප්‍රමෝෂන් උදව්</p>
              <DialogTitle className="mt-1 text-lg font-black tracking-tight">Create Promotion flow එකේ මොකක්ද වෙන්නේ?</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                Save කිරීමට කලින් step ටික, DB write එක, notification queue behavior එක කෙටියෙන් පැහැදිලි කර ඇත.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-5 md:p-6">
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.08] p-4">
            <p className="text-sm font-semibold leading-6 text-foreground/85">
              Confirm & Save click කරන තුරු campaign එක DB එකට write වෙන්නේ නැහැ. Global promotion වලට notification යවන්නේ නැහැ; user based promotion වලට පමණක් PROMO_DEFAULT_TITLE / PROMO_DEFAULT_BODY queue වෙයි.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {promotionHelpSections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-white/10 bg-background/45 p-4">
                <h3 className="text-sm font-black">{section.title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">{section.summary}</p>
                <div className="mt-4 space-y-2">
                  {section.items.map((item) => (
                    <div key={item} className="flex gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold leading-5 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePromotionWizard({
  open,
  onOpenChange,
  onCreated,
  userEmail,
  lockUserEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  userEmail: string;
  lockUserEmail: boolean;
}) {
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [promotionType, setPromotionType] = React.useState<PromotionType>('global');
  const [apps, setApps] = React.useState<App[]>([]);
  const [userPromotionEmailInput, setUserPromotionEmailInput] = React.useState('');
  const [userPromotionProfile, setUserPromotionProfile] = React.useState<PromotionUserProfile | null>(null);
  const [userProfileLoading, setUserProfileLoading] = React.useState(false);
  const [userProfileError, setUserProfileError] = React.useState<string | null>(null);
  const [selectedPromotedPackage, setSelectedPromotedPackage] = React.useState('');
  const [selectedPlacementPackages, setSelectedPlacementPackages] = React.useState<string[]>([]);
  const [templates, setTemplates] = React.useState<PromotionTemplate[]>([]);
  const [notificationTemplates, setNotificationTemplates] = React.useState<PromotionNotificationTemplate[]>([]);
  const [rewardValues, setRewardValues] = React.useState<PromotionRewardValue[]>([]);
  const [rewardValuesLoading, setRewardValuesLoading] = React.useState(false);
  const [rewardValuesError, setRewardValuesError] = React.useState<string | null>(null);
  const [selectedNotificationTemplateId, setSelectedNotificationTemplateId] = React.useState('');
  const [loadingSetup, setLoadingSetup] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notificationTemplateError, setNotificationTemplateError] = React.useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = React.useState<PromotionTemplate | null>(null);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [form, setForm] = React.useState<CreatePromotionCampaignInput>({
    promotion_type: 'global',
    template_id: '',
    target_package_name: '',
    campaign_id: '',
    target_email: 'All',
    target_country: 'All',
    target_lang: 'all',
    target_user_type: 'all',
    reward_type: 'IAP_DISCOUNT',
    reward_value: 'lifetime_promo_earlyaccess',
    valid_from: toLocalDateTimeValue(new Date()),
    valid_to: toLocalDateTimeValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    status: 'LIVE',
    notification_enabled: '0',
    notification_title: '',
    notification_body: '',
    notification_app_package_name: '',
  });

  const userPromotionEmail = userPromotionEmailInput.trim().toLowerCase();
  const isUserBased = promotionType === 'user';
  const androidApps = React.useMemo(
    () => apps.filter((app) => app.isActive && app.package_name && app.os.toLowerCase().includes('android')),
    [apps]
  );
  const promotedApp = React.useMemo(
    () => androidApps.find((app) => app.package_name === selectedPromotedPackage) || null,
    [androidApps, selectedPromotedPackage]
  );
  const userInstalledApps = React.useMemo(
    () => (userPromotionProfile?.apps || []).filter((app) => app.status !== 'not_installed'),
    [userPromotionProfile?.apps]
  );
  const userNotInstalledApps = React.useMemo(
    () => (userPromotionProfile?.apps || []).filter((app) => app.status === 'not_installed'),
    [userPromotionProfile?.apps]
  );
  const promotedUserApp = React.useMemo(
    () => userPromotionProfile?.apps.find((app) => app.package_name === selectedPromotedPackage) || null,
    [selectedPromotedPackage, userPromotionProfile?.apps]
  );
  const promotedAppName = promotedUserApp?.app_name || promotedApp?.name || selectedPromotedPackage;
  const placementApps = React.useMemo(
    () => androidApps.filter((app) => selectedPlacementPackages.includes(app.package_name)),
    [androidApps, selectedPlacementPackages]
  );
  const availablePlacementApps = React.useMemo(
    () => androidApps.filter((app) => app.package_name !== selectedPromotedPackage),
    [androidApps, selectedPromotedPackage]
  );
  const userPlacementApps = React.useMemo(
    () => userInstalledApps
      .filter((app) => app.package_name !== selectedPromotedPackage)
      .sort((first, second) => dateSortValue(second.last_online) - dateSortValue(first.last_online)),
    [selectedPromotedPackage, userInstalledApps]
  );
  const selectedPlacementNames = React.useMemo(
    () => isUserBased
      ? userPlacementApps.filter((app) => selectedPlacementPackages.includes(app.package_name)).map((app) => app.app_name)
      : placementApps.map((app) => app.name),
    [isUserBased, placementApps, selectedPlacementPackages, userPlacementApps]
  );
  const getPlacementAppName = React.useCallback((packageName: string) => {
    if (isUserBased) {
      return userPlacementApps.find((app) => app.package_name === packageName)?.app_name || packageName;
    }
    return availablePlacementApps.find((app) => app.package_name === packageName)?.name || packageName;
  }, [availablePlacementApps, isUserBased, userPlacementApps]);
  const campaignIds = React.useMemo(
    () => selectedPlacementPackages.map((packageName) => ({
      packageName,
      appName: getPlacementAppName(packageName),
      campaignId: buildPromotionCampaignId(promotedAppName || selectedPromotedPackage, getPlacementAppName(packageName)),
    })),
    [getPlacementAppName, promotedAppName, selectedPlacementPackages, selectedPromotedPackage]
  );
  const filteredTemplates = React.useMemo(
    () => templates.filter((template) => template.package_name.trim().toLowerCase() === selectedPromotedPackage.trim().toLowerCase()),
    [selectedPromotedPackage, templates]
  );
  const filteredNotificationTemplates = React.useMemo(
    () => {
      const matchingTemplates = notificationTemplates.filter((template) => template.package_name.trim().toLowerCase() === selectedPromotedPackage.trim().toLowerCase());
      const defaultTemplates = matchingTemplates.filter(isPromoDefaultNotificationTemplate);
      if (defaultTemplates.length > 0) return defaultTemplates;
      const defaultSource = notificationTemplates.find(isPromoDefaultNotificationTemplate) || null;
      return selectedPromotedPackage ? [buildPromoDefaultNotificationTemplate(selectedPromotedPackage, defaultSource)] : [];
    },
    [notificationTemplates, selectedPromotedPackage]
  );
  const selectedTemplate = React.useMemo(
    () => templates.find((template) => String(template.id) === form.template_id) || null,
    [form.template_id, templates]
  );
  const selectedNotificationTemplate = React.useMemo(
    () => (
      filteredNotificationTemplates.find((template) => String(template.id) === selectedNotificationTemplateId) ||
      notificationTemplates.find((template) => String(template.id) === selectedNotificationTemplateId) ||
      null
    ),
    [filteredNotificationTemplates, notificationTemplates, selectedNotificationTemplateId]
  );
  const selectedLanguageLabel = promotionLanguages.find((language) => language.code === (form.target_lang === '*' ? 'all' : form.target_lang))?.name || form.target_lang;
  const selectedUserTypeLabel = promotionUserTypes.find((type) => type.value === (form.target_user_type === '*' ? 'all' : form.target_user_type))?.label || form.target_user_type;
  const selectedNotificationPreviewTitle = selectedNotificationTemplate ? getNotificationTemplateText(selectedNotificationTemplate, 'title', form.target_lang) : '';
  const selectedNotificationPreviewBody = selectedNotificationTemplate ? getNotificationTemplateText(selectedNotificationTemplate, 'body', form.target_lang) : '';
  const promotionNotificationRequired = isUserBased;

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const initialUserPromotionEmail = userEmail.trim().toLowerCase();
    const initialPromotionType: PromotionType = lockUserEmail && initialUserPromotionEmail ? 'user' : 'global';
    setStep(0);
    setError(null);
    setNotificationTemplateError(null);
    setUserProfileError(null);
    setUserPromotionProfile(null);
    setUserPromotionEmailInput(initialUserPromotionEmail);
    setPromotionType(initialPromotionType);
    setSelectedPromotedPackage('');
    setSelectedPlacementPackages([]);
    setSelectedNotificationTemplateId('');
    setRewardValues([]);
    setRewardValuesError(null);
    setRewardValuesLoading(false);
    setLoadingSetup(true);
    setForm((current) => ({
      ...current,
      promotion_type: initialPromotionType,
      template_id: '',
      target_package_name: '',
      campaign_id: '',
      target_email: initialUserPromotionEmail || 'All',
      target_country: 'All',
      target_lang: 'all',
      target_user_type: 'all',
      reward_type: 'IAP_DISCOUNT',
      reward_value: 'lifetime_promo_earlyaccess',
      valid_from: toLocalDateTimeValue(new Date()),
      valid_to: toLocalDateTimeValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      status: 'LIVE',
      notification_enabled: '0',
      notification_title: '',
      notification_body: '',
      notification_app_package_name: '',
    }));
    void Promise.all([getAndroidPromotionTemplates(), getAndroidPromotionNotificationTemplates(), getApps()]).then(([templateResult, notificationTemplateResult, appRows]) => {
      if (cancelled) return;
      setTemplates(templateResult.templates);
      setNotificationTemplates(notificationTemplateResult.notificationTemplates);
      setApps(appRows);
      setError(templateResult.error || null);
      setNotificationTemplateError(notificationTemplateResult.error || null);
      setLoadingSetup(false);
    });

    return () => {
      cancelled = true;
    };
  }, [lockUserEmail, open, userEmail]);

  React.useEffect(() => {
    if (!open || promotionType !== 'user') return;
    if (!isValidEmail(userPromotionEmail)) {
      setUserPromotionProfile(null);
      setUserProfileError(null);
      setUserProfileLoading(false);
      setForm((current) => ({ ...current, target_email: userPromotionEmail || 'All' }));
      return;
    }

    let cancelled = false;
    setUserProfileLoading(true);
    setUserProfileError(null);
    setForm((current) => ({ ...current, target_email: userPromotionEmail }));

    const timeout = window.setTimeout(() => {
      void getAndroidPromotionUserProfile(userPromotionEmail).then((result) => {
        if (cancelled) return;
        setUserPromotionProfile(result.profile);
        setUserProfileError(result.error || null);
        setUserProfileLoading(false);
      });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, promotionType, userPromotionEmail]);

  React.useEffect(() => {
    if (!open || !selectedPromotedPackage || form.reward_type !== 'IAP_DISCOUNT') {
      setRewardValues([]);
      setRewardValuesError(null);
      setRewardValuesLoading(false);
      return;
    }

    let cancelled = false;
    setRewardValuesLoading(true);
    setRewardValuesError(null);

    void getAndroidPromotionRewardValues(selectedPromotedPackage).then((result) => {
      if (cancelled) return;
      const values = result.rewardValues;
      setRewardValues(values);
      setRewardValuesError(result.error || null);
      setRewardValuesLoading(false);
      setForm((current) => {
        if (current.reward_type !== 'IAP_DISCOUNT') return current;
        const currentExists = values.some((item) => item.name === current.reward_value);
        const preferred = values.find((item) => item.name === 'lifetime_promo_earlyaccess')?.name || values[0]?.name || '';
        return {
          ...current,
          reward_value: currentExists ? current.reward_value : preferred,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [form.reward_type, open, selectedPromotedPackage]);

  const updateForm = React.useCallback((key: keyof CreatePromotionCampaignInput, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const updateRewardType = React.useCallback((value: string) => {
    setForm((current) => ({
      ...current,
      reward_type: value,
      reward_value: value === 'IAP_DISCOUNT' ? current.reward_value : '',
    }));
  }, []);

  const selectTemplate = React.useCallback((templateId: string) => {
    setForm((current) => ({
      ...current,
      template_id: templateId,
    }));
  }, []);

  const selectNotificationTemplate = React.useCallback((templateId: string) => {
    const template = filteredNotificationTemplates.find((item) => String(item.id) === templateId) || notificationTemplates.find((item) => String(item.id) === templateId) || null;
    setSelectedNotificationTemplateId(templateId);
    if (!template) return;

    setForm((current) => ({
      ...current,
      notification_title: getNotificationQueueTitle(template),
      notification_body: getNotificationQueueBody(template),
      notification_enabled: '1',
    }));
  }, [filteredNotificationTemplates, notificationTemplates]);

  const selectPromotedPackage = React.useCallback((packageName: string) => {
    const matchingTemplates = templates.filter((template) => template.package_name.trim().toLowerCase() === packageName.trim().toLowerCase());
    const firstTemplate = matchingTemplates[0] || null;
    const matchingNotificationTemplates = notificationTemplates.filter((template) => template.package_name.trim().toLowerCase() === packageName.trim().toLowerCase());
    const defaultNotificationSource = notificationTemplates.find(isPromoDefaultNotificationTemplate) || null;
    const firstNotificationTemplate = isUserBased
      ? matchingNotificationTemplates.find(isPromoDefaultNotificationTemplate) || buildPromoDefaultNotificationTemplate(packageName, defaultNotificationSource)
      : null;
    setSelectedPromotedPackage(packageName);
    setSelectedPlacementPackages([]);
    setSelectedNotificationTemplateId(firstNotificationTemplate ? String(firstNotificationTemplate.id) : '');
    setRewardValues([]);
    setRewardValuesError(null);
    setForm((current) => ({
      ...current,
      target_package_name: packageName,
      template_id: firstTemplate ? String(firstTemplate.id) : '',
      campaign_id: '',
      notification_enabled: firstNotificationTemplate ? '1' : '0',
      notification_title: firstNotificationTemplate ? getNotificationQueueTitle(firstNotificationTemplate) : '',
      notification_body: firstNotificationTemplate ? getNotificationQueueBody(firstNotificationTemplate) : '',
      notification_app_package_name: '',
    }));
  }, [isUserBased, notificationTemplates, templates]);

  const togglePlacementPackage = React.useCallback((packageName: string) => {
    if (packageName === selectedPromotedPackage) return;
    setSelectedPlacementPackages((current) =>
      current.includes(packageName)
        ? current.filter((item) => item !== packageName)
        : [...current, packageName]
    );
  }, [selectedPromotedPackage]);

  const updatePromotionType = React.useCallback((nextType: PromotionType) => {
    if (lockUserEmail && nextType === 'global') return;
    setPromotionType(nextType);
    setSelectedPromotedPackage('');
    setSelectedPlacementPackages([]);
    setSelectedNotificationTemplateId('');
    setRewardValues([]);
    setRewardValuesError(null);
    setForm((current) => ({
      ...current,
      promotion_type: nextType,
      template_id: '',
      target_package_name: '',
      campaign_id: '',
      target_email: nextType === 'user' ? userPromotionEmail : 'All',
      target_country: 'All',
      target_lang: 'all',
      target_user_type: 'all',
      notification_enabled: '0',
      notification_title: '',
      notification_body: '',
      notification_app_package_name: '',
    }));
  }, [lockUserEmail, userPromotionEmail]);

  React.useEffect(() => {
    if (!promotionNotificationRequired || !selectedNotificationTemplate) return;
    setForm((current) => ({
      ...current,
      notification_title: getNotificationQueueTitle(selectedNotificationTemplate),
      notification_body: getNotificationQueueBody(selectedNotificationTemplate),
      notification_enabled: '1',
    }));
  }, [promotionNotificationRequired, selectedNotificationTemplate]);

  React.useEffect(() => {
    if (!open || !promotionNotificationRequired || selectedNotificationTemplateId || filteredNotificationTemplates.length === 0) return;

    const template = filteredNotificationTemplates[0];
    setSelectedNotificationTemplateId(String(template.id));
    setForm((current) => ({
      ...current,
      notification_title: getNotificationQueueTitle(template),
      notification_body: getNotificationQueueBody(template),
      notification_enabled: '1',
    }));
  }, [filteredNotificationTemplates, open, promotionNotificationRequired, selectedNotificationTemplateId]);

  const submit = React.useCallback(async () => {
    if (!selectedPromotedPackage || selectedPlacementPackages.length === 0) {
      setError('Select one promoted app and at least one placement app.');
      return;
    }

    if (promotionNotificationRequired && !selectedNotificationTemplateId) {
      setStep(5);
      setError('Select a notification template before saving this promotion.');
      return;
    }

    setSaving(true);
    setError(null);
    for (const placementPackage of selectedPlacementPackages) {
      const result = await createAndroidPromotionCampaign({
        ...form,
        promotion_type: isUserBased ? 'user' : 'global',
        target_package_name: selectedPromotedPackage,
        target_email: isUserBased ? userPromotionEmail : toAudienceApiValue(form.target_email),
        target_country: isUserBased ? '*' : toAudienceApiValue(form.target_country),
        target_lang: isUserBased ? '*' : toAudienceApiValue(form.target_lang),
        target_user_type: isUserBased ? '*' : toAudienceApiValue(form.target_user_type),
        reward_value: form.reward_type === 'IAP_DISCOUNT' ? form.reward_value : '',
        notification_enabled: isUserBased && selectedNotificationTemplateId ? '1' : '0',
        notification_title: isUserBased && selectedNotificationTemplate ? getNotificationQueueTitle(selectedNotificationTemplate) : '',
        notification_body: isUserBased && selectedNotificationTemplate ? getNotificationQueueBody(selectedNotificationTemplate) : '',
        notification_app_package_name: isUserBased ? placementPackage : '',
        campaign_id: buildPromotionCampaignId(promotedAppName || selectedPromotedPackage, getPlacementAppName(placementPackage)),
        valid_from: toSqlDateTime(form.valid_from),
        valid_to: toSqlDateTime(form.valid_to),
      });
      if (!result.success) {
        setError(result.error || 'Unable to create promotion campaign.');
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onOpenChange(false);
    onCreated();
  }, [form, getPlacementAppName, isUserBased, onCreated, onOpenChange, promotedAppName, promotionNotificationRequired, selectedNotificationTemplate, selectedNotificationTemplateId, selectedPlacementPackages, selectedPromotedPackage, userPromotionEmail]);

  const canContinue =
    step === 0 ? (promotionType === 'global' || (isValidEmail(userPromotionEmail) && Boolean(userPromotionProfile) && !userProfileLoading)) :
    step === 1 ? Boolean(selectedPromotedPackage) :
    step === 2 ? Boolean(form.template_id) :
    step === 3 ? selectedPlacementPackages.length > 0 :
    step === 4 ? Boolean((form.reward_type !== 'IAP_DISCOUNT' || form.reward_value) && form.valid_from && form.valid_to && form.target_user_type && (isUserBased || (form.target_email && form.target_country && form.target_lang))) :
    step === 5 ? (!promotionNotificationRequired || Boolean(selectedNotificationTemplateId)) :
    true;

  const stepLabels = React.useMemo(
    () => promotionNotificationRequired
      ? ['Type', 'Promote App', 'Template', 'Placement', 'Distribution', 'Notification', 'Confirm']
      : ['Type', 'Promote App', 'Template', 'Placement', 'Distribution', 'Confirm'],
    [promotionNotificationRequired]
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[820px] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-white/10 px-6 py-5 pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-emerald-400" />
                Create Promotion
              </DialogTitle>
              <DialogDescription className="mt-2">Save a live campaign with the selected promotion settings.</DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setHelpOpen(true)}
              className="h-9 w-9 shrink-0 rounded-xl border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15 hover:text-white"
              aria-label="ප්‍රමෝෂන් උදව් විවෘත කරන්න"
              title="ප්‍රමෝෂන් උදව්"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[220px_1fr]">
          <div className="min-h-0 overflow-hidden border-r border-white/10 bg-muted/10 p-4">
            <div className="space-y-2">
              {stepLabels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  disabled={index > step}
                  onClick={() => index <= step && setStep(index)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${step === index ? 'bg-emerald-500/15 text-emerald-100' : index > step ? 'text-muted-foreground' : 'text-muted-foreground hover:bg-white/[0.04]'}`}
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${step === index ? 'bg-emerald-500 text-white' : 'bg-white/10'}`}>{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {error && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}
              {loadingSetup && (
                <div className="flex items-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading promotion setup
                </div>
              )}

              {!loadingSetup && step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">Promotion type</h3>
                    <p className="text-sm text-muted-foreground">Choose whether this campaign is global or targeted to the selected user.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <ChoiceCard
                      title="Global promotion"
                      description="Show the promotion to a broad audience using country, language, and user-type filters."
                      selected={promotionType === 'global'}
                      disabled={lockUserEmail}
                      onClick={() => updatePromotionType('global')}
                    />
                    <ChoiceCard
                      title="User based promotion"
                      description="Target one user by email and use their app profile for promotion placement."
                      selected={promotionType === 'user'}
                      onClick={() => updatePromotionType('user')}
                    />
                  </div>
                  {promotionType === 'user' && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <Field label="Target email">
                        <Input
                          type="email"
                          value={userPromotionEmailInput}
                          onChange={(event) => {
                            if (lockUserEmail) return;
                            setUserPromotionEmailInput(event.target.value);
                            setUserPromotionProfile(null);
                            setUserProfileError(null);
                            setSelectedPromotedPackage('');
                            setSelectedPlacementPackages([]);
                            setSelectedNotificationTemplateId('');
                          }}
                          placeholder="user@example.com"
                          readOnly={lockUserEmail}
                          className={lockUserEmail ? 'cursor-not-allowed opacity-80' : undefined}
                          required
                        />
                      </Field>
                      {!userPromotionEmailInput.trim() && <p className="text-sm text-muted-foreground">Enter a user email to continue.</p>}
                      {userPromotionEmailInput.trim() && !isValidEmail(userPromotionEmail) && (
                        <p className="text-sm text-destructive">Enter a valid email address.</p>
                      )}
                      {userProfileLoading && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading user app profile
                        </div>
                      )}
                      {userProfileError && <p className="text-sm text-destructive">{userProfileError}</p>}
                      {userPromotionProfile && (
                        <div className="grid gap-3 pt-1 text-sm sm:grid-cols-3">
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs text-muted-foreground">Installed</div>
                            <div className="mt-1 font-semibold">{userInstalledApps.length}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs text-muted-foreground">Not installed</div>
                            <div className="mt-1 font-semibold">{userNotInstalledApps.length}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="text-xs text-muted-foreground">Premium</div>
                            <div className="mt-1 font-semibold">{userPromotionProfile.summary.premium}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!loadingSetup && step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">Apps to promote</h3>
                    <p className="text-sm text-muted-foreground">Select the app that this campaign will promote.</p>
                  </div>
                  {isUserBased ? (
                    <div className="space-y-6">
                      <UserPromotionAppSection
                        title="Installed apps"
                        apps={userInstalledApps}
                        emptyText="No installed apps found for this user."
                        selectedPackage={selectedPromotedPackage}
                        onSelect={selectPromotedPackage}
                      />
                      <UserPromotionAppSection
                        title="Not installed apps"
                        apps={userNotInstalledApps}
                        emptyText="No not-installed apps found for this user."
                        selectedPackage={selectedPromotedPackage}
                        onSelect={selectPromotedPackage}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {androidApps.map((app) => (
                        <AppSelectCard
                          key={app.package_name}
                          app={app}
                          selected={selectedPromotedPackage === app.package_name}
                          onClick={() => selectPromotedPackage(app.package_name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!loadingSetup && step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">Template</h3>
                    <p className="text-sm text-muted-foreground">
                      Showing templates for {promotedAppName || 'the selected app'}.
                    </p>
                  </div>
                  {filteredTemplates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-muted-foreground">
                      No templates found in fnd_global_promotion_template_tab for {selectedPromotedPackage || 'this app'}.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`relative rounded-2xl border p-4 transition-colors ${form.template_id === String(template.id) ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20'}`}
                      >
                        <button
                          type="button"
                          onClick={() => selectTemplate(String(template.id))}
                          className="block w-full pr-20 text-left"
                        >
                          <div className="font-semibold">{template.template_name}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{template.package_name}</div>
                          <Badge variant="outline" className="mt-3">{template.status || 'N/A'}</Badge>
                        </button>
                        <div className="absolute right-3 top-3 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 rounded-full px-2 text-xs"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          {form.template_id === String(template.id) && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              )}

              {!loadingSetup && step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">Ad placement apps</h3>
                    <p className="text-sm text-muted-foreground">
                      {isUserBased ? 'Select installed apps where this promotion should be placed.' : 'Select the apps where this promotion ad should be placed.'}
                    </p>
                  </div>
                  {isUserBased ? (
                    userPlacementApps.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-muted-foreground">
                        This user has no other installed apps available for placement.
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {userPlacementApps.map((app) => (
                          <UserAppSelectCard
                            key={app.package_name}
                            app={app}
                            selected={selectedPlacementPackages.includes(app.package_name)}
                            onClick={() => togglePlacementPackage(app.package_name)}
                            showPurchasedStatusBadge={false}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {availablePlacementApps.map((app) => (
                        <AppSelectCard
                          key={app.package_name}
                          app={app}
                          selected={selectedPlacementPackages.includes(app.package_name)}
                          onClick={() => togglePlacementPackage(app.package_name)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!loadingSetup && step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">Ad distribution settings</h3>
                    <p className="text-sm text-muted-foreground">Use All for broad audience values.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Campaign ID</div>
                    {campaignIds.length === 0 ? (
                      <Input value="" placeholder="Select placement app first" readOnly />
                    ) : campaignIds.length === 1 ? (
                      <Input value={campaignIds[0].campaignId} readOnly className="font-mono text-sm" />
                    ) : (
                      <div className="grid gap-2">
                        {campaignIds.map((item) => (
                          <div key={item.packageName} className="grid gap-2 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:items-center">
                            <div className="truncate text-sm text-muted-foreground">{item.appName}</div>
                            <Input value={item.campaignId} readOnly className="font-mono text-sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Target email">
                      <Input
                        value={isUserBased ? userPromotionEmail : toAudienceDisplayValue(form.target_email)}
                        readOnly={isUserBased}
                        onChange={(event) => updateForm('target_email', event.target.value)}
                      />
                    </Field>
                    {!isUserBased && (
                      <>
                        <Field label="Target country">
                          <Input value={toAudienceDisplayValue(form.target_country)} onChange={(event) => updateForm('target_country', event.target.value)} />
                        </Field>
                        <Field label="Target language">
                          <Select value={form.target_lang === '*' ? 'all' : form.target_lang} onValueChange={(value) => updateForm('target_lang', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                              {promotionLanguages.map((language) => (
                                <SelectItem key={language.code} value={language.code}>{language.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      </>
                    )}
                    {!isUserBased && (
                      <Field label="Target user type">
                        <Select value={form.target_user_type === '*' ? 'all' : form.target_user_type} onValueChange={(value) => updateForm('target_user_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                          <SelectContent>
                            {promotionUserTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                    <Field label="Reward type">
                      <Select value={form.reward_type} onValueChange={updateRewardType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reward type" />
                        </SelectTrigger>
                        <SelectContent>
                          {promotionRewardTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {form.reward_type === 'IAP_DISCOUNT' && (
                      <Field label="Reward value">
                        <Select
                          value={form.reward_value}
                          onValueChange={(value) => updateForm('reward_value', value)}
                          disabled={rewardValuesLoading || rewardValues.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={rewardValuesLoading ? 'Loading reward values' : 'Select reward value'} />
                          </SelectTrigger>
                          <SelectContent>
                            {rewardValues.map((item) => (
                              <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {rewardValuesLoading && (
                          <p className="mt-2 flex items-center text-xs text-muted-foreground">
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            Loading lifetime promo values
                          </p>
                        )}
                        {!rewardValuesLoading && rewardValuesError && <p className="mt-2 text-xs text-destructive">{rewardValuesError}</p>}
                        {!rewardValuesLoading && !rewardValuesError && rewardValues.length === 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">No lifetime promo reward values found for this app.</p>
                        )}
                      </Field>
                    )}
                    <Field label="Valid from">
                      <Input type="datetime-local" value={form.valid_from} onChange={(event) => updateForm('valid_from', event.target.value)} />
                    </Field>
                    <Field label="Valid to">
                      <Input type="datetime-local" value={form.valid_to} onChange={(event) => updateForm('valid_to', event.target.value)} />
                    </Field>
                  </div>
                </div>
              )}

              {!loadingSetup && promotionNotificationRequired && step === 5 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">Notification queue</h3>
                    <p className="text-sm text-muted-foreground">
                      Showing notification templates for {promotedAppName || 'the selected app'}.
                    </p>
                  </div>
                  {promotionNotificationRequired && (
                    <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                      Promotions queue one notification for each selected placement app using PROMO_DEFAULT_TITLE and PROMO_DEFAULT_BODY.
                    </div>
                  )}
                  {notificationTemplateError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {notificationTemplateError}
                    </div>
                  )}
                  {filteredNotificationTemplates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-muted-foreground">
                      No notification templates found in fnd_global_notification_template_tab for {selectedPromotedPackage || 'this app'}.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {filteredNotificationTemplates.map((template) => {
                        const active = selectedNotificationTemplateId === String(template.id);
                        const title = getNotificationTemplateText(template, 'title', form.target_lang);
                        const body = getNotificationTemplateText(template, 'body', form.target_lang);
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => selectNotificationTemplate(String(template.id))}
                            className={`min-w-0 rounded-2xl border p-4 text-left transition-colors ${active ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold">{title || template.title || template.key_title}</div>
                                <div className="mt-1 text-xs text-muted-foreground">{template.key_title} / {template.key_body}</div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge variant="outline">{template.notification_type || 'N/A'}</Badge>
                                {active ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{body || template.body || template.key_body}</p>
                            <div className="mt-3 text-xs text-muted-foreground">{selectedLanguageLabel} preview</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!loadingSetup && step === stepLabels.length - 1 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold">Confirm promotion</h3>
                    <p className="text-sm text-muted-foreground">Review the campaign before writing it to MySQL.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <ReviewRow label="Type" value={isUserBased ? 'User based promotion' : 'Global promotion'} />
                      <ReviewRow label="Template" value={selectedTemplate?.template_name || form.template_id} />
                      <ReviewRow label="Promoted app" value={promotedAppName} />
                      <ReviewRow label="Placement apps" value={selectedPlacementNames.join(', ')} />
                      <ReviewRow label="Campaign ID" value={campaignIds.map((item) => item.campaignId).join(', ')} />
                      <ReviewRow label="Audience" value={`${isUserBased ? userPromotionEmail : toAudienceDisplayValue(form.target_email)} / ${isUserBased ? 'All' : toAudienceDisplayValue(form.target_country)} / ${isUserBased ? 'All' : selectedLanguageLabel}`} />
                      <ReviewRow label="User type" value={selectedUserTypeLabel} />
                      <ReviewRow label="Reward" value={form.reward_type === 'IAP_DISCOUNT' ? `${form.reward_type}: ${form.reward_value}` : form.reward_type} />
                      <ReviewRow label="Valid" value={`${form.valid_from} - ${form.valid_to}`} />
                      {promotionNotificationRequired ? (
                        <>
                          <ReviewRow label="Notification template" value={selectedNotificationTemplate ? `${selectedNotificationTemplate.notification_type || 'N/A'}: ${selectedNotificationTemplate.key_title}` : 'Not selected'} />
                          <ReviewRow label="Notification" value={selectedNotificationTemplate ? `${selectedNotificationPreviewTitle} / ${selectedNotificationPreviewBody}` : 'Skipped'} />
                        </>
                      ) : null}
                      <ReviewRow label="Status" value={form.status} />
                      <ReviewRow label="Rows to create" value={promotionNotificationRequired ? `${selectedPlacementPackages.length} campaign/notification combination(s)` : `${selectedPlacementPackages.length} campaign row(s)`} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/10 bg-background/95 px-6 py-4">
              <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => step === 0 ? onOpenChange(false) : setStep((current) => current - 1)}>
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              {step < stepLabels.length - 1 ? (
                <Button disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
                  Next
                </Button>
              ) : (
                <Button disabled={saving} onClick={submit} className="bg-emerald-600 text-white hover:bg-emerald-500">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Confirm & Save
                </Button>
              )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <PromotionWizardHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    <Dialog open={!!previewTemplate} onOpenChange={(nextOpen) => !nextOpen && setPreviewTemplate(null)}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-400" />
                {previewTemplate?.template_name || 'Template Preview'}
              </DialogTitle>
              <DialogDescription>{previewTemplate?.package_name}</DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              disabled={!previewTemplate}
              onClick={() => void copyPromotionPreviewHtml(previewTemplate, toast)}
            >
              <Copy className="h-4 w-4" />
              Copy HTML
            </Button>
          </div>
        </DialogHeader>
        <div className="h-[70vh] bg-white">
          <iframe
            key={previewTemplate ? `wizard-preview-${previewTemplate.id}-${previewTemplate.package_name}` : 'wizard-preview-empty'}
            title={`${previewTemplate?.template_name || 'Template'} preview`}
            sandbox="allow-scripts allow-same-origin allow-popups"
            srcDoc={buildPromotionPreviewHtml(previewTemplate)}
            className="h-full w-full bg-white"
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ChoiceCard({
  title,
  description,
  selected,
  disabled,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{title}</div>
        {selected && <CheckCircle2 className="h-4 w-4 text-emerald-300" />}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

function AppSelectCard({ app, selected, onClick }: { app: App; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${selected ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20'}`}
    >
      <img src={app.icon_url || 'https://placehold.co/48x48.png'} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{app.name}</div>
        <div className="truncate text-xs text-muted-foreground">{app.package_name}</div>
      </div>
      {selected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> : null}
    </button>
  );
}

function UserPromotionAppSection({
  title,
  apps,
  emptyText,
  selectedPackage,
  onSelect,
}: {
  title: string;
  apps: PromotionAppStatus[];
  emptyText: string;
  selectedPackage: string;
  onSelect: (packageName: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h4>
        <Badge variant="outline">{apps.length}</Badge>
      </div>
      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {apps.map((app) => (
            <UserAppSelectCard
              key={app.package_name}
              app={app}
              selected={selectedPackage === app.package_name}
              onClick={() => onSelect(app.package_name)}
              showPremiumBadge={false}
              showLastOnline={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function getUserAppStatusLabel(status: PromotionAppStatus['status']) {
  if (status === 'not_installed') return 'Not installed';
  if (status === 'purchased') return 'Purchased';
  return 'Installed';
}

function getUserAppStatusBadgeClassName(status: PromotionAppStatus['status']) {
  if (status === 'purchased') {
    return 'border-yellow-400/60 bg-yellow-400 text-black hover:bg-yellow-400';
  }
  if (status === 'installed_not_purchased') {
    return 'border-sky-400/35 bg-sky-400/10 text-sky-200 hover:bg-sky-400/15';
  }
  return 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/5';
}

function UserAppSelectCard({
  app,
  selected,
  onClick,
  showPremiumBadge = true,
  showLastOnline = true,
  showPurchasedStatusBadge = true,
}: {
  app: PromotionAppStatus;
  selected: boolean;
  onClick: () => void;
  showPremiumBadge?: boolean;
  showLastOnline?: boolean;
  showPurchasedStatusBadge?: boolean;
}) {
  const showStatusBadge = app.status !== 'purchased' || showPurchasedStatusBadge;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 gap-3 rounded-2xl border p-3 text-left transition-colors ${selected ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 bg-white/[0.035] hover:border-white/20'}`}
    >
      <img src={app.app_icon || 'https://placehold.co/48x48.png'} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="truncate font-semibold">{app.app_name}</div>
          {showPremiumBadge && app.premium && (
            <Badge className={app.force_premium ? 'bg-red-500 text-white hover:bg-red-500' : 'bg-yellow-500 text-black hover:bg-yellow-500'}>
              {app.force_premium ? 'Force Premium' : 'Premium'}
            </Badge>
          )}
        </div>
        <div className="mt-1 truncate text-xs text-muted-foreground">{app.package_name}</div>
        {showLastOnline && (
          <div className="mt-1 text-xs text-muted-foreground">Last online: {formatDate(app.last_online)}</div>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {showStatusBadge ? (
            <Badge variant="outline" className={getUserAppStatusBadgeClassName(app.status)}>
              {getUserAppStatusLabel(app.status)}
            </Badge>
          ) : null}
          {app.language && <Badge variant="outline">{app.language}</Badge>}
        </div>
      </div>
      {selected ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" /> : null}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium">{value}</div>
    </div>
  );
}

function PromotionTemplatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [templates, setTemplates] = React.useState<PromotionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<PromotionTemplate | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    void getAndroidPromotionTemplates().then((result) => {
      if (cancelled) return;
      setTemplates(result.templates);
      setSelectedTemplate(result.templates[0] || null);
      setError(result.error || null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="border-b px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-400" />
                Promotional Templates
              </DialogTitle>
              <DialogDescription>Templates from fnd_global_promotion_template_tab.</DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              disabled={!selectedTemplate}
              onClick={() => void copyPromotionPreviewHtml(selectedTemplate, toast)}
            >
              <Copy className="h-4 w-4" />
              Copy HTML
            </Button>
          </div>
        </DialogHeader>

        <div className="grid min-h-[620px] grid-cols-1 overflow-hidden md:grid-cols-[360px_1fr]">
          <div className="border-r bg-muted/20 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading templates
              </div>
            ) : error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            ) : templates.length === 0 ? (
              <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">No templates found.</div>
            ) : (
              <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {templates.map((template) => {
                  const active = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${active ? 'border-emerald-500/60 bg-emerald-500/10' : 'bg-card hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 font-medium">{template.template_name}</div>
                        <Badge className={template.status.toUpperCase() === 'LIVE' ? 'bg-emerald-500 text-white hover:bg-emerald-500' : ''} variant={template.status.toUpperCase() === 'LIVE' ? 'default' : 'outline'}>
                          {template.status || 'N/A'}
                        </Badge>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{template.package_name}</div>
                      <div className="mt-2 text-xs text-muted-foreground">{formatDate(template.valid_from)} - {formatDate(template.valid_to)}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col">
            {selectedTemplate ? (
              <>
                <div className="border-b px-5 py-4">
                  <div className="font-semibold">{selectedTemplate.template_name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{selectedTemplate.package_name}</div>
                </div>
                <div className="min-h-0 flex-1 bg-white">
                  <iframe
                    key={`template-preview-${selectedTemplate.id}-${selectedTemplate.package_name}`}
                    title={`${selectedTemplate.template_name} preview`}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                    srcDoc={buildPromotionPreviewHtml(selectedTemplate)}
                    className="h-[560px] w-full bg-white"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Select a template to preview.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PromotionProfileDialog({
  user,
  profile,
  loading,
  open,
  onOpenChange,
}: {
  user: PromotionUser | null;
  profile: PromotionUserProfile | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [placementTarget, setPlacementTarget] = React.useState<PromotionAppStatus | null>(null);

  const grouped = React.useMemo(() => {
    const apps = profile?.apps || [];
    return {
      purchased: apps.filter((app) => app.status === 'purchased'),
      installed: apps.filter((app) => app.status === 'installed_not_purchased'),
      notInstalled: apps.filter((app) => app.status === 'not_installed'),
    };
  }, [profile?.apps]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-400" />
            Promotion Target
          </DialogTitle>
          <DialogDescription>{user?.email || 'Loading user profile'}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading app profile
          </div>
        ) : profile ? (
          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryCard label="Purchased" value={profile.summary.purchased} icon={<ShoppingCart className="h-4 w-4" />} />
              <SummaryCard label="Installed not purchased" value={profile.summary.installed_not_purchased} icon={<PackageCheck className="h-4 w-4" />} />
              <SummaryCard label="Not installed" value={profile.summary.not_installed} icon={<PackageMinus className="h-4 w-4" />} />
              <SummaryCard label="Premium tags" value={profile.summary.premium} icon={<Crown className="h-4 w-4" />} />
            </div>

            <Tabs defaultValue="installed">
              <TabsList>
                <TabsTrigger value="installed">Installed Not Purchased</TabsTrigger>
                <TabsTrigger value="notInstalled">Not Installed</TabsTrigger>
                <TabsTrigger value="purchased">Purchased</TabsTrigger>
              </TabsList>
              <TabsContent value="installed">
                <AppStatusList
                  apps={grouped.installed}
                  emptyText="No installed unpaid apps found."
                  actionLabel="Create promotion"
                  onSelectApp={setPlacementTarget}
                />
              </TabsContent>
              <TabsContent value="notInstalled">
                <AppStatusList
                  apps={grouped.notInstalled}
                  emptyText="No missing apps found."
                  actionLabel="Create promotion"
                  onSelectApp={setPlacementTarget}
                />
              </TabsContent>
              <TabsContent value="purchased">
                <AppStatusList apps={grouped.purchased} emptyText="No purchased apps found." />
              </TabsContent>
            </Tabs>

            <PromotionPlacementDialog
              target={placementTarget}
              purchasedApps={grouped.purchased}
              open={!!placementTarget}
              onOpenChange={(nextOpen) => {
                if (!nextOpen) setPlacementTarget(null);
              }}
            />
          </div>
        ) : (
          <div className="py-20 text-center text-sm text-muted-foreground">Unable to load user profile.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function AppStatusList({
  apps,
  emptyText,
  actionLabel,
  onSelectApp,
}: {
  apps: PromotionAppStatus[];
  emptyText: string;
  actionLabel?: string;
  onSelectApp?: (app: PromotionAppStatus) => void;
}) {
  if (apps.length === 0) {
    return <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {apps.map((app) => (
        <button
          key={`${app.db_name}-${app.status}`}
          type="button"
          onClick={() => onSelectApp?.(app)}
          disabled={!onSelectApp}
          className="flex gap-3 rounded-lg border bg-card p-3 text-left transition-colors enabled:hover:border-emerald-500/40 enabled:hover:bg-emerald-500/5 disabled:cursor-default"
        >
          <img src={app.app_icon || 'https://placehold.co/64x64.png'} alt="" className="h-11 w-11 rounded-md object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="truncate font-medium">{app.app_name}</div>
              {app.premium && (
                <Badge className={app.force_premium ? 'bg-red-500 text-white hover:bg-red-500' : 'bg-yellow-500 text-black hover:bg-yellow-500'}>
                  {app.force_premium ? 'Force Premium' : 'Premium'}
                </Badge>
              )}
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{app.package_name}</div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              {app.purchased_date && <span>Purchased: {formatDate(app.purchased_date)}</span>}
              {app.registered_date && <span>Installed: {formatDate(app.registered_date)}</span>}
              {app.last_online && <span>Last online: {formatDate(app.last_online)}</span>}
              {app.device && <span>Device: {app.device}</span>}
            </div>
          </div>
          {actionLabel && <div className="shrink-0 self-start text-xs font-medium text-emerald-400">{actionLabel}</div>}
        </button>
      ))}
    </div>
  );
}

function PromotionPlacementDialog({
  target,
  purchasedApps,
  open,
  onOpenChange,
}: {
  target: PromotionAppStatus | null;
  purchasedApps: PromotionAppStatus[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedPlacements, setSelectedPlacements] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (open) {
      setSelectedPlacements([]);
    }
  }, [open, target?.db_name]);

  const togglePlacement = React.useCallback((dbName: string) => {
    setSelectedPlacements((current) =>
      current.includes(dbName)
        ? current.filter((item) => item !== dbName)
        : [...current, dbName]
    );
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ad Placement Setup</DialogTitle>
          <DialogDescription>Select purchased apps where this promotion ad should be placed.</DialogDescription>
        </DialogHeader>

        {target && (
          <div className="space-y-5">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Promote Ad</div>
              <div className="flex items-center gap-3">
                <img src={target.app_icon || 'https://placehold.co/64x64.png'} alt="" className="h-12 w-12 rounded-md object-cover" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{target.app_name}</div>
                  <div className="truncate text-xs text-muted-foreground">{target.package_name}</div>
                  <Badge variant="outline" className="mt-2">
                    {target.status === 'installed_not_purchased' ? 'Installed not purchased' : 'Not installed'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ad Place To Be</div>
              {purchasedApps.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  This user has no purchased apps available for ad placement.
                </div>
              ) : (
                <div className="grid max-h-[340px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {purchasedApps.map((app) => {
                    const checked = selectedPlacements.includes(app.db_name);
                    return (
                      <label
                        key={app.db_name}
                        className="flex cursor-pointer gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                      >
                        <Checkbox checked={checked} onCheckedChange={() => togglePlacement(app.db_name)} className="mt-1" />
                        <img src={app.app_icon || 'https://placehold.co/64x64.png'} alt="" className="h-10 w-10 rounded-md object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{app.app_name}</span>
                            {app.premium && <Badge className="bg-yellow-500 text-black hover:bg-yellow-500">Premium</Badge>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{app.sku || app.package_name}</div>
                          {app.purchased_date && <div className="mt-1 text-xs text-muted-foreground">Purchased: {formatDate(app.purchased_date)}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
              <div className="text-sm text-muted-foreground">
                {selectedPlacements.length} placement app{selectedPlacements.length === 1 ? '' : 's'} selected
              </div>
              <Button disabled={selectedPlacements.length === 0}>Continue</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
