import { NextResponse } from 'next/server';
import { seedPaintings } from '@/lib/seeder';

export async function POST() {
  try {
    const result = await seedPaintings();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Seeding failed' }, { status: 500 });
  }
}