'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { AndroidPlatformIcon, ApplePlatformIcon } from "./platform-icons";

interface AdmobStatusCardProps {
  data: {
    revenue: { total: number; android: number; apple: number };
    impressions: { total: number; android: number; apple: number };
    clicks?: { total: number; android: number; apple: number };
    ctr: number;
    ctrByPlatform?: { android: number; apple: number };
  };
}

const formatNumber = (num: number, isDecimal: boolean = true): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(isDecimal ? 1 : 0)}k`;
    return Math.floor(num).toString();
};

const formatCurrency = (num: number): string => `$${num.toFixed(2)}`;

const MetricRow = ({ label, androidValue, iosValue }: { label: string; androidValue: string; iosValue: string }) => (
    <div className="flex justify-between items-center py-2.5 text-sm">
        <span className="text-white/60 font-medium">{label}</span>
        <div className="flex gap-14 text-right pr-2">
            <span className="w-8 flex justify-center font-black">{iosValue}</span>
            <span className="w-8 flex justify-center font-black">{androidValue}</span>
        </div>
    </div>
);

export function AdmobStatusCard({ data, platformIcons }: { data: AdmobStatusCardProps['data'], platformIcons?: any }) {

    const androidClicks = data.clicks?.android || 0;
    const iosClicks = data.clicks?.apple || 0;
    const androidCtr = (data.ctrByPlatform?.android ?? (data.impressions.android > 0 ? ((androidClicks / data.impressions.android) * 100) : 0)).toFixed(2);
    const iosCtr = (data.ctrByPlatform?.apple ?? (data.impressions.apple > 0 ? ((iosClicks / data.impressions.apple) * 100) : 0)).toFixed(2);

    return (
        <Card className="col-span-1 border-0 shadow-xl overflow-hidden relative" style={{ backgroundColor: 'hsl(var(--card-red))', borderRadius: 'var(--radius)' }}>
            <CardHeader className="bg-white/10 pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white">
                    <div className="p-2 rounded-xl bg-white/10 ring-1 ring-white/20">
                        <Flame className="w-5 h-5 transition-transform hover:scale-110" />
                    </div>
                    AdMob Status
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-white">
                 <div className="flex justify-between items-center py-3 text-[10px] font-black uppercase tracking-widest border-b border-white/10">
                    <span>Metric</span>
                     <div className="flex gap-14 text-right pr-2">
                         <span className="w-8 flex justify-center text-white"><ApplePlatformIcon className="h-3.5 w-3.5" /></span>
                        <span className="w-8 flex justify-center text-white"><AndroidPlatformIcon className="h-3.5 w-3.5" /></span>
                    </div>
                </div>
                 <div className="divide-y divide-white/10">
                    <MetricRow label="Impressions" androidValue={formatNumber(data.impressions.android)} iosValue={formatNumber(data.impressions.apple)} />
                    <MetricRow label="Clicks" androidValue={formatNumber(androidClicks, false)} iosValue={formatNumber(iosClicks, false)} />
                    <MetricRow label="CTR" androidValue={`${androidCtr}%`} iosValue={`${iosCtr}%`} />
                    <MetricRow label="Income" androidValue={formatCurrency(data.revenue.android)} iosValue={formatCurrency(data.revenue.apple)} />
                </div>
                 <div className="flex justify-between items-center pt-5 mt-3 border-t border-white/10 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Income Realized (USD)</span>
                    <span className="text-5xl font-black text-white tracking-tighter drop-shadow-sm">{formatCurrency(data.revenue.total)}</span>
                </div>
            </CardContent>
            {/* Glow effect */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 blur-3xl rounded-full" />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        </Card>
    );
}
