
'use client';

import * as React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormLabel } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ChromePicker, ColorResult } from 'react-color';

interface DashboardCustomizationFormProps {
  form: UseFormReturn<any>; // Loosely typed to avoid conflicts
}

export const defaultDashboardConfig = {
    cardConfig: {
        installs: { icon: "/icons/download.png", color: "#3b82f6" },
        purchases: { icon: "/icons/shopping-cart.png", color: "#f97316" },
        appRevenue: { icon: "/icons/dollar-sign.png", color: "#ef4444" },
        admobImpressions: { icon: "/icons/store.png", color: "#8b5cf6" },
        admobCtr: { icon: "/icons/percent.png", color: "#6366f1" },
        admobRevenue: { icon: "/icons/dollar-sign.png", color: "#ec4899" },
        adsImpressions: { icon: "/icons/store.png", color: "#6b7280" },
        costPerConversion: { icon: "/icons/percent.png", color: "#4b5563" },
        adsExpenses: { icon: "/icons/dollar-sign.png", color: "#475569" },
        otherIncome: { icon: "/icons/store.png", color: "#6b7280" },
        otherExpenses: { icon: "/icons/percent.png", color: "#4b5563" },
        totalAmount: { icon: "/icons/dollar-sign.png", color: "#475569" },
        yearlySubs: { icon: "/icons/user.png", color: "#22c55e" },
        monthlySubs: { icon: "/icons/users.png", color: "#14b8a6" },
        netRevenue: { icon: "/icons/dollar-sign.png", color: "#d946ef" },
    },
    platformIcons: {
        apple: "/icons/apple.png",
        android: "/icons/android.png",
    },
    platformStyles: {
        android: { bgColor: "#A4C639" },
        ios: { bgColor: "#F0F0F0" },
    }
};

const formatCardName = (name: string) => {
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const IconUploader = ({ label, imageUrl, onUpload }: { label: string, imageUrl: string, onUpload: (file: File) => void }) => {
    const { getRootProps, getInputProps } = useDropzone({
        onDrop: acceptedFiles => {
            if (acceptedFiles.length > 0) {
                onUpload(acceptedFiles[0]);
            }
        },
        accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/svg+xml': ['.svg'] },
        maxFiles: 1,
    });

    return (
        <div className="space-y-2">
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-4">
                <Image src={imageUrl} alt={label} width={40} height={40} className="rounded-xl border border-white/10 bg-white/[0.035] p-1" />
                <div {...getRootProps()} className="w-full">
                    <input {...getInputProps()} />
                    <Button type="button" variant="outline" className="w-full rounded-xl border-white/10 bg-background/60">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Icon
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ColorPicker = ({ label, color, onChange }: { label: string, color: string, onChange: (color: ColorResult) => void }) => {
    return (
        <div className="flex items-center justify-between">
            <FormLabel>{label}</FormLabel>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="rounded-xl border-white/10" style={{ backgroundColor: color }} />
                </PopoverTrigger>
                <PopoverContent className="w-auto border-white/10 bg-card p-0">
                    <ChromePicker color={color} onChange={onChange} />
                </PopoverContent>
            </Popover>
        </div>
    );
};

export function DashboardCustomizationForm({ form }: DashboardCustomizationFormProps) {
  const [config, setConfig] = React.useState(() => {
    try {
      const storedConfig = form.getValues('dashboard_cards_json');
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        // Ensure all nested objects exist, merging with defaults if they don't
        return {
            ...defaultDashboardConfig,
            ...parsed,
            cardConfig: { ...defaultDashboardConfig.cardConfig, ...(parsed.cardConfig || {}) },
            platformIcons: { ...defaultDashboardConfig.platformIcons, ...(parsed.platformIcons || {}) },
            platformStyles: {
                ...defaultDashboardConfig.platformStyles,
                ...(parsed.platformStyles || {}),
                android: { ...defaultDashboardConfig.platformStyles.android, ...(parsed.platformStyles?.android || {}) },
                ios: { ...defaultDashboardConfig.platformStyles.ios, ...(parsed.platformStyles?.ios || {}) },
            }
        };
      }
      return defaultDashboardConfig;
    } catch {
      return defaultDashboardConfig;
    }
  });

  React.useEffect(() => {
    form.setValue('dashboard_cards_json', JSON.stringify(config, null, 2), { shouldValidate: true, shouldDirty: true });
  }, [config, form]);

  const handleFileUpload = (key: string, field: 'icon' | 'platform', file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      setConfig((prev: any) => {
        if (field === 'icon') {
            return {
                ...prev,
                cardConfig: {
                    ...prev.cardConfig,
                    [key]: { ...prev.cardConfig[key], icon: dataUrl }
                }
            };
        }
        if (field === 'platform') {
             return {
                ...prev,
                platformIcons: {
                    ...prev.platformIcons,
                    [key]: dataUrl
                }
            };
        }
        return prev;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleColorChange = (key: string, field: 'bgColor', color: ColorResult) => {
    setConfig((prev: any) => ({
      ...prev,
      platformStyles: {
        ...prev.platformStyles,
        [key]: { ...prev.platformStyles[key], [field]: color.hex },
      },
    }));
  };


  return (
    <Card className="overflow-hidden border-white/10 bg-card/75 shadow-sm">
      <CardHeader className="border-b border-white/10 bg-muted/10">
        <CardTitle>Dashboard Customization</CardTitle>
        <CardDescription>
          Manage info-card icons, platform logos, and platform colors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        <div className="space-y-4">
            <h4 className="text-base font-semibold">Card Appearance</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(config.cardConfig).map(([key, value]: [string, any]) => (
                    <div key={key} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <p className="font-semibold">{formatCardName(key)}</p>
                        <IconUploader
                            label="Card Icon"
                            imageUrl={value.icon}
                            onUpload={(file) => handleFileUpload(key, 'icon', file)}
                        />
                    </div>
                ))}
            </div>
         </div>
         <div className="space-y-4">
            <h4 className="text-base font-semibold">Platform Styles</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <IconUploader
                        label="Android Logo"
                        imageUrl={config.platformIcons.android}
                        onUpload={(file) => handleFileUpload('android', 'platform', file)}
                    />
                    <ColorPicker
                        label="Android BG Color"
                        color={config.platformStyles.android.bgColor}
                        onChange={(color) => handleColorChange('android', 'bgColor', color)}
                    />
                 </div>
                 <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <IconUploader
                        label="Apple Logo"
                        imageUrl={config.platformIcons.apple}
                        onUpload={(file) => handleFileUpload('apple', 'platform', file)}
                    />
                     <ColorPicker
                        label="iOS BG Color"
                        color={config.platformStyles.ios.bgColor}
                        onChange={(color) => handleColorChange('ios', 'bgColor', color)}
                    />
                 </div>
            </div>
         </div>
      </CardContent>
    </Card>
  );
}
