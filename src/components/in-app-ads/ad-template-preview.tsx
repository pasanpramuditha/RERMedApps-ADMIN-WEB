

'use client';

import * as React from 'react';
import { Spinner } from '@/components/ui/spinner';
import type { AdTemplate } from '@/app/(dashboard)/in-app-ads/data';

interface AdTemplatePreviewProps {
    isLoading: boolean;
    templateDetails: Pick<AdTemplate, 'platform' | 'android' | 'ios' | 'name'> | null;
    selectedPlatform: 'android' | 'ios' | 'all';
}

export function AdTemplatePreview({ isLoading, templateDetails, selectedPlatform }: AdTemplatePreviewProps) {
    
    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Spinner /></div>;
    }
    if (!templateDetails || selectedPlatform === 'all') {
        return <div className="flex items-center justify-center h-full text-center text-muted-foreground">Select a platform and template to see a preview.</div>;
    }

    const config = selectedPlatform === 'ios' ? templateDetails.ios : templateDetails.android;
    if (!config) {
            return <div className="flex items-center justify-center h-full text-center text-muted-foreground">Template not configured for {selectedPlatform}.</div>;
    }
    
    const htmlContent = config.htmlContent;
    
    return (
        <div className="w-full h-full bg-background rounded-lg border flex flex-col items-center p-2 relative overflow-hidden shadow-inner">
            <iframe
                srcDoc={htmlContent}
                className="w-full h-full bg-white"
                style={{ border: 'none' }}
                sandbox="allow-scripts allow-same-origin"
                title="Live Ad Preview"
            />
        </div>
    )
};
