import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface DayRow { day: string; views: bigint | number }
interface PathRow { path: string; views: bigint | number }
interface RefRow { referrer: string; views: bigint | number }

// Safe count helper - returns 0 if table doesn't exist yet
async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function GET(req: NextRequest) {
  const adminSession = req.cookies.get('admin_session');
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Date boundaries
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const thirtyDaysAgo = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);

    // Page view counts (PageView table may not exist yet)
    const [todayCount, weekCount, monthCount, totalCount] = await Promise.all([
      safeCount(() => prisma.pageView.count({ where: { createdAt: { gte: todayStart } } })),
      safeCount(() => prisma.pageView.count({ where: { createdAt: { gte: weekStart } } })),
      safeCount(() => prisma.pageView.count({ where: { createdAt: { gte: monthStart } } })),
      safeCount(() => prisma.pageView.count()),
    ]);

    // Daily breakdown (last 30 days)
    const dailyViews = await safeQuery<DayRow[]>(
      () => prisma.$queryRawUnsafe(`
        SELECT DATE("createdAt") as day, COUNT(*) as views
        FROM "PageView"
        WHERE "createdAt" >= ?
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `, thirtyDaysAgo.toISOString()),
      []
    );

    // Top pages (last 30 days)
    const topPages = await safeQuery<PathRow[]>(
      () => prisma.$queryRawUnsafe(`
        SELECT "path", COUNT(*) as views
        FROM "PageView"
        WHERE "createdAt" >= ?
        GROUP BY "path"
        ORDER BY views DESC
        LIMIT 20
      `, thirtyDaysAgo.toISOString()),
      []
    );

    // Top referrers (last 30 days, non-null only)
    const topReferrers = await safeQuery<RefRow[]>(
      () => prisma.$queryRawUnsafe(`
        SELECT "referrer", COUNT(*) as views
        FROM "PageView"
        WHERE "createdAt" >= ? AND "referrer" IS NOT NULL AND "referrer" != ''
        GROUP BY "referrer"
        ORDER BY views DESC
        LIMIT 10
      `, thirtyDaysAgo.toISOString()),
      []
    );

    // User stats
    const [userCount, scoreCount, gameStats] = await Promise.all([
      safeCount(() => prisma.user.count()),
      safeCount(() => prisma.score.count()),
      safeQuery(
        () => prisma.$queryRawUnsafe(`
          SELECT "mode", COUNT(*) as games, SUM("points") as totalPoints
          FROM "Score"
          GROUP BY "mode"
        `) as Promise<{ mode: string; games: bigint | number; totalPoints: bigint | number }[]>,
        []
      ),
    ]);

    // Convert bigint to number for JSON serialization
    const toNum = (v: bigint | number) => Number(v);

    return NextResponse.json({
      summary: {
        today: todayCount,
        week: weekCount,
        month: monthCount,
        total: totalCount,
        users: userCount,
        scores: scoreCount,
      },
      dailyViews: dailyViews.map(r => ({ day: r.day, views: toNum(r.views) })),
      topPages: topPages.map(r => ({ path: r.path, views: toNum(r.views) })),
      topReferrers: topReferrers.map(r => ({ referrer: r.referrer, views: toNum(r.views) })),
      gameStats: gameStats.map(r => ({ mode: r.mode, games: toNum(r.games), totalPoints: toNum(r.totalPoints) })),
    });
  } catch (err) {
    console.error('Analytics API error:', err);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
}
