import { NextResponse } from 'next/server';

// OpenStreetMap Nominatim is free for light, non-commercial use, as long as
// requests are identified with a real User-Agent and kept to roughly 1/sec.
// See: https://operations.osmfoundation.org/policies/nominatim/
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'FortTrails/1.0 (personal trip-log app)',
        Accept: 'application/json'
      }
    });
    const data = await res.json();
    if (!data || !data.length) {
      return NextResponse.json({ error: 'No location found for that name' }, { status: 404 });
    }
    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      label: data[0].display_name
    });
  } catch (e) {
    return NextResponse.json({ error: 'Lookup failed — try again' }, { status: 500 });
  }
}
