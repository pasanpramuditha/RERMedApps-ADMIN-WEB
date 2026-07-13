
'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import { z } from 'zod';
import admin, { type FirestoreQuery, type FirestoreWriteBatch } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import type { OtherExpense } from './data';
import { logActivity } from '@/lib/activity-log';
import { addMonths, addYears, isBefore, startOfDay } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { convertToUSD } from '@/lib/currency';


const db = admin.firestore();
const otherExpensesCollection = db.collection('other_expenses');
const expenseCategoriesCollection = db.collection('expense_categories');
const expenseSubCategoriesCollection = db.collection('expense_subcategories');

const otherExpenseFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(['USD', 'LKR']),
  date: z.date(),
  recurrence: z.enum(['One-Time', 'Monthly', 'Annually']),
  attachmentUrl: z.string().url().optional().or(z.literal('')),
  generateRecurring: z.boolean().optional(),
});

const timeZone = 'Asia/Colombo';

const generateRecurringExpenses = async (batch: FirestoreWriteBatch, parentId: string, data: z.infer<typeof otherExpenseFormSchema>) => {
    if (data.recurrence === 'One-Time' || !data.generateRecurring) return;

    const generationEndDate = addYears(new Date(), 5);
    const zonedStartDate = toZonedTime(data.date, timeZone);

    let nextDate = data.recurrence === 'Monthly'
        ? addMonths(zonedStartDate, 1)
        : addYears(zonedStartDate, 1);
        
    const convertedAmount = await convertToUSD(data.amount, data.currency);

    while (isBefore(nextDate, generationEndDate)) {
        const newDocRef = otherExpensesCollection.doc();
        batch.set(newDocRef, {
            ...data,
            convertedAmount: parseFloat(convertedAmount.toFixed(2)),
            attachmentUrl: '', // Set attachment to empty for future records
            date: admin.firestore.Timestamp.fromDate(toZonedTime(nextDate, timeZone)),
            parentId: parentId,
            isGenerated: true,
        });
        nextDate = data.recurrence === 'Monthly'
            ? addMonths(nextDate, 1)
            : addYears(nextDate, 1);
    }
}

const deleteRecurringExpenses = async (batch: FirestoreWriteBatch, parentId: string) => {
    const snapshot = await otherExpensesCollection.where('parentId', '==', parentId).get();
    if (!snapshot.empty) {
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
    }
}


export async function addOtherExpense(data: z.infer<typeof otherExpenseFormSchema>, idToken?: string) {
    await requireAdminAuth();
    const validation = otherExpenseFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }
    
    try {
        const batch = db.batch();
        const docRef = otherExpensesCollection.doc();
        
        const zonedDate = toZonedTime(startOfDay(validation.data.date), timeZone);
        const { generateRecurring, ...dataToSave } = validation.data;
        const convertedAmount = await convertToUSD(dataToSave.amount, dataToSave.currency);

        const finalData = {
             ...dataToSave,
             date: admin.firestore.Timestamp.fromDate(zonedDate),
             isGenerated: false,
             convertedAmount: parseFloat(convertedAmount.toFixed(2)),
        };

        batch.set(docRef, finalData);
        
        // Pass the original Date object from the form to generate recurring expenses correctly
        await generateRecurringExpenses(batch, docRef.id, validation.data);
        
        await batch.commit();

        revalidatePath('/other-expenses');
        
        await logActivity('ADD_OTHER_EXPENSE', {
            entityType: 'Other Expense',
            entityId: docRef.id,
            entityName: validation.data.description
        }, idToken);

        const categoryDoc = await expenseCategoriesCollection.doc(validation.data.category).get();
        if (!categoryDoc.exists) {
            await expenseCategoriesCollection.doc(validation.data.category).set({ name: validation.data.category });
        }
        
        if (validation.data.subCategory) {
            const subCategoryDoc = await expenseSubCategoriesCollection.doc(validation.data.subCategory).get();
            if (!subCategoryDoc.exists) {
                await expenseSubCategoriesCollection.doc(validation.data.subCategory).set({ name: validation.data.subCategory, parent: validation.data.category });
            }
        }


        return { success: true };
    } catch (error: any) {
        return { error: "Failed to add expense." };
    }
}

export async function updateOtherExpense(id: string, data: z.infer<typeof otherExpenseFormSchema>, isParent: boolean, idToken?: string) {
    await requireAdminAuth();
    const validation = otherExpenseFormSchema.safeParse(data);
    if (!validation.success) {
        return { error: "Invalid data provided.", details: validation.error.flatten() };
    }

    try {
        const batch = db.batch();
        const docRef = otherExpensesCollection.doc(id);
        
        const zonedDate = toZonedTime(startOfDay(validation.data.date), timeZone);
        const { generateRecurring, ...updateData } = validation.data;
        const convertedAmount = await convertToUSD(updateData.amount, updateData.currency);

        const finalUpdateData = {
            ...updateData,
            date: admin.firestore.Timestamp.fromDate(zonedDate),
            convertedAmount: parseFloat(convertedAmount.toFixed(2)),
        };

        if (isParent) {
            // This is a parent record. Delete old children and generate new ones.
            await deleteRecurringExpenses(batch, id);
            await generateRecurringExpenses(batch, id, validation.data);
        }
        
        batch.update(docRef, finalUpdateData);
        
        await batch.commit();
        
        revalidatePath('/other-expenses');
        
        await logActivity('UPDATE_OTHER_EXPENSE', {
            entityType: 'Other Expense',
            entityId: id,
            entityName: validation.data.description,
        }, idToken);
        
        const categoryDoc = await expenseCategoriesCollection.doc(validation.data.category).get();
        if (!categoryDoc.exists) {
            await expenseCategoriesCollection.doc(validation.data.category).set({ name: validation.data.category });
        }
        
        if (validation.data.subCategory) {
            const subCategoryDoc = await expenseSubCategoriesCollection.doc(validation.data.subCategory).get();
            if (!subCategoryDoc.exists) {
                await expenseSubCategoriesCollection.doc(validation.data.subCategory).set({ name: validation.data.subCategory, parent: validation.data.category });
            }
        }

        return { success: true };
    } catch (error: any) {
        return { error: "Failed to update expense." };
    }
}

export async function deleteOtherExpense(id: string, isParent: boolean, idToken?: string) {
    await requireAdminAuth();
    try {
        const batch = db.batch();
        const expenseRef = otherExpensesCollection.doc(id);
        const expenseDoc = await expenseRef.get();
        if (!expenseDoc.exists) {
            return { error: 'Expense not found.' };
        }
        const expenseName = expenseDoc.data()?.description || 'Unknown Expense';

        batch.delete(expenseRef);
        
        if (isParent) {
            await deleteRecurringExpenses(batch, id);
        }
        
        await batch.commit();

        revalidatePath('/other-expenses');
        
        await logActivity('DELETE_OTHER_EXPENSE', {
            entityType: 'Other Expense',
            entityId: id,
            entityName: expenseName
        }, idToken);

        return { success: true };
    } catch (error: any) {
        return { error: 'Failed to delete expense. ' + error.message };
    }
}


export async function listOtherExpenses(): Promise<OtherExpense[]> {
    await requireAdminAuth();
    try {
        const snapshot = await otherExpensesCollection
            .orderBy('date', 'desc')
            .get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const dateInColombo = toZonedTime(data.date.toDate(), timeZone);
            return {
                id: doc.id,
                category: data.category,
                subCategory: data.subCategory,
                description: data.description,
                amount: data.amount,
                currency: data.currency || 'USD',
                date: formatTz(dateInColombo, 'yyyy-MM-dd', { timeZone }),
                recurrence: data.recurrence || 'One-Time',
                attachmentUrl: data.attachmentUrl,
                isGenerated: data.isGenerated || false,
                parentId: data.parentId,
                convertedAmount: data.convertedAmount,
            } as OtherExpense;
        });

    } catch (error) {
        console.error("Error listing other expenses:", error);
        return [];
    }
}

// Category Management
export async function listExpenseCategories(): Promise<string[]> {
    await requireAdminAuth();
    try {
        const snapshot = await expenseCategoriesCollection.orderBy('name').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => doc.data().name);
    } catch (error) {
        console.error("Error listing expense categories:", error);
        return [];
    }
}

export async function renameExpenseCategory(oldName: string, newName: string, idToken?: string): Promise<{ success: boolean; error?: string }> {
    await requireAdminAuth();
    if (!oldName || !newName || oldName === newName) {
        return { success: false, error: "Invalid category names provided." };
    }

    try {
        const batch = db.batch();
        const expensesSnapshot = await otherExpensesCollection.where('category', '==', oldName).get();
        
        expensesSnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { category: newName });
        });
        
        // Rename in categories collection
        const oldCategoryRef = expenseCategoriesCollection.doc(oldName);
        const newCategoryRef = expenseCategoriesCollection.doc(newName);

        const oldDoc = await oldCategoryRef.get();
        if(oldDoc.exists) {
            batch.set(newCategoryRef, { name: newName });
            batch.delete(oldCategoryRef);
        }
        
        await batch.commit();

        await logActivity('RENAME_EXPENSE_CATEGORY', {
            entityType: 'Category',
            entityId: oldName,
            entityName: `From '${oldName}' to '${newName}'`
        }, idToken);
        
        revalidatePath('/other-expenses');
        return { success: true };
    } catch (error: any) {
        console.error("Error renaming category:", error);
        return { success: false, error: "Failed to rename category in the database." };
    }
}


export async function deleteExpenseCategory(categoryName: string, idToken?: string): Promise<{ success: boolean; error?: string }> {
     await requireAdminAuth();
     if (!categoryName) {
        return { success: false, error: "Category name is required." };
    }
    try {
        const snapshot = await otherExpensesCollection.where('category', '==', categoryName).limit(1).get();
        if (!snapshot.empty) {
            return { success: false, error: "Cannot delete category: it is currently in use by one or more expense records." };
        }
        
        await expenseCategoriesCollection.doc(categoryName).delete();
        
        await logActivity('DELETE_OTHER_EXPENSE', {
            entityType: 'Category',
            entityId: categoryName,
            entityName: categoryName
        }, idToken);

        revalidatePath('/other-expenses');
        return { success: true };
    } catch (error: any) {
        console.error("Error checking category before deletion:", error);
        return { success: false, error: "Failed to delete category." };
    }
}

// SubCategory Management
export async function listExpenseSubCategories(parentCategory?: string): Promise<string[]> {
    await requireAdminAuth();
    try {
        let query: FirestoreQuery = expenseSubCategoriesCollection;
        if(parentCategory) {
            query = query.where('parent', '==', parentCategory);
        }
        const snapshot = await query.orderBy('name').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => doc.data().name);
    } catch (error) {
        console.error("Error listing expense subcategories:", error);
        return [];
    }
}
