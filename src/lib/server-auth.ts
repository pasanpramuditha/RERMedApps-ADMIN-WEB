import admin, { type DecodedIdToken } from '@/lib/firebase-admin';
import { cookies, headers } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'admin_session';

export type AdminUser = {
  uid: string;
  email: string;
};

const DEFAULT_ADMIN_EMAILS = ['pasanpramuditha97@gmail.com'];

export class AdminAuthError extends Error {
  code: 'Unauthorized' | 'Forbidden';
  email?: string;
  configuredEmailCount?: number;

  constructor(code: 'Unauthorized' | 'Forbidden', message = code, details: { email?: string; configuredEmailCount?: number } = {}) {
    super(message);
    this.name = 'AdminAuthError';
    this.code = code;
    this.email = details.email;
    this.configuredEmailCount = details.configuredEmailCount;
  }
}

export function configuredAdminEmails() {
  const configured = [
    process.env.ADMIN_EMAILS || '',
    process.env.ADMIN_EMAIL || '',
  ].join(',')
    .split(/[,;\n]+/)
    .map((email) => email.trim().replace(/^['"]+|['"]+$/g, '').toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...configured, ...DEFAULT_ADMIN_EMAILS]));
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
    throw new AdminAuthError('Unauthorized');
  }

  if (!isDecodedAdmin(decoded)) {
    throw new AdminAuthError('Forbidden', 'Forbidden', {
      email: String(decoded.email || '').toLowerCase(),
      configuredEmailCount: configuredAdminEmails().length,
    });
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
