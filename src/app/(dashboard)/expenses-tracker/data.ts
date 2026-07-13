import { z } from 'zod';

export const expenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['One-Time', 'Recurring']),
  date: z.string(),
  amount: z.number(),
  currency: z.enum(['USD', 'LKR']),
  attachmentUrl: z.string().url().optional(),
});

export type Expense = z.infer<typeof expenseSchema>;
