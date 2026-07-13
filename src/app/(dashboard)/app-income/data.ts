import { z } from 'zod';

export const appIncomeSchema = z.object({
    id: z.string(),
    appId: z.string(),
    appName: z.string(),
    appIcon: z.string().url(),
    category: z.enum(['IAP', 'AdMob']),
    year: z.number(),
    month: z.number(),
    amount: z.number(),
    currency: z.enum(['USD', 'LKR']),
});

export type AppIncome = z.infer<typeof appIncomeSchema>;
