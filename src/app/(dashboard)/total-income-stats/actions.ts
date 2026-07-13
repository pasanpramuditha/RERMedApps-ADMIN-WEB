

'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import admin from '@/lib/firebase-admin';
import { subMonths, format, getYear } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const db = admin.firestore();

export interface TotalIncomeStats {
  lifetime: number;
  lastMonth: number;
  currentYear: number;
  breakdown: {
    source: string;
    value: number;
    fill: string;
  }[];
}

async function getTotalIncomeFromCollection(collectionName: string, valueField: string): Promise<number> {
    const snapshot = await db.collection(collectionName).get();
    let total = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data && Array.isArray(data.rows)) {
            total += data.rows.reduce((sum: number, row: any) => sum + (row[valueField] || 0), 0);
        } else if (data && data.totalEarnings) { // AdMob specific structure
             total += data.totalEarnings;
        } else if (data && data.summary && data.summary.totalProceedsUSD) { // Apple sales reports specific structure
            total += data.summary.totalProceedsUSD;
        }
    });
    return total;
}

export async function getTotalIncomeStats(): Promise<TotalIncomeStats> {
    await requireAdminAuth();
    try {
        const timeZone = 'Asia/Colombo';
        const nowInColombo = toZonedTime(new Date(), timeZone);
        const lastMonthDate = subMonths(nowInColombo, 1);
        const lastMonthId = format(lastMonthDate, 'yyyy_MM');
        const currentYear = getYear(nowInColombo);

        const collections = [
            { name: 'android_earnings_reports', valueField: 'amountMerchantCurrency', chartLabel: 'Android' },
            { name: 'apple_earnings_reports', valueField: 'proceedsUSD', chartLabel: 'Apple' },
            { name: 'admob_earnings', valueField: 'estimatedEarnings', chartLabel: 'AdMob' },
        ];

        let lifetime = 0;
        let lastMonth = 0;
        let currentYearTotal = 0;
        const breakdown: TotalIncomeStats['breakdown'] = [];

        for (const coll of collections) {
            const collectionLifetimeTotal = await getTotalIncomeFromCollection(coll.name, coll.valueField);
            lifetime += collectionLifetimeTotal;
            breakdown.push({ source: coll.chartLabel, value: collectionLifetimeTotal, fill: '' }); // Fill will be set on client

            // Last Month
            const lastMonthDoc = await db.collection(coll.name).doc(`earnings_${lastMonthId}`).get();
            if (lastMonthDoc.exists) {
                const data = lastMonthDoc.data();
                if (data && Array.isArray(data.rows)) {
                    lastMonth += data.rows.reduce((sum: number, row: any) => sum + (row[coll.valueField] || 0), 0);
                } else if(data && data.totalEarnings) {
                    lastMonth += data.totalEarnings
                }
            }

            // Current Year
            const yearStartId = `earnings_${currentYear}_01`;
            const yearEndId = `earnings_${currentYear}_12`;
            const yearSnapshot = await db.collection(coll.name)
                .where(admin.firestore.FieldPath.documentId(), '>=', yearStartId)
                .where(admin.firestore.FieldPath.documentId(), '<=', yearEndId)
                .get();
            
            yearSnapshot.forEach(doc => {
                 const data = doc.data();
                 if (data && Array.isArray(data.rows)) {
                    currentYearTotal += data.rows.reduce((sum: number, row: any) => sum + (row[coll.valueField] || 0), 0);
                } else if(data && data.totalEarnings) {
                    currentYearTotal += data.totalEarnings
                }
            });
        }
        
        return { lifetime, lastMonth, currentYear: currentYearTotal, breakdown };

    } catch (error) {
        console.error("Error fetching total income stats:", error);
        return { lifetime: 0, lastMonth: 0, currentYear: 0, breakdown: [] };
    }
}
