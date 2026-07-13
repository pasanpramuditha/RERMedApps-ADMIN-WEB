
import { z } from 'zod';

export const PfcTransactionSchema = z.object({
  transactionDate: z.string(),
  description: z.string(),
  currency: z.string(),
  debit: z.number().optional(),
  credit: z.number().optional(),
  runningBalance: z.number(),
  category: z.string().optional(),
  isDuplicate: z.boolean().optional(),
});

export type PfcTransaction = z.infer<typeof PfcTransactionSchema>;
