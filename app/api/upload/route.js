import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Vercel Blob client-upload endpoint.
// The browser uploads the actual file directly to Blob, which avoids the
// 4.5MB Vercel Function request-body limit. Most importantly, the client
// upload SDK returns the real public Blob URL (not the temporary
// https://vercel.com/api/blob/... signing endpoint).
export async function POST(request) {
  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/*', 'image/heic', 'image/heif'],
          addRandomSuffix: false,
          // Keep the pathname supplied by the app so the resulting public
          // URL remains stable and easy to identify in Blob storage.
          tokenPayload: JSON.stringify({ pathname })
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('[Fort Trails] Blob upload completed:', blob.url);
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('[Fort Trails] Blob client-upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Could not prepare Vercel Blob upload' },
      { status: 400 }
    );
  }
}
