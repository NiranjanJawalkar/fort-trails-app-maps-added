import { NextResponse } from 'next/server';
import { getTrips, setTrips } from '../../../../lib/store';

export async function PATCH(req, { params }) {
  const { id } = params;
  const body = await req.json();
  const trips = await getTrips();
  const idx = trips.findIndex((t) => t.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const trip = trips[idx];

  if (body.action === 'addItinerary') {
    trip.itinerary.push({ time: body.time || '—', text: body.text || '' });
  } else if (body.action === 'addChecklist') {
    trip.checklist.push({ text: body.text || '', done: false });
  } else if (body.action === 'toggleChecklist') {
    if (trip.checklist[body.index]) {
      trip.checklist[body.index].done = !trip.checklist[body.index].done;
    }
  } else {
    const allowed = ['name', 'date', 'notes'];
    allowed.forEach((k) => {
      if (body[k] !== undefined) trip[k] = body[k];
    });
  }

  trips[idx] = trip;
  await setTrips(trips);
  return NextResponse.json({ trip });
}

export async function DELETE(_req, { params }) {
  const { id } = params;
  const trips = await getTrips();
  const next = trips.filter((t) => t.id !== id);
  await setTrips(next);
  return NextResponse.json({ ok: true });
}
