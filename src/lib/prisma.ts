import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

// Cache singleton in both dev and production to prevent multiple connections
globalForPrisma.prisma = prisma;

// Graceful shutdown: flush SQLite WAL and disconnect on SIGTERM/SIGINT
if (typeof process !== 'undefined' && !(globalThis as Record<string, unknown>).__prismaShutdownRegistered) {
  (globalThis as Record<string, unknown>).__prismaShutdownRegistered = true;
  const shutdown = async () => {
    try {
      await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch { /* ignore */ }
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
