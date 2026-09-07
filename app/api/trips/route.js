import { NextResponse } from 'next/server';
import { getTrips, setTrips, newId } from '../../../lib/store';

export async function GET() {
  try {
    const trips = await getTrips();
    return NextResponse.json({ trips });
  } catch (e) {
    return NextResponse.json({ error: 'Could not read from the database: ' + e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Trip name is required' }, { status: 400 });
    }
    const trips = await getTrips();
    const trip = {
      id: newId('trip'),
      name: body.name.trim(),
      date: body.date || '',
      notes: (body.notes || '').trim(),
      itinerary: [],
      checklist: [],
      createdAt: new Date().toISOString()
    };
    trips.push(trip);
    await setTrips(trips);
    return NextResponse.json({ trip }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Could not save: ' + e.message }, { status: 500 });
  }
}
