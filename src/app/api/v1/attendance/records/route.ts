import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const monthParam = searchParams.get("month");
    const statusParam = searchParams.get("status");
    const departmentIdParam = searchParams.get("departmentId");
    const employeeIdParam = searchParams.get("employeeId");

    let dateFilter: any = {};
    if (dateParam) {
      const d = new Date(dateParam);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    } else if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        const start = new Date(Date.UTC(y, m - 1, 1));
        const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        dateFilter = { gte: start, lte: end };
      }
    }

    const whereClause: any = {
      companyId: session.companyId,
      ...(dateParam || monthParam ? { date: dateFilter } : {}),
      ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
      ...(employeeIdParam ? { employeeId: employeeIdParam } : {}),
    };

    if (departmentIdParam && departmentIdParam !== "ALL") {
      whereClause.employee = {
        departmentId: departmentIdParam,
      };
    }

    const [records, policy, locations, departments, employees] =
      await Promise.all([
        db.attendance.findMany({
          where: whereClause,
          include: {
            employee: {
              include: { department: true, position: true, location: true },
            },
          },
          orderBy: { date: "desc" },
        }),
        db.attendancePolicy.findFirst({
          where: { companyId: session.companyId },
        }),
        db.location.findMany({
          where: { companyId: session.companyId },
        }),
        db.department.findMany({
          where: { companyId: session.companyId },
          orderBy: { name: "asc" },
        }),
        db.employee.findMany({
          where: { companyId: session.companyId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeIdNumber: true,
            departmentId: true,
          },
          orderBy: { firstName: "asc" },
        }),
      ]);

    // Compute summary metrics
    let presentCount = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;
    let totalMinutes = 0;

    records.forEach((r) => {
      if (r.status === "PRESENT") presentCount++;
      else if (r.status === "LATE") lateCount++;
      else if (r.status === "EARLY_LEAVE") earlyLeaveCount++;

      if (r.workDurationMinutes) {
        totalMinutes += r.workDurationMinutes;
      }
    });

    const total = records.length;
    const onTimeRate = total > 0 ? Math.round((presentCount / total) * 100) : 100;
    const totalHours = Number((totalMinutes / 60).toFixed(1));

    return NextResponse.json({
      success: true,
      records,
      policy,
      locations,
      departments,
      employees,
      summary: {
        total,
        present: presentCount,
        late: lateCount,
        earlyLeave: earlyLeaveCount,
        onTimeRate,
        totalHours,
      },
    });
  } catch (err: any) {
    console.error("Attendance Records Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat rekap absensi: " + err.message },
      { status: 500 }
    );
  }
}