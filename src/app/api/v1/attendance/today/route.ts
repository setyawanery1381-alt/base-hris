import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.employeeId || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

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
      const dayStartLocal = new Date();
      dayStartLocal.setHours(0, 0, 0, 0);
      const dayEndLocal = new Date();
      dayEndLocal.setHours(23, 59, 59, 999);

      attendance = await db.attendance.findFirst({
        where: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          OR: [
            { date: todayStart },
            { date: { gte: dayStartLocal, lte: dayEndLocal } },
            { checkInTime: { gte: new Date(Date.now() - 20 * 60 * 60 * 1000) } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // 3. Get company policy, employee location & schedule for today
    const [policy, employee, schedule] = await Promise.all([
      db.attendancePolicy.findFirst({
        where: { companyId: session.companyId },
      }),
      db.employee.findUnique({
        where: { id: session.employeeId },
        include: { location: true },
      }),
      db.employeeSchedule.findUnique({
        where: {
          employeeId_date: {
            employeeId: session.employeeId,
            date: todayStart,
          },
        },
        include: { shift: true },
      }),
    ]);

    // 4. Determine effective shift & off-day status
    let effectiveShift = null;
    let isOffDay = false;

    if (schedule) {
      isOffDay = schedule.isOffDay;
      if (schedule.shift) {
        effectiveShift = {
          id: schedule.shift.id,
          name: schedule.shift.name,
          code: schedule.shift.code,
          startTime: schedule.shift.startTime,
          endTime: schedule.shift.endTime,
          breakDurationMinutes: schedule.shift.breakDurationMinutes,
          color: schedule.shift.color,
        };
      }
    } else {
      // Fallback to company policy
      let workingDays: string[] = ["MON", "TUE", "WED", "THU", "FRI"];
      if (policy?.workingDays) {
        try {
          workingDays =
            typeof policy.workingDays === "string"
              ? JSON.parse(policy.workingDays)
              : policy.workingDays;
        } catch {}
      }

      const currentDayCode = DAY_MAP[now.getDay()];
      isOffDay = !workingDays.includes(currentDayCode);

      effectiveShift = {
        id: "default",
        name: policy?.name || "Kebijakan Kantor Standar",
        code: "DEF",
        startTime: policy?.workStartTime || "08:00",
        endTime: policy?.workEndTime || "17:00",
        breakDurationMinutes: policy?.breakDurationMinutes ?? 60,
        color: "#0d9488",
      };
    }

    // 5. Calculate check-in window
    let checkInWindow = null;
    if (effectiveShift) {
      const [sh, sm] = effectiveShift.startTime.split(":").map(Number);
      const scheduledStart = new Date(now);
      scheduledStart.setHours(sh, sm, 0, 0);

      const windowStartMins = policy?.checkInWindowStartMinutes ?? 60;
      const windowEndMins = policy?.checkInWindowEndMinutes ?? 240;

      const windowStart = new Date(
        scheduledStart.getTime() - windowStartMins * 60 * 1000
      );
      const windowEnd = new Date(
        scheduledStart.getTime() + windowEndMins * 60 * 1000
      );

      checkInWindow = {
        earliest: windowStart.toISOString(),
        latest: windowEnd.toISOString(),
        earliestDisplay: windowStart.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        latestDisplay: windowEnd.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      attendance,
      policy,
      officeLocation: employee?.location,
      schedule,
      shift: effectiveShift,
      isOffDay,
      checkInWindow,
    });
  } catch (err: any) {
    console.error("Today Attendance Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}