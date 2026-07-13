'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { ActiveSubscribers } from "@/app/(dashboard)/dashboard/actions";
import { AndroidPlatformIcon, ApplePlatformIcon } from "./platform-icons";

interface ActiveFunnelCardProps {
    data: ActiveSubscribers;
}

const MetricRow = ({ label, androidValue, iosValue, color }: { label: string; androidValue: string | number; iosValue: string | number; color?: string }) => (
    <div className="flex justify-between items-center py-2.5 text-sm group transition-colors hover:bg-white/[0.02]">
        <span className="text-white/60 font-medium">{label}</span>
        <div className="flex gap-14 text-right pr-2 relative">
            <span className="w-8 flex justify-center font-black text-white">{iosValue}</span>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[1px] bg-white/10" />
            <span className="w-8 flex justify-center font-black" style={{ color: color || 'white' }}>{androidValue}</span>
        </div>
    </div>
);

export function ActiveFunnelCard({ data, platformIcons }: { data: ActiveSubscribers; platformIcons?: any }) {
    const totalSubs = data.yearly.total + data.monthly.total;
    const totalAndroid = data.yearly.android + data.monthly.android;
    const totalIos = data.yearly.apple + data.monthly.apple;

    return (
        <Card className="col-span-1 border border-white/5 shadow-2xl overflow-hidden" style={{ backgroundColor: '#0a0d14', borderRadius: '1.5rem' }}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white">
                    <div className="p-2 rounded-xl bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    Active Funnel
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="flex justify-between items-center py-3 text-[10px] font-black uppercase tracking-widest border-b border-white/10">
                    <span className="text-white/40">Metric</span>
                     <div className="flex gap-14 text-right pr-2">
                        <span className="w-8 flex justify-center text-white/60"><ApplePlatformIcon className="h-3.5 w-3.5" /></span>
                        <span className="w-8 flex justify-center text-white/60"><AndroidPlatformIcon className="h-3.5 w-3.5" /></span>
                    </div>
                </div>
                 <div className="divide-y divide-white/10">
                    <MetricRow label="Yearly Subs" androidValue={data.yearly.android} iosValue={data.yearly.apple} />
                    <MetricRow label="Monthly Subs" androidValue={data.monthly.android} iosValue={data.monthly.apple} />
                    <MetricRow label="Active Trials" androidValue={data.trials.android} iosValue={data.trials.apple} color="var(--card-orange)" />
                    <MetricRow label="Total" androidValue={totalAndroid} iosValue={totalIos} color="#10b981" />
                </div>
                 <div className="flex justify-between items-center pt-5 mt-3 border-t border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">All Subscriptions</span>
                    <span className="text-4xl font-black text-emerald-400">{totalSubs}</span>
                </div>
            </CardContent>
        </Card>
    );
}
