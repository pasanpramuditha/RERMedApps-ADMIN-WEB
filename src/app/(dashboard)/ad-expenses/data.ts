import { z } from 'zod';

export const adExpenseSchema = z.object({
    id: z.string(),
    year: z.number(),
    month: z.number(),
    amount: z.number(),
    currency: z.enum(['USD', 'LKR']),
});

export type AdExpense = z.infer<typeof adExpenseSchema>;
