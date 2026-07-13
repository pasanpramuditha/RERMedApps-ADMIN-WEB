'use client'

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Apple } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    color: string;
    androidValue?: number;
    iosValue?: number;
    isCurrency?: boolean;
    onClick?: () => void;
    platformIcons: {
        apple: string;
        android: string;
    }
}

const formatValue = (value: number, isCurrency = false) => {
    if (isCurrency) {
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
        return `$${value.toFixed(2)}`;
    }
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toLocaleString();
};

function AnimatedMetric({ value, className }: { value: string; className?: string }) {
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
                changed ? "scale-105 text-emerald-200 drop-shadow-[0_0_14px_rgba(167,243,208,0.75)]" : "",
                className || "",
            ].join(" ")}
        >
            {value}
        </span>
    );
}

function AndroidIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="currentColor"
        >
            <path d="M7.4 8.8h9.2a1.2 1.2 0 0 1 1.2 1.2v6.7a1.2 1.2 0 0 1-1.2 1.2h-.7v2.2a1.1 1.1 0 0 1-2.2 0v-2.2h-3.4v2.2a1.1 1.1 0 0 1-2.2 0v-2.2h-.7a1.2 1.2 0 0 1-1.2-1.2V10a1.2 1.2 0 0 1 1.2-1.2Z" />
            <path d="M4.6 10a1.1 1.1 0 0 1 1.1 1.1v4.7a1.1 1.1 0 0 1-2.2 0v-4.7A1.1 1.1 0 0 1 4.6 10Z" />
            <path d="M19.4 10a1.1 1.1 0 0 1 1.1 1.1v4.7a1.1 1.1 0 0 1-2.2 0v-4.7a1.1 1.1 0 0 1 1.1-1.1Z" />
            <path d="M8.3 4.2a.55.55 0 0 1 .76.17l.85 1.3A5.8 5.8 0 0 1 12 5.3c.74 0 1.45.13 2.1.37l.84-1.3a.55.55 0 1 1 .93.6l-.8 1.24a5.1 5.1 0 0 1 2.3 2.02H6.63a5.1 5.1 0 0 1 2.3-2.02l-.8-1.24a.55.55 0 0 1 .17-.76Z" />
            <circle cx="9.8" cy="7.05" r=".45" fill="rgba(0,0,0,.5)" />
            <circle cx="14.2" cy="7.05" r=".45" fill="rgba(0,0,0,.5)" />
        </svg>
    );
}

export function StatCard({ title, value, icon: Icon, color, androidValue, iosValue, isCurrency=false, onClick, platformIcons }: StatCardProps) {
    const hasBreakdown = androidValue !== undefined && iosValue !== undefined;
    return (
        <Card
            className={`relative overflow-hidden border-0 shadow-lg transition-all hover:scale-[1.02] ${onClick ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background' : ''}`}
            style={{ backgroundColor: `hsl(${color})`, borderRadius: 'var(--radius)' }}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={(event) => {
                if (!onClick) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            }}
        >
            <CardHeader className="p-4 pb-1">
                <div className="p-2 rounded-xl w-fit bg-white/10 ring-1 ring-white/20">
                    <Icon className="w-4 h-4 text-white"/>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{title}</p>
                <p className="text-3xl font-black text-white tracking-tighter mb-3">
                    <AnimatedMetric value={formatValue(value, isCurrency)} />
                </p>
                {hasBreakdown && (
                     <div className="flex items-center justify-between text-xs mt-auto pt-2.5 border-t border-white/15">
                        <div className="flex-1 flex items-center gap-2 text-white">
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-white/15 ring-1 ring-white/20">
                                <Apple className="h-3 w-3" />
                            </span>
                            <AnimatedMetric value={formatValue(iosValue, isCurrency)} className="font-black" />
                        </div>
                        <div className="h-4 w-[1px] bg-white/20 mx-2" />
                        <div className="flex-1 flex items-center gap-2 justify-end text-white">
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-md bg-white/15 ring-1 ring-white/20">
                                <AndroidIcon className="h-3 w-3" />
                            </span>
                            <AnimatedMetric value={formatValue(androidValue, isCurrency)} className="font-black" />
                        </div>
                    </div>
                )}
            </CardContent>
            {/* Glow effect */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 blur-3xl rounded-full" />
        </Card>
    )
}
