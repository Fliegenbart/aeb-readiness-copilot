import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const databaseUrl = resolveDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.VERCEL) {
    const runtimeDatabasePath = path.join(
      os.tmpdir(),
      "aeb-readiness-copilot.db",
    );
    const bundledDatabasePath = path.join(process.cwd(), "prisma", "dev.db");

    if (!existsSync(runtimeDatabasePath) && existsSync(bundledDatabasePath)) {
      mkdirSync(path.dirname(runtimeDatabasePath), { recursive: true });
      copyFileSync(bundledDatabasePath, runtimeDatabasePath);
    }

    return `file:${runtimeDatabasePath}`;
  }

  return "file:./dev.db";
}
