import { NextResponse } from 'next/server';
import { getCategories, setCategories } from '../../../lib/store';

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json({ categories });
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }
  const categories = await getCategories();
  if (!categories.some((c) => c.toLowerCase() === name.toLowerCase())) {
    categories.push(name);
    await setCategories(categories);
  }
  return NextResponse.json({ categories });
}
