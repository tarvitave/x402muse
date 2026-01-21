import { NextResponse } from 'next/server';
import { seedPaintings } from '@/lib/seeder';
import { cookies } from 'next/headers';

export async function POST() {
  // Double check auth just in case middleware fails or is bypassed
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');

  if (!session || session.value !== 'valid') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const count = await seedPaintings();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}
