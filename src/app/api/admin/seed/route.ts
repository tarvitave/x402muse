import { NextResponse } from 'next/server';
import { seedPaintings } from '@/lib/seeder';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for seeding

export async function POST() {
  try {
    console.log('Starting seed process...');
    const result = await seedPaintings();
    console.log('Seed complete:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Seeding failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Seeding failed: ${message}` }, { status: 500 });
  }
}