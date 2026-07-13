
'use server';
/**
 * @fileOverview A deterministic helper for categorizing bank transactions.
 *
 * - categorizeTransaction - A function that handles the transaction categorization.
 * - CategorizeTransactionInput - The input type for the categorizeTransaction function.
 * - CategorizeTransactionOutput - The return type for the categorizeTransaction function.
 */

import { z } from 'zod';

const CategorizeTransactionInputSchema = z.object({
  description: z.string().describe('The transaction description from the bank statement (e.g., "PURCHASE Google One").'),
});
export type CategorizeTransactionInput = z.infer<typeof CategorizeTransactionInputSchema>;

const CategorizeTransactionOutputSchema = z.object({
  tag: z.enum(['Business', 'Personal', 'Unknown']).describe('The category of the transaction.'),
});
export type CategorizeTransactionOutput = z.infer<typeof CategorizeTransactionOutputSchema>;

const businessKeywords = [
  'google one',
  'google cloud',
  'google payment',
  'apple inc',
  'chatgpt',
  'openai',
  'appscreens.com',
  'yubico',
  'figma',
  'aws',
  'amazon web services',
  'supabase',
  'vercel',
  'github',
  'namecheap',
  'cloudflare',
  'stripe',
  'firebase',
];

const personalKeywords = [
  'restaurant',
  'cafe',
  'coffee',
  'grocery',
  'supermarket',
  'uber eats',
  'doordash',
  'netflix',
  'spotify',
  'cinema',
  'fashion',
  'pharmacy',
];

export async function categorizeTransaction(input: CategorizeTransactionInput): Promise<CategorizeTransactionOutput> {
  const parsed = CategorizeTransactionInputSchema.parse(input);
  const description = parsed.description.toLowerCase();

  if (businessKeywords.some((keyword) => description.includes(keyword))) {
    return { tag: 'Business' };
  }

  if (personalKeywords.some((keyword) => description.includes(keyword))) {
    return { tag: 'Personal' };
  }

  return { tag: 'Unknown' };
}
