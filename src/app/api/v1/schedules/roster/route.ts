import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { recordAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "shift.view")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin melihat jadwal kerja." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month") || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const departmentId = searchParams.get("departmentId");
    const employeeId = searchParams.get("employeeId");

    const [year, month] = monthParam.split("-").map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Fetch employees in company
    const employees = await db.employee.findMany({
      where: {
        companyId: session.companyId,
        ...(departmentId ? { departmentId } : {}),
        ...(employeeId ? { id: employeeId } : {}),
      },
      include: {
        department: true,
        position: true,
      },
      orderBy: { firstName: "asc" },
    });

    // Fetch schedules for the date range
    const schedules = await db.employeeSchedule.findMany({
      where: {
        companyId: session.companyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        shift: true,
      },
    });

    return NextResponse.json({
      success: true,
      month: monthParam,
      employees,
      schedules,
    });
  } catch (err: any) {
    console.error("GET Roster Error:", err);
    return NextResponse.json({ error: "Gagal memuat jadwal roster." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session, "shift.manage")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin mengatur jadwal roster." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { employeeIds, startDate, endDate, shiftId, isOffDay, notes } = body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 karyawan untuk diatur jadwalnya." },
        { status: 400 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Tanggal mulai dan tanggal selesai wajib diisi." },
        { status: 400 }
      );
    }

    if (!isOffDay && !shiftId) {
      return NextResponse.json(
        { error: "Pilih shift kerja atau tandai sebagai Hari Libur (Off-Day)." },
        { status: 400 }
      );
    }

    // Verify shift belongs to this company if provided
    let targetShiftId = shiftId;
    if (!isOffDay) {
      const shift = await db.shift.findFirst({
        where: { id: shiftId, companyId: session.companyId },
      });
      if (!shift) {
        return NextResponse.json({ error: "Shift tidak ditemukan di perusahaan Anda." }, { status: 404 });
      }
    } else {
      // For off-day, pick first shift or create a fallback relation
      if (!targetShiftId) {
        const anyShift = await db.shift.findFirst({
          where: { companyId: session.companyId },
        });
        targetShiftId = anyShift?.id;
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return NextResponse.json({ error: "Tanggal selesai tidak boleh sebelum tanggal mulai." }, { status: 400 });
    }

    // Generate list of dates
    const dateList: Date[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      dateList.push(new Date(Date.UTC(curr.getFullYear(), curr.getMonth(), curr.getDate())));
      curr.setDate(curr.getDate() + 1);
    }

    let assignedCount = 0;

    for (const empId of employeeIds) {
      for (const d of dateList) {
        await db.employeeSchedule.upsert({
          where: {
            employeeId_date: {
              employeeId: empId,
              date: d,
            },
          },
          update: {
            shiftId: targetShiftId,
            isOffDay: Boolean(isOffDay),
            notes: notes || null,
          },
          create: {
            companyId: session.companyId,
            employeeId: empId,
            shiftId: targetShiftId,
            date: d,
            isOffDay: Boolean(isOffDay),
            notes: notes || null,
          },
        });
        assignedCount++;
      }
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "SCHEDULE",
      action: "ASSIGN_ROSTER",
      newValues: {
        employeeCount: employeeIds.length,
        startDate,
        endDate,
        shiftId: targetShiftId,
        isOffDay,
        totalSlots: assignedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil mengatur jadwal kerja untuk ${employeeIds.length} karyawan (${assignedCount} slot jadwal).`,
      assignedCount,
    });
  } catch (err: any) {
    console.error("POST Roster Error:", err);
    return NextResponse.json({ error: "Gagal menyimpan jadwal roster." }, { status: 500 });
  }
}
