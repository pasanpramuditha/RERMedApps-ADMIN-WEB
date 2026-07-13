
import { z } from 'zod';

export const androidSubscriptionReportRowSchema = z.object({
  date: z.string().optional(),
  packageName: z.string().optional(),
  productId: z.string().optional(),
  country: z.string().optional(),
  basePlanId: z.string().optional(),
  offerId: z.string().optional(),
  newSubscriptions: z.number().optional(),
  cancelledSubscriptions: z.number().optional(),
  activeSubscriptions: z.number().optional(),
});

export type AndroidSubscriptionReportRow = z.infer<typeof androidSubscriptionReportRowSchema>;

export const summaryRowSchema = z.object({
  packageName: z.string(),
  newSubscriptions: z.number(),
  cancelledSubscriptions: z.number(),
  activeSubscriptions: z.number(),
  monthlyActive: z.number(),
  yearlyActive: z.number(),
});

export type SubscriptionSummary = z.infer<typeof summaryRowSchema>;
