import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/mailings/contacts?listId=xxx&bounceType=hard|soft|all
export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const listId = params.get('listId');
  const bounceType = params.get('bounceType'); // 'hard' | 'soft' | 'all' | null

  if (!listId) return NextResponse.json({ error: 'listId required' }, { status: 400 });

  const where: Record<string, unknown> = { mailingListId: listId };
  if (bounceType === 'hard') where.bounceType = 'hard';
  else if (bounceType === 'soft') where.bounceType = 'soft';
  else if (bounceType === 'bounced') where.bounceType = { not: null };

  const contacts = await prisma.mailingListContact.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const bounceSummary = await prisma.mailingListContact.groupBy({
    by: ['bounceType'],
    where: { mailingListId: listId },
    _count: true,
  });

  const unsubCount = await prisma.mailingListContact.count({
    where: { mailingListId: listId, unsubscribed: true },
  });

  const summary: Record<string, number> = { total: 0, clean: 0, soft: 0, hard: 0, unsubscribed: unsubCount };
  for (const b of bounceSummary) {
    const key = b.bounceType ?? 'clean';
    summary[key] = b._count;
    summary.total += b._count;
  }
  summary.clean = summary.total - (summary.soft ?? 0) - (summary.hard ?? 0);

  return NextResponse.json({ contacts, summary });
}

// PATCH /api/admin/mailings/contacts?id=xxx — manually set bounce type
export async function PATCH(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { bounceType } = await req.json(); // 'soft' | 'hard' | null
  const contact = await prisma.mailingListContact.update({
    where: { id },
    data: {
      bounceType: bounceType ?? null,
      bouncedAt: bounceType ? new Date() : null,
    },
  });
  return NextResponse.json({ contact });
}
