import { issueSignedToken, presignUrl } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Generates a short-lived presigned PUT URL so the browser can upload
// directly to Vercel Blob (bypassing the 4.5MB Vercel Function body limit).
//
// This uses issueSignedToken/presignUrl rather than the older
// handleUpload()/upload() client-token flow, because this project's Blob
// store authenticates via OIDC + BLOB_STORE_ID (the current default when
// connecting a store from the Vercel dashboard) rather than a static
// BLOB_READ_WRITE_TOKEN — and issueSignedToken supports OIDC automatically,
// while the older flow only knows how to use a static token.
//
// The store is public, so only the upload (PUT) needs to be signed — the
// resulting blob URL is directly viewable afterwards, no read-side proxy
// needed.
export async function POST(request) {
  try {
    const body = await request.json();
    const pathname = body?.pathname;
    if (!pathname || typeof pathname !== 'string') {
      return NextResponse.json({ error: 'Missing file path' }, { status: 400 });
    }

    const allowedContentTypes = ['image/*', 'image/heic', 'image/heif'];
    const maximumSizeInBytes = 30 * 1024 * 1024; // 30MB per photo
    const validUntil = Date.now() + 15 * 60 * 1000; // 15 minutes

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

    // Public blobs are served from a clean, permanent URL that's separate
    // from the presigned (query-string-signed) upload URL.
    const blobUrl = presignedUrl.split('?')[0];

    return NextResponse.json({ presignedUrl, blobUrl });
  } catch (error) {
    console.error('[Fort Trails] Blob upload URL error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not create a Vercel Blob upload URL' },
      { status: 500 }
    );
  }
}
