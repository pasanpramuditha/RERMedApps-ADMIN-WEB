
'use client';

import * as React from 'react';
import Image from 'next/image';
import { App } from '@/app/(dashboard)/apps/data';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface AppTargetSelectorProps {
    apps: App[];
    value: string[];
    onChange: (selectedAppIds: string[]) => void;
}


const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M12 2a3 3 0 0 0-3 3c0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.66-1.34-3-3-3Z"/></svg>
);

const AndroidIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><line x1="12" x2="12" y1="18" y2="18"/></svg>
);


export function AppTargetSelector({ apps, value: selectedAppIds, onChange }: AppTargetSelectorProps) {
    const handleSelect = (appId: string) => {
        const newSelection = selectedAppIds.includes(appId)
            ? selectedAppIds.filter(id => id !== appId)
            : [...selectedAppIds, appId];
        onChange(newSelection);
    }

    if (apps.length === 0) {
        return <p className="text-sm text-muted-foreground">No apps found. Please add an app first.</p>
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {apps.map(app => {
                const isSelected = selectedAppIds.includes(app.id);
                return (
                    <Card 
                        key={app.id} 
                        onClick={() => handleSelect(app.id)}
                        className={cn(
                            "p-4 flex items-center gap-4 cursor-pointer transition-all relative",
                            isSelected ? "ring-2 ring-primary" : "hover:bg-muted/50"
                        )}
                    >
                         {isSelected && (
                            <div className="absolute top-2 right-2 text-primary">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                         )}
                        <Image src={app.icon_url} alt={app.name} width={40} height={40} className="rounded-lg" data-ai-hint="app icon" />
                        <div className="flex-1">
                            <p className="font-semibold">{app.name}</p>
                            <div className="text-muted-foreground">
                                {app.os === 'iOS' ? <AppleIcon className="w-4 h-4" /> : <AndroidIcon className="w-4 h-4" />}
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
