import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET /api/admin/mailings/campaigns?listId=xxx
export async function GET(req: NextRequest) {
  const listId = new URL(req.url).searchParams.get('listId');
  const campaigns = await prisma.emailCampaign.findMany({
    where: listId ? { mailingListId: listId } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      mailingList: { select: { name: true } },
      _count: { select: { sends: true } },
    },
  });
  return NextResponse.json({ campaigns });
}

// POST /api/admin/mailings/campaigns — create campaign
export async function POST(req: NextRequest) {
  const { mailingListId, subject, bodyMarkdown, fromName, fromEmail, sendRatePerMinute } = await req.json();
  if (!mailingListId || !subject || !bodyMarkdown || !fromEmail) {
    return NextResponse.json({ error: 'mailingListId, subject, bodyMarkdown, fromEmail required' }, { status: 400 });
  }
  const campaign = await prisma.emailCampaign.create({
    data: {
      id: randomUUID(),
      mailingListId,
      subject,
      bodyMarkdown,
      fromName: fromName ?? '',
      fromEmail,
      sendRatePerMinute: sendRatePerMinute ?? 60,
      status: 'draft',
    },
  });
  return NextResponse.json({ campaign });
}

// PATCH /api/admin/mailings/campaigns?id=xxx — update campaign
export async function PATCH(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const data = await req.json();
  const allowed = ['subject', 'bodyMarkdown', 'fromName', 'fromEmail', 'sendRatePerMinute', 'status'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in data) update[k] = data[k];
  }
  const campaign = await prisma.emailCampaign.update({ where: { id }, data: update });
  return NextResponse.json({ campaign });
}

// DELETE /api/admin/mailings/campaigns?id=xxx
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.emailCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
