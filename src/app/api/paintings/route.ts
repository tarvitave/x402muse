import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await prisma.painting.findMany({
      where: {
        active: true
      },
      include: {
        hints: true
      }
    });
    
    // Add runtime fields that aren't in DB but needed by frontend
    const enriched = data.map(p => ({
        ...p,
        blurLevel: 'blur(10px)'
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error reading paintings from DB:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
