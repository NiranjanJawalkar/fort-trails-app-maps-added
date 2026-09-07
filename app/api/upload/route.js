import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// This route no longer receives the photo bytes themselves. Instead, the
// browser asks it for a short-lived upload token, then uploads the file
// straight to Vercel Blob. This matters because Vercel Functions have a
// hard 4.5MB request body limit that can't be raised — and phone photos
// routinely exceed that. Client uploads bypass the function entirely.
export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Photo storage is not configured yet. Add the Vercel Blob integration to this project.' },
      { status: 500 }
    );
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/*', 'image/heic', 'image/heif'],
        addRandomSuffix: true,
        maximumSizeInBytes: 30 * 1024 * 1024 // 30MB per photo
      }),
      onUploadCompleted: async () => {
        // No server-side bookkeeping needed here — the browser attaches the
        // returned blob URL to the entry itself via /api/entries afterwards.
        // Note: this callback isn't reachable when running on localhost,
        // only once deployed — that's expected and harmless.
      }
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Upload authorization failed' }, { status: 400 });
  }
}
