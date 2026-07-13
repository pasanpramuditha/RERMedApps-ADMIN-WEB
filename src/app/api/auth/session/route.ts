import { NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin';
import { ADMIN_SESSION_COOKIE, requireAdminAuth } from '@/lib/server-auth';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export async function POST(request: Request) {
  const { idToken } = await request.json().catch(() => ({ idToken: '' }));
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing ID token.' }, { status: 400 });
  }

  try {
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
    const message = error instanceof Error ? error.message : '';
    if (message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'This Firebase user is not listed in ADMIN_EMAILS.' }, { status: 403 });
    }
    if (message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Firebase ID token could not be verified by the server.' }, { status: 401 });
    }
    console.error('Admin session creation failed:', error);
    return NextResponse.json({ success: false, error: 'Server Firebase Admin configuration is missing or invalid.' }, { status: 500 });
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
