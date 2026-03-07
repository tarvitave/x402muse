import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json();
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    const referrer = req.headers.get('referer') || null;
    const userAgent = req.headers.get('user-agent') || null;

    // Use raw SQL as fallback in case Prisma model isn't synced with DB
    try {
      await prisma.pageView.create({
        data: { path, referrer, userAgent },
      });
    } catch (prismaErr) {
      // Table might exist but Prisma model might not match — try raw SQL
      try {
        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        await prisma.$executeRawUnsafe(
          `INSERT INTO "PageView" ("id", "path", "referrer", "userAgent", "createdAt") VALUES (?, ?, ?, ?, ?)`,
          id, path, referrer, userAgent, new Date().toISOString()
        );
      } catch (sqlErr) {
        // Analytics is non-critical — log both errors but don't return 500
        console.error('Track prisma error:', prismaErr);
        console.error('Track sql error:', sqlErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Track error:', err);
    return NextResponse.json({ ok: true }); // non-critical — don't 500 the browser
  }
}

// GET endpoint for quick health check
export async function GET() {
  try {
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "PageView"`) as { count: number }[];
    return NextResponse.json({ ok: true, count: Number(count[0].count) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
