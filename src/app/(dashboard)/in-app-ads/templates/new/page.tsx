
'use client';

import * as React from 'react';
import { AdTemplateForm } from '@/components/in-app-ads/ad-template-form';

export default function CreateAdTemplatePage() {
    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-2xl font-bold tracking-tight">Create New Ad Template</h1>
                <p className="text-muted-foreground">
                    Design a reusable template for your in-app promotional ads.
                </p>
            </div>
            <AdTemplateForm />
        </div>
    );
}
