import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [totalEmployees, attendanceRecords, leaveRequests, overtimeRequests] = await Promise.all([
      db.employee.count({ where: { companyId: session.companyId, deletedAt: null } }),
      db.attendance.findMany({
        where: { companyId: session.companyId },
        include: {
          employee: {
            include: {
              department: true,
              position: true,
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      db.leaveRequest.findMany({
        where: { companyId: session.companyId },
        include: { employee: true, leaveType: true },
      }),
      db.overtimeRequest.findMany({
        where: { companyId: session.companyId },
        include: { employee: true },
      }),
    ]);

    const presentCount = attendanceRecords.filter((a) => a.status === "PRESENT").length;
    const lateCount = attendanceRecords.filter((a) => a.status === "LATE").length;
    const totalOvertimeHours = overtimeRequests
      .filter((o) => o.status === "APPROVED")
      .reduce((acc, curr) => acc + curr.hours, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalEmployees,
        totalAttendance: attendanceRecords.length,
        presentCount,
        lateCount,
        attendanceRate: totalEmployees > 0 ? Math.round((presentCount / (attendanceRecords.length || 1)) * 100) : 100,
        totalLeavesApproved: leaveRequests.filter((l) => l.status === "APPROVED").length,
        totalOvertimeHours,
      },
      records: attendanceRecords,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal memuat rekap laporan." }, { status: 500 });
  }
}