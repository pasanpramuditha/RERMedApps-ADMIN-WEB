import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin_session';
const PUBLIC_FILE = /\.[^/]+$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/session') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const acceptsHtml = request.headers.get('accept')?.includes('text/html');
  const hasSession = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (acceptsHtml && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/';
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
