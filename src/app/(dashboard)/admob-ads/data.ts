import { z } from 'zod';

export const platformAdSettingsSchema = z.object({
  nativeInterval: z.number().optional(),
  rewardInterval: z.number().optional(),
  banner: z.boolean().optional(),
  interstitial: z.boolean().optional(),
  nativeAd: z.boolean().optional(),
  appOpen: z.boolean().optional(),
});

export type PlatformAdSettings = z.infer<typeof platformAdSettingsSchema>;

export const adSettingsSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon_url: z.string().url(),
  settings: platformAdSettingsSchema,
  error: z.string().optional(),
  debug: z.unknown().optional(),
});

export type AdSettings = z.infer<typeof adSettingsSchema>;
