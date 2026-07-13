import admin, { type DecodedIdToken } from '@/lib/firebase-admin';
import { cookies, headers } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'admin_session';

export type AdminUser = {
  uid: string;
  email: string;
};

function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isDecodedAdmin(decoded: DecodedIdToken) {
  const email = String(decoded.email || '').toLowerCase();
  const allowedEmails = configuredAdminEmails();

  if (allowedEmails.length > 0) {
    return allowedEmails.includes(email);
  }

  if (decoded.admin === true || decoded.role === 'admin') {
    return true;
  }

  return process.env.NODE_ENV !== 'production' && process.env.ADMIN_ALLOW_ANY_FIREBASE_USER === 'true';
}

async function bearerTokenFromHeaders() {
  try {
    const value = (await headers()).get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(value);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

async function sessionCookieFromRequest() {
  try {
    return (await cookies()).get(ADMIN_SESSION_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export async function requireAdminAuth(idToken?: string | null): Promise<AdminUser> {
  const token = idToken || await bearerTokenFromHeaders();
  let decoded: DecodedIdToken | null = null;

  if (token) {
    decoded = await admin.auth().verifyIdToken(token, true);
  } else {
    const session = await sessionCookieFromRequest();
    if (session) {
      decoded = await admin.auth().verifySessionCookie(session, true);
    }
  }

  if (!decoded) {
    throw new Error('Unauthorized');
  }

  if (!isDecodedAdmin(decoded)) {
    throw new Error('Forbidden');
  }

  return {
    uid: decoded.uid,
    email: decoded.email || '',
  };
}

export function getPhpBackendAuthHeaders(): Record<string, string> {
  const token = process.env.PHP_BACKEND_AUTH_TOKEN || process.env.PHP_AUTH_TOKEN || '';
  if (!token) {
    throw new Error('PHP backend auth token is not configured.');
  }

  return { Authorization: `Bearer ${token}` };
}
