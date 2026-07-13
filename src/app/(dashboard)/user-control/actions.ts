

'use server';

import { requireAdminAuth } from '@/lib/server-auth';
import admin from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/lib/activity-log';

interface CreateUserFormData {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
}

interface UpdateUserFormData {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
    photoURL?: string;
    mobile?: string;
}

const db = admin.firestore();
const userSettingsCollection = db.collection('user_settings');

export async function createUser(formData: CreateUserFormData, idToken?: string) {
    await requireAdminAuth();
    try {
        const { email, password, firstName, lastName, photoURL } = formData;

        if (!password) {
            return { error: "Password is required." };
        }

        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
            photoURL: photoURL || undefined,
            emailVerified: true,
        });
        
        revalidatePath('/user-control');
        
        await logActivity('CREATE_USER', {
            entityType: 'User',
            entityId: userRecord.uid,
            entityName: email
        }, idToken);
        
        return { uid: userRecord.uid };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateUser(formData: UpdateUserFormData, idToken?: string) {
    await requireAdminAuth();
    try {
        const { uid, email, password, firstName, lastName, photoURL, mobile } = formData;
        
        const updatePayload: { email: string; displayName: string; password?: string, photoURL?: string, phoneNumber?: string } = {
            email,
            displayName: `${firstName} ${lastName}`,
            photoURL: photoURL || undefined,
            phoneNumber: mobile || undefined,
        };

        if (password && password.length >= 6) {
            updatePayload.password = password;
        }

        await admin.auth().updateUser(uid, updatePayload);
        
        revalidatePath('/user-control');
        
        await logActivity('UPDATE_USER', {
            entityType: 'User',
            entityId: uid,
            entityName: email
        }, idToken);
        
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}


export async function listAllUsers() {
    await requireAdminAuth();
    try {
        const userRecords = await admin.auth().listUsers();
        return userRecords.users;
    } catch (error: any) {
        console.error("Error listing users:", error);
        return [];
    }
}

export async function updateUserStatus(uid: string, disabled: boolean, idToken?: string) {
    await requireAdminAuth();
    try {
        const user = await admin.auth().getUser(uid);
        await admin.auth().updateUser(uid, { disabled });
        revalidatePath('/user-control');
        
        await logActivity('UPDATE_USER_STATUS', {
            entityType: 'User',
            entityId: uid,
            entityName: user.email,
            changes: { status: disabled ? 'Disabled' : 'Active' }
        }, idToken);
        
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getUserNavVisibility(uid: string): Promise<string> {
    await requireAdminAuth();
    try {
        const doc = await userSettingsCollection.doc(uid).get();
        if (doc.exists) {
            return doc.data()?.navigation_visibility_json || '{}';
        }
        return '{}';
    } catch (error) {
        console.error("Error fetching user nav visibility:", error);
        return '{}';
    }
}

export async function saveUserNavVisibility(uid: string, visibilityJson: string, idToken?: string) {
    await requireAdminAuth();
    try {
        await userSettingsCollection.doc(uid).set({
            navigation_visibility_json: visibilityJson
        }, { merge: true });
        
        const user = await admin.auth().getUser(uid);
        
        await logActivity('UPDATE_USER_PERMISSIONS', {
            entityType: 'User Permissions',
            entityId: uid,
            entityName: user.email,
        }, idToken);
        
        revalidatePath('/user-control');
        return { success: true };
    } catch (error: any) {
        console.error("Error saving user nav visibility:", error);
        return { error: 'Failed to save user permissions.' };
    }
}
