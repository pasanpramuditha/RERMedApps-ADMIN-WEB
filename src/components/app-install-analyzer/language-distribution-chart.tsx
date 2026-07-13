

'use client';

import * as React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { getLanguageDistribution, type LanguageDistributionData } from '@/app/(dashboard)/app-install-analyzer/actions';
import type { App } from '@/app/(dashboard)/apps/data';
import { MultiSelect } from './multi-select';
import Image from 'next/image';
import { BarChart3, Languages, Radar as RadarIcon, Smartphone } from 'lucide-react';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { TimeHorizonPicker } from '@/components/home/TimeHorizonPicker';
import { AndroidPlatformIcon, ApplePlatformIcon } from '@/components/home/platform-icons';

type Platform = 'Android' | 'iOS' | 'Both';

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

const languageFlags: Record<string, string> = {
    'EN': '🇺🇸', 'ES': '🇪🇸', 'PT': '🇵🇹', 'FR': '🇫🇷', 'RU': '🇷🇺', 'DE': '🇩🇪',
    'ZH': '🇨🇳', 'KO': '🇰🇷', 'JA': '🇯🇵', 'ID': '🇮🇩', 'IT': '🇮🇹', 'TR': '🇹🇷', 'VI': '🇻🇳'
};

const CustomPolarAngleAxisTick = ({ x, y, payload }: any) => {
    const languageCode = payload.value;
    const flag = languageFlags[languageCode] || '';
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={4} textAnchor="middle" fill="rgba(255,255,255,0.72)" fontSize={12}>
                {flag} {languageCode}
            </text>
        </g>
    );
};

interface LanguageDistributionChartProps {
    allApps: App[];
    initialPlatform?: Platform;
}

function isLiveApp(app: App) {
    return Number(app.status ?? 4) === 2;
}

function isPlatformApp(app: App, platform: Platform): boolean {
    if (platform === 'Both') {
        return isPlatformApp(app, 'Android') || isPlatformApp(app, 'iOS');
    }

    return (app.os || '').toLowerCase().includes(platform.toLowerCase());
}

function getAppPlatform(app: App): 'Android' | 'iOS' {
    return isPlatformApp(app, 'iOS') ? 'iOS' : 'Android';
}

export function LanguageDistributionChart({ allApps, initialPlatform = 'Android' }: LanguageDistributionChartProps) {
    const [selectedPlatform, setSelectedPlatform] = React.useState<Platform>(initialPlatform);
    const [selectedAppIds, setSelectedAppIds] = React.useState<string[]>([]);
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: startOfDay(subDays(new Date(), 6)),
        to: endOfDay(new Date()),
    });
    const [chartData, setChartData] = React.useState<LanguageDistributionData[]>([]);
    const [activeApps, setActiveApps] = React.useState<App[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [initialLoad, setInitialLoad] = React.useState(true);

    const handleAnalyze = async () => {
        if (selectedAppIds.length === 0) return;
        setInitialLoad(false);
        setLoading(true);
        const { data, apps } = await getLanguageDistribution(selectedAppIds, dateRange, platformApps);
        setChartData(data);
        setActiveApps(apps);
        setLoading(false);
    }

    React.useEffect(() => {
        setSelectedPlatform(initialPlatform);
    }, [initialPlatform]);

    const platformApps = React.useMemo(() => {
        return allApps.filter((app) => isLiveApp(app) && isPlatformApp(app, selectedPlatform));
    }, [allApps, selectedPlatform]);
    
    const appOptions = React.useMemo(() => {
        return platformApps.map(app => ({
            value: app.id,
            label: app.name,
            iconUrl: app.icon_url,
            platform: selectedPlatform === 'Both' ? getAppPlatform(app) : undefined,
        }));
    }, [platformApps, selectedPlatform]);

    React.useEffect(() => {
        const validIds = new Set(platformApps.map((app) => app.id));
        setSelectedAppIds((current) => current.filter((id) => validIds.has(id)));
        setChartData([]);
        setActiveApps([]);
        setInitialLoad(true);
    }, [platformApps]);

    const appTotals = React.useMemo(() => {
        return activeApps.map(app => {
            const total = chartData.reduce((sum, langData) => {
                const appData = langData[app.name] as { count: number; } | undefined;
                return sum + (appData?.count || 0);
            }, 0);
            return { ...app, totalInstalls: total };
        });
    }, [activeApps, chartData]);

    return (
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c11] shadow-2xl shadow-black/20">
            <div className="relative border-b border-white/10 px-5 py-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_4%_0%,rgba(139,92,246,0.18),transparent_34%),radial-gradient(circle_at_95%_0%,rgba(59,130,246,0.11),transparent_30%)]" />
                <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/15 text-violet-200">
                            <RadarIcon className="h-4 w-4" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Language Distribution</h2>
                    </div>
                    <p className="mt-2 text-sm text-white/45">Compare install share by language across selected live apps.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-100">
                            {selectedPlatform}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/65">
                            {platformApps.length} live app(s)
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 xl:min-w-[760px]">
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
                    <MultiSelect
                        options={appOptions}
                        selected={selectedAppIds}
                        onChange={setSelectedAppIds}
                        className="h-11 rounded-xl border-white/10 bg-black/30 text-white shadow-none hover:bg-white/[0.06] sm:col-span-1"
                        placeholder="Select apps..."
                    />
                    <TimeHorizonPicker
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-full [&_button]:h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:border-white/10 [&_button]:bg-black/30 [&_button]:shadow-none"
                    />
                     <Button onClick={handleAnalyze} disabled={loading || selectedAppIds.length === 0} className="h-11 w-full rounded-xl bg-violet-600 px-6 font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500">
                        Analyze
                    </Button>
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="h-[520px] w-full rounded-3xl border border-white/10 bg-[#101116]/70 p-4 shadow-inner shadow-black/20">
                        {loading ? <Skeleton className="h-full w-full rounded-2xl bg-white/[0.06]" /> : 
                        initialLoad ? <EmptyLanguageState title="Select apps to compare" description="Pick one or more live apps, then run Analyze." /> :
                        chartData.length === 0 ? <EmptyLanguageState title="No distribution data" description="The selected apps and period did not return language rows." /> :
                        (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="78%" data={chartData}>
                                <PolarGrid stroke="rgba(255,255,255,0.10)" />
                                <PolarAngleAxis dataKey="language" tick={<CustomPolarAngleAxisTick />} />
                                <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 5']} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} tickFormatter={(value) => `${Math.round(value as number)}%`} />
                                <Tooltip
                                    formatter={(value, name, props) => {
                                        const appData = props.payload[name] as { percentage: number, count: number} | undefined;
                                        if (!appData) return null;
                                        return [
                                            `${appData.percentage.toFixed(2)}% (${appData.count} users)`,
                                            name
                                        ];
                                    }}
                                    contentStyle={{
                                        background: '#111217',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '14px',
                                        color: '#fff',
                                    }}
                                />
                                <Legend
                                  wrapperStyle={{
                                    fontSize: '12px',
                                  }}
                                  formatter={(value) => <span style={{color: 'rgba(255,255,255,0.78)'}}>{value}</span>}
                                />
                                {activeApps.map(app => (
                                    <Radar 
                                        key={app.id} 
                                        name={app.name} 
                                        dataKey={(item) => (item[app.name] as {percentage: number})?.percentage || 0}
                                        stroke={app.themeColor || '#8884d8'} 
                                        fill={app.themeColor || '#8884d8'} 
                                        fillOpacity={0.6} 
                                    />
                                ))}
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                <Languages className="h-4 w-4 text-violet-300" />
                                Total Installs
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                                        <Smartphone className="h-3.5 w-3.5 text-violet-200/60" />
                                        Apps
                                    </div>
                                    <div className="mt-1 text-xl font-semibold text-white">{activeApps.length}</div>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
                                        <BarChart3 className="h-3.5 w-3.5 text-violet-200/60" />
                                        Installs
                                    </div>
                                    <div className="mt-1 text-xl font-semibold text-white">
                                        {appTotals.reduce((sum, app) => sum + app.totalInstalls, 0).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {loading ? (
                             <div className="space-y-2">
                                <Skeleton className="h-16 w-full rounded-2xl bg-white/[0.06]" />
                                <Skeleton className="h-16 w-full rounded-2xl bg-white/[0.06]" />
                                <Skeleton className="h-16 w-full rounded-2xl bg-white/[0.06]" />
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {appTotals.map(app => (
                                    <li key={app.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Image src={app.icon_url} alt={app.name} width={32} height={32} className="rounded-md" data-ai-hint="app icon" />
                                            <span className="truncate text-sm font-medium text-white">{app.name}</span>
                                        </div>
                                        <span className="shrink-0 text-lg font-semibold text-white">{app.totalInstalls.toLocaleString()}</span>
                                    </li>
                                ))}
                                {appTotals.length === 0 && !initialLoad && (
                                     <p className="rounded-2xl border border-white/10 bg-white/[0.025] py-8 text-center text-sm text-white/45">No installs for selected apps.</p>
                                )}
                            </ul>
                        )}
                    </div>
            </div>
        </section>
    );
}

function EmptyLanguageState({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="max-w-sm text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/50">
                    <Languages className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/45">{description}</p>
            </div>
        </div>
    );
}
