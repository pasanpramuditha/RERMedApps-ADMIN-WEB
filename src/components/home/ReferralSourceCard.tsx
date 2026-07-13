'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight, Globe2, Info, ShoppingCart } from "lucide-react";
import { AndroidPlatformIcon, ApplePlatformIcon } from "./platform-icons";

type PlatformCounts = { android: number; apple: number; total: number };
type ReferralPurchaseDetail = {
    appId: string;
    appName: string;
    packageName: string;
    sku: string;
    purchaseUsers: number;
    purchaseEvents: number;
    revenueUsd: number;
    revenueLkr: number;
    iconUrl: string;
};
type ReferralDetail = {
    label: string;
    acquired: PlatformCounts;
    purchaseUsers: number;
    purchaseEvents: number;
    revenueUsd: number;
    revenueLkr: number;
    purchases?: ReferralPurchaseDetail[];
};
type ReferralDetailRow = ReferralDetail & { key: string; purchases: ReferralPurchaseDetail[] };

interface ReferralSourceCardProps {
    data: {
        organic: PlatformCounts;
        inAppAds: PlatformCounts;
        googleAds: PlatformCounts;
        metaAds: PlatformCounts;
        others: PlatformCounts;
        details?: Record<string, ReferralDetail>;
    };
    dateRangeLabel?: string;
    platformIcons?: {
        apple: string;
        android: string;
    };
}

const formatNumber = (value: number) => value.toLocaleString();
const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MetricRow = ({ label, androidValue, iosValue }: { label: string; androidValue: number; iosValue: number }) => (
    <div className="flex items-center justify-between py-2.5 text-sm transition-colors hover:bg-white/[0.02]">
        <span className="font-medium text-white/60">{label}</span>
        <div className="relative flex gap-14 pr-2 text-right">
            <span className="flex w-8 justify-center font-black text-white tabular-nums">{formatNumber(iosValue)}</span>
            <div className="absolute bottom-0 left-1/2 top-0 w-[1px] -translate-x-1/2 bg-white/10" />
            <span className="flex w-8 justify-center font-black text-white tabular-nums">{formatNumber(androidValue)}</span>
        </div>
    </div>
);

export function ReferralSourceCard({ data, dateRangeLabel }: ReferralSourceCardProps) {
    const [open, setOpen] = React.useState(false);
    const [selectedSource, setSelectedSource] = React.useState('googleAds');
    const total = data.organic.total + data.inAppAds.total + data.googleAds.total + data.metaAds.total + data.others.total;
    const makeDetailRow = (key: string, detail: ReferralDetail | undefined, fallback: ReferralDetail): ReferralDetailRow => ({
        key,
        ...(detail || fallback),
        purchases: detail?.purchases || fallback.purchases || [],
    });
    const detailRows: ReferralDetailRow[] = [
        makeDetailRow('organic', data.details?.organic, { label: 'Organic Installs', acquired: data.organic, purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] }),
        makeDetailRow('inAppAds', data.details?.inAppAds, { label: 'In-App Ads', acquired: data.inAppAds, purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] }),
        makeDetailRow('googleAds', data.details?.googleAds, { label: 'Google Ads', acquired: data.googleAds, purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] }),
        makeDetailRow('metaAds', data.details?.metaAds, { label: 'Meta Ads', acquired: data.metaAds, purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] }),
        makeDetailRow('others', data.details?.others, { label: 'Others', acquired: data.others, purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0, revenueLkr: 0, purchases: [] }),
    ];
    const selectedDetail = detailRows.find((row) => row.key === selectedSource) || detailRows[0];
    const totals = detailRows.reduce(
        (sum, row) => ({
            acquired: sum.acquired + row.acquired.total,
            purchaseUsers: sum.purchaseUsers + row.purchaseUsers,
            purchaseEvents: sum.purchaseEvents + row.purchaseEvents,
            revenueUsd: sum.revenueUsd + row.revenueUsd,
        }),
        { acquired: 0, purchaseUsers: 0, purchaseEvents: 0, revenueUsd: 0 }
    );

    return (
        <>
            <Card className="col-span-1 overflow-hidden border border-white/5 shadow-2xl" style={{ backgroundColor: '#0a0d14', borderRadius: '1.5rem' }}>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-3">
                        <CardTitle className="flex items-start gap-3 text-sm font-black uppercase tracking-widest text-white">
                            <div className="rounded-xl bg-blue-600 p-2 shadow-[0_0_15px_rgba(37,99,235,0.35)]">
                                <Globe2 className="h-5 w-5 text-white" />
                            </div>
                            <span className="leading-tight">
                                Installation Referral Source
                                {dateRangeLabel && (
                                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-white/35">
                                        {dateRangeLabel}
                                    </span>
                                )}
                            </span>
                        </CardTitle>
                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-blue-100 transition-colors hover:border-blue-300/40 hover:bg-blue-400/20"
                        >
                            <Info className="h-3 w-3" />
                            More Info
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between border-b border-white/10 py-3 text-[10px] font-black uppercase tracking-widest">
                        <span className="text-white/40">Metric</span>
                        <div className="flex gap-14 pr-2 text-right">
                            <span className="flex w-8 justify-center text-sky-100/70"><ApplePlatformIcon className="h-3.5 w-3.5" /></span>
                            <span className="flex w-8 justify-center text-emerald-100/70"><AndroidPlatformIcon className="h-3.5 w-3.5" /></span>
                        </div>
                    </div>
                    <div className="divide-y divide-white/10">
                        <MetricRow label="Organic Installs" androidValue={data.organic.android} iosValue={data.organic.apple} />
                        <MetricRow label="In-App Ads" androidValue={data.inAppAds.android} iosValue={data.inAppAds.apple} />
                        <MetricRow label="Google Ads" androidValue={data.googleAds.android} iosValue={data.googleAds.apple} />
                        <MetricRow label="Meta Ads" androidValue={data.metaAds.android} iosValue={data.metaAds.apple} />
                        <MetricRow label="Others" androidValue={data.others.android} iosValue={data.others.apple} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Acquisitions</span>
                        <span className="text-4xl font-black text-blue-400 tabular-nums">{formatNumber(total)}</span>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="overflow-hidden border-white/10 bg-[#08090d] p-0 shadow-2xl sm:max-w-4xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:transition-colors [&>button:hover]:bg-white/10">
                    <DialogHeader className="border-b border-white/10 bg-white/[0.025] px-7 py-6">
                        <div className="flex items-start gap-4 pr-10">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/20">
                                <ShoppingCart className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold tracking-tight">Referral Purchase Details</DialogTitle>
                                <DialogDescription className="mt-1">
                                    Purchase behavior from users acquired through each Android referral source. iOS source tracking is currently zero.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 px-7 py-5">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Acquired</p>
                                <p className="mt-2 text-2xl font-black tabular-nums">{formatNumber(totals.acquired)}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/55">Purchase Users</p>
                                <p className="mt-2 text-2xl font-black text-emerald-100 tabular-nums">{formatNumber(totals.purchaseUsers)}</p>
                            </div>
                            <div className="rounded-xl border border-orange-400/15 bg-orange-400/[0.06] p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-100/55">Events</p>
                                <p className="mt-2 text-2xl font-black text-orange-100 tabular-nums">{formatNumber(totals.purchaseEvents)}</p>
                            </div>
                            <div className="rounded-xl border border-blue-400/15 bg-blue-400/[0.06] p-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/55">Revenue</p>
                                <p className="mt-2 text-2xl font-black text-blue-100 tabular-nums">{formatCurrency(totals.revenueUsd)}</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                            <div className="grid grid-cols-[minmax(0,1.2fr)_110px_120px_110px_120px_110px] border-b border-white/10 bg-white/[0.035] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/45">
                                <span>Source</span>
                                <span className="text-right">Acquired</span>
                                <span className="text-right">Buyers</span>
                                <span className="text-right">Events</span>
                                <span className="text-right">Revenue</span>
                                <span className="text-right">Conv.</span>
                            </div>
                            <div className="divide-y divide-white/10">
                                {detailRows.map((row) => {
                                    const conversion = row.acquired.total > 0 ? (row.purchaseUsers / row.acquired.total) * 100 : 0;
                                    const selected = row.key === selectedDetail.key;
                                    return (
                                        <button
                                            key={row.key}
                                            type="button"
                                            onClick={() => setSelectedSource(row.key)}
                                            className={`grid w-full grid-cols-[minmax(0,1.2fr)_110px_120px_110px_120px_110px] items-center px-5 py-3.5 text-left text-sm transition-colors ${selected ? 'bg-blue-400/[0.08] ring-1 ring-inset ring-blue-300/20' : 'hover:bg-white/[0.025]'}`}
                                        >
                                            <span className="flex items-center gap-2 font-semibold text-white/80">
                                                {row.label}
                                                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${selected ? 'translate-x-0.5 text-blue-200' : 'text-white/30'}`} />
                                            </span>
                                            <span className="text-right font-black tabular-nums">{formatNumber(row.acquired.total)}</span>
                                            <span className="text-right font-black text-emerald-100 tabular-nums">{formatNumber(row.purchaseUsers)}</span>
                                            <span className="text-right font-black text-orange-100 tabular-nums">{formatNumber(row.purchaseEvents)}</span>
                                            <span className="text-right font-black text-blue-100 tabular-nums">{formatCurrency(row.revenueUsd)}</span>
                                            <span className="text-right font-black text-white/70 tabular-nums">{conversion.toFixed(1)}%</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.025]">
                            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/55">Selected Source</p>
                                    <h3 className="mt-1 text-base font-bold text-white">{selectedDetail.label} purchase breakdown</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Revenue</p>
                                    <p className="mt-1 text-lg font-black text-blue-100 tabular-nums">{formatCurrency(selectedDetail.revenueUsd)}</p>
                                </div>
                            </div>

                            {selectedDetail.purchases.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(150px,0.9fr)_90px_90px_110px] border-b border-white/10 bg-black/20 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/45">
                                        <span>App</span>
                                        <span>SKU / Subscription</span>
                                        <span className="text-right">Buyers</span>
                                        <span className="text-right">Events</span>
                                        <span className="text-right">Revenue</span>
                                    </div>
                                    <div className="max-h-72 divide-y divide-white/10 overflow-y-auto">
                                        {selectedDetail.purchases.map((purchase, index) => (
                                            <div
                                                key={`${purchase.packageName}-${purchase.sku}-${index}`}
                                                className="grid grid-cols-[minmax(0,1.5fr)_minmax(150px,0.9fr)_90px_90px_110px] items-center gap-3 px-5 py-3.5 text-sm"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                                                        {purchase.iconUrl ? (
                                                            <img src={purchase.iconUrl} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <AndroidPlatformIcon className="h-4 w-4 text-emerald-100/75" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-bold text-white">{purchase.appName}</p>
                                                    </div>
                                                </div>
                                                <span className="truncate rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white/70">
                                                    {purchase.sku || 'unknown'}
                                                </span>
                                                <span className="text-right font-black text-emerald-100 tabular-nums">{formatNumber(purchase.purchaseUsers)}</span>
                                                <span className="text-right font-black text-orange-100 tabular-nums">{formatNumber(purchase.purchaseEvents)}</span>
                                                <span className="text-right font-black text-blue-100 tabular-nums">{formatCurrency(purchase.revenueUsd)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="px-5 py-8 text-center text-sm text-white/45">
                                    No purchases found for {selectedDetail.label.toLowerCase()} in this date range.
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
