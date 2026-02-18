import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category');
    const where = category ? { category } : {};

    const paintings = await prisma.painting.findMany({
      where,
      include: {
        hints: true,
      },
      orderBy: {
        source: 'asc',
      },
    });
    return NextResponse.json(paintings);
  } catch (error) {
    console.error('Failed to fetch paintings:', error);
    return NextResponse.json({ error: 'Failed to fetch paintings' }, { status: 500 });
  }
}