
import { z } from 'zod';

export const fixedDepositSchema = z.object({
    id: z.string(),
    bankName: z.string(),
    amount: z.number(),
    currency: z.enum(['LKR', 'USD']).default('LKR'),
    startDate: z.string(),
    endDate: z.string(),
    interestRate: z.number(),
});

export type FixedDeposit = z.infer<typeof fixedDepositSchema>;

export const cashAccountSchema = z.object({
    id: z.string(),
    bankName: z.string(),
    balance: z.number(),
});

export type CashAccount = z.infer<typeof cashAccountSchema>;
