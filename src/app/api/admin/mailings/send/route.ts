import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import { marked } from 'marked';

// GET /api/admin/mailings/send?campaignId=xxx — get send status + bounce counts
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
  const bounceCounts = await prisma.emailSend.groupBy({
    by: ['bounceType'],
    where: { campaignId, status: 'failed' },
    _count: true,
  });

  const stats: Record<string, number> = { pending: 0, sent: 0, failed: 0, softBounce: 0, hardBounce: 0 };
  for (const c of counts) stats[c.status] = c._count;
  for (const b of bounceCounts) {
    if (b.bounceType === 'soft') stats.softBounce = b._count;
    if (b.bounceType === 'hard') stats.hardBounce = b._count;
  }

  return NextResponse.json({ campaign, stats });
}

// POST /api/admin/mailings/send
// Body: { campaignId, action: 'start' | 'pause' | 'resume', includeSoftBounces?: boolean }
export async function POST(req: NextRequest) {
  const { campaignId, action, includeSoftBounces = false } = await req.json();
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
      await prisma.emailSend.deleteMany({ where: { campaignId } });

      // Filter out bounced and unsubscribed contacts
      const contacts = campaign.mailingList.contacts.filter(c => {
        if (c.unsubscribed) return false;                    // always skip unsubscribed
        if (c.bounceType === 'hard') return false;           // always skip hard bounces
        if (c.bounceType === 'soft' && !includeSoftBounces) return false; // skip soft unless opted in
        return true;
      });

      const skippedHard = campaign.mailingList.contacts.filter(c => c.bounceType === 'hard').length;
      const skippedSoft = campaign.mailingList.contacts.filter(c => c.bounceType === 'soft').length;
      const skippedUnsub = campaign.mailingList.contacts.filter(c => c.unsubscribed).length;

      await prisma.emailSend.createMany({
        data: contacts.map(c => ({
          id: randomUUID(),
          campaignId,
          email: c.email,
          name: c.name ?? undefined,
          status: 'pending',
        })),
      });

      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: 'sending', totalSent: 0 } });
      void sendCampaign(campaignId).catch(err => console.error('Campaign send error:', err));

      return NextResponse.json({
        ok: true, status: 'sending',
        queued: contacts.length,
        skippedHard,
        skippedSoft: includeSoftBounces ? 0 : skippedSoft,
        skippedUnsub,
      });
    }

    // resume
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: 'sending' } });
    void sendCampaign(campaignId).catch(err => console.error('Campaign send error:', err));
    return NextResponse.json({ ok: true, status: 'sending' });
  }

  return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}

// ── Bounce classification ─────────────────────────────────────────────────────

function classifyBounce(err: unknown): 'hard' | 'soft' {
  const msg = String(err).toLowerCase();
  const code = (err as { responseCode?: number })?.responseCode ?? 0;

  // Hard bounce: user/address doesn't exist, or permanently rejected
  if (
    code >= 550 && code <= 554 ||
    msg.includes('user unknown') ||
    msg.includes('no such user') ||
    msg.includes('does not exist') ||
    msg.includes('invalid address') ||
    msg.includes('address rejected') ||
    msg.includes('undeliverable') ||
    msg.includes('550') || msg.includes('551') || msg.includes('552') ||
    msg.includes('553') || msg.includes('554')
  ) return 'hard';

  // Soft bounce: temporary failures, mailbox full, server unavailable
  return 'soft';
}

// ── Send loop ─────────────────────────────────────────────────────────────────

async function sendCampaign(campaignId: string) {
  const transporter = createTransporter();

  while (true) {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== 'sending') break;

    const batchSize = Math.max(1, Math.min(campaign.sendRatePerMinute, 10));
    const pending = await prisma.emailSend.findMany({
      where: { campaignId, status: 'pending' },
      take: batchSize,
    });

    if (pending.length === 0) {
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: 'completed' } });
      break;
    }

    const baseHtml = await marked.parse(campaign.bodyMarkdown);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

    for (const send of pending) {
      const current = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
      if (!current || current.status !== 'sending') return;

      // Look up unsubscribe token for this recipient
      const contact = await prisma.mailingListContact.findFirst({
        where: { email: send.email, mailingList: { campaigns: { some: { id: campaignId } } } },
        select: { id: true, bounceType: true, unsubscribeToken: true },
      });

      const unsubUrl = contact?.unsubscribeToken
        ? `${siteUrl}/api/unsubscribe?token=${contact.unsubscribeToken}`
        : null;

      const unsubHtml = unsubUrl
        ? `<p style="margin-top:32px;font-size:12px;color:#888;text-align:center;">` +
          `<a href="${unsubUrl}" style="color:#888;">Unsubscribe</a> from this mailing list.</p>`
        : '';
      const unsubText = unsubUrl ? `\n\n---\nUnsubscribe: ${unsubUrl}` : '';

      const htmlBody = baseHtml + unsubHtml;
      const textBody = campaign.bodyMarkdown + unsubText;

      try {
        await transporter.sendMail({
          from: campaign.fromName
            ? `"${campaign.fromName}" <${campaign.fromEmail}>`
            : campaign.fromEmail,
          to: send.name ? `"${send.name}" <${send.email}>` : send.email,
          subject: campaign.subject,
          html: htmlBody,
          text: textBody,
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
        const bounceType = classifyBounce(err);

        // Record the failed send with bounce type
        await prisma.emailSend.update({
          where: { id: send.id },
          data: { status: 'failed', bounceType, error: String(err) },
        });

        // Mark the contact with the bounce type (upgrade hard bounce, set soft if not already bounced)
        if (contact) {
          const existingBounce = contact.bounceType;
          // Hard bounce always wins; only set soft if not already marked
          if (bounceType === 'hard' || !existingBounce) {
            await prisma.mailingListContact.update({
              where: { id: contact.id },
              data: { bounceType, bouncedAt: new Date() },
            });
          }
        }
      }
    }

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
  return nodemailer.createTransport({ sendmail: true });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
