
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { SavingsTransactionSchema, type SavingsTransaction } from './data';
import { logActivity } from '@/lib/activity-log';
import { toZonedTime } from 'date-fns-tz';

const db = admin.firestore();
const payoutsCollection = db.collection('payouts');
const otherExpensesCollection = db.collection('other_expenses');
const otherIncomeCollection = db.collection('other_income');
const appsReceivedPaymentsCollection = db.collection('apps_received_payments');
const cashAccountsCollection = db.collection('cash_accounts');
const timeZone = 'Asia/Colombo';


const SavingsStatementUploadSchema = z.object({
  fileName: z.string(),
  transactions: z.array(SavingsTransactionSchema),
});

export async function saveSavingsStatement(data: z.infer<typeof SavingsStatementUploadSchema>) {
  await requireAdminAuth();
  const validation = SavingsStatementUploadSchema.safeParse(data);
  if (!validation.success) {
      console.error("Invalid Savings statement data:", validation.error.flatten());
      return { error: 'Invalid data provided.' };
  }

  try {
    const batch = db.batch();
    const { transactions } = validation.data;
    
    // Filter out duplicates before processing
    const newTransactions = transactions.filter(tx => !tx.isDuplicate);

    for (const tx of newTransactions) {
        // Create a unique-ish ID for the transaction to prevent duplicates
        const transactionId = `${tx.transactionDate.replace(/\//g, '')}-${tx.description.substring(0, 10)}-${tx.debit || tx.credit}`;
        const [day, month, year] = tx.transactionDate.split('/');
        const dateObject = toZonedTime(new Date(`${year}-${month}-${day}`), timeZone);

        if (tx.category === 'Payout') {
            const payoutRef = payoutsCollection.doc();
            batch.set(payoutRef, {
                description: tx.description,
                amount: tx.credit || tx.debit,
                currency: tx.currency,
                date: admin.firestore.Timestamp.fromDate(dateObject),
                sourceTransactionId: transactionId,
                type: tx.credit ? 'Credit' : 'Debit',
            });
        } else if (tx.debit) {
            // This is an expense
            const expenseRef = otherExpensesCollection.doc();
            batch.set(expenseRef, {
                category: tx.category || 'Unknown',
                description: tx.description,
                amount: tx.debit,
                currency: tx.currency,
                date: admin.firestore.Timestamp.fromDate(dateObject),
                recurrence: 'One-Time',
                attachmentUrl: '',
                isGenerated: false,
                sourceTransactionId: transactionId
            });
        } else if (tx.credit) {
            // This is income, route it based on category
            const incomeData = {
                category: tx.category,
                description: tx.description,
                amount: tx.credit,
                currency: tx.currency,
                date: admin.firestore.Timestamp.fromDate(dateObject),
                sourceTransactionId: transactionId
            };
            
            if (tx.category === 'IOS Income' || tx.category === 'Android Income' || tx.category === 'Admob Income') {
                const appsReceivedPaymentRef = appsReceivedPaymentsCollection.doc();
                batch.set(appsReceivedPaymentRef, incomeData);
            } else { // 'Other' or uncategorized credits go to other_income
                const otherIncomeRef = otherIncomeCollection.doc();
                batch.set(otherIncomeRef, incomeData);
            }
        }
    }
    
    // Find the latest transaction to update the main account balance
    if (transactions.length > 0) {
        const latestTransaction = transactions.reduce((latest, current) => {
             const [day, month, year] = current.transactionDate.split('/');
             const currentDate = new Date(`${year}-${month}-${day}`);
             const [latestDay, latestMonth, latestYear] = latest.transactionDate.split('/');
             const latestDate = new Date(`${latestYear}-${latestMonth}-${latestDay}`);
             return currentDate > latestDate ? current : latest;
        });

        const [day, month, year] = latestTransaction.transactionDate.split('/');
        const latestTransactionDate = new Date(`${year}-${month}-${day}`);
        
        const mmAccountRef = cashAccountsCollection.doc('mm_account');
        batch.set(mmAccountRef, {
            bankName: 'MM Account',
            balance: latestTransaction.runningBalance,
            currency: latestTransaction.currency,
            lastUpdated: admin.firestore.Timestamp.fromDate(latestTransactionDate),
        }, { merge: true });
    }


    await batch.commit();

    await logActivity('UPLOAD_BANK_STATEMENT', {
      entityType: 'MM Account Statement',
      entityId: validation.data.fileName,
      entityName: `Statement: ${validation.data.fileName}`,
      changes: {
        totalTransactions: transactions.length,
        newTransactionsProcessed: newTransactions.length,
      }
    });

    revalidatePath('/savings-account-statement');
    revalidatePath('/other-expenses');
    revalidatePath('/other-income');
    revalidatePath('/apps-received-payments');
    revalidatePath('/payouts');
    revalidatePath('/dashboard'); // Revalidate dashboard to show new balance

    return { success: true, transactionCount: newTransactions.length };
  } catch (error: any) {
    console.error("Error saving savings statement:", error);
    return { error: 'Failed to save statement to database.' };
  }
}

export async function getExistingSavingsTransactionIds(transactionIds: string[]): Promise<string[]> {
    await requireAdminAuth();
    if (transactionIds.length === 0) return [];
    
    const existingIds = new Set<string>();
    
    const batches: string[][] = [];
    for (let i = 0; i < transactionIds.length; i += 30) {
        batches.push(transactionIds.slice(i, i + 30));
    }
    
    try {
        for (const batch of batches) {
            const expensesSnapshot = await otherExpensesCollection.where('sourceTransactionId', 'in', batch).get();
            expensesSnapshot.forEach(doc => existingIds.add(doc.data().sourceTransactionId));

            const incomeSnapshot = await otherIncomeCollection.where('sourceTransactionId', 'in', batch).get();
            incomeSnapshot.forEach(doc => existingIds.add(doc.data().sourceTransactionId));

            const payoutSnapshot = await payoutsCollection.where('sourceTransactionId', 'in', batch).get();
            payoutSnapshot.forEach(doc => existingIds.add(doc.data().sourceTransactionId));

            const appsReceivedPaymentsSnapshot = await appsReceivedPaymentsCollection.where('sourceTransactionId', 'in', batch).get();
            appsReceivedPaymentsSnapshot.forEach(doc => existingIds.add(doc.data().sourceTransactionId));
        }
        return Array.from(existingIds);
    } catch (error) {
        console.error("Error fetching existing Savings transaction IDs:", error);
        return []; // Return empty on error to avoid blocking uploads
    }
}
