import { NextResponse } from 'next/server';
import { COOKIE_NAME, computeToken } from './lib/auth';

export async function middleware(req) {
  const appPassword = process.env.APP_PASSWORD;

  // No password configured -> gate is off, site is open (matches pre-gate behavior).
  if (!appPassword) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Always allow the login page and its API, plus Next's own asset routes.
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/logout') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const expected = await computeToken(appPassword);

  if (cookie === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
