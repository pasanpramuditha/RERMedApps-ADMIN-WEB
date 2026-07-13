
'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Earning } from './data';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const NumberCell = ({ value }: { value?: number }) => (
    <div className="text-right">{value?.toLocaleString() ?? 'N/A'}</div>
);
const CurrencyCell = ({ value, currency }: { value?: number, currency?: string }) => {
    if (value === undefined || value === null) return <div className="text-right">N/A</div>;
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
    }).format(value);
    return <div className="text-right font-medium">{formatted}</div>;
}

export const columns: ColumnDef<Earning>[] = [
  {
    accessorKey: 'skuId',
    header: 'SKU ID',
  },
  {
    accessorKey: 'productTitle',
    header: 'Product Title',
    cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.productTitle}>
            {row.original.productTitle}
        </div>
    )
  },
  {
    accessorKey: 'transactionDate',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Transaction Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div>{row.original.transactionDate}</div>,
  },
  {
    accessorKey: 'amountMerchantCurrency',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="w-full justify-end px-2"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <CurrencyCell value={row.original.amountMerchantCurrency} currency={row.original.merchantCurrency} />
  },
  {
    accessorKey: 'transactionType',
    header: 'Type',
    cell: ({ row }) => {
        const type = row.getValue('transactionType') as string;
        if (!type) return null;
        let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'outline';
        if (type.toLowerCase().includes('charge')) variant = 'default';
        if (type.toLowerCase().includes('tax')) variant = 'secondary';
        if (type.toLowerCase().includes('refund')) variant = 'destructive';
        
        return <Badge variant={variant}>{type}</Badge>;
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'transactionTime',
    header: 'Transaction Time',
  },
  {
    accessorKey: 'taxType',
    header: 'Tax Type',
  },
  {
    accessorKey: 'refundType',
    header: 'Refund Type',
  },
  {
    accessorKey: 'productId',
    header: 'Product ID',
  },
  {
    accessorKey: 'productType',
    header: 'Product Type',
  },
  {
    accessorKey: 'hardware',
    header: 'Hardware',
  },
  {
    accessorKey: 'buyerCountry',
    header: 'Buyer Country',
  },
  {
    accessorKey: 'buyerState',
    header: 'Buyer State',
  },
  {
    accessorKey: 'buyerPostalCode',
    header: 'Buyer Postal Code',
  },
  {
    accessorKey: 'buyerCurrency',
    header: 'Buyer Currency',
  },
  {
    accessorKey: 'amountBuyerCurrency',
    header: 'Amount (Buyer Currency)',
    cell: ({ row }) => <CurrencyCell value={row.original.amountBuyerCurrency} currency={row.original.buyerCurrency} />,
  },
  {
    accessorKey: 'currencyConversionRate',
    header: 'Conversion Rate',
    cell: ({ row }) => <NumberCell value={row.original.currencyConversionRate} />,
  },
  {
    accessorKey: 'merchantCurrency',
    header: 'Merchant Currency',
  },
  {
    accessorKey: 'basePlanId',
    header: 'Base Plan ID',
  },
  {
    accessorKey: 'offerId',
    header: 'Offer ID',
  },
  {
    accessorKey: 'groupId',
    header: 'Group ID',
  },
  {
    accessorKey: 'firstUsd1mEligible',
    header: '1M Eligible',
  },
  {
    accessorKey: 'serviceFeePercent',
    header: 'Service Fee %',
    cell: ({ row }) => <div className="text-right">{row.original.serviceFeePercent}%</div>,
  },
  {
    accessorKey: 'feeDescription',
    header: 'Fee Description',
  },
  {
    accessorKey: 'promotionId',
    header: 'Promotion ID',
  },
];
