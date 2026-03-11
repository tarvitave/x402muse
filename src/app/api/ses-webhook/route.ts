import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/ses-webhook
// Receives SNS notifications from AWS SES event publishing.
// SNS first sends a SubscriptionConfirmation — we auto-confirm it.
// Then it sends Notification messages containing SES events.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const messageType = (req.headers.get('x-amz-sns-message-type') ?? body['Type']) as string;

  // ── Subscription confirmation ─────────────────────────────────────────────
  if (messageType === 'SubscriptionConfirmation') {
    const subscribeUrl = body['SubscribeURL'] as string;
    if (subscribeUrl) {
      try {
        await fetch(subscribeUrl);
        console.log('SES webhook: SNS subscription confirmed');
      } catch (err) {
        console.error('SES webhook: failed to confirm SNS subscription', err);
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Notification ──────────────────────────────────────────────────────────
  if (messageType === 'Notification') {
    let sesEvent: Record<string, unknown>;
    try {
      const raw = body['Message'] as string;
      sesEvent = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return NextResponse.json({ error: 'invalid SES event' }, { status: 400 });
    }

    const notifType = sesEvent['notificationType'] as string | undefined
      ?? sesEvent['eventType'] as string | undefined; // SES v2 uses eventType

    const mail = sesEvent['mail'] as Record<string, unknown> | undefined;
    const sesMessageId = mail?.['messageId'] as string | undefined;

    if (!sesMessageId || !notifType) {
      return NextResponse.json({ ok: true }); // ignore unknown formats
    }

    console.log(`SES webhook: ${notifType} for messageId ${sesMessageId}`);

    try {
      switch (notifType) {
        case 'Delivery': {
          const delivery = sesEvent['delivery'] as Record<string, unknown> | undefined;
          const ts = delivery?.['timestamp'] as string | undefined;
          await prisma.emailSend.updateMany({
            where: { sesMessageId },
            data: { delivered: true, deliveredAt: ts ? new Date(ts) : new Date() },
          });
          break;
        }

        case 'Bounce': {
          const bounce = sesEvent['bounce'] as Record<string, unknown> | undefined;
          const bounceType = bounce?.['bounceType'] as string | undefined;
          // Permanent = hard, Transient/Undetermined = soft
          const mapped = bounceType === 'Permanent' ? 'hard' : 'soft';
          const recipients = (bounce?.['bouncedRecipients'] as Array<{ emailAddress: string }>) ?? [];
          const emails = recipients.map(r => r.emailAddress.toLowerCase());

          for (const email of emails) {
            await prisma.emailSend.updateMany({
              where: { sesMessageId, email: { equals: email, mode: 'insensitive' } },
              data: { status: 'failed', bounceType: mapped, error: `SES ${bounceType} bounce` },
            });
            // Mark the contact record
            const contact = await prisma.mailingListContact.findFirst({
              where: { email: { equals: email, mode: 'insensitive' } },
              select: { id: true, bounceType: true },
            });
            if (contact && (mapped === 'hard' || !contact.bounceType)) {
              await prisma.mailingListContact.update({
                where: { id: contact.id },
                data: { bounceType: mapped, bouncedAt: new Date() },
              });
            }
          }
          break;
        }

        case 'Complaint': {
          const complaint = sesEvent['complaint'] as Record<string, unknown> | undefined;
          const recipients = (complaint?.['complainedRecipients'] as Array<{ emailAddress: string }>) ?? [];
          const emails = recipients.map(r => r.emailAddress.toLowerCase());

          for (const email of emails) {
            await prisma.emailSend.updateMany({
              where: { sesMessageId, email: { equals: email, mode: 'insensitive' } },
              data: { complained: true, complainedAt: new Date() },
            });
            // Auto-unsubscribe complainers
            const contact = await prisma.mailingListContact.findFirst({
              where: { email: { equals: email, mode: 'insensitive' } },
              select: { id: true },
            });
            if (contact) {
              await prisma.mailingListContact.update({
                where: { id: contact.id },
                data: { unsubscribed: true, unsubscribedAt: new Date() },
              });
            }
          }
          break;
        }

        case 'Open': {
          const open = sesEvent['open'] as Record<string, unknown> | undefined;
          const ts = open?.['timestamp'] as string | undefined;
          await prisma.emailSend.updateMany({
            where: { sesMessageId, opened: false },
            data: { opened: true, openedAt: ts ? new Date(ts) : new Date() },
          });
          break;
        }

        case 'Click': {
          const click = sesEvent['click'] as Record<string, unknown> | undefined;
          const ts = click?.['timestamp'] as string | undefined;
          await prisma.emailSend.updateMany({
            where: { sesMessageId, clicked: false },
            data: { clicked: true, clickedAt: ts ? new Date(ts) : new Date() },
          });
          break;
        }

        default:
          // Send, Reject, RenderingFailure — ignore
          break;
      }
    } catch (err) {
      console.error('SES webhook: DB update error', err);
      // Return 200 so SNS doesn't retry; log the error
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
