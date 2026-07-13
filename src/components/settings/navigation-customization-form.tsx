
'use client';

import * as React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormLabel } from '@/components/ui/form';
import { getNavVisibilityKey, navSections } from '@/components/dashboard/nav-sections';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';

interface NavigationCustomizationFormProps {
  form: UseFormReturn<any>;
}

export const dashboardComponents = [
    { key: 'Earning Breakdown', label: 'Earning Breakdown Chart' },
    { key: 'Ad Expenses', label: 'Ad Expenses Chart' },
    { key: 'Best Selling Apps', label: 'Best Selling Apps Chart' },
    { key: 'App Revenue Breakdown', label: 'App Revenue Breakdown Chart' },
]

export function NavigationCustomizationForm({ form }: NavigationCustomizationFormProps) {
  const [visibility, setVisibility] = React.useState<Record<string, boolean>>(() => {
    try {
        const storedConfig = form.getValues('navigation_visibility_json');
        return storedConfig ? JSON.parse(storedConfig) : {};
    } catch {
        return {};
    }
  });

  React.useEffect(() => {
    form.setValue('navigation_visibility_json', JSON.stringify(visibility, null, 2), { shouldValidate: true, shouldDirty: true });
  }, [visibility, form]);

  const handleToggle = (label: string, isVisible: boolean) => {
    setVisibility(prev => ({ ...prev, [label]: isVisible }));
  };

  return (
    <Card className="overflow-hidden border-white/10 bg-card/75 shadow-sm">
      <CardHeader className="border-b border-white/10 bg-muted/10">
        <CardTitle>Dashboard Component Visibility</CardTitle>
        <CardDescription>
          Control which charts, components, and navigation items are visible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {dashboardComponents.map(item => (
                    <div key={item.key} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                        <FormLabel htmlFor={`nav-toggle-${item.label}`}>{item.label}</FormLabel>
                        <Switch
                            id={`nav-toggle-${item.label}`}
                            checked={visibility[item.key] !== false}
                            onCheckedChange={(checked) => handleToggle(item.key, checked)}
                        />
                    </div>
                ))}
            </div>
        </div>
        <Separator />
         <div className="space-y-1">
            <CardTitle>Navigation Menu Visibility</CardTitle>
            <CardDescription>
            Control which items appear in the main sidebar navigation.
            </CardDescription>
        </div>
        {navSections.map((section, index) => (
            <React.Fragment key={section.title}>
                <div className="space-y-4">
                    <h4 className="text-base font-semibold">{section.title}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                        {section.items.map(item => (
                            <div key={getNavVisibilityKey(item)} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                                <FormLabel htmlFor={`nav-toggle-${getNavVisibilityKey(item)}`}>{item.label}</FormLabel>
                                <Switch
                                    id={`nav-toggle-${getNavVisibilityKey(item)}`}
                                    checked={visibility[getNavVisibilityKey(item)] !== false} // Default to visible if not set
                                    onCheckedChange={(checked) => handleToggle(getNavVisibilityKey(item), checked)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
                {index < navSections.length - 1 && <Separator />}
            </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
