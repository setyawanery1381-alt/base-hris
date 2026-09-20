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

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const employeeIdParam = searchParams.get("employeeId");

    const isHrOrAdmin =
      hasPermission(session, "attendance.view.all") ||
      hasPermission(session, "attendance.correct") ||
      session.roles?.includes("HR_ADMIN") ||
      session.roles?.includes("SUPER_ADMIN");

    const whereClause: any = {
      companyId: session.companyId,
    };

    if (isHrOrAdmin) {
      if (employeeIdParam) whereClause.employeeId = employeeIdParam;
      if (statusParam && statusParam !== "ALL") whereClause.status = statusParam;
    } else {
      // Regular employee can only see their own
      whereClause.employeeId = session.employeeId;
      if (statusParam && statusParam !== "ALL") whereClause.status = statusParam;
    }

    const corrections = await db.attendanceCorrection.findMany({
      where: whereClause,
      include: {
        employee: {
          include: { department: true, position: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      corrections,
    });
  } catch (err: any) {
    console.error("Attendance Correction GET Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat koreksi absensi: " + err.message },
      { status: 500 }
    );
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
      requestedCheckIn,
      requestedCheckOut,
      reason,
      attachmentUrl,
      employeeId: targetEmpId,
      action = "REQUEST",
      adminNotes,
    } = body;

    if (!date || !reason) {
      return NextResponse.json(
        { error: "Tanggal absensi dan alasan koreksi wajib diisi." },
        { status: 400 }
      );
    }

    const isHrOrAdmin =
      hasPermission(session, "attendance.correct") ||
      session.roles?.includes("HR_ADMIN") ||
      session.roles?.includes("SUPER_ADMIN");

    const effectiveEmployeeId =
      isHrOrAdmin && targetEmpId ? targetEmpId : session.employeeId;

    if (!effectiveEmployeeId) {
      return NextResponse.json(
        { error: "Data karyawan tidak valid." },
        { status: 400 }
      );
    }

    // Parse target date normalized to UTC 00:00:00
    const d = new Date(date);
    const targetDate = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    );

    // Policy check
    const policy = await db.attendancePolicy.findFirst({
      where: { companyId: session.companyId },
    });

    const isDirectApply = action === "APPLY_DIRECT" && isHrOrAdmin;

    if (!isDirectApply) {
      if (policy && !policy.isCorrectionAllowed) {
        return NextResponse.json(
          { error: "Koreksi absensi dinonaktifkan oleh kebijakan perusahaan." },
          { status: 400 }
        );
      }

      const maxDays = policy?.maxCorrectionDays ?? 7;
      const now = new Date();
      const diffMs = now.getTime() - targetDate.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > maxDays) {
        return NextResponse.json(
          {
            error: `Pengajuan koreksi melebihi batas maksimal (${maxDays} hari) yang diizinkan kebijakan perusahaan.`,
          },
          { status: 400 }
        );
      }
    }

    // Helper to parse checkIn / checkOut times
    const parseTime = (timeInput: string | null | undefined) => {
      if (!timeInput) return null;
      if (timeInput.includes("T")) return new Date(timeInput);
      const [h, m] = timeInput.split(":").map(Number);
      const res = new Date(d);
      res.setHours(h, m, 0, 0);
      return res;
    };

    const parsedIn = parseTime(requestedCheckIn);
    const parsedOut = parseTime(requestedCheckOut);

    // If HR directly applies correction
    if (isDirectApply) {
      let durationMinutes = null;
      if (parsedIn && parsedOut) {
        const gross = Math.max(
          1,
          Math.round((parsedOut.getTime() - parsedIn.getTime()) / (1000 * 60))
        );
        const breakMins = policy?.breakDurationMinutes ?? 60;
        durationMinutes = gross > breakMins ? gross - breakMins : gross;
      }

      const attendanceRecord = await db.attendance.upsert({
        where: {
          companyId_employeeId_date: {
            companyId: session.companyId,
            employeeId: effectiveEmployeeId,
            date: targetDate,
          },
        },
        create: {
          companyId: session.companyId,
          employeeId: effectiveEmployeeId,
          date: targetDate,
          checkInTime: parsedIn,
          checkOutTime: parsedOut,
          workDurationMinutes: durationMinutes,
          status: "PRESENT",
          notes: `[Koreksi HR: ${reason}]`,
        },
        update: {
          checkInTime: parsedIn,
          checkOutTime: parsedOut,
          workDurationMinutes: durationMinutes,
          status: "PRESENT",
          notes: `[Koreksi HR: ${reason}]`,
        },
      });

      const correction = await db.attendanceCorrection.create({
        data: {
          companyId: session.companyId,
          employeeId: effectiveEmployeeId,
          attendanceId: attendanceRecord.id,
          date: targetDate,
          requestedCheckIn: parsedIn,
          requestedCheckOut: parsedOut,
          reason,
          attachmentUrl,
          status: "APPROVED",
          adminNotes: adminNotes || "Diterapkan langsung oleh HR Admin",
        },
      });

      await recordAuditLog({
        companyId: session.companyId,
        userId: session.userId,
        module: "ATTENDANCE",
        action: "CORRECTION_APPLIED",
        recordId: correction.id,
        newValues: {
          employeeId: effectiveEmployeeId,
          date: targetDate,
          checkIn: parsedIn,
          checkOut: parsedOut,
          reason,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Koreksi absensi berhasil diterapkan langsung!",
        data: correction,
      });
    }

    // Regular employee correction request
    const existingAtt = await db.attendance.findUnique({
      where: {
        companyId_employeeId_date: {
          companyId: session.companyId,
          employeeId: effectiveEmployeeId,
          date: targetDate,
        },
      },
    });

    const correction = await db.attendanceCorrection.create({
      data: {
        companyId: session.companyId,
        employeeId: effectiveEmployeeId,
        attendanceId: existingAtt?.id || null,
        date: targetDate,
        requestedCheckIn: parsedIn,
        requestedCheckOut: parsedOut,
        reason,
        attachmentUrl,
        status: "PENDING",
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ATTENDANCE",
      action: "CORRECTION_REQUESTED",
      recordId: correction.id,
      newValues: {
        employeeId: effectiveEmployeeId,
        date: targetDate,
        reason,
        requestedCheckIn: parsedIn,
        requestedCheckOut: parsedOut,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Pengajuan koreksi absensi berhasil dikirim dan menunggu persetujuan HR.",
      data: correction,
    });
  } catch (err: any) {
    console.error("Attendance Correction POST Error:", err);
    return NextResponse.json(
      { error: "Gagal memproses koreksi absensi: " + err.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isHrOrAdmin =
      hasPermission(session, "attendance.correct") ||
      session.roles?.includes("HR_ADMIN") ||
      session.roles?.includes("SUPER_ADMIN");

    if (!isHrOrAdmin) {
      return NextResponse.json(
        { error: "Hanya HR Admin yang dapat menyetujui koreksi absensi." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { correctionId, action, adminNotes } = body;

    if (!correctionId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: "Parameter correctionId dan action (APPROVE/REJECT) wajib diisi." },
        { status: 400 }
      );
    }

    const correction = await db.attendanceCorrection.findUnique({
      where: { id: correctionId },
    });

    if (!correction || correction.companyId !== session.companyId) {
      return NextResponse.json(
        { error: "Pengajuan koreksi tidak ditemukan." },
        { status: 404 }
      );
    }

    if (action === "REJECT") {
      const updated = await db.attendanceCorrection.update({
        where: { id: correctionId },
        data: {
          status: "REJECTED",
          adminNotes: adminNotes || "Ditolak oleh HR Admin",
        },
      });

      await recordAuditLog({
        companyId: session.companyId,
        userId: session.userId,
        module: "ATTENDANCE",
        action: "CORRECTION_REJECTED",
        recordId: correctionId,
        newValues: { adminNotes },
      });

      return NextResponse.json({
        success: true,
        message: "Pengajuan koreksi absensi telah ditolak.",
        data: updated,
      });
    }

    // Action === "APPROVE"
    const policy = await db.attendancePolicy.findFirst({
      where: { companyId: session.companyId },
    });

    let durationMinutes = null;
    if (correction.requestedCheckIn && correction.requestedCheckOut) {
      const gross = Math.max(
        1,
        Math.round(
          (new Date(correction.requestedCheckOut).getTime() -
            new Date(correction.requestedCheckIn).getTime()) /
            (1000 * 60)
        )
      );
      const breakMins = policy?.breakDurationMinutes ?? 60;
      durationMinutes = gross > breakMins ? gross - breakMins : gross;
    }

    // Update or insert Attendance
    const attRecord = await db.attendance.upsert({
      where: {
        companyId_employeeId_date: {
          companyId: session.companyId,
          employeeId: correction.employeeId,
          date: correction.date,
        },
      },
      create: {
        companyId: session.companyId,
        employeeId: correction.employeeId,
        date: correction.date,
        checkInTime: correction.requestedCheckIn,
        checkOutTime: correction.requestedCheckOut,
        workDurationMinutes: durationMinutes,
        status: "PRESENT",
        notes: `[Koreksi Disetujui: ${correction.reason}]`,
      },
      update: {
        checkInTime: correction.requestedCheckIn,
        checkOutTime: correction.requestedCheckOut,
        workDurationMinutes: durationMinutes,
        status: "PRESENT",
        notes: `[Koreksi Disetujui: ${correction.reason}]`,
      },
    });

    const updatedCorrection = await db.attendanceCorrection.update({
      where: { id: correctionId },
      data: {
        status: "APPROVED",
        attendanceId: attRecord.id,
        adminNotes: adminNotes || "Disetujui oleh HR Admin",
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ATTENDANCE",
      action: "CORRECTION_APPROVED",
      recordId: correctionId,
      newValues: {
        attendanceId: attRecord.id,
        adminNotes,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan koreksi absensi telah disetujui dan data absensi telah diperbarui!",
      data: updatedCorrection,
    });
  } catch (err: any) {
    console.error("Attendance Correction PUT Error:", err);
    return NextResponse.json(
      { error: "Gagal memproses koreksi absensi: " + err.message },
      { status: 500 }
    );
  }
}
