import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

// Use absolute path for database to ensure it works in all contexts
// In production (Docker), use /app/data/dev.db for volume persistence
const dbPath = process.env.DATABASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? `file:${path.join(process.cwd(), 'data', 'dev.db')}`
    : `file:${path.join(process.cwd(), 'dev.db')}`);
console.log('Database path:', dbPath);

const adapter = new PrismaLibSql({ url: dbPath });

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
