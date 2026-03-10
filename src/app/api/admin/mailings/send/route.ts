import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import { marked } from 'marked';

// GET /api/admin/mailings/send?campaignId=xxx — get send status
export async function GET(req: NextRequest) {
  const campaignId = new URL(req.url).searchParams.get('campaignId');
  if (!campaignId) return NextResponse.json({ error: 'campaignId required' }, { status: 400 });

  const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const counts = await prisma.emailSend.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: true,
  });

  const stats: Record<string, number> = { pending: 0, sent: 0, failed: 0 };
  for (const c of counts) stats[c.status] = c._count;

  return NextResponse.json({ campaign, stats });
}

// POST /api/admin/mailings/send — start or resume sending
// Body: { campaignId, action: 'start' | 'pause' | 'resume' }
export async function POST(req: NextRequest) {
  const { campaignId, action } = await req.json();
  if (!campaignId || !action) {
    return NextResponse.json({ error: 'campaignId and action required' }, { status: 400 });
  }

  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
    include: { mailingList: { include: { contacts: true } } },
  });
  if (!campaign) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (action === 'pause') {
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: 'paused' } });
    return NextResponse.json({ ok: true, status: 'paused' });
  }

  if (action === 'start' || action === 'resume') {
    if (action === 'start') {
      // Delete any old send records and create fresh ones
      await prisma.emailSend.deleteMany({ where: { campaignId } });
      const contacts = campaign.mailingList.contacts;
      await prisma.emailSend.createMany({
        data: contacts.map(c => ({
          id: randomUUID(),
          campaignId,
          email: c.email,
          name: c.name ?? undefined,
          status: 'pending',
        })),
      });
    }

    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: 'sending' } });

    // Fire off sending in background (non-blocking)
    void sendCampaign(campaignId).catch(err =>
      console.error('Campaign send error:', err)
    );

    return NextResponse.json({ ok: true, status: 'sending' });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}

async function sendCampaign(campaignId: string) {
  const transporter = createTransporter();

  while (true) {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'sending') break;

    // Get next batch based on rate
    const batchSize = Math.max(1, Math.min(campaign.sendRatePerMinute, 10));
    const pending = await prisma.emailSend.findMany({
      where: { campaignId, status: 'pending' },
      take: batchSize,
    });

    if (pending.length === 0) {
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: 'completed' } });
      break;
    }

    const htmlBody = await marked.parse(campaign.bodyMarkdown);

    for (const send of pending) {
      // Re-check campaign status before each send
      const current = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
      if (!current || current.status !== 'sending') return;

      try {
        await transporter.sendMail({
          from: campaign.fromName
            ? `"${campaign.fromName}" <${campaign.fromEmail}>`
            : campaign.fromEmail,
          to: send.name ? `"${send.name}" <${send.email}>` : send.email,
          subject: campaign.subject,
          html: htmlBody,
          text: campaign.bodyMarkdown,
        });
        await prisma.emailSend.update({
          where: { id: send.id },
          data: { status: 'sent', sentAt: new Date() },
        });
        await prisma.emailCampaign.update({
          where: { id: campaignId },
          data: { totalSent: { increment: 1 } },
        });
      } catch (err) {
        await prisma.emailSend.update({
          where: { id: send.id },
          data: { status: 'failed', error: String(err) },
        });
      }
    }

    // Wait to maintain rate limit (batchSize emails per interval)
    const intervalMs = Math.ceil((60 * 1000 * batchSize) / Math.max(1, campaign.sendRatePerMinute));
    await sleep(intervalMs);
  }
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  // Fall back to sendmail
  return nodemailer.createTransport({ sendmail: true });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
