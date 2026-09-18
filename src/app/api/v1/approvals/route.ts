import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [pendingLeaves, pendingOvertimes] = await Promise.all([
      db.leaveRequest.findMany({
        where: { companyId: session.companyId, status: "PENDING" },
        include: {
          employee: { include: { department: true, position: true } },
          leaveType: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.overtimeRequest.findMany({
        where: { companyId: session.companyId, status: "PENDING" },
        include: {
          employee: { include: { department: true, position: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      leaves: pendingLeaves,
      overtimes: pendingOvertimes,
      totalPending: pendingLeaves.length + pendingOvertimes.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat approval inbox." }, { status: 500 });
  }
}