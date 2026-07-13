

import { z } from 'zod';

const emptyableUrl = (message: string) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return value.trim();
      return value;
    },
    z.string().url({ message }).or(z.literal(''))
  );

export const inAppAdSchema = z.object({
  id: z.string(),
  appId: z.string(),
  appName: z.string(),
  appIcon: z.string().url(),
  appDbName: z.string(),
  appPackageName: z.string(),
  templateId: z.string(),
  templateName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  oneTime: z.boolean(),
  targetGroup: z.string(),
  language: z.string(),
  platform: z.enum(['Android', 'iOS', 'Android & iOS']),
  status: z.enum(['Pending', 'Active', 'Paused', 'Archived', 'Expired', 'Internal Testing']),
  android: z.any().optional(),
  ios: z.any().optional(),
});

export type InAppAd = z.infer<typeof inAppAdSchema>;

const androidSchema = z.object({
    htmlContent: z.string().min(1, 'HTML content is required'),
    buttonType: z.string().min(1, 'Button type is required'),
    navigationUrl: emptyableUrl('Please enter a valid URL').optional(),
    imageUrl: emptyableUrl('Please enter a valid image URL').optional(),
});

const iosSchema = z.object({
    htmlContent: z.string().min(1, 'HTML content is required'),
    buttonText: z.record(z.string()).optional(),
    closeButtonEnabled: z.boolean().default(true),
    closeButtonTopPosition: z.boolean().optional(),
    buttonColor: z.string().optional(),
    navigationUrl: emptyableUrl('Please enter a valid URL').optional(),
    imageUrl: emptyableUrl('Please enter a valid image URL').optional(),
});


export const adTemplateSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Template name is required'),
    platform: z.enum(['android', 'ios']),
    android: androidSchema.nullish(),
    ios: iosSchema.nullish(),
    createdBy: z.string().optional(),
    lastUpdatedAt: z.string().optional(),
    lastUpdatedBy: z.string().optional(),
}).refine(data => {
    if (data.platform === 'android') return !!data.android;
    if (data.platform === 'ios') return !!data.ios;
    return false;
}, {
    message: "The selected platform must be configured.",
    path: ["platform"],
});


export type AdTemplate = z.infer<typeof adTemplateSchema>;

export const inAppAdFormSchema = z.object({
  targetApps: z.array(z.string()).min(1, "Please select at least one app"),
  templateId: z.string().min(1, "Please select a template"),
  templateName: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  oneTime: z.boolean().default(false),
  targetGroup: z.enum(['ALL', 'PREMIUM', 'PREMIUM_ACTIVE', 'NONPREMIUM', 'NONPREMIUM_ACTIVE']),
  language: z.enum(['all', 'de', 'en', 'es', 'fr', 'pt', 'ru', 'zh', 'ja', 'ko', 'it', 'id', 'vi', 'tr', 'th']),
  android: androidSchema.nullish(),
  ios: iosSchema.nullish(),
});

export type InAppAdForm = z.infer<typeof inAppAdFormSchema>;
