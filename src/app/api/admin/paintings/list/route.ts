import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Fetching paintings from database...');
    const paintings = await prisma.painting.findMany({
      include: {
        hints: true,
      },
      orderBy: {
        source: 'asc',
      },
    });
    console.log('Found paintings:', paintings.length);
    return NextResponse.json(paintings);
  } catch (error) {
    console.error('Failed to fetch paintings:', error);
    return NextResponse.json({ error: 'Failed to fetch paintings' }, { status: 500 });
  }
}