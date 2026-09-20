import fs from "fs";
import path from "path";

async function main() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const snapshotPath = path.join(process.cwd(), "src", "lib", "db_snapshot.ts");

  if (!fs.existsSync(dbPath)) {
    console.error("dev.db not found!");
    process.exit(1);
  }

  const dbBuffer = fs.readFileSync(dbPath);
  const b64 = dbBuffer.toString("base64");

  const content = `// Embedded DB snapshot to guarantee Vercel / serverless functionality
export function getEmbeddedDbSnapshot(): Buffer {
  const b64 = "${b64}";
  return Buffer.from(b64, "base64");
}
`;

  fs.writeFileSync(snapshotPath, content, "utf8");
  console.log(`✅ Updated db_snapshot.ts successfully (${dbBuffer.length} bytes -> ${b64.length} chars).`);
}

main().catch(console.error);
