
'use server';

import { cache } from 'react';

// Using React's cache function to memoize the API call within a single request-response lifecycle.
export const getExchangeRates = cache(async (): Promise<Record<string, number>> => {
    try {
        // Fetch fresh rates, but allow Next.js to cache the response for 6 hours.
        const ratesResponse = await fetch('https://open.er-api.com/v6/latest/USD', {
            next: { revalidate: 3600 * 6 } 
        } as RequestInit & { next: { revalidate: number } });
        if (ratesResponse.ok) {
            const ratesData = await ratesResponse.json();
            if (ratesData && ratesData.rates) {
                return ratesData.rates; // These are USD_TO_OTHER
            }
        }
        throw new Error('Invalid data from exchange rate API');
    } catch (e) {
        console.error("Could not fetch live exchange rates. Using fallback.", e);
        // Fallback rates in case the API is down.
        return { USD: 1, LKR: 300 }; 
    }
});

/**
 * Converts an amount from a given currency to USD using live exchange rates.
 * @param amount The amount to convert.
 * @param currency The three-letter currency code of the amount (e.g., "LKR").
 * @returns The converted amount in USD.
 */
export async function convertToUSD(amount: number, currency: string): Promise<number> {
    const currencyCode = currency.toUpperCase();
    if (currencyCode === 'USD') {
        return amount;
    }
    
    const rates = await getExchangeRates(); // rates are USD_TO_OTHER (e.g., { "LKR": 300 })
    const rate = rates[currencyCode];
    
    if (rate === undefined) {
         console.warn(`Exchange rate not found for currency: ${currency}. Returning original amount.`);
         return amount;
    }
    
    // To convert an amount from another currency to USD, we divide by the rate.
    // e.g., amount is in LKR, rate is USD_TO_LKR (300). USD amount = LKR amount / 300.
    return amount / rate;
}
