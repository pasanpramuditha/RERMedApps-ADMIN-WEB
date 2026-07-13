'use client';

import * as React from 'react';

interface NetRevenueCardProps {
    netRevenue?: number;
}

const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '$0.00';
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

const formatLKR = (usdValue?: number) => {
    if (usdValue === undefined || usdValue === null) return '0 LKR';
    const rate = 300; // Approximate rate
    return `${(usdValue * rate).toLocaleString('en-US', {maximumFractionDigits: 0})} LKR`;
}

function AnimatedText({ value, className }: { value: string; className?: string }) {
    const [changed, setChanged] = React.useState(false);
    const previousValueRef = React.useRef(value);

    React.useEffect(() => {
        if (previousValueRef.current === value) return;

        previousValueRef.current = value;
        setChanged(true);
        const timeout = window.setTimeout(() => setChanged(false), 700);

        return () => window.clearTimeout(timeout);
    }, [value]);

    return (
        <span
            className={[
                "inline-block tabular-nums transition-all duration-500",
                changed ? "scale-105 text-emerald-100 drop-shadow-[0_0_18px_rgba(167,243,208,0.85)]" : "",
                className || "",
            ].join(" ")}
        >
            {value}
        </span>
    );
}

export function NetRevenueCard({ netRevenue }: NetRevenueCardProps) {
    return (
        <div className="relative group p-6 px-10 bg-white/5 border border-white/10 rounded-2xl text-right overflow-hidden shadow-2xl transition-all hover:bg-white/10">
            <div className="relative z-10">
                <p className="text-[10px] font-black tracking-[0.2em] text-white/50 uppercase">Net Revenue</p>
                <p className="text-5xl font-black text-white tracking-tighter mt-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    <AnimatedText value={formatCurrency(netRevenue)} />
                </p>
                <div className="flex items-center justify-end gap-2 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-bold text-white/40 tracking-wider">
                        APPROXIMATELY <AnimatedText value={formatLKR(netRevenue)} />
                    </p>
                </div>
            </div>
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16 group-hover:bg-primary/30 transition-colors" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 blur-[50px] rounded-full -ml-12 -mb-12" />
        </div>
    );
}
