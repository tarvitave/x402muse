// Creates SQLite tables if they don't exist - no Prisma CLI needed
const { PrismaClient } = require('@prisma/client');

async function init() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Painting" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "source" TEXT,
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
        "costSol" REAL NOT NULL DEFAULT 0.01,
        "isLocked" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "Hint_paintingId_fkey" FOREIGN KEY ("paintingId") REFERENCES "Painting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
