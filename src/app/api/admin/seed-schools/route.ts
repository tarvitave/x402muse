import { NextResponse } from 'next/server';
import { seedSchools } from '@/lib/seeder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  try {
    console.log('Starting school seed process...');
    const result = await seedSchools();
    console.log('School seed complete:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('School seeding failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Seeding failed: ${message}` }, { status: 500 });
  }
}
