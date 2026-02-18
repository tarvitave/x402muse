import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await prisma.painting.findMany({
      where: {
        active: true,
        category: 'painting',
      },
      include: {
        hints: true
      }
    });

    const enriched = data.map((p: typeof data[number]) => ({
        ...p,
        blurLevel: 'blur(20px)',
        answer: p.artist,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error reading paintings from DB:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
