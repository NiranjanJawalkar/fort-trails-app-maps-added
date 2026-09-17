import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { getEntries, setEntries } from '../../../../lib/store';

export async function PATCH(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const entries = await getEntries();
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const current = entries[idx];

    // Special-case: increment vote atomically-ish
    if (body.action === 'upvote') {
      current.votes = (current.votes || 0) + 1;
    } else if (body.action === 'addPhotos' && Array.isArray(body.photos)) {
      current.photos = [...(current.photos || []), ...body.photos];
    } else if (body.action === 'removePhoto' && body.photoId) {
      const target = (current.photos || []).find((p) => p.id === body.photoId);
      current.photos = (current.photos || []).filter((p) => p.id !== body.photoId);

      // Also delete the actual file from Blob storage, not just the
      // reference, so removed photos actually free up storage space.
      if (target?.url) {
        try {
          await del(target.url);
        } catch (blobError) {
          // Don't block removing the reference if the underlying file is
          // already gone or the delete otherwise fails — log and continue.
          console.error('[Fort Trails] Blob delete failed (reference removed anyway):', blobError);
        }
      }
    } else {
      // generic field update
      const allowed = ['name', 'region', 'difficulty', 'date', 'companions', 'rating', 'notes', 'status', 'lat', 'lng'];
      allowed.forEach((k) => {
        if (body[k] !== undefined) current[k] = body[k];
      });
    }

    entries[idx] = current;
    await setEntries(entries);
    return NextResponse.json({ entry: current });
  } catch (error) {
    console.error('[Fort Trails] entries/[id] PATCH error:', error);
    return NextResponse.json({ error: error.message || 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = params;
    const entries = await getEntries();
    const target = entries.find((e) => e.id === id);

    // Clean up all of this entry's Blob files too, not just its metadata.
    if (target?.photos?.length) {
      await Promise.all(
        target.photos.map((p) =>
          p?.url
            ? del(p.url).catch((e) => console.error('[Fort Trails] Blob delete failed:', e))
            : Promise.resolve()
        )
      );
    }

    const next = entries.filter((e) => e.id !== id);
    await setEntries(next);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Fort Trails] entries/[id] DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
