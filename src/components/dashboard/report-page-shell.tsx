'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ReportPageShellProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const accentClasses = {
  blue: {
    icon: 'border-blue-400/25 bg-blue-500/[0.15] text-blue-100',
    wash: 'from-blue-500/[0.12]',
  },
  emerald: {
    icon: 'border-emerald-400/25 bg-emerald-500/[0.15] text-emerald-100',
    wash: 'from-emerald-500/[0.12]',
  },
  violet: {
    icon: 'border-violet-400/25 bg-violet-500/[0.15] text-violet-100',
    wash: 'from-violet-500/[0.12]',
  },
  amber: {
    icon: 'border-amber-400/25 bg-amber-500/[0.15] text-amber-100',
    wash: 'from-amber-500/[0.12]',
  },
  rose: {
    icon: 'border-rose-400/25 bg-rose-500/[0.15] text-rose-100',
    wash: 'from-rose-500/[0.12]',
  },
};

export function ReportPageShell({
  title,
  description,
  icon: Icon,
  accent = 'blue',
  actions,
  children,
}: ReportPageShellProps) {
  const color = accentClasses[accent];

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 shadow-sm">
        <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent', color.wash)} />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border', color.icon)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
        </div>
      </div>

      {children}
    </div>
  );
}

export function ReportControls({
  children,
  title = 'Report Controls',
  description = 'Choose the reporting period, fetch data, and save the processed result.',
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <Card className="border-white/10 bg-card/75 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
        {children}
      </CardContent>
    </Card>
  );
}

export function ReportSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-white/10 bg-card/75 shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-white/10 bg-muted/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
}
