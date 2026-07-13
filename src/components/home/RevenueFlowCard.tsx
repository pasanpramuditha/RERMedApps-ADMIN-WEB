'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Repeat2 } from "lucide-react";

interface RevenueFlowCardProps {
    data: {
        appIncome: number;
        admobIncome: number;
        adsExpenses: number;
        net: number;
    };
}

const formatCurrency = (value: number) => {
    const prefix = value < 0 ? '-' : '';
    return `${prefix}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const FlowRow = ({ label, value, negative = false }: { label: string; value: number; negative?: boolean }) => (
    <div className="flex items-center justify-between border-b border-white/15 py-4">
        <span className="text-[10px] font-black uppercase italic tracking-widest text-white/60">{label}</span>
        <span className="text-xl font-black text-white tabular-nums">{negative ? `-${formatCurrency(value)}` : formatCurrency(value)}</span>
    </div>
);

export function RevenueFlowCard({ data }: RevenueFlowCardProps) {
    return (
        <Card className="col-span-1 overflow-hidden border-0 shadow-2xl" style={{ backgroundColor: '#a72ad8', borderRadius: '1.5rem' }}>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-sm font-black uppercase tracking-widest text-white">
                    <div className="rounded-xl bg-white/20 p-2 ring-1 ring-white/20">
                        <Repeat2 className="h-5 w-5 text-white" />
                    </div>
                    Revenue Flow
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 text-white">
                <FlowRow label="App Income" value={data.appIncome} />
                <FlowRow label="AdMob Income" value={data.admobIncome} />
                <FlowRow label="Ads Expenses" value={Math.abs(data.adsExpenses)} negative />
                <div className="flex items-center justify-between pt-5">
                    <span className="text-[10px] font-black uppercase italic tracking-widest text-white/80">Net</span>
                    <span className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.45)] tabular-nums">
                        {formatCurrency(data.net)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
