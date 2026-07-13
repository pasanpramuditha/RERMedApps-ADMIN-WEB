import { z } from 'zod';

export const earningSchema = z.object({
  id: z.string(),
  description: z.string().optional(),
  transactionDate: z.string().optional(),
  transactionTime: z.string().optional(),
  taxType: z.string().optional(),
  transactionType: z.string().optional(),
  refundType: z.string().optional(),
  productTitle: z.string().optional(),
  productId: z.string().optional(),
  productType: z.string().optional(),
  skuId: z.string().optional(),
  hardware: z.string().optional(),
  buyerCountry: z.string().optional(),
  buyerState: z.string().optional(),
  buyerPostalCode: z.string().optional(),
  buyerCurrency: z.string().optional(),
  amountBuyerCurrency: z.number().optional(),
  currencyConversionRate: z.number().optional(),
  merchantCurrency: z.string().optional(),
  amountMerchantCurrency: z.number().optional(),
  basePlanId: z.string().optional(),
  offerId: z.string().optional(),
  groupId: z.string().optional(),
  firstUsd1mEligible: z.string().optional(),
  serviceFeePercent: z.number().optional(),
  feeDescription: z.string().optional(),
  promotionId: z.string().optional(),
});

export type Earning = z.infer<typeof earningSchema>;
