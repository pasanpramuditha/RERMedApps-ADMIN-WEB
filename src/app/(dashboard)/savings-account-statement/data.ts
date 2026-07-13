
import { z } from 'zod';

export const SavingsTransactionSchema = z.object({
  transactionDate: z.string(),
  description: z.string(),
  currency: z.string(),
  debit: z.number().optional(),
  credit: z.number().optional(),
  runningBalance: z.number(),
  category: z.string().optional(),
  isDuplicate: z.boolean().optional(),
});

export type SavingsTransaction = z.infer<typeof SavingsTransactionSchema>;
