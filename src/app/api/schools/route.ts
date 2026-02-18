import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await prisma.painting.findMany({
      where: {
        active: true,
        category: 'school',
      },
      include: {
        hints: true
      }
    });

    const enriched = data.map((p: typeof data[number]) => ({
        ...p,
        blurLevel: 'blur(20px)',
        answer: p.title,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error reading schools from DB:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
