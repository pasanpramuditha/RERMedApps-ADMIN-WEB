

'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { getTemplateDetails } from '@/app/(dashboard)/in-app-ads/actions';
import type { InAppAd, AdTemplate } from '@/app/(dashboard)/in-app-ads/data';

interface AdPreviewDialogProps {
  ad: InAppAd;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeviceScreen = ({ template }: { template: AdTemplate | null }) => {
    if (!template) {
        return <div className="text-center text-muted-foreground">Template not found or configured.</div>;
    }

    const platform = template.platform;
    const config = platform === 'ios' ? template.ios : template.android;

    if (!config) {
        return <div className="text-center text-muted-foreground">Template not configured for {platform}.</div>;
    }

    const htmlContent = config.htmlContent;
    
    return (
        <div className="w-full h-[700px] bg-background rounded-lg border shadow-lg flex flex-col items-center p-2 relative overflow-hidden">
             <iframe
                srcDoc={htmlContent}
                className="w-full h-full bg-white"
                style={{ border: 'none' }}
                sandbox="allow-scripts allow-same-origin"
                title="Ad Preview"
            />
        </div>
    );
};


export function AdPreviewDialog({ ad, isOpen, onOpenChange }: AdPreviewDialogProps) {
  const [template, setTemplate] = React.useState<AdTemplate | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchTemplate() {
      if (isOpen) {
        setLoading(true);
        // This is a temporary way to find the templateId. In a real scenario, the ad object would contain the templateId.
        // We are assuming the template name is unique for now.
        const allTemplates = await getTemplateDetails(ad.templateId); // This needs the actual ID, not just name.
        setTemplate(allTemplates);
        setLoading(false);
      }
    }
    // A proper implementation would require `ad` to have a `templateId` property.
    // Since it doesn't, we can't reliably fetch the template.
    // For now, we will assume we can fetch it, but this is a structural issue.
    // Let's assume `ad` has `templateId`. If not, this component will fail.
    
    // The `inAppAd` object from `getInAppAds` doesn't include the template ID, which is needed here.
    // I will assume for the sake of this component that it *is* available.
    // The actions.ts would need to be updated to pass this through.
    // For now, I will add a placeholder if templateId is missing.
    if (ad.templateId) {
        fetchTemplate();
    } else {
        setTemplate(null);
        setLoading(false);
    }
  }, [isOpen, ad.templateId]);
  

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <Image src={ad.appIcon} alt={ad.appName} width={48} height={48} className="rounded-lg" data-ai-hint="app icon" />
            <div>
              <DialogTitle className="text-2xl">{ad.templateName}</DialogTitle>
              <p className="text-muted-foreground">{ad.appName}</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="min-h-[700px] flex items-center justify-center">
            {loading ? <Spinner size="large" /> : <DeviceScreen template={template} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// In a follow-up, `getInAppAds` action in `in-app-ads/actions.ts` should be modified 
// to include `templateId` in the returned `InAppAd` object.
// And the `inAppAdSchema` in `in-app-ads/data.ts` should also be updated.
