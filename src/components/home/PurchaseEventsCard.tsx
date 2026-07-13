'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import type { PurchaseStats } from '@/app/(dashboard)/dashboard/actions';
import { AndroidPlatformIcon, ApplePlatformIcon } from "./platform-icons";

const MetricRow = ({ label, androidValue, iosValue }: { label: string; androidValue: string | number; iosValue: string | number }) => (
    <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center border-b border-white/10 py-2.5 text-sm last:border-b-0">
        <span className="truncate font-medium text-white/62">{label}</span>
        <span className="border-r border-white/10 pr-8 text-right font-black text-white">{iosValue}</span>
        <span className="text-right font-black text-white">{androidValue}</span>
    </div>
);

export function PurchaseEventsCard({ data }: { data: PurchaseStats }) {
    const totalPurchases = data?.totalPurchases?.total || 0;
    const revenueLkr = Math.round(data?.appRevenueLkr?.total || 0);
    const revenueLabel = revenueLkr > 0 ? `APPROXIMATELY ${revenueLkr.toLocaleString()} LKR` : 'APPROXIMATELY 0 LKR';

    return (
        <Card className="col-span-1 overflow-hidden border border-white/10 bg-[#080b12] shadow-2xl" style={{ borderRadius: '1.5rem' }}>
            <CardHeader className="px-6 pb-5 pt-6">
                <CardTitle className="flex items-center gap-3 text-[13px] font-black uppercase tracking-[0.18em] text-white">
                    <div className="rounded-xl bg-orange-500 p-2 shadow-[0_0_22px_rgba(249,115,22,0.38)]">
                        <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    Purchase Events
                </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-7 pt-2">
                <div className="grid grid-cols-[minmax(0,1fr)_64px_64px] items-center border-b border-white/15 pb-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    <span>Metric</span>
                    <span className="flex justify-end border-r border-transparent pr-8">
                        <ApplePlatformIcon className="h-3.5 w-3.5 text-white/65" />
                    </span>
                    <span className="flex justify-end">
                        <AndroidPlatformIcon className="h-3.5 w-3.5 text-white/65" />
                    </span>
                </div>
                 <div>
                    <MetricRow label="Free Trials" androidValue={data.freeTrials?.android || 0} iosValue={data.freeTrials?.apple || 0} />
                    <MetricRow label="Monthly" androidValue={data.monthlySubscribers.android} iosValue={data.monthlySubscribers.apple} />
                    <MetricRow label="Yearly" androidValue={data.yearlySubscribers.android} iosValue={data.yearlySubscribers.apple} />
                    <MetricRow label="Lifetime" androidValue={data.lifetimePurchases?.android || 0} iosValue={data.lifetimePurchases?.apple || 0} />
                    <MetricRow label="Offer Deals" androidValue={data.offerPurchases?.android || 0} iosValue={data.offerPurchases?.apple || 0} />
                </div>
                 <div className="mt-8 flex items-end justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">{revenueLabel}</span>
                    <span className="text-4xl font-black leading-none text-orange-400">{totalPurchases}</span>
                </div>
            </CardContent>
        </Card>
    );
}
