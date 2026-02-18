// Creates SQLite tables if they don't exist - no Prisma CLI needed
const { PrismaClient } = require('@prisma/client');

async function init() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
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
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Hint" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "paintingId" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "costSol" REAL NOT NULL DEFAULT 0.00001,
        "isLocked" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "Hint_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "Painting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    // Migrate: add category column if missing (for existing DBs)
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Painting" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'painting'`);
      console.log('Added category column to Painting table');
    } catch (e) {
      // Column already exists — ignore
    }
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
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
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Payout" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "amountSol" REAL NOT NULL,
        "txSignature" TEXT,
        "weekStart" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HintPayment" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "hintId" TEXT NOT NULL,
        "amountSol" REAL NOT NULL,
        "txSignature" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database tables initialized successfully');
  } catch (e) {
    console.error('DB init error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

init();
