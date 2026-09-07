import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

// Uploads one or more files sent as multipart/form-data under the "files" field.
// Returns an array of { id, url, name } ready to attach to an entry's photos array.
export async function POST(req) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Photo storage is not configured yet. Add the Vercel Blob integration to this project.' },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const files = formData.getAll('files');
  const folder = (formData.get('folder') || 'general').toString().replace(/[^a-z0-9-_]/gi, '-');

  if (!files.length) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  const uploaded = [];
  for (const file of files) {
    if (typeof file === 'string') continue;
    const ext = (file.name && file.name.includes('.')) ? file.name.split('.').pop() : 'jpg';
    const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await put(key, file, { access: 'public' });
    uploaded.push({
      id: 'photo_' + Math.random().toString(36).slice(2, 10),
      url: blob.url,
      name: file.name || 'photo',
      createdAt: new Date().toISOString()
    });
  }

  return NextResponse.json({ photos: uploaded });
}
