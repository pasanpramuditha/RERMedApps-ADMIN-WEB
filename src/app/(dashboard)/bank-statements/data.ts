import { z } from 'zod';

export const bankTransactionSchema = z.object({
  id: z.string(),
  transactionType: z.enum(['DEBIT', 'CREDIT']),
  postedDate: z.string(),
  amount: z.number(),
  fitId: z.string(),
  name: z.string(),
  memo: z.string().optional(),
  currency: z.string(),
  accountId: z.string(),
  tag: z.enum(['Business', 'Personal', 'Unknown']).optional(),
  isDuplicate: z.boolean().optional(),
});

export type BankTransaction = z.infer<typeof bankTransactionSchema>;

export const BankStatementUploadSchema = z.object({
  fileName: z.string(),
  transactions: z.array(bankTransactionSchema),
  account: z.object({
    bankId: z.string(),
    accountId: z.string(),
    accountType: z.string(),
    currency: z.string(),
    ledgerBalance: z.number(),
    balanceDate: z.string(),
  }),
});

export type BankStatementUpload = z.infer<typeof BankStatementUploadSchema>;
