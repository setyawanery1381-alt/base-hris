import { NextResponse } from "next/server";
import { clearAuthCookie, getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "AUTH",
      action: "LOGOUT",
      recordId: session.userId,
    });
  }

  await clearAuthCookie();
  return NextResponse.json({ success: true, message: "Berhasil logout." });
}