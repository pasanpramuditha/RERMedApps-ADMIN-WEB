
import { z } from 'zod';

export const purchasedUserSchema = z.object({
  id: z.string(),
  appName: z.string(),
  appIcon: z.string().url(),
  email: z.string().email(),
  sku: z.string(),
  orderId: z.string(),
  appVersion: z.string(),
  purchasedDate: z.string(),
});

export type PurchasedUser = z.infer<typeof purchasedUserSchema>;
