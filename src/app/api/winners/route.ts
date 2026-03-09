import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') ?? '4', 10), 52);
  try {
    const payouts = await prisma.payout.findMany({
      orderBy: { weekStart: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, id: true } },
      },
    });

    const winners = payouts.map((p) => ({
      weekStart: p.weekStart.toISOString(),
      userName: p.user?.name ?? p.userId.slice(0, 8) + '...',
      amountSol: p.amountSol,
      txSignature: p.txSignature,
    }));

    return NextResponse.json({ winners });
  } catch {
    return NextResponse.json({ winners: [] });
  }
}
