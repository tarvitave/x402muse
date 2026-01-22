import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const paintings = await prisma.painting.findMany({
      include: {
        hints: true,
      },
      orderBy: {
        source: 'asc',
      },
    });
    return NextResponse.json(paintings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch paintings' }, { status: 500 });
  }
}