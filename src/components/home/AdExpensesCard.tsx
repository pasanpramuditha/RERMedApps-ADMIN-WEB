'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { AndroidPlatformIcon, ApplePlatformIcon } from "./platform-icons";

interface AdExpensesCardProps {
    data: {
        expenses: { total: number; android: number; apple: number };
        clicks: { total: number; android: number; apple: number };
    };
    paidRevenue: number;
    platformIcons?: {
        apple: string;
        android: string;
    };
}

const formatCurrency = (value: number) => `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatNumber = (value: number) => value.toLocaleString();

const MetricRow = ({ label, androidValue, iosValue }: { label: string; androidValue: string; iosValue: string }) => (
    <div className="flex items-center justify-between py-2.5 text-sm transition-colors hover:bg-white/[0.02]">
        <span className="font-medium text-white/60">{label}</span>
        <div className="relative flex gap-14 pr-2 text-right">
            <span className="flex w-16 justify-center font-black text-white tabular-nums">{iosValue}</span>
            <div className="absolute bottom-0 left-1/2 top-0 w-[1px] -translate-x-1/2 bg-white/10" />
            <span className="flex w-16 justify-center font-black text-white tabular-nums">{androidValue}</span>
        </div>
    </div>
);

export function AdExpensesCard({ data, paidRevenue }: AdExpensesCardProps) {
    return (
        <Card className="col-span-1 overflow-hidden border border-white/5 shadow-2xl" style={{ backgroundColor: '#0a0d14', borderRadius: '1.5rem' }}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white">
                    <div className="rounded-xl bg-cyan-500 p-2 shadow-[0_0_15px_rgba(6,182,212,0.35)]">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    Ad Expenses
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="flex items-center justify-between border-b border-white/10 py-3 text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/40">Metric</span>
                    <div className="flex gap-14 pr-2 text-right">
                        <span className="flex w-16 justify-center text-sky-100/70"><ApplePlatformIcon className="h-3.5 w-3.5" /></span>
                        <span className="flex w-16 justify-center text-emerald-100/70"><AndroidPlatformIcon className="h-3.5 w-3.5" /></span>
                    </div>
                </div>
                <div className="divide-y divide-white/10">
                    <MetricRow label="Google Ads" androidValue={formatCurrency(data.expenses.android)} iosValue={formatCurrency(data.expenses.apple)} />
                    <MetricRow label="Meta Ads" androidValue={formatCurrency(0)} iosValue={formatCurrency(0)} />
                </div>
                <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Expenses</span>
                    <span className="text-2xl font-black text-cyan-400 tabular-nums">{formatCurrency(data.expenses.total)}</span>
                </div>
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Paid Clicks</span>
                        <span className="text-xs font-black text-cyan-300 tabular-nums">{formatNumber(data.clicks.total)} Total</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Paid Revenue</span>
                        <span className="text-xs font-black text-emerald-300 tabular-nums">{formatCurrency(paidRevenue)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
