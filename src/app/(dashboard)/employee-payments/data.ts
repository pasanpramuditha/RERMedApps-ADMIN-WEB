
import { z } from 'zod';
import { financeEmployeeNames } from '@/lib/finance-employees';

export const employeePaymentSchema = z.object({
  id: z.string(),
  employeeName: z.enum(financeEmployeeNames),
  remarks: z.string().optional(),
  amount: z.number(),
  currency: z.enum(['USD', 'LKR']),
  date: z.string(),
  paymentSlipUrl: z.string().url().optional(),
  transactionType: z.enum(['Bank Transfer', 'Cash']).optional(),
});

export type EmployeePayment = z.infer<typeof employeePaymentSchema>;
