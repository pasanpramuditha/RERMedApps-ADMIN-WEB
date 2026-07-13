import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function ensureFirebaseAdminApp() {
  if (getApps().length) {
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    initializeApp({
      credential: cert(serviceAccount as ServiceAccount),
    });
  } else {
    initializeApp();
  }
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
