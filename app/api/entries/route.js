import { NextResponse } from 'next/server';
import { getEntries, setEntries, newId } from '../../../lib/store';

export async function GET() {
  try {
    const entries = await getEntries();
    return NextResponse.json({ entries });
  } catch (e) {
    return NextResponse.json({ error: 'Could not read from the database: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const entries = await getEntries();

    const entry = {
      id: newId('entry'),
      status: body.status === 'wishlist' ? 'wishlist' : 'visited',
      name: body.name.trim(),
      region: (body.region || '').trim(),
      difficulty: body.difficulty || 'Easy',
      date: body.date || '',
      companions: (body.companions || '').trim(),
      rating: body.status === 'wishlist' ? 0 : (parseInt(body.rating, 10) || 0),
      notes: (body.notes || '').trim(),
      addedBy: (body.addedBy || 'Someone').trim(),
      lat: (typeof body.lat === 'number' && !isNaN(body.lat)) ? body.lat : null,
      lng: (typeof body.lng === 'number' && !isNaN(body.lng)) ? body.lng : null,
      votes: body.status === 'wishlist' ? 0 : undefined,
      photos: Array.isArray(body.photos) ? body.photos : [], // [{id, url, caption, uploadedBy, createdAt}]
      createdAt: new Date().toISOString()
    };

    entries.push(entry);
    await setEntries(entries);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Could not save: ' + e.message }, { status: 500 });
  }
}
