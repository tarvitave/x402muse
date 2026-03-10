import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET /api/admin/mailings/campaigns?listId=xxx
export async function GET(req: NextRequest) {
  try {
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
  } catch (err) {
    console.error('GET campaigns error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/admin/mailings/campaigns — create campaign
export async function POST(req: NextRequest) {
  try {
    const { mailingListId, subject, bodyMarkdown, fromName, fromEmail, sendRatePerMinute, name } = await req.json();
    if (!mailingListId || !subject || !bodyMarkdown || !fromEmail) {
      return NextResponse.json({ error: 'mailingListId, subject, bodyMarkdown, fromEmail required' }, { status: 400 });
    }
    const campaign = await prisma.emailCampaign.create({
      data: {
        id: randomUUID(),
        name: name ?? null,
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
  } catch (err) {
    console.error('POST campaign error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/admin/mailings/campaigns?id=xxx — update campaign
export async function PATCH(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const data = await req.json();
    const existing = await prisma.emailCampaign.findUnique({ where: { id }, select: { status: true } });
    if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const allowed = ['name', 'subject', 'bodyMarkdown', 'fromName', 'fromEmail', 'sendRatePerMinute', 'mailingListId', 'status'];
    const contentFields = new Set(['name', 'subject', 'bodyMarkdown', 'fromName', 'fromEmail', 'sendRatePerMinute', 'mailingListId']);
    const update: Record<string, unknown> = {};
    for (const k of allowed) {
      if (!(k in data)) continue;
      // Block content edits if campaign is already sending/completed
      if (contentFields.has(k) && !['draft', 'paused'].includes(existing.status)) continue;
      update[k] = data[k];
    }
    const campaign = await prisma.emailCampaign.update({ where: { id }, data: update });
    return NextResponse.json({ campaign });
  } catch (err) {
    console.error('PATCH campaign error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/admin/mailings/campaigns?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await prisma.emailCampaign.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE campaign error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
