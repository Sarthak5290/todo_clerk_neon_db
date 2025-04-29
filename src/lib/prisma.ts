// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
let prisma: PrismaClient;

// Define the global type correctly with PrismaClient
type GlobalWithPrisma = typeof globalThis & {
  prisma: PrismaClient | undefined;
};

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // In development, we want to reuse the same instance
  const globalForPrisma = global as GlobalWithPrisma;

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  prisma = globalForPrisma.prisma;
}

export default prisma;
