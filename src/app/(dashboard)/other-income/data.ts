
import { z } from 'zod';

export const otherIncomeSchema = z.object({
  id: z.string(),
  category: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: z.enum(['USD', 'LKR']),
  date: z.string(),
  attachmentUrl: z.string().url().optional(),
  convertedAmount: z.number().optional(),
});

export type OtherIncome = z.infer<typeof otherIncomeSchema>;
