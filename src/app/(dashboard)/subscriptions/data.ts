export type SubscriptionPeriod = 'today' | 'yesterday' | 'last7days' | 'this_month' | 'last_month';

export interface SubscriptionRecord {
  id: string;
  platform: 'android' | 'apple';
  appIcon?: string;
  subCount: number;
  type: string;
  user: string;
  geo: string;
  language?: string;
  flag: string;
  appHint?: string;
  product: string;
  sku: string;
  amount: string;
  amountCurrency?: string;
  amountLkr?: string;
  totalSpent: string;
  totalLkr?: string;
  amountUsdRaw?: number;
  amountLkrRaw?: number;
  time: string;
  activity?: string;
  status: string;
  statusColor: string;
  action?: string;
  tag: string;
}

export interface SubscriptionSummary {
  Yearly: number;
  Monthly: number;
  Trials: number;
  Expired: number;
  Cancelled: number;
  Failed: number;
  Refunds: number;
  mrr_lkr: number;
  mrr_usd: number;
}

export interface SubscriptionsDashboardData {
  success: boolean;
  period: SubscriptionPeriod | string;
  from: string;
  to: string;
  summary: SubscriptionSummary;
  records: SubscriptionRecord[];
  error_msg?: string;
}

export const emptySubscriptionSummary: SubscriptionSummary = {
  Yearly: 0,
  Monthly: 0,
  Trials: 0,
  Expired: 0,
  Cancelled: 0,
  Failed: 0,
  Refunds: 0,
  mrr_lkr: 0,
  mrr_usd: 0,
};
