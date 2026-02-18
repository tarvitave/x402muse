import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { userId, paintingId, mode, hintsUsed } = await req.json();

  if (!userId || !paintingId || !mode) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const safeHintsUsed = Math.max(0, parseInt(hintsUsed) || 0);
  const points = Math.max(1, 10 - safeHintsUsed);

  const score = await prisma.score.create({
    data: {
      userId,
      paintingId,
      mode,
      points,
      hintsUsed: safeHintsUsed,
    },
  });

  return NextResponse.json({ score });
}
