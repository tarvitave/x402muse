// Creates SQLite tables if they don't exist - no Prisma CLI needed
const { PrismaClient } = require('@prisma/client');

async function runSafe(prisma, label, fn) {
  try {
    await fn();
  } catch (e) {
    console.error(`DB init error [${label}]:`, e.message);
  }
}

async function init() {
  const prisma = new PrismaClient();
  try {
    // Enable WAL mode for better crash recovery and checkpoint any pending WAL data
    await prisma.$executeRawUnsafe(`PRAGMA journal_mode=WAL`);
    await prisma.$executeRawUnsafe(`PRAGMA wal_checkpoint(TRUNCATE)`);
  } catch (e) {
    console.error('DB init error [WAL setup]:', e.message);
  }

  await runSafe(prisma, 'Painting', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Painting" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "source" TEXT,
      "category" TEXT NOT NULL DEFAULT 'painting',
      "title" TEXT NOT NULL,
      "artist" TEXT NOT NULL,
      "imageUrl" TEXT NOT NULL,
      "thumbnailPath" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  await runSafe(prisma, 'Hint', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Hint" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "paintingId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "costSol" REAL NOT NULL DEFAULT 0.00001,
      "isLocked" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "Hint_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "Painting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `));

  // Migrate: add category column if missing (for existing DBs)
  await runSafe(prisma, 'Painting.category migration', () =>
    prisma.$executeRawUnsafe(`ALTER TABLE "Painting" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'painting'`)
  );

  await runSafe(prisma, 'User', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  await runSafe(prisma, 'Score', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Score" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "paintingId" TEXT NOT NULL,
      "mode" TEXT NOT NULL,
      "points" INT NOT NULL,
      "hintsUsed" INT NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Score_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `));

  await runSafe(prisma, 'Payout', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Payout" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "amountSol" REAL NOT NULL,
      "txSignature" TEXT,
      "weekStart" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `));

  await runSafe(prisma, 'HintPayment', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HintPayment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "hintId" TEXT NOT NULL,
      "amountSol" REAL NOT NULL,
      "txSignature" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  await runSafe(prisma, 'PageView', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PageView" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "path" TEXT NOT NULL,
      "referrer" TEXT,
      "userAgent" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));
  await runSafe(prisma, 'PageView.idx_createdAt', () =>
    prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView" ("createdAt")`)
  );
  await runSafe(prisma, 'PageView.idx_path', () =>
    prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PageView_path_idx" ON "PageView" ("path")`)
  );
  console.log('PageView table ready');

  await runSafe(prisma, 'MailingList', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MailingList" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `));

  await runSafe(prisma, 'MailingListContact', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "MailingListContact" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "mailingListId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "bounceType" TEXT,
      "bouncedAt" DATETIME,
      "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
      "unsubscribedAt" DATETIME,
      "unsubscribeToken" TEXT UNIQUE,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MailingListContact_mailingListId_fkey" FOREIGN KEY ("mailingListId") REFERENCES "MailingList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `));
  await runSafe(prisma, 'MailingListContact.idx', () =>
    prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MailingListContact_mailingListId_idx" ON "MailingListContact" ("mailingListId")`)
  );

  await runSafe(prisma, 'EmailCampaign', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmailCampaign" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "mailingListId" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "bodyMarkdown" TEXT NOT NULL,
      "fromName" TEXT NOT NULL,
      "fromEmail" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "sendRatePerMinute" INTEGER NOT NULL DEFAULT 60,
      "totalSent" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailCampaign_mailingListId_fkey" FOREIGN KEY ("mailingListId") REFERENCES "MailingList" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `));

  await runSafe(prisma, 'EmailSend', () => prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmailSend" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "campaignId" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "name" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "bounceType" TEXT,
      "error" TEXT,
      "sentAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailSend_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `));
  await runSafe(prisma, 'EmailSend.idx', () =>
    prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmailSend_campaignId_idx" ON "EmailSend" ("campaignId")`)
  );

  // Migrations: add columns that may be missing on existing DBs
  await runSafe(prisma, 'MailingListContact.bounceType migration', () =>
    prisma.$executeRawUnsafe(`ALTER TABLE "MailingListContact" ADD COLUMN "bounceType" TEXT`)
  );
  await runSafe(prisma, 'MailingListContact.bouncedAt migration', () =>
    prisma.$executeRawUnsafe(`ALTER TABLE "MailingListContact" ADD COLUMN "bouncedAt" DATETIME`)
  );
  await runSafe(prisma, 'MailingListContact.unsubscribed migration', () =>
    prisma.$executeRawUnsafe(`ALTER TABLE "MailingListContact" ADD COLUMN "unsubscribed" BOOLEAN NOT NULL DEFAULT false`)
  );
  await runSafe(prisma, 'MailingListContact.unsubscribedAt migration', () =>
    prisma.$executeRawUnsafe(`ALTER TABLE "MailingListContact" ADD COLUMN "unsubscribedAt" DATETIME`)
  );
  await runSafe(prisma, 'MailingListContact.unsubscribeToken migration', () =>
    prisma.$executeRawUnsafe(`ALTER TABLE "MailingListContact" ADD COLUMN "unsubscribeToken" TEXT UNIQUE`)
  );
  // Populate unsubscribeToken for any existing contacts that don't have one
  await runSafe(prisma, 'MailingListContact.unsubscribeToken populate', async () => {
    const contacts = await prisma.$queryRawUnsafe(
      `SELECT "id" FROM "MailingListContact" WHERE "unsubscribeToken" IS NULL`
    );
    for (const c of contacts) {
      const { randomUUID } = require('crypto');
      await prisma.$executeRawUnsafe(
        `UPDATE "MailingListContact" SET "unsubscribeToken" = ? WHERE "id" = ?`,
        randomUUID(), c.id
      );
    }
  });
  await runSafe(prisma, 'EmailSend.bounceType migration', () =>
    prisma.$executeRawUnsafe(`ALTER TABLE "EmailSend" ADD COLUMN "bounceType" TEXT`)
  );
  console.log('Mailing tables ready');

  // Migrate: update existing hints with old 0.01 cost to 0.00001
  await runSafe(prisma, 'Hint cost migration', () =>
    prisma.$executeRawUnsafe(`UPDATE "Hint" SET "costSol" = 0.00001 WHERE "costSol" > 0.00001`)
  );

  // Log existing data counts for diagnostics
  try {
    const users = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "User"`);
    const scores = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Score"`);
    const paintings = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Painting"`);
    const payments = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count, COALESCE(SUM("amountSol"), 0) as total FROM "HintPayment"`);
    console.log(`Database stats: ${users[0].count} users, ${scores[0].count} scores, ${paintings[0].count} paintings, ${payments[0].count} hint payments (${payments[0].total} SOL total)`);
  } catch (e) {
    console.error('DB stats error:', e.message);
  }

  // Final WAL checkpoint to ensure all data is flushed to main DB file
  await runSafe(prisma, 'final WAL checkpoint', () =>
    prisma.$executeRawUnsafe(`PRAGMA wal_checkpoint(TRUNCATE)`)
  );
  console.log('Database tables initialized successfully');

  await prisma.$disconnect();
}

init();
