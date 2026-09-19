import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.employeeId || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. First check for active open shift (checked in, not checked out)
    let attendance = await db.attendance.findFirst({
      where: {
        companyId: session.companyId,
        employeeId: session.employeeId,
        checkInTime: { not: null },
        checkOutTime: null,
      },
      orderBy: { checkInTime: "desc" },
    });

    // 2. If no open shift, check for completed attendance today or in the last 20 hours
    if (!attendance) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      attendance = await db.attendance.findFirst({
        where: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          OR: [
            { date: { gte: todayStart, lte: todayEnd } },
            { checkInTime: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Get company policy
    const policy = await db.attendancePolicy.findFirst({
      where: { companyId: session.companyId },
    });

    // Get assigned office location
    const employee = await db.employee.findUnique({
      where: { id: session.employeeId },
      include: { location: true },
    });

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      attendance,
      policy,
      officeLocation: employee?.location,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}