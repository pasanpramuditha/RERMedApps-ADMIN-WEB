import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n').replace(/^['"]+|['"]+$/g, '');
}

function normalizeServiceAccount(value: Record<string, unknown>): ServiceAccount {
  const projectId = String(value.projectId || value.project_id || '');
  const clientEmail = String(value.clientEmail || value.client_email || '');
  const privateKey = String(value.privateKey || value.private_key || '');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase service account JSON must include project_id/client_email/private_key.');
  }
  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  } as ServiceAccount;
}

function parseServiceAccountJson(value: string) {
  let trimmed = value.trim();
  if (!trimmed) return null;
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') {
      trimmed = parsed.trim();
    }
  }
  const jsonText = trimmed.startsWith('{')
    ? trimmed
    : Buffer.from(trimmed, 'base64').toString('utf8');
  return normalizeServiceAccount(JSON.parse(jsonText));
}

function getServiceAccountFromEnv(): ServiceAccount | null {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '';
  if (serviceAccountJson.trim()) {
    return parseServiceAccountJson(serviceAccountJson);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    } as ServiceAccount;
  }

  return null;
}

function ensureFirebaseAdminApp() {
  if (getApps().length) {
    return;
  }

  const serviceAccount = getServiceAccountFromEnv();
  if (!serviceAccount) {
    throw new Error('Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.');
  }

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = (() => {
  ensureFirebaseAdminApp();
  return getAuth();
}) as () => Auth;

function createDisabledFirestoreReference(): any {
  const emptySnapshot = {
    empty: true,
    docs: [],
    forEach: (_callback: (doc: any) => void) => {},
  };

  const reference: any = {
    id: 'firestore-disabled',
    collection: () => reference,
    doc: () => reference,
    where: () => reference,
    orderBy: () => reference,
    limit: () => reference,
    add: async () => ({ id: 'firestore-disabled' }),
    set: async () => {},
    update: async () => {},
    delete: async () => {},
    get: async () => emptySnapshot,
    data: () => ({}),
    batch: () => ({
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: async () => {},
    }),
  };

  return reference;
}

const firestoreDisabled: any = function firestoreDisabled() {
  return createDisabledFirestoreReference();
};

firestoreDisabled.FieldPath = {
  documentId: () => '__name__',
};
firestoreDisabled.FieldValue = {
  serverTimestamp: () => new Date(),
};
firestoreDisabled.Timestamp = {
  fromDate: (date: Date) => date,
};

const admin = {
  auth,
  firestore: firestoreDisabled,
};

export default admin;
export type { DecodedIdToken } from 'firebase-admin/auth';
export type FirestoreQuery = any;
export type FirestoreWriteBatch = any;
