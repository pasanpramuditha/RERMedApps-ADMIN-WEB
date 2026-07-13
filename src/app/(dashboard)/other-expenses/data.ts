
import { z } from 'zod';

export const otherExpenseSchema = z.object({
  id: z.string(),
  category: z.string(),
  subCategory: z.string().optional(),
  description: z.string(),
  amount: z.number(),
  currency: z.enum(['USD', 'LKR']),
  date: z.string(),
  recurrence: z.enum(['One-Time', 'Monthly', 'Annually']),
  attachmentUrl: z.string().url().optional(),
  isGenerated: z.boolean().optional(),
  parentId: z.string().optional(),
  convertedAmount: z.number().optional(),
});

export type OtherExpense = z.infer<typeof otherExpenseSchema>;
