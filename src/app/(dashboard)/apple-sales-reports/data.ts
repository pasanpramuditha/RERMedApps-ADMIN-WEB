
import { z } from 'zod';

export const appleSalesReportRowSchema = z.object({
  provider: z.string().optional(),
  providerCountry: z.string().optional(),
  sku: z.string().optional(),
  developer: z.string().optional(),
  title: z.string().optional(),
  version: z.string().optional(),
  productTypeIdentifier: z.string().optional(),
  units: z.number().optional(),
  developerProceeds: z.number().optional(),
  developerProceedsUSD: z.number().optional(),
  beginDate: z.string().optional(),
  endDate: z.string().optional(),
  customerCurrency: z.string().optional(),
  countryCode: z.string().optional(),
  currencyOfProceeds: z.string().optional(),
  appleIdentifier: z.string().optional(),
  customerPrice: z.number().optional(),
  customerPriceUSD: z.number().optional(),
  promoCode: z.string().optional(),
  parentIdentifier: z.string().optional(),
  subscription: z.string().optional(),
  period: z.string().optional(),
  category: z.string().optional(),
  cmb: z.string().optional(),
  device: z.string().optional(),
  supportedPlatforms: z.string().optional(),
  proceedsReason: z.string().optional(),
  preservedPricing: z.string().optional(),
  client: z.string().optional(),
  orderType: z.string().optional(),
});

export type AppleSalesReportRow = z.infer<typeof appleSalesReportRowSchema>;

export const AppleSalesReportSchema = z.object({
  fileName: z.string(),
  reportDate: z.string(), // YYYY-MM
  summary: z.object({
    totalProceedsUSD: z.number(),
    totalUnits: z.number(),
  }),
  rows: z.array(appleSalesReportRowSchema),
});

export type AppleSalesReport = z.infer<typeof AppleSalesReportSchema>;
