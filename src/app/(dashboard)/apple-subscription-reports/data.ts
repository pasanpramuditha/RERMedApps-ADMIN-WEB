import { z } from 'zod';

export const appleSubscriptionReportRowSchema = z.object({
  date: z.string().optional(),
  appName: z.string().optional(),
  appAppleId: z.string().optional(),
  subscriptionName: z.string().optional(),
  subscriptionAppleId: z.string().optional(),
  subscriptionGroupId: z.string().optional(),
  standardSubscriptionDuration: z.string().optional(),
  subscriptionOfferName: z.string().optional(),
  promotionalOfferId: z.string().optional(),
  customerPrice: z.number().optional(),
  customerCurrency: z.string().optional(),
  developerProceeds: z.number().optional(),
  proceedsCurrency: z.string().optional(),
  preservedPricing: z.string().optional(),
  proceedsReason: z.string().optional(),
  client: z.string().optional(),
  device: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  activeStandardPriceSubscriptions: z.number().optional(),
  activeFreeTrialIntroductoryOfferSubscriptions: z.number().optional(),
  activePayUpFrontIntroductoryOfferSubscriptions: z.number().optional(),
  activePayAsYouGoIntroductoryOfferSubscriptions: z.number().optional(),
  freeTrialPromotionalOfferSubscriptions: z.number().optional(),
  payUpFrontPromotionalOfferSubscriptions: z.number().optional(),
  payAsYouGoPromotionalOfferSubscriptions: z.number().optional(),
  freeTrialOfferCodeSubscriptions: z.number().optional(),
  payUpFrontOfferCodeSubscriptions: z.number().optional(),
  payAsYouGoOfferCodeSubscriptions: z.number().optional(),
  marketingOptIns: z.number().optional(),
  billingRetry: z.number().optional(),
  gracePeriod: z.number().optional(),
  subscribers: z.number().optional(),
  freeTrialWinBackOffers: z.number().optional(),
  payUpFrontWinBackOffers: z.number().optional(),
  payAsYouGoWinBackOffers: z.number().optional(),
});

export type AppleSubscriptionReportRow = z.infer<typeof appleSubscriptionReportRowSchema>;

export const AppleSubscriptionReportSchema = z.object({
  fileName: z.string(),
  reportDate: z.string(), // YYYY-MM
  rows: z.array(appleSubscriptionReportRowSchema),
});

export type AppleSubscriptionReport = z.infer<typeof AppleSubscriptionReportSchema>;
