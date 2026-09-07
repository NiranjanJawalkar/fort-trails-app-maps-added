import { NextResponse } from 'next/server';
import { getEntries, setEntries } from '../../../../lib/store';

export async function PATCH(req, { params }) {
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
    current.photos = (current.photos || []).filter((p) => p.id !== body.photoId);
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
}

export async function DELETE(_req, { params }) {
  const { id } = params;
  const entries = await getEntries();
  const next = entries.filter((e) => e.id !== id);
  await setEntries(next);
  return NextResponse.json({ ok: true });
}
