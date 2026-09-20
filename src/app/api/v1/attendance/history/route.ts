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
    const monthParam = searchParams.get("month"); // "YYYY-MM"

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-indexed

    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        year = y;
        month = m - 1;
      }
    }

    const startOfMonth = new Date(Date.UTC(year, month, 1));
    const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

    const [records, schedules, policy] = await Promise.all([
      db.attendance.findMany({
        where: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        orderBy: { date: "desc" },
      }),
      db.employeeSchedule.findMany({
        where: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        include: { shift: true },
        orderBy: { date: "asc" },
      }),
      db.attendancePolicy.findFirst({
        where: { companyId: session.companyId },
      }),
    ]);

    let presentCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let totalWorkMinutes = 0;

    records.forEach((r) => {
      if (r.status === "PRESENT") presentCount++;
      else if (r.status === "LATE") lateCount++;
      else if (r.status === "EARLY_LEAVE") earlyLeaveCount++;

      if (r.workDurationMinutes) {
        totalWorkMinutes += r.workDurationMinutes;
      }
    });

    const totalDays = records.length;
    const totalWorkHours = Number((totalWorkMinutes / 60).toFixed(1));

    return NextResponse.json({
      success: true,
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      summary: {
        totalDays,
        presentCount,
        lateCount,
        earlyLeaveCount,
        totalWorkMinutes,
        totalWorkHours,
      },
      records,
      schedules,
      policy,
    });
  } catch (err: any) {
    console.error("Attendance History Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat riwayat absensi: " + err.message },
      { status: 500 }
    );
  }
}
