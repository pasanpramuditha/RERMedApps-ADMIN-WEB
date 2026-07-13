'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { AppleSubscriptionReportRow } from '@/app/(dashboard)/apple-subscription-reports/data';

const safeToLocaleString = (value: number | undefined | null) => (value ?? 0).toLocaleString();
const moneyLabel = (amount: number | undefined | null, currency: string | undefined | null) =>
  amount === undefined || amount === null ? '-' : `${amount} ${currency || ''}`.trim();

export const columns: ColumnDef<AppleSubscriptionReportRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'appName', header: 'App Name' },
  { accessorKey: 'appAppleId', header: 'App Apple ID' },
  { accessorKey: 'subscriptionName', header: 'Subscription Name' },
  { accessorKey: 'subscriptionAppleId', header: 'Subscription Apple ID' },
  { accessorKey: 'subscriptionGroupId', header: 'Subscription Group ID' },
  { accessorKey: 'standardSubscriptionDuration', header: 'Duration' },
  { accessorKey: 'customerPrice', header: 'Price', cell: ({ row }) => moneyLabel(row.original.customerPrice, row.original.customerCurrency) },
  { accessorKey: 'developerProceeds', header: 'Proceeds', cell: ({ row }) => moneyLabel(row.original.developerProceeds, row.original.proceedsCurrency) },
  { accessorKey: 'device', header: 'Device' },
  { accessorKey: 'country', header: 'Country' },
  { accessorKey: 'subscribers', header: 'Subscribers', cell: ({ row }) => <div className="text-right">{safeToLocaleString(row.original.subscribers)}</div> },
  { accessorKey: 'activeStandardPriceSubscriptions', header: 'Active Standard Price', cell: ({ row }) => <div className="text-right">{safeToLocaleString(row.original.activeStandardPriceSubscriptions)}</div> },
  { accessorKey: 'activeFreeTrialIntroductoryOfferSubscriptions', header: 'Active Free Trial', cell: ({ row }) => <div className="text-right">{safeToLocaleString(row.original.activeFreeTrialIntroductoryOfferSubscriptions)}</div> },
  { accessorKey: 'billingRetry', header: 'Billing Retry', cell: ({ row }) => <div className="text-right">{safeToLocaleString(row.original.billingRetry)}</div> },
  { accessorKey: 'gracePeriod', header: 'Grace Period', cell: ({ row }) => <div className="text-right">{safeToLocaleString(row.original.gracePeriod)}</div> },
];
