
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApps } from '../apps/actions';
import type { App } from '../apps/data';
import { getInstallAnalysisByDateRange, type InstallData } from './actions';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AreaChart as AreaChartIcon, BarChart3, Download, Filter, Languages, MousePointer2, Smartphone } from 'lucide-react';
import { endOfDay, format, parseISO, startOfDay, subDays } from 'date-fns';
import { LanguageDistributionChart } from '@/components/app-install-analyzer/language-distribution-chart';
import { MultiSelect } from '@/components/app-install-analyzer/multi-select';
import type { DateRange } from 'react-day-picker';
import { TimeHorizonPicker } from '@/components/home/TimeHorizonPicker';
import { AndroidPlatformIcon, ApplePlatformIcon } from '@/components/home/platform-icons';
import { AnalyticsHelpDialog } from '@/components/dashboard/analytics-help-dialog';

type Platform = 'Android' | 'iOS' | 'Both';
type InstallChartData = InstallData & {
    android?: number;
    ios?: number;
};

const languages = [
    { value: 'all', label: 'All Languages' },
    { value: 'en', label: '🇺🇸 English' },
    { value: 'de', label: '🇩🇪 German' },
    { value: 'es', label: '🇪🇸 Spanish' },
    { value: 'fr', label: '🇫🇷 French' },
    { value: 'pt', label: '🇵🇹 Portuguese' },
    { value: 'ru', label: '🇷🇺 Russian' },
    { value: 'zh', label: '🇨🇳 Chinese' },
    { value: 'ja', label: '🇯🇵 Japanese' },
    { value: 'ko', label: '🇰🇷 Korean' },
    { value: 'it', label: '🇮🇹 Italian' },
    { value: 'id', label: '🇮🇩 Indonesian' },
    { value: 'vi', label: '🇻🇳 Vietnamese' },
    { value: 'tr', label: '🇹🇷 Turkish' },
];

const platforms: Array<{ value: Platform; label: string }> = [
    { value: 'Android', label: 'Android' },
    { value: 'iOS', label: 'iOS' },
    { value: 'Both', label: 'Both' },
];

function PlatformSelectLabel({ platform }: { platform: Platform }) {
    if (platform === 'Both') {
        return (
            <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                <span className="flex shrink-0 items-center -space-x-1">
                    <AndroidPlatformIcon className="h-4 w-4 text-emerald-300" />
                    <ApplePlatformIcon className="h-4 w-4 text-sky-300" />
                </span>
                <span className="truncate">Both</span>
            </span>
        );
    }

    return (
        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            {platform === 'Android' ? (
                <AndroidPlatformIcon className="h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
                <ApplePlatformIcon className="h-4 w-4 shrink-0 text-sky-300" />
            )}
            <span className="truncate">{platform}</span>
        </span>
    );
}

function isPlatformApp(app: App, platform: Platform): boolean {
    if (platform === 'Both') {
        return isPlatformApp(app, 'Android') || isPlatformApp(app, 'iOS');
    }

    const os = (app.os || '').toLowerCase();
    return os.includes(platform.toLowerCase());
}

function isLiveApp(app: App) {
    return Number(app.status ?? 4) === 2;
}

function getAppPlatform(app: App): 'Android' | 'iOS' {
    return isPlatformApp(app, 'iOS') ? 'iOS' : 'Android';
}

function getAppIdsForPlatform(apps: App[], platform: Exclude<Platform, 'Both'>) {
    return Array.from(new Set(
        apps
            .filter((app) => isLiveApp(app) && isPlatformApp(app, platform))
            .map((app) => app.id)
            .filter((id): id is string => !!id)
    ));
}

function mergePlatformInstallData(androidData: InstallData[], iosData: InstallData[]): InstallChartData[] {
    const dateMap = new Map<string, InstallChartData>();

    androidData.forEach((row) => {
        const current = dateMap.get(row.date) || { date: row.date, installs: 0, android: 0, ios: 0 };
        current.android = (current.android || 0) + row.installs;
        current.installs = (current.android || 0) + (current.ios || 0);
        dateMap.set(row.date, current);
    });

    iosData.forEach((row) => {
        const current = dateMap.get(row.date) || { date: row.date, installs: 0, android: 0, ios: 0 };
        current.ios = (current.ios || 0) + row.installs;
        current.installs = (current.android || 0) + (current.ios || 0);
        dateMap.set(row.date, current);
    });

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export default function AppInstallAnalyzerPage() {
    const [apps, setApps] = React.useState<App[]>([]);
    const [loadingApps, setLoadingApps] = React.useState(true);
    const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>('Android');
    const [selectedApps, setSelectedApps] = React.useState<string[]>([]);
    const [selectedLanguage, setSelectedLanguage] = React.useState('all');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: startOfDay(subDays(new Date(), 6)),
        to: endOfDay(new Date()),
    });

    const [chartData, setChartData] = React.useState<InstallChartData[]>([]);
    const [loadingChart, setLoadingChart] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [appsError, setAppsError] = React.useState<string | null>(null);
    const [initialLoad, setInitialLoad] = React.useState(true);
    const platformApps = React.useMemo(
        () => apps.filter((app) => isLiveApp(app) && isPlatformApp(app, selectedPlatform)),
        [apps, selectedPlatform]
    );
    const platformAppOptions = React.useMemo(
        () => platformApps
            .filter((app) => !!app.id)
            .map((app) => ({
                value: app.id,
                label: app.name,
                iconUrl: app.icon_url,
                platform: selectedPlatform === 'Both' ? getAppPlatform(app) : undefined,
            })),
        [platformApps, selectedPlatform]
    );
    const selectedAppRows = React.useMemo(
        () => platformApps.filter((app) => app.id && selectedApps.includes(app.id)),
        [platformApps, selectedApps]
    );

    React.useEffect(() => {
        async function fetchApps() {
            setLoadingApps(true);
            setAppsError(null);
            try {
                const appList = await getApps();
                const safeAppList = Array.isArray(appList) ? appList : [];
                setApps(safeAppList);
            } catch (fetchError: any) {
                console.error('Failed to load apps for install analyzer:', fetchError);
                setApps([]);
                setAppsError(fetchError?.message || 'Failed to load app list.');
            } finally {
                setLoadingApps(false);
            }
        }
        fetchApps();
    }, []);

    React.useEffect(() => {
        setSelectedApps([]);
        setChartData([]);
        setInitialLoad(true);
        setError(null);
    }, [selectedPlatform]);

    const handleAnalyze = async () => {
        setInitialLoad(false);
        setLoadingChart(true);
        setError(null);
        setChartData([]);
        const hasSelectedApps = selectedApps.length > 0;

        if (selectedPlatform === 'Both') {
            const androidAppIds = !hasSelectedApps
                ? getAppIdsForPlatform(platformApps, 'Android')
                : selectedAppRows
                    .filter((app) => isPlatformApp(app, 'Android'))
                    .map((app) => app.id)
                    .filter((id): id is string => !!id);
            const iosAppIds = !hasSelectedApps
                ? getAppIdsForPlatform(platformApps, 'iOS')
                : selectedAppRows
                    .filter((app) => isPlatformApp(app, 'iOS'))
                    .map((app) => app.id)
                    .filter((id): id is string => !!id);
            const emptyInstallResult = Promise.resolve<{ data: InstallData[]; error?: string }>({ data: [] });

            const [androidResult, iosResult] = await Promise.all([
                androidAppIds.length > 0 ? getInstallAnalysisByDateRange(androidAppIds, selectedLanguage, dateRange) : emptyInstallResult,
                iosAppIds.length > 0 ? getInstallAnalysisByDateRange(iosAppIds, selectedLanguage, dateRange) : emptyInstallResult,
            ]);

            if (androidResult.error || iosResult.error) {
                setError(androidResult.error || iosResult.error || 'Failed to load install analysis.');
            } else {
                setChartData(mergePlatformInstallData(androidResult.data || [], iosResult.data || []));
            }
        } else {
            const selectedAppIds = !hasSelectedApps
                ? Array.from(new Set(platformApps.map(app => app.id).filter(Boolean)))
                : Array.from(new Set(selectedAppRows.map(app => app.id).filter(Boolean)));

            const result = await getInstallAnalysisByDateRange(selectedAppIds, selectedLanguage, dateRange);
            if (result.error) {
                setError(result.error);
            } else {
                const key = selectedPlatform === 'Android' ? 'android' : 'ios';
                setChartData((result.data || []).map((row) => ({
                    ...row,
                    android: key === 'android' ? row.installs : 0,
                    ios: key === 'ios' ? row.installs : 0,
                })));
            }
        }
        setLoadingChart(false);
    };
    
    const totalInstalls = React.useMemo(() => chartData.reduce((sum, item) => sum + item.installs, 0), [chartData]);
    const averageDailyInstalls = React.useMemo(
        () => (chartData.length > 0 ? Math.round(totalInstalls / chartData.length) : 0),
        [chartData.length, totalInstalls]
    );
    const peakDay = React.useMemo(() => {
        if (chartData.length === 0) return null;
        return chartData.reduce((max, item) => item.installs > max.installs ? item : max, chartData[0]);
    }, [chartData]);
    const selectedLanguageLabel = languages.find((language) => language.value === selectedLanguage)?.label || 'All Languages';
    const selectedAppsSummary = React.useMemo(() => {
        if (selectedApps.length === 0 || selectedApps.length === platformAppOptions.length) {
            return `all live ${selectedPlatform} apps`;
        }
        if (selectedAppRows.length === 1) {
            return selectedAppRows[0].name;
        }
        return `${selectedAppRows.length} selected ${selectedPlatform} apps`;
    }, [platformAppOptions.length, selectedAppRows, selectedApps.length, selectedPlatform]);
    const dateRangeLabel = dateRange?.from
        ? dateRange.to && format(dateRange.from, 'yyyy-MM-dd') !== format(dateRange.to, 'yyyy-MM-dd')
            ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
            : format(dateRange.from, 'MMM dd')
        : 'Select Range';
    const noPlatformAppsMessage = `No live ${selectedPlatform} apps returned from the app registry.`;


    return (
        <div className="min-h-screen space-y-5 bg-black pb-10 text-white">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/30">
                <div className="relative px-5 py-5 lg:px-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(59,130,246,0.24),transparent_34%),radial-gradient(circle_at_92%_5%,rgba(16,185,129,0.14),transparent_34%)]" />
                    <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/15 text-blue-200">
                                <AreaChartIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-blue-200/70">{selectedPlatform} Acquisition</p>
                                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">App Install Analyzer</h1>
                                <p className="mt-1 text-sm leading-5 text-white/50">
                                    Review install trends by platform, app, language, and reporting window.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:min-w-[420px] sm:flex-row sm:items-center xl:justify-end">
                            <AnalyticsHelpDialog page="app-install-analyzer" className="self-start sm:self-auto" />
                            <div className="grid w-full grid-cols-3 gap-2">
                                {[
                                    { label: 'Platform', value: selectedPlatform, icon: Smartphone },
                                    { label: 'Live Apps', value: loadingApps ? '--' : platformApps.length.toLocaleString(), icon: Smartphone },
                                    { label: 'Range', value: dateRangeLabel, icon: Filter },
                                ].map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
                                                <Icon className="h-3.5 w-3.5 text-blue-200/60" />
                                                {item.label}
                                            </div>
                                            <div className="mt-1 truncate text-sm font-semibold text-white">{item.value}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#0b0c11] p-4 shadow-xl shadow-black/20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-2 pr-2 text-sm font-semibold text-white/80">
                        <Filter className="h-4 w-4 text-blue-300" />
                        Filters
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
                    <Select value={selectedPlatform} onValueChange={(value) => setSelectedPlatform(value as Platform)}>
                        <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-black/30 text-white shadow-none [&>span]:flex [&>span]:items-center [&>span]:whitespace-nowrap">
                            <PlatformSelectLabel platform={selectedPlatform} />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#101116] text-white">
                            {platforms.map((platform) => (
                                <SelectItem key={platform.value} value={platform.value}>
                                    <PlatformSelectLabel platform={platform.value} />
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {loadingApps ? <Skeleton className="h-11 w-full rounded-xl bg-white/[0.06]" /> : platformApps.length === 0 ? (
                        <div className="flex h-11 items-center rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 text-sm text-amber-100">
                            {appsError || noPlatformAppsMessage}
                        </div>
                    ) : (
                        <MultiSelect
                            options={platformAppOptions}
                            selected={selectedApps}
                            onChange={setSelectedApps}
                            placeholder="All Apps"
                            className="h-11 w-full rounded-xl border-white/10 bg-black/30 text-white shadow-none hover:bg-black/40"
                        />
                    )}
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger className="h-11 w-full rounded-xl border-white/10 bg-black/30 text-white shadow-none"><SelectValue placeholder="Select Language" /></SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#101116] text-white">{languages.map(lang => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <TimeHorizonPicker date={dateRange} setDate={setDateRange} className="w-full [&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:border-white/10 [&_button]:bg-black/30 [&_button]:shadow-none" />
                    </div>
                    <Button onClick={handleAnalyze} disabled={loadingChart || loadingApps || platformApps.length === 0} className="h-11 w-full rounded-xl bg-blue-600 px-6 font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500 lg:w-auto">
                        Analyze
                    </Button>
                </div>
            </section>

             {error && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-emerald-300" />
                            <h2 className="text-lg font-semibold text-white">
                                Install Trend {selectedLanguage !== 'all' ? `- ${selectedLanguageLabel}` : ''}
                            </h2>
                        </div>
                        <p className="mt-1 text-sm text-white/45">
                            Showing data for {selectedAppsSummary}.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'Total', value: totalInstalls.toLocaleString() },
                            { label: 'Daily Avg', value: averageDailyInstalls.toLocaleString() },
                            { label: 'Peak', value: peakDay ? peakDay.installs.toLocaleString() : '0' },
                        ].map((stat) => (
                            <div key={stat.label} className="min-w-[96px] rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{stat.label}</div>
                                <div className="mt-1 text-lg font-semibold text-white">{stat.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-5">
                    {loadingChart ? <Skeleton className="h-[420px] w-full rounded-2xl bg-white/[0.06]" /> : 
                     initialLoad ? <EmptyState icon={MousePointer2} title="Select filters to start" description="Choose an app, language, and period, then run Analyze." /> :
                     chartData.length === 0 ? <EmptyState icon={Download} title="No install data found" description="The selected filters did not return installation rows." /> :
                     (
                        <>
                            <div className="h-[390px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorInstalls" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorIosInstalls" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.40}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                                        <XAxis 
                                            dataKey="date" 
                                            tickFormatter={(dateStr) => format(parseISO(dateStr), 'MMM d')}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 12 }}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{
                                                background: '#111217',
                                                border: '1px solid rgba(255,255,255,0.12)',
                                                borderRadius: '14px',
                                                color: '#fff',
                                            }}
                                            labelFormatter={(label) => format(parseISO(label), 'PPP')}
                                        />
                                        {selectedPlatform === 'Both' && (
                                            <Legend
                                                verticalAlign="top"
                                                align="right"
                                                wrapperStyle={{ color: 'rgba(255,255,255,0.68)', fontSize: 12 }}
                                            />
                                        )}
                                        {selectedPlatform === 'Both' && (
                                            <Area type="monotone" name="Android" dataKey="android" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInstalls)" />
                                        )}
                                        {selectedPlatform === 'Both' && (
                                            <Area type="monotone" name="iOS" dataKey="ios" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIosInstalls)" />
                                        )}
                                        {selectedPlatform !== 'Both' && (
                                            <Area
                                                type="monotone"
                                                name={selectedPlatform}
                                                dataKey="installs"
                                                stroke={selectedPlatform === 'Android' ? '#10b981' : '#3b82f6'}
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill={selectedPlatform === 'Android' ? 'url(#colorInstalls)' : 'url(#colorIosInstalls)'}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </div>
            </section>

            <LanguageDistributionChart allApps={apps} initialPlatform={selectedPlatform} />

        </div>
    );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
    return (
        <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.025]">
            <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/50">
                    <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/45">{description}</p>
            </div>
        </div>
    );
}
