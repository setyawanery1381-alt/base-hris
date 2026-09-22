import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { calculateExecutiveMetrics } from "@/lib/compliance-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [employees, attendanceRecords, payslips, leaveRequests] = await Promise.all([
      db.employee.findMany({
        where: { companyId: session.companyId },
        include: { department: true, position: true },
      }),
      db.attendance.findMany({
        where: { companyId: session.companyId },
      }),
      db.payslip.findMany({
        where: { companyId: session.companyId },
      }),
      db.leaveRequest.findMany({
        where: { companyId: session.companyId },
      }),
    ]);

    const metrics = calculateExecutiveMetrics({
      employees,
      attendanceRecords,
      payslips,
      leaveRequests,
    });

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    console.error("GET /api/v1/compliance/analytics error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch analytics metrics" }, { status: 500 });
  }
}
