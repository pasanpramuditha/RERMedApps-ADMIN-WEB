
'use client';

import { cn } from "@/lib/utils";
import Image from 'next/image';

type InfoCardProps = {
    iconUrl: string;
    title: string;
    value: string;
    androidValue?: string;
    iosValue?: string;
    change?: string;
    iconBgClassName?: string;
    isLive?: boolean;
    platformIcons: {
        apple: string;
        android: string;
    };
    platformStyles: {
        android: { bgColor: string };
        ios: { bgColor: string };
    }
};

export function InfoCard({ iconUrl, title, value, androidValue, iosValue, change, iconBgClassName, isLive = false, platformIcons, platformStyles }: InfoCardProps) {
    const hasPlatformValues = androidValue !== undefined && iosValue !== undefined;

    return (
        <div className={cn("bg-card text-card-foreground rounded-lg p-4 flex flex-row items-center justify-between h-[128px] shadow-sm relative")}>
             {isLive && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 text-xs bg-black/20 text-white px-1.5 py-0.5 rounded-full z-10">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                    Live
                </div>
            )}
            <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 flex items-center justify-center rounded-full text-white", iconBgClassName)}>
                    <Image src={iconUrl} alt={title} width={28} height={28} className="w-7 h-7" data-ai-hint="card icon" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold">{value}</p>
                    {change && !hasPlatformValues && (
                       <p className="text-xs text-muted-foreground mt-1">{change}</p>
                    )}
                </div>
            </div>
            
            {hasPlatformValues && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{ backgroundColor: platformStyles.android.bgColor }}>
                            <Image src={platformIcons.android} alt="Android" width={16} height={16} className="w-4 h-4" data-ai-hint="android logo" />
                        </div>
                        <span className="font-semibold w-12 text-left">{androidValue}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <div className="w-6 h-6 flex items-center justify-center rounded-md" style={{ backgroundColor: platformStyles.ios.bgColor }}>
                            <Image src={platformIcons.apple} alt="Apple" width={16} height={16} className="w-4 h-4" data-ai-hint="apple logo" />
                        </div>
                        <span className="font-semibold w-12 text-left">{iosValue}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
