
'use client';

import * as React from 'react';
import type { AdTemplate } from '@/app/(dashboard)/in-app-ads/data';
import { TemplateCard } from './template-card';

interface TemplateCardViewProps {
  templates: AdTemplate[];
  onAction: () => void;
}

export function TemplateCardView({ templates, onAction }: TemplateCardViewProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
        <h3 className="text-xl font-bold tracking-tight">No templates found</h3>
        <p className="text-sm text-muted-foreground">
          Create a template to get started.
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map(template => (
        <TemplateCard key={template.id} template={template} onAction={onAction} />
      ))}
    </div>
  );
}
