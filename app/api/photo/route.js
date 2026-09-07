import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Turns a stored private Blob URL into a short-lived signed GET URL.
// The browser can then render the image directly without exposing Blob credentials.
export async function GET(request) {
  try {
    const rawUrl = request.nextUrl.searchParams.get('url');
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing photo URL' }, { status: 400 });
    }

    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    if (!hostname.endsWith('.private.blob.vercel-storage.com')) {
      return NextResponse.json({ error: 'Invalid private Blob URL' }, { status: 400 });
    }

    const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    if (!pathname) {
      return NextResponse.json({ error: 'Missing photo path' }, { status: 400 });
    }

    const validUntil = Date.now() + 60 * 60 * 1000;
    const token = await issueSignedToken({
      pathname,
      operations: ['get'],
      validUntil
    });

    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: 'get',
      access: 'private',
      validUntil
    });

    return NextResponse.redirect(presignedUrl, 302);
  } catch (error) {
    console.error('[Fort Trails] Blob photo read error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create a photo access URL' },
      { status: 500 }
    );
  }
}
