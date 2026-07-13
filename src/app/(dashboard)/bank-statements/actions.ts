
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { type BankStatementUpload, type BankTransaction } from './data';
import { logActivity } from '@/lib/activity-log';
import { toZonedTime } from 'date-fns-tz';

const db = admin.firestore();

export async function saveBankStatement(data: BankStatementUpload) {
  await requireAdminAuth();

  try {
    const batch = db.batch();
    const { fileName, transactions, account } = data;
    const timeZone = 'Asia/Colombo';

    // 1. Save all transactions to a dedicated collection for audit purposes
    transactions.forEach((tx) => {
      const docRef = db.collection('bank_statement_transactions').doc();
      batch.set(docRef, tx);
    });
    
    // 2. Filter out duplicates before adding to ledgers
    const newTransactions = transactions.filter(tx => !tx.isDuplicate);

    // 3. Add DEBITs to other_expenses
    const debitTransactions = newTransactions.filter(tx => tx.transactionType === 'DEBIT');
    debitTransactions.forEach(tx => {
      const docRef = db.collection('other_expenses').doc();
      const expenseDate = new Date(`${tx.postedDate.substring(0, 4)}-${tx.postedDate.substring(4, 6)}-${tx.postedDate.substring(6, 8)}`);
      batch.set(docRef, {
        category: tx.tag || 'Bank Transaction',
        description: tx.name,
        amount: Math.abs(tx.amount),
        currency: tx.currency,
        date: admin.firestore.Timestamp.fromDate(toZonedTime(expenseDate, timeZone)),
        recurrence: 'One-Time',
        attachmentUrl: '',
        isGenerated: false,
        sourceTransactionId: tx.fitId,
      });
    });
    
    // 4. Add CREDITs to other_income
    const creditTransactions = newTransactions.filter(tx => tx.transactionType === 'CREDIT');
    creditTransactions.forEach(tx => {
      const docRef = db.collection('other_income').doc();
       const incomeDate = new Date(`${tx.postedDate.substring(0, 4)}-${tx.postedDate.substring(4, 6)}-${tx.postedDate.substring(6, 8)}`);
      batch.set(docRef, {
        category: tx.tag || 'Bank Transaction',
        description: tx.name,
        amount: tx.amount,
        currency: tx.currency,
        date: admin.firestore.Timestamp.fromDate(toZonedTime(incomeDate, timeZone)),
        sourceTransactionId: tx.fitId,
      });
    });

    await batch.commit();

    await logActivity('UPLOAD_BANK_STATEMENT', {
      entityType: 'Bank Statement',
      entityId: fileName,
      entityName: `Statement from ${account.bankId} for account ${account.accountId}`,
      changes: {
        totalTransactionsInFile: transactions.length,
        newTransactionsProcessed: newTransactions.length,
      }
    });

    revalidatePath('/bank-statements');
    revalidatePath('/other-expenses');
    revalidatePath('/other-income');

    return { success: true, transactionCount: newTransactions.length };
  } catch (error: any) {
    console.error("Error saving bank statement:", error);
    return { error: 'Failed to save statement to database.' };
  }
}


export async function getExistingTransactionIds(fitIds: string[]): Promise<string[]> {
    await requireAdminAuth();
    if (fitIds.length === 0) return [];
    
    const existingIds = new Set<string>();
    
    // Firestore 'in' queries are limited to 30 elements. We need to batch the requests.
    const batches: string[][] = [];
    for (let i = 0; i < fitIds.length; i += 30) {
        batches.push(fitIds.slice(i, i + 30));
    }
    
    try {
        for (const batch of batches) {
            // Check other_expenses
            const expensesSnapshot = await db.collection('other_expenses').where('sourceTransactionId', 'in', batch).get();
            if (!expensesSnapshot.empty) {
                expensesSnapshot.forEach(doc => {
                    existingIds.add(doc.data().sourceTransactionId);
                });
            }
            // Check other_income
            const incomeSnapshot = await db.collection('other_income').where('sourceTransactionId', 'in', batch).get();
            if (!incomeSnapshot.empty) {
                incomeSnapshot.forEach(doc => {
                    existingIds.add(doc.data().sourceTransactionId);
                });
            }
        }
        return Array.from(existingIds);
    } catch (error) {
        console.error("Error fetching existing transaction IDs from ledgers:", error);
        return []; // Return empty on error to avoid blocking uploads
    }
}
