import { NextResponse } from 'next/server';
import { COOKIE_NAME, computeToken } from '../../../lib/auth';

export async function POST(req) {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) {
    return NextResponse.json({ error: 'No password is configured on the server.' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { password } = body;

  if (password !== appPassword) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const token = await computeToken(appPassword);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
  return res;
}
