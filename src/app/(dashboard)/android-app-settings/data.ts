import { z } from 'zod';

export const androidAppSettingSchema = z.object({
  category: z.string().nullable(),
  name: z.string(),
  int_value: z.number().nullable(),
  string_value: z.string().nullable(),
  description: z.string().nullable(),
});

export type AndroidAppSetting = z.infer<typeof androidAppSettingSchema>;

export const androidAppSettingUpdateSchema = z.object({
  appId: z.string(),
  settings: z.array(androidAppSettingSchema),
});

export type AndroidAppSettingUpdate = z.infer<typeof androidAppSettingUpdateSchema>;
