
import { z } from 'zod';

export type UserType = 'default' | 'brand_new' | 'existing_no_purchase' | 'existing_with_purchase';

export const registeredUserSchema = z.object({
  id: z.string(),
  appId: z.string(),
  appName: z.string(),
  appIcon: z.string().url(),
  os: z.enum(['iOS', 'Android', 'Android & iOS']),
  email: z.string().email(),
  country: z.string().optional(),
  language: z.string(),
  registered_date: z.string(),
  device: z.string(),
  version: z.string(),
  last_online: z.string(),
  dbName: z.string(),
  premium: z.number().or(z.string()),
  purchase_premium: z.boolean().optional(),
  purchase_count: z.number().optional(),
  ads_free: z.number().or(z.string()),
  ss_enabled: z.number().or(z.string()),
  chat_enabled: z.number().or(z.string()),
  userType: z.string().optional(),
});

export type RegisteredUser = z.infer<typeof registeredUserSchema>;
