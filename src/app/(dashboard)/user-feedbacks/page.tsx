
'use client';

import * as React from 'react';
import { columns } from './columns';
import { UserFeedbacksDataTable } from '@/components/user-feedbacks/user-feedbacks-data-table';
import { listAllFeedbacks } from './actions';
import type { Feedback } from './data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Archive, AlertCircle, CheckCircle2, CircleHelp, Filter, Inbox, MessageSquareText, MonitorSmartphone, Reply, RotateCw, Search, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type StatusType = 'P' | 'R' | 'A';
type PlatformType = 'All' | 'iOS' | 'Android';

const feedbackHelpQuickTips = [
    'Pending, Resolved, Archived status filter එකෙන් inbox state එක මාරු වෙනවා.',
    'Platform filter එකෙන් Android/iOS feedback වෙනම බලන්න පුළුවන්.',
    'Reply action එකෙන් user reply එක draft/translate/send workflow එක open වෙනවා.',
];

const feedbackHelpSections = [
    {
        title: 'Status & Platform Filters',
        eyebrow: 'Inbox filtering',
        icon: Filter,
        iconClassName: 'border-blue-400/25 bg-blue-500/[0.14] text-blue-100',
        description: 'Feedback list එක ලොකු නම් status සහ platform filters භාවිතා කරලා අවශ්‍ය rows ටික ඉක්මනින් isolate කරනවා.',
        points: [
            'Pending කියන්නේ තව reply/handling අවශ්‍ය feedback.',
            'Resolved කියන්නේ reply යවා හෝ backend එකේ resolved ලෙස mark වූ feedback.',
            'Archived කියන්නේ handled කරලා archive කරපු feedback.',
            'All Platforms, iOS, Android filter එකෙන් platform අනුව list එක narrow වෙනවා.',
        ],
        actions: [
            { label: 'Status Select', detail: 'Pending / Resolved / Archived backend list එක load කරනවා. Email filter එකක් URL එකෙන් ආවොත් all statuses load කරලා ඒ email එකට filter වෙනවා.' },
            { label: 'Platform Select', detail: 'Loaded feedback rows අතරින් Android හෝ iOS rows පමණක් table එකේ පෙන්වනවා.' },
        ],
    },
    {
        title: 'Search & Feedback Table',
        eyebrow: 'Find exact feedback',
        icon: Search,
        iconClassName: 'border-cyan-400/25 bg-cyan-500/[0.14] text-cyan-100',
        description: 'Table area එකෙන් email, app name, feedback text වගේ values search කරලා relevant customer message එක හොයාගන්න පුළුවන්.',
        points: [
            'App column එකේ app icon, app name, version පෙන්වනවා.',
            'Date & Time column header එක click කළාම sorting වෙනවා.',
            'Language badge එක user feedback language code එක පෙන්වනවා.',
            'Status badge එක current handling state එක පෙන්වනවා.',
        ],
        actions: [
            { label: 'Search Input', detail: 'Email, app, feedback text වගේ values වලින් current table rows filter කරනවා.' },
            { label: 'Pagination', detail: 'Rows වැඩි නම් bottom pagination controls වලින් next/previous pages බලන්න පුළුවන්.' },
        ],
    },
    {
        title: 'Feedback Actions',
        eyebrow: 'Reply, archive, delete',
        icon: Reply,
        iconClassName: 'border-emerald-400/25 bg-emerald-500/[0.14] text-emerald-100',
        description: 'Row එකේ 3-dot menu එකෙන් feedback එකට කරන්න පුළුවන් main actions තියෙනවා.',
        points: [
            'Reply dialog එක original feedback එක, translated feedback, reply editor එක සහ send button එක පෙන්වනවා.',
            'Non-English feedback එකක් නම් feedback English වෙත translate වෙනවා; reply එක user language එකට translate කරලා send කරන්න පුළුවන්.',
            'Draft Reply button එක app reply knowledge සහ AI draft flow භාවිතා කරලා reply draft එකක් හදනවා.',
        ],
        actions: [
            { label: 'Reply', detail: 'Reply dialog open වෙලා response එක send කළාම feedback resolved ලෙස update වෙනවා. Backend response එක අනුව feedback notification queue වෙන්නත් පුළුවන්.' },
            { label: 'Archive', detail: 'Feedback status archived ලෙස update කරනවා. List refresh වුනාම current status filter අනුව row එක move/hidden වෙන්න පුළුවන්.' },
            { label: 'Delete', detail: 'Confirmation dialog එකෙන් confirm කළාම feedback backend එකෙන් permanently delete වෙනවා. මේ action එක undo කරන්න බැහැ.' },
        ],
    },
    {
        title: 'Refresh & Counts',
        eyebrow: 'Live list state',
        icon: RotateCw,
        iconClassName: 'border-amber-400/25 bg-amber-500/[0.14] text-amber-100',
        description: 'Header badges සහ Refresh button එක current list state එක understand කරන්න උදව් කරනවා.',
        points: [
            'Visible feedback count එක active filters පසු table එකේ පෙන්වන rows count එක.',
            'Android/iOS counts loaded feedback set එකේ platform breakdown එක.',
            'API Error alert එක backend/API failure එකක් ආවොත් පෙන්වනවා.',
        ],
        actions: [
            { label: 'Refresh', detail: 'Current status/email filter අනුව feedback data නැවත backend එකෙන් fetch කරනවා.' },
        ],
    },
];

export default function UserFeedbacksPage() {
    const [emailFilter, setEmailFilter] = React.useState('');
    const [feedbacks, setFeedbacks] = React.useState<Feedback[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedStatus, setSelectedStatus] = React.useState<StatusType>('P');
    const [selectedPlatform, setSelectedPlatform] = React.useState<PlatformType>('All');
    const [apiError, setApiError] = React.useState<string | null>(null);
    const [isHelpDialogOpen, setIsHelpDialogOpen] = React.useState(false);
    
    const fetchFeedbacks = React.useCallback(async () => {
        setLoading(true);
        setApiError(null);
        if (emailFilter) {
            const results = await Promise.all([
                listAllFeedbacks('P'),
                listAllFeedbacks('R'),
                listAllFeedbacks('A'),
            ]);
            setFeedbacks(results.flatMap((result) => result.feedbacks));
            const firstError = results.find((result) => result.error)?.error;
            if (firstError) {
                setApiError(firstError);
            }
        } else {
            const result = await listAllFeedbacks(selectedStatus);
            setFeedbacks(result.feedbacks);
            if (result.error) {
                setApiError(result.error);
            }
        }
        setLoading(false);
    }, [emailFilter, selectedStatus]);
    
    // Initial data fetch and when status filter changes
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setEmailFilter(params.get('email')?.trim() || '');
    }, []);

    React.useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    React.useEffect(() => {
        window.addEventListener('user-feedbacks:refresh', fetchFeedbacks);
        return () => window.removeEventListener('user-feedbacks:refresh', fetchFeedbacks);
    }, [fetchFeedbacks]);

    const filteredFeedbacks = React.useMemo(() => {
        if (selectedPlatform === 'All') {
            return feedbacks;
        }
        return feedbacks.filter((feedback) => feedback.platform === selectedPlatform);
    }, [feedbacks, selectedPlatform]);

    const androidCount = feedbacks.filter((feedback) => feedback.platform === 'Android').length;
    const iosCount = feedbacks.filter((feedback) => feedback.platform === 'iOS').length;
    const selectedStatusLabel = selectedStatus === 'P' ? 'Pending' : selectedStatus === 'R' ? 'Resolved' : 'Archived';

    return (
        <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/[0.12] to-transparent" />
                <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-400/25 bg-sky-500/[0.15] text-sky-100">
                            <MessageSquareText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Support Inbox
                            </div>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">User Feedbacks</h1>
                            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                                Review customer messages, draft replies, archive handled items, and keep app feedback organized.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                                    <Inbox className="h-3.5 w-3.5" />
                                    {filteredFeedbacks.length} visible feedback(s)
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/[0.10] px-2.5 py-1 text-emerald-100">
                                    <MonitorSmartphone className="h-3.5 w-3.5" />
                                    Android {androidCount}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-500/[0.10] px-2.5 py-1 text-sky-100">
                                    <Smartphone className="h-3.5 w-3.5" />
                                    iOS {iosCount}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/[0.10] px-2.5 py-1 text-amber-100">
                                    {selectedStatus === 'A' ? <Archive className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                    {emailFilter ? 'All statuses' : selectedStatusLabel}
                                </span>
                                {emailFilter && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-500/[0.10] px-2.5 py-1 text-blue-100">
                                        Filtered by {emailFilter}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:self-start">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsHelpDialogOpen(true)}
                            className="h-10 w-10 rounded-xl border-sky-400/25 bg-sky-500/[0.12] px-0 text-sky-100 hover:bg-sky-500/[0.18] hover:text-white"
                            aria-label="Open user feedbacks help"
                            title="User Feedbacks Help"
                        >
                            <CircleHelp className="h-4 w-4" />
                        </Button>
                        <Button onClick={fetchFeedbacks} disabled={loading} className="h-10 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-500">
                            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {apiError && (
                 <Alert variant="destructive" className="rounded-2xl border-destructive/40 bg-destructive/10">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error</AlertTitle>
                    <AlertDescription>{apiError}</AlertDescription>
                </Alert>
            )}

            <div className="rounded-2xl border border-white/10 bg-card/75 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select value={selectedStatus} onValueChange={(value: StatusType) => setSelectedStatus(value)}>
                        <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-background/60 sm:w-52">
                            <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="P">Pending</SelectItem>
                            <SelectItem value="R">Resolved</SelectItem>
                            <SelectItem value="A">Archived</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedPlatform} onValueChange={(value: PlatformType) => setSelectedPlatform(value)}>
                        <SelectTrigger className="h-10 w-full rounded-xl border-white/10 bg-background/60 sm:w-52">
                            <SelectValue placeholder="Select Platform" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Platforms</SelectItem>
                            <SelectItem value="iOS">iOS</SelectItem>
                            <SelectItem value="Android">Android</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <UserFeedbacksDataTable
                columns={columns}
                data={filteredFeedbacks}
                isLoading={loading}
                initialGlobalFilter={emailFilter}
            />

            <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
                <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden border-sky-400/20 bg-card p-0 text-foreground shadow-2xl">
                    <DialogHeader className="border-b border-white/10 bg-gradient-to-br from-sky-500/[0.16] to-transparent px-6 py-5">
                        <div className="flex items-start gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-sky-400/25 bg-sky-500/[0.15] text-sky-100">
                                <CircleHelp className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200/80">User Feedbacks Help</p>
                                <DialogTitle className="mt-1 text-lg font-black tracking-tight">User Feedbacks page එක භාවිතා කරන ආකාරය</DialogTitle>
                                <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                                    Filters, table columns, reply workflow, archive/delete actions Sinhala වලින් පැහැදිලි කර ඇත.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto p-5 md:p-6">
                        <div className="rounded-2xl border border-sky-400/15 bg-sky-500/[0.08] p-4">
                            <p className="text-sm font-semibold leading-6 text-foreground/85">
                                මේ page එක customer feedback inbox එකක්. App users ලා එවපු messages බලලා reply කරන්න, handled items archive කරන්න, අවශ්‍ය නැති feedback delete කරන්න මෙතැනින් පුළුවන්.
                            </p>
                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                                {feedbackHelpQuickTips.map((tip) => (
                                    <div key={tip} className="rounded-xl border border-white/10 bg-background/45 px-3 py-2 text-xs font-bold leading-5 text-muted-foreground">
                                        {tip}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            {feedbackHelpSections.map((section) => {
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
                                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300/80" />
                                                    <span>{point}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                                            {section.actions.map((action) => (
                                                <div key={`${section.title}-${action.label}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-200">{action.label}</p>
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
