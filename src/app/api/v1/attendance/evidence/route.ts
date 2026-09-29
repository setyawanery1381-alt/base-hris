import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get("attendanceId");

    let whereClause: any = {
      companyId: session.companyId,
    };

    if (attendanceId) {
      whereClause.attendanceId = attendanceId;
    } else {
      // Find latest attendance for this employee
      const latest = await db.attendance.findFirst({
        where: {
          companyId: session.companyId,
          employeeId: session.employeeId,
        },
        orderBy: { date: "desc" },
      });
      if (!latest) {
        return NextResponse.json({ evidence: [] });
      }
      whereClause.attendanceId = latest.id;
    }

    const evidences = await db.attendanceEvidence.findMany({
      where: whereClause,
      orderBy: { capturedAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: evidences,
    });
  } catch (error: any) {
    console.error("Attendance Evidence Fetch Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data bukti foto: " + error.message },
      { status: 500 }
    );
  }
}
