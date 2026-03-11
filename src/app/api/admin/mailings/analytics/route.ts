import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

// GET /api/admin/mailings/analytics?days=30
export async function GET(req: Request) {
  const days = Math.max(1, Math.min(365, parseInt(new URL(req.url).searchParams.get('days') ?? '30')));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  type DailyRow = {
    day: string;
    sent: bigint | number;
    failed: bigint | number;
    softBounce: bigint | number;
    hardBounce: bigint | number;
    delivered: bigint | number;
    opened: bigint | number;
    clicked: bigint | number;
    complained: bigint | number;
  };
  const daily = await safeQuery<DailyRow[]>(
    () => prisma.$queryRawUnsafe(`
      SELECT
        DATE("sentAt") as day,
        SUM(CASE WHEN "status" = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN "status" = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN "bounceType" = 'soft' THEN 1 ELSE 0 END) as softBounce,
        SUM(CASE WHEN "bounceType" = 'hard' THEN 1 ELSE 0 END) as hardBounce,
        SUM(CASE WHEN "delivered" = 1 THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN "opened" = 1 THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN "clicked" = 1 THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN "complained" = 1 THEN 1 ELSE 0 END) as complained
      FROM "EmailSend"
      WHERE "sentAt" >= ?
      GROUP BY DATE("sentAt")
      ORDER BY day ASC
    `, since),
    []
  );

  type CampaignRow = {
    id: string; name: string | null; subject: string; listName: string; status: string;
    sent: bigint | number; failed: bigint | number; softBounce: bigint | number;
    hardBounce: bigint | number; total: bigint | number;
    delivered: bigint | number; opened: bigint | number;
    clicked: bigint | number; complained: bigint | number;
  };
  const campaigns = await safeQuery<CampaignRow[]>(
    () => prisma.$queryRawUnsafe(`
      SELECT
        c."id",
        c."name",
        c."subject",
        ml."name" as listName,
        c."status",
        SUM(CASE WHEN s."status" = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN s."status" = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN s."bounceType" = 'soft' THEN 1 ELSE 0 END) as softBounce,
        SUM(CASE WHEN s."bounceType" = 'hard' THEN 1 ELSE 0 END) as hardBounce,
        COUNT(s."id") as total,
        SUM(CASE WHEN s."delivered" = 1 THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN s."opened" = 1 THEN 1 ELSE 0 END) as opened,
        SUM(CASE WHEN s."clicked" = 1 THEN 1 ELSE 0 END) as clicked,
        SUM(CASE WHEN s."complained" = 1 THEN 1 ELSE 0 END) as complained
      FROM "EmailCampaign" c
      LEFT JOIN "EmailSend" s ON s."campaignId" = c."id"
      LEFT JOIN "MailingList" ml ON ml."id" = c."mailingListId"
      GROUP BY c."id", c."name", c."subject", ml."name", c."status"
      ORDER BY c."createdAt" DESC
    `),
    []
  );

  const n = (v: bigint | number) => Number(v);

  return NextResponse.json({
    daily: daily.map(r => ({
      day: r.day,
      sent: n(r.sent),
      failed: n(r.failed),
      softBounce: n(r.softBounce),
      hardBounce: n(r.hardBounce),
      delivered: n(r.delivered),
      opened: n(r.opened),
      clicked: n(r.clicked),
      complained: n(r.complained),
    })),
    campaigns: campaigns.map(r => ({
      id: r.id,
      name: r.name,
      subject: r.subject,
      listName: r.listName,
      status: r.status,
      sent: n(r.sent),
      failed: n(r.failed),
      softBounce: n(r.softBounce),
      hardBounce: n(r.hardBounce),
      total: n(r.total),
      delivered: n(r.delivered),
      opened: n(r.opened),
      clicked: n(r.clicked),
      complained: n(r.complained),
    })),
  });
}
