// src/app/api/admin/paintings/list/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session || session.value !== 'valid') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await prisma.painting.findMany({
      include: {
        hints: true
      }
    });

    const enriched = data.map(p => ({
        ...p,
        blurLevel: 'blur(10px)'
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error reading paintings for admin:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
