import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
  return monday;
}

export async function GET(req: NextRequest) {
  const weekStart = getWeekStart();
  const mode = req.nextUrl.searchParams.get('mode');
  const period = req.nextUrl.searchParams.get('period'); // 'alltime' or default (weekly)

  const whereClause: Record<string, unknown> = {};
  if (period !== 'alltime') {
    whereClause.createdAt = { gte: weekStart };
  }
  if (mode) whereClause.mode = mode;

  const rows = await prisma.score.groupBy({
    by: ['userId'],
    where: whereClause,
    _sum: { points: true },
    _count: { id: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 10,
  });

  const userIds = rows.map((r) => r.userId);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: userMap[r.userId]?.name ?? 'Unknown',
    totalPoints: r._sum.points ?? 0,
    gamesPlayed: r._count.id,
  }));

  // For weekly view, include the prize pool (total SOL collected this week)
  let prizePoolSol: number | undefined;
  let paymentCount: number | undefined;
  if (period !== 'alltime') {
    const payments = await prisma.hintPayment.aggregate({
      where: { createdAt: { gte: weekStart } },
      _sum: { amountSol: true },
      _count: { id: true },
    });
    prizePoolSol = payments._sum.amountSol ?? 0;
    paymentCount = payments._count.id;
    console.log(`Prize pool query: ${prizePoolSol} SOL from ${paymentCount} payments since ${weekStart.toISOString()}`);
  }

  return NextResponse.json({ weekStart: weekStart.toISOString(), leaderboard, prizePoolSol, paymentCount });
}
