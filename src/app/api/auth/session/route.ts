import { NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  const { idToken } = await request.json().catch(() => ({ idToken: '' }));
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing ID token.' }, { status: 400 });
  }

  try {
    const [{ default: admin }, { AdminAuthError, requireAdminAuth }] = await Promise.all([
      import('@/lib/firebase-admin'),
      import('@/lib/server-auth'),
    ]);
    await requireAdminAuth(idToken);
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AdminAuthError' && 'code' in error && error.code === 'Forbidden') {
      const authError = error as Error & { email?: string; configuredEmailCount?: number };
      const configuredText = authError.configuredEmailCount && authError.configuredEmailCount > 0
        ? `${authError.configuredEmailCount} admin email(s) configured`
        : 'no ADMIN_EMAILS configured';
      return NextResponse.json({ success: false, error: `This Firebase user (${authError.email || 'email missing'}) is not listed in ADMIN_EMAILS (${configuredText}).` }, { status: 403 });
    }
    if (error instanceof Error && error.name === 'AdminAuthError' && 'code' in error && error.code === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Firebase ID token could not be verified by the server.' }, { status: 401 });
    }
    console.error('Admin session creation failed:', error);
    const detail = error instanceof Error && error.message
      ? ` Details: ${error.message.slice(0, 220)}`
      : '';
    return NextResponse.json({ success: false, error: `Server Firebase Admin configuration is missing or invalid. Set FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.${detail}` }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
