'use client';

import * as React from 'react';
import { useMemo, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { BellRing, CheckCircle2, CircleHelp, Languages, Mail, Search, Send, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  prepareUserNotificationTranslation,
  searchAndroidPushUsers,
  sendUserNotification,
  type PushTargetUser,
} from '@/app/(dashboard)/push-notifications/actions';

type AndroidPushApp = {
  id: string;
  name: string;
  icon_url: string;
  package_name: string;
  db_name: string;
};

type Props = {
  apps: AndroidPushApp[];
};

type TranslationPreview = {
  sourceTitle: string;
  sourceMessage: string;
  userId: string;
  targetLanguage: string;
  title: string;
  message: string;
};

const titleMax = 65;
const messageMax = 178;

const pushHelpQuickTips = [
  'මේ page එක one Android user කෙනෙකුට notification queue කරන්න හදලා තියෙන්නේ.',
  'Title max 65 characters, message max 178 characters ලෙස limit වෙනවා.',
  'User language English නොවෙයි නම් queue කිරීමට පෙර Translate button එකෙන් preview එක හදන්න ඕන.',
];

const pushHelpSections = [
  {
    title: 'Target Search',
    eyebrow: 'Find Android user',
    icon: Search,
    iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
    description: 'User email එක type කරලා Android app records search කරන area එක. එක email එකට app records කිහිපයක් තිබුණොත් card කිහිපයක් පෙන්වනවා.',
    points: [
      'URL එකෙන් email/app query params ආවොත් page open වුන ගමන් prefill සහ search කරයි.',
      'Search result card එකේ app name, db name, location/language, device, app version, last online පෙන්වනවා.',
      'Card එක click කළාම ඒ app/user record එක notification target ලෙස select වෙනවා.',
    ],
    actions: [
      { label: 'Search', detail: 'Typed email එකට matching Android registered users backend එකෙන් load කරනවා. Invalid email එකක් නම් error alert එක පෙන්වනවා.' },
      { label: 'Select User', detail: 'Notification යවන්න යන exact app record එක තෝරනවා. Select කළාම compose panel එකේ user/email/app details පෙන්වනවා.' },
    ],
  },
  {
    title: 'Compose Message',
    eyebrow: 'Title and body',
    icon: BellRing,
    iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
    description: 'Push notification title සහ message ලියන area එක. Character limits backend validation එකට match වෙන විදියට UI එකෙන්ම enforce කරනවා.',
    points: [
      'Title field එක 65 characters දක්වා සීමා වෙනවා.',
      'Message field එක 178 characters දක්වා සීමා වෙනවා.',
      'Selected user නැත්නම් Queue Notification button එක disabled වෙනවා.',
      'Title/message වෙනස් කළාම පරණ translation preview එක clear වෙනවා.',
    ],
    actions: [
      { label: 'Title', detail: 'Notification එකේ bold/header text එක. Short සහ direct title එකක් තබන්න.' },
      { label: 'Message', detail: 'User device එකට යන notification body text එක. Long text automatic trim නොවී limit එක තුළ තබනවා.' },
    ],
  },
  {
    title: 'Translation Preview',
    eyebrow: 'Non-English users',
    icon: Languages,
    iconClassName: 'border-violet-400/25 bg-violet-500/[0.14] text-violet-100',
    description: 'Selected user language English නොවෙයි නම් translated notification exact preview එක මෙතැන පෙන්වනවා.',
    points: [
      'Target language එක user profile language code එකෙන් ගන්නවා.',
      'Translate button එක title සහ message දෙකම target language එකට translate කරනවා.',
      'Translated title/message limits ඉක්මවුවොත් error එකක් පෙන්වනවා; English source text short කරන්න ඕන.',
      'Fresh translation නැත්නම් Queue Notification disabled වෙනවා.',
    ],
    actions: [
      { label: 'Translate', detail: 'Current title/message target language එකට translate කරලා Queued Title සහ Queued Message preview එක හදනවා.' },
    ],
  },
  {
    title: 'Queue Notification',
    eyebrow: 'Backend send registration',
    icon: Send,
    iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
    description: 'Button එක click කළාම selected appId, email, title, message backend action එකට යවලා notification queue/register කරනවා.',
    points: [
      'English user නම් typed title/message directly queue වෙනවා.',
      'Non-English user නම් translated preview title/message queue වෙනවා.',
      'Success alert එකෙන් queued summary පෙන්වනවා; failed නම් error alert සහ toast පෙන්වනවා.',
      'Queue වුනාට පස්සේ title/message fields clear වෙනවා.',
    ],
    actions: [
      { label: 'Queue Notification', detail: 'Selected Android user record එකට notification queue කරනවා. මේ action එක real backend side-effect එකක් ඇති කරන button එක.' },
    ],
  },
];

function normalizedLanguageCode(language?: string) {
  const value = (language || '').trim().toUpperCase();
  if (!value || value === 'N/A') {
    return 'EN';
  }

  if (value === 'ENGLISH' || value === 'ENG') {
    return 'EN';
  }

  return value;
}

function shouldTranslateForUser(user: PushTargetUser | null) {
  return !!user && normalizedLanguageCode(user.language) !== 'EN';
}

function shortDate(value?: string) {
  if (!value) {
    return 'No recent activity';
  }

  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function UserNotificationConsole({ apps }: Props) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialApp = (searchParams.get('app') || '').toLowerCase();
  const [email, setEmail] = useState('');
  const [users, setUsers] = useState<PushTargetUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PushTargetUser | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [translationPreview, setTranslationPreview] = useState<TranslationPreview | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isSearching, startSearch] = useTransition();
  const [isTranslating, startTranslate] = useTransition();
  const [isSending, startSend] = useTransition();
  const didPrefill = React.useRef(false);

  const selectedApp = useMemo(
    () => apps.find((app) => app.id === selectedUser?.appId),
    [apps, selectedUser?.appId],
  );
  const needsTranslation = shouldTranslateForUser(selectedUser);
  const targetLanguage = normalizedLanguageCode(selectedUser?.language);

  const hasFreshTranslation =
    !!translationPreview &&
    !!selectedUser &&
    translationPreview.userId === selectedUser.id &&
    translationPreview.sourceTitle === title &&
    translationPreview.sourceMessage === message &&
    translationPreview.targetLanguage === targetLanguage;

  const canQueue =
    !!selectedUser &&
    !!title &&
    !!message &&
    !isSending &&
    !isTranslating &&
    (!needsTranslation || hasFreshTranslation);

  function clearTranslation() {
    setTranslationPreview(null);
  }

  function handleSearch(nextEmail = email, nextAppHint = '') {
    setError('');
    setSuccess('');
    setSelectedUser(null);
    clearTranslation();
    startSearch(async () => {
      const result = await searchAndroidPushUsers(nextEmail);
      if (result.error) {
        setUsers([]);
        setError(result.error);
        return;
      }

      setUsers(result.users);
      if (result.users.length === 1 || nextAppHint) {
        const normalizedHint = nextAppHint.toLowerCase();
        const matchedUser = normalizedHint
          ? result.users.find((user) =>
              [
                user.appId,
                user.appName,
                user.dbName,
                user.appIcon,
                apps.find((app) => app.id === user.appId)?.package_name,
                apps.find((app) => app.id === user.appId)?.icon_url,
              ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(normalizedHint) || normalizedHint.includes(String(value).toLowerCase()))
            )
          : null;
        setSelectedUser(matchedUser || result.users[0]);
      }
      if (result.users.length === 0) {
        setError('No Android user record found for this email.');
      }
    });
  }

  React.useEffect(() => {
    if (didPrefill.current || !initialEmail) return;
    didPrefill.current = true;
    setEmail(initialEmail);
    handleSearch(initialEmail, initialApp);
  }, [initialApp, initialEmail]);

  function handleTranslate() {
    if (!selectedUser) {
      setError('Select one Android app record before translating.');
      return;
    }

    if (!title || !message) {
      setError('Enter both title and message before translating.');
      return;
    }

    if (!needsTranslation) {
      setError('This user language is English. Queue the typed title and message directly.');
      return;
    }

    setError('');
    setSuccess('');
    startTranslate(async () => {
      const result = await prepareUserNotificationTranslation({
        title,
        message,
        targetLanguage,
      });

      if (result.error || !result.success) {
        setTranslationPreview(null);
        const errorMessage = result.error || 'Failed to translate notification.';
        setError(errorMessage);
        toast({ title: 'Translation failed', description: errorMessage, variant: 'destructive' });
        return;
      }

      setTranslationPreview({
        sourceTitle: title,
        sourceMessage: message,
        userId: selectedUser.id,
        targetLanguage,
        title: result.title || title,
        message: result.message || message,
      });
    });
  }

  function handleSend() {
    if (!selectedUser) {
      setError('Select one Android app record before sending.');
      return;
    }

    if (needsTranslation && (!hasFreshTranslation || !translationPreview)) {
      setError('Translate the current title and message before queueing.');
      return;
    }

    const queuedTitle = needsTranslation ? translationPreview?.title || title : title;
    const queuedMessage = needsTranslation ? translationPreview?.message || message : message;

    setError('');
    setSuccess('');
    startSend(async () => {
      const result = await sendUserNotification({
        appId: selectedUser.appId,
        email: selectedUser.email,
        title: queuedTitle,
        message: queuedMessage,
      });

      if (result.error) {
        setError(result.error);
        toast({ title: 'Send failed', description: result.error, variant: 'destructive' });
        return;
      }

      const summary = result.summary || `Queued for ${selectedUser.email}.`;
      setSuccess(summary);
      toast({ title: 'Notification queued', description: summary });
      setTitle('');
      setMessage('');
      setTranslationPreview(null);
    });
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[26px] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(47,111,237,0.22),transparent_34%),linear-gradient(135deg,rgba(16,185,129,0.08),rgba(8,10,14,0.94))] shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/15 text-emerald-300">
              <BellRing className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.34em] text-emerald-300">Android Push Center</div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">User notification</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Target one Android user by email and register the notification for the cron sender.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHelpDialogOpen(true)}
              className="h-10 w-10 rounded-xl border-emerald-400/25 bg-emerald-400/10 px-0 text-emerald-200 hover:bg-emerald-400/15 hover:text-white"
              aria-label="Open push notifications help"
              title="Push Notifications Help"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
            <Badge className="border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-emerald-200 hover:bg-emerald-400/10">
              <Smartphone className="mr-1.5 h-3.5 w-3.5" />
              Android only
            </Badge>
            <Badge variant="outline" className="border-white/10 bg-white/5 px-3 py-1 text-muted-foreground">
              {apps.length} active app{apps.length === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(460px,1.08fr)]">
        <section className="rounded-[24px] border border-border/70 bg-card/70 p-5 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-300">Target</div>
              <h2 className="mt-1 text-xl font-semibold">Find Android user</h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
              <UserRound className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="user@email.com"
                className="h-12 rounded-2xl border-white/10 bg-background/70 pl-10"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={isSearching} className="h-12 rounded-2xl px-5">
              <Search className="mr-2 h-4 w-4" />
              {isSearching ? 'Searching' : 'Search'}
            </Button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(user);
                    clearTranslation();
                  }}
                  className={cn(
                    'w-full rounded-2xl border bg-background/45 p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-400/50 hover:bg-blue-500/10',
                    isSelected ? 'border-blue-400/70 bg-blue-500/15 shadow-lg shadow-blue-500/10' : 'border-white/10',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <img src={user.appIcon} alt="" className="h-10 w-10 rounded-xl border border-white/10 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{user.appName}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{user.dbName}</div>
                    </div>
                    {isSelected ? <CheckCircle2 className="h-5 w-5 text-blue-300" /> : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Location</span>
                      <span className="mt-1 block">{user.country || 'N/A'} / {user.language}</span>
                    </span>
                    <span className="truncate rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Device</span>
                      <span className="mt-1 block truncate">{user.device || 'Unknown device'}</span>
                    </span>
                    <span className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">App Version</span>
                      <span className="mt-1 block">v{user.version || 'N/A'}</span>
                    </span>
                    <span className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Last Online</span>
                      <span className="mt-1 block">{shortDate(user.last_online)}</span>
                    </span>
                  </div>
                </button>
              );
            })}

            {!users.length && !isSearching ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-background/30 p-8 text-center text-sm text-muted-foreground">
                Search an Android email to load matching app records.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border border-border/70 bg-card/70 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Compose</div>
              <h2 className="mt-1 text-xl font-semibold">Queue user notification</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/50 px-4 py-3 text-sm">
              {selectedUser ? (
                <div className="flex items-center gap-3">
                  <img src={selectedUser.appIcon} alt="" className="h-9 w-9 rounded-xl object-cover" />
                  <div>
                    <div className="font-medium">{selectedUser.email}</div>
                    <div className="text-xs text-muted-foreground">{selectedApp?.package_name || selectedUser.appName}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Smartphone className="h-4 w-4" />
                  No Android user selected
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-title">Title</Label>
                <span className="text-xs text-muted-foreground">{title.length}/{titleMax}</span>
              </div>
              <Input
                id="push-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value.slice(0, titleMax));
                  clearTranslation();
                }}
                placeholder="Short notification title"
                className="h-12 rounded-2xl border-white/10 bg-background/70"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-message">Message</Label>
                <span className="text-xs text-muted-foreground">{message.length}/{messageMax}</span>
              </div>
              <Textarea
                id="push-message"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value.slice(0, messageMax));
                  clearTranslation();
                }}
                placeholder="Write the message the user should receive"
                className="min-h-[132px] rounded-2xl border-white/10 bg-background/70"
              />
            </div>

            {selectedUser && needsTranslation ? (
              <div className="rounded-2xl border border-white/10 bg-background/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Languages className="h-4 w-4 text-emerald-300" />
                      Translation preview
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Target language: {targetLanguage}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTranslate}
                    disabled={isTranslating || !title || !message}
                    className="h-10 rounded-xl"
                  >
                    <Languages className="mr-2 h-4 w-4" />
                    {isTranslating ? 'Translating' : 'Translate'}
                  </Button>
                </div>

                {translationPreview ? (
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Queued Title</div>
                      <div className="mt-1 whitespace-pre-wrap">{translationPreview.title}</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Queued Message</div>
                      <div className="mt-1 whitespace-pre-wrap">{translationPreview.message}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-sm text-muted-foreground">
                    Translate to preview the exact notification that will be queued.
                  </div>
                )}
              </div>
            ) : null}

            {error ? (
              <Alert variant="destructive" className="rounded-2xl">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {success ? (
              <Alert className="rounded-2xl border-emerald-400/25 bg-emerald-400/10 text-emerald-100">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Queued</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-end">
              <Button
                onClick={handleSend}
                disabled={!canQueue}
                className="h-12 rounded-2xl px-6"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSending ? 'Queueing' : 'Queue Notification'}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden border-emerald-400/20 bg-card p-0 text-foreground shadow-2xl">
          <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_42%),linear-gradient(135deg,rgba(47,111,237,0.10),transparent)] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/15 text-emerald-200">
                <CircleHelp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80">Push Notifications Help</p>
                <DialogTitle className="mt-1 text-lg font-black tracking-tight">Push Notifications page එක භාවිතා කරන ආකාරය</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                  Target search, compose limits, translation preview, queue action Sinhala වලින් පැහැදිලි කර ඇත.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto p-5 md:p-6">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.08] p-4">
              <p className="text-sm font-semibold leading-6 text-foreground/85">
                මේ console එක Android user කෙනෙක් email එකෙන් හොයාගෙන, app record එක තෝරාගෙන, title/message ලියලා notification එක backend sender queue එකට register කරන workflow එක.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {pushHelpQuickTips.map((tip) => (
                  <div key={tip} className="rounded-xl border border-white/10 bg-background/45 px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {pushHelpSections.map((section) => {
                const HelpSectionIcon = section.icon;
                return (
                  <section key={section.title} className="rounded-2xl border border-white/10 bg-background/45 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${section.iconClassName}`}>
                        <HelpSectionIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{section.eyebrow}</p>
                        <h3 className="mt-1 text-sm font-black">{section.title}</h3>
                        <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">{section.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {section.points.map((point) => (
                        <div key={point} className="flex gap-2 text-xs font-semibold leading-5 text-muted-foreground">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/80" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {section.actions.map((action) => (
                        <div key={`${section.title}-${action.label}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200">{action.label}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">{action.detail}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
