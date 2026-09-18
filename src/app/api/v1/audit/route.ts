import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whereClause: any = {};
    if (session.companyId && !session.roles.includes("SUPER_ADMIN")) {
      whereClause.companyId = session.companyId;
    }

    const logs = await db.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat audit log." }, { status: 500 });
  }
}