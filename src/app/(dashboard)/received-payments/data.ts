
import { z } from 'zod';

export const receivedPaymentSchema = z.object({
  id: z.string(),
  source: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: z.enum(['USD', 'LKR']),
  date: z.string(),
  attachmentUrl: z.string().url().optional(),
});

export type ReceivedPayment = z.infer<typeof receivedPaymentSchema>;
