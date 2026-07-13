// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Your web app's Firebase configuration
// Note: These variables are now only used for client-side Firebase services if needed,
// but the primary authentication is mocked.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isFirebaseConfigReady() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !String(firebaseConfig.apiKey).includes('your-') &&
    String(firebaseConfig.apiKey).trim() !== 'undefined'
  );
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigReady()) {
    throw new Error('Firebase client config is missing or invalid. Check NEXT_PUBLIC_FIREBASE_* environment variables.');
  }
  return !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export { getFirebaseApp, getFirebaseAuth, isFirebaseConfigReady };
