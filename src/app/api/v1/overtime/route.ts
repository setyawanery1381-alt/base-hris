import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeOnly = searchParams.get("mine") === "true";
    const status = searchParams.get("status");
    const month = searchParams.get("month"); // YYYY-MM
    const date = searchParams.get("date"); // YYYY-MM-DD
    const departmentId = searchParams.get("departmentId");
    const employeeId = searchParams.get("employeeId");

    const isHrOrManager =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("MANAGER");

    const whereClause: any = { companyId: session.companyId };

    if (!isHrOrManager || employeeOnly) {
      whereClause.employeeId = session.employeeId;
    } else if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      whereClause.date = { gte: startOfDay, lte: endOfDay };
    } else if (month) {
      const [yearStr, monthStr] = month.split("-");
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      whereClause.date = { gte: startOfMonth, lte: endOfMonth };
    }

    if (departmentId && departmentId !== "ALL") {
      whereClause.employee = { departmentId };
    }

    const [requests, policy] = await Promise.all([
      db.overtimeRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            include: {
              department: true,
              position: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      db.overtimePolicy.findUnique({
        where: { companyId: session.companyId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      requests,
      policy,
    });
  } catch (err: any) {
    console.error("GET /api/v1/overtime error:", err);
    return NextResponse.json({ error: "Gagal memuat daftar lembur: " + err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      date,
      startTime,
      endTime,
      reason,
      projectName,
      attachmentUrl,
      compensationType,
    } = body;

    const isHrOrManager =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("MANAGER");

    const targetEmployeeId = isHrOrManager && body.employeeId ? body.employeeId : session.employeeId;

    if (!targetEmployeeId) {
      return NextResponse.json({ error: "Profil karyawan tidak ditemukan." }, { status: 400 });
    }

    if (!date || !startTime || !endTime || !reason) {
      return NextResponse.json({ error: "Tanggal, jam mulai, jam selesai, dan alasan lembur wajib diisi." }, { status: 400 });
    }

    // 1. Parse times & validate reversed window
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return NextResponse.json({ error: "Format jam tidak valid. Gunakan format HH:mm." }, { status: 400 });
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "Jam selesai lembur harus lebih besar dari jam mulai lembur." },
        { status: 400 }
      );
    }

    const totalMinutes = endMinutes - startMinutes;

    // 2. Fetch Overtime Policy & Attendance Policy
    let policy = await db.overtimePolicy.findUnique({
      where: { companyId: session.companyId },
    });

    if (!policy) {
      policy = await db.overtimePolicy.create({
        data: {
          companyId: session.companyId,
          minOvertimeMinutes: 60,
          maxDailyHours: 4.0,
          maxWeeklyHours: 18.0,
          requiresPreApproval: true,
          compensationType: "PAYABLE",
          roundingMinutes: 30,
          requiresAttachment: false,
          workdayMultiplier: 1.5,
          holidayMultiplier: 2.0,
        },
      });
    }

    // 3. Min Overtime Minutes check
    if (totalMinutes < policy.minOvertimeMinutes) {
      return NextResponse.json(
        {
          error: `Durasi lembur (${totalMinutes} menit) kurang dari batas minimal kebijakan perusahaan (${policy.minOvertimeMinutes} menit).`,
        },
        { status: 400 }
      );
    }

    // 4. Calculate Duration Hours with Rounding
    let durationHours = Math.round((totalMinutes / 60) * 100) / 100;
    if (policy.roundingMinutes && policy.roundingMinutes > 1) {
      const roundedMinutes = Math.floor(totalMinutes / policy.roundingMinutes) * policy.roundingMinutes;
      durationHours = Math.round((roundedMinutes / 60) * 100) / 100;
      if (durationHours === 0) {
        durationHours = Math.round((totalMinutes / 60) * 100) / 100;
      }
    }

    // 5. Max Daily Hours check
    const normalizedDate = new Date(date);
    const dateOnlyStr = normalizedDate.toISOString().split("T")[0];
    const dayStart = new Date(`${dateOnlyStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateOnlyStr}T23:59:59.999Z`);

    const existingDailyRequests = await db.overtimeRequest.findMany({
      where: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        status: { in: ["PENDING", "APPROVED"] },
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    const existingDailyHours = existingDailyRequests.reduce((sum, r) => sum + (r.durationHours || r.hours || 0), 0);
    const newTotalDaily = Math.round((existingDailyHours + durationHours) * 100) / 100;

    if (newTotalDaily > policy.maxDailyHours) {
      return NextResponse.json(
        {
          error: `Total lembur pada tanggal ini (${newTotalDaily} jam) melebihi batas maksimal harian (${policy.maxDailyHours} jam).`,
        },
        { status: 400 }
      );
    }

    // 6. Max Weekly Hours check
    // Calculate week start (Monday) and week end (Sunday)
    const currentDay = normalizedDate.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const weekStart = new Date(normalizedDate);
    weekStart.setUTCDate(normalizedDate.getUTCDate() + diffToMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const existingWeeklyRequests = await db.overtimeRequest.findMany({
      where: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        status: { in: ["PENDING", "APPROVED"] },
        date: { gte: weekStart, lte: weekEnd },
      },
    });

    const existingWeeklyHours = existingWeeklyRequests.reduce((sum, r) => sum + (r.durationHours || r.hours || 0), 0);
    const newTotalWeekly = Math.round((existingWeeklyHours + durationHours) * 100) / 100;

    if (newTotalWeekly > policy.maxWeeklyHours) {
      return NextResponse.json(
        {
          error: `Total lembur minggu ini (${newTotalWeekly} jam) melebihi batas maksimal mingguan (${policy.maxWeeklyHours} jam).`,
        },
        { status: 400 }
      );
    }

    // 7. Check Required Attachment
    if (policy.requiresAttachment && !attachmentUrl) {
      return NextResponse.json(
        {
          error: "Lampiran Surat Perintah Kerja (SPK) lembur wajib disertakan sesuai kebijakan perusahaan.",
        },
        { status: 400 }
      );
    }

    // 8. Check Overlapping Overtime Requests
    for (const req of existingDailyRequests) {
      const [exStartH, exStartM] = req.startTime.split(":").map(Number);
      const [exEndH, exEndM] = req.endTime.split(":").map(Number);
      const exStart = exStartH * 60 + exStartM;
      const exEnd = exEndH * 60 + exEndM;

      // Overlap condition: startMinutes < exEnd && endMinutes > exStart
      if (startMinutes < exEnd && endMinutes > exStart) {
        return NextResponse.json(
          {
            error: `Jadwal lembur bertabrakan dengan pengajuan lembur yang sudah ada pada pukul ${req.startTime} - ${req.endTime}.`,
          },
          { status: 400 }
        );
      }
    }

    // 9. Determine Overtime Type (WORKDAY vs HOLIDAY / OFF_DAY)
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const dayOfWeek = dayNames[normalizedDate.getUTCDay()];

    const attendancePolicy = await db.attendancePolicy.findFirst({
      where: { companyId: session.companyId, isDefault: true },
    });

    let workingDays: string[] = ["MON", "TUE", "WED", "THU", "FRI"];
    if (attendancePolicy?.workingDays) {
      try {
        workingDays = JSON.parse(attendancePolicy.workingDays);
      } catch (e) {}
    }

    // Check personal schedule offDay
    const personalSchedule = await db.employeeSchedule.findUnique({
      where: {
        employeeId_date: {
          employeeId: targetEmployeeId,
          date: dayStart,
        },
      },
    });

    let overtimeType = "WORKDAY";
    if (personalSchedule?.isOffDay || !workingDays.includes(dayOfWeek)) {
      overtimeType = "HOLIDAY";
    }

    // 10. Create Overtime Request
    const ot = await db.overtimeRequest.create({
      data: {
        companyId: session.companyId,
        employeeId: targetEmployeeId,
        date: dayStart,
        overtimeType,
        startTime,
        endTime,
        hours: durationHours,
        durationHours: durationHours,
        reason,
        projectName: projectName || null,
        attachmentUrl: attachmentUrl || null,
        compensationType: compensationType || policy.compensationType || "PAYABLE",
        status: "PENDING",
      },
    });

    // 11. Create In-App Notification for HR / Managers
    const hrUsers = await db.user.findMany({
      where: {
        companyId: session.companyId,
        roles: {
          some: {
            role: {
              name: { in: ["HR_ADMIN", "SUPER_ADMIN", "MANAGER"] },
            },
          },
        },
      },
      select: { id: true },
    });

    const emp = await db.employee.findUnique({
      where: { id: targetEmployeeId },
      include: { user: { select: { name: true } } },
    });

    for (const hr of hrUsers) {
      await db.notification.create({
        data: {
          companyId: session.companyId,
          userId: hr.id,
          category: "APPROVAL",
          title: "Pengajuan Lembur Baru",
          message: `${emp?.user?.name || "Karyawan"} mengajukan lembur ${durationHours} jam pada ${dateOnlyStr}.`,
          referenceModule: "OVERTIME",
          referenceId: ot.id,
        },
      });
    }

    // 12. Record Audit Log
    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "OVERTIME",
      action: "OVERTIME_REQUESTED",
      recordId: ot.id,
      newValues: {
        date: dateOnlyStr,
        startTime,
        endTime,
        durationHours,
        overtimeType,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan lembur berhasil dikirim.",
      data: ot,
    });
  } catch (err: any) {
    console.error("POST /api/v1/overtime error:", err);
    return NextResponse.json({ error: "Gagal memproses permohonan lembur: " + err.message }, { status: 500 });
  }
}