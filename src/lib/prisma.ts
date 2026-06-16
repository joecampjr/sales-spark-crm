import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const connectionString = process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({
    adapter,
    log: ['error'],
  });
} else {
  if (!globalForPrisma.pgPool) {
    const connectionString = process.env.DATABASE_URL!;
    globalForPrisma.pgPool = new Pool({ 
      connectionString,
      max: 3, // Limit each dev pool to 3 connections
      idleTimeoutMillis: 5000, // Close idle connections after 5 seconds
      connectionTimeoutMillis: 2000, // Connection timeout of 2 seconds
    });
  }
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaPg(globalForPrisma.pgPool);
    globalForPrisma.prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });
  }
  prisma = globalForPrisma.prisma;
}

export { prisma };
