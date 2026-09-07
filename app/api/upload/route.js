import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Generates a short-lived, single-file upload URL. This avoids the older
// client-token flow, which requires BLOB_READ_WRITE_TOKEN. The current Vercel
// Blob SDK can authenticate server-side with either OIDC (recommended on
// Vercel) or the legacy BLOB_READ_WRITE_TOKEN.
export async function POST(request) {
  try {
    const body = await request.json();

    if (body?.type !== 'blob.generate-presigned-url') {
      return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 });
    }

    const pathname = body?.payload?.pathname;
    if (!pathname || typeof pathname !== 'string') {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
    }

    const allowedContentTypes = ['image/*', 'image/heic', 'image/heif'];
    const maximumSizeInBytes = 30 * 1024 * 1024;
    const validUntil = Date.now() + 15 * 60 * 1000;

    const token = await issueSignedToken({
      pathname,
      operations: ['put'],
      validUntil,
      allowedContentTypes,
      maximumSizeInBytes
    });

    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: 'put',
      access: 'public',
      validUntil,
      allowedContentTypes,
      maximumSizeInBytes
    });

    const cleanUrl = presignedUrl.split('?')[0];

    return NextResponse.json({
      type: 'blob.generate-presigned-url',
      presignedUrl,
      blobUrl: cleanUrl
    });
  } catch (error) {
    console.error('[Fort Trails] Blob upload URL error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create a Vercel Blob upload URL' },
      { status: 500 }
    );
  }
}
