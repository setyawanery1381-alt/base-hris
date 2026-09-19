import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { getEmbeddedDbSnapshot } from "./db_snapshot";

function ensureDatabase() {
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    (process.env.NODE_ENV === "production" && process.platform === "linux");

  const currentUrl = process.env.DATABASE_URL || "";

  // If using SQLite (file: prefix or empty/not postgres)
  if (currentUrl.startsWith("file:") || !currentUrl) {
    if (isServerless) {
      const tmpDbPath = "/tmp/dev.db";

      let ready = false;
      try {
        if (fs.existsSync(tmpDbPath) && fs.statSync(tmpDbPath).size > 1000) {
          ready = true;
        }
      } catch {
        ready = false;
      }

      if (!ready) {
        // Try copying from disk first
        const candidatePaths = [
          path.join(process.cwd(), "prisma", "dev.db"),
          path.join(process.cwd(), ".next", "server", "prisma", "dev.db"),
          path.resolve(process.cwd(), "dev.db"),
        ];

        for (const p of candidatePaths) {
          try {
            if (fs.existsSync(p) && fs.statSync(p).size > 1000) {
              fs.copyFileSync(p, tmpDbPath);
              ready = true;
              break;
            }
          } catch {}
        }

        // If not found on disk, restore from embedded snapshot
        if (!ready) {
          try {
            const buf = getEmbeddedDbSnapshot();
            fs.writeFileSync(tmpDbPath, buf);
            ready = true;
          } catch (err) {
            console.error("Failed to write snapshot to /tmp/dev.db:", err);
          }
        }
      }

      if (ready) {
        process.env.DATABASE_URL = `file:${tmpDbPath}`;
      }
    }
  }
}

ensureDatabase();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;