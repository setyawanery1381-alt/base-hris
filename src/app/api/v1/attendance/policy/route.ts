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

    if (!hasPermission(session, "attendance.policy.view")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin melihat kebijakan absensi." },
        { status: 403 }
      );
    }

    let policy = await db.attendancePolicy.findFirst({
      where: { companyId: session.companyId },
    });

    if (!policy) {
      policy = await db.attendancePolicy.create({
        data: {
          companyId: session.companyId,
          name: "Standard Policy",
          workingDays: JSON.stringify(["MON", "TUE", "WED", "THU", "FRI"]),
          workStartTime: "08:00",
          workEndTime: "17:00",
          checkInWindowStartMinutes: 60,
          checkInWindowEndMinutes: 240,
          lateToleranceMinutes: 15,
          earlyCheckoutToleranceMinutes: 0,
          geofenceRadiusMeters: 100,
          isSelfieRequired: true,
          isGpsRequired: true,
          breakDurationMinutes: 60,
          isOvertimeAllowed: true,
          minOvertimeMinutes: 30,
          isCorrectionAllowed: true,
          maxCorrectionDays: 7,
          isDefault: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      policy: {
        ...policy,
        workingDays: typeof policy.workingDays === "string" ? JSON.parse(policy.workingDays) : policy.workingDays,
      },
    });
  } catch (err: any) {
    console.error("GET AttendancePolicy Error:", err);
    return NextResponse.json(
      { error: "Gagal memuat kebijakan absensi." },
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

    if (!hasPermission(session, "attendance.policy.manage")) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki izin mengubah kebijakan absensi." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (body.workStartTime && !timeRegex.test(body.workStartTime)) {
      return NextResponse.json({ error: "Format jam masuk tidak valid (HH:mm)." }, { status: 400 });
    }
    if (body.workEndTime && !timeRegex.test(body.workEndTime)) {
      return NextResponse.json({ error: "Format jam pulang tidak valid (HH:mm)." }, { status: 400 });
    }

    let workingDaysStr = JSON.stringify(["MON", "TUE", "WED", "THU", "FRI"]);
    if (Array.isArray(body.workingDays)) {
      workingDaysStr = JSON.stringify(body.workingDays);
    } else if (typeof body.workingDays === "string") {
      workingDaysStr = body.workingDays;
    }

    const existingPolicy = await db.attendancePolicy.findFirst({
      where: { companyId: session.companyId },
    });

    const updateData = {
      name: body.name || "Kebijakan Kantor Utama",
      workingDays: workingDaysStr,
      workStartTime: body.workStartTime || "08:00",
      workEndTime: body.workEndTime || "17:00",
      checkInWindowStartMinutes: Number(body.checkInWindowStartMinutes ?? 60),
      checkInWindowEndMinutes: Number(body.checkInWindowEndMinutes ?? 240),
      lateToleranceMinutes: Number(body.lateToleranceMinutes ?? 15),
      earlyCheckoutToleranceMinutes: Number(body.earlyCheckoutToleranceMinutes ?? 0),
      geofenceRadiusMeters: Math.max(10, Number(body.geofenceRadiusMeters ?? 100)),
      isSelfieRequired: Boolean(body.isSelfieRequired ?? true),
      isGpsRequired: Boolean(body.isGpsRequired ?? true),
      breakDurationMinutes: Number(body.breakDurationMinutes ?? 60),
      isOvertimeAllowed: Boolean(body.isOvertimeAllowed ?? true),
      minOvertimeMinutes: Number(body.minOvertimeMinutes ?? 30),
      isCorrectionAllowed: Boolean(body.isCorrectionAllowed ?? true),
      maxCorrectionDays: Math.max(1, Number(body.maxCorrectionDays ?? 7)),
    };

    let updatedPolicy;
    if (existingPolicy) {
      updatedPolicy = await db.attendancePolicy.update({
        where: { id: existingPolicy.id },
        data: updateData,
      });
    } else {
      updatedPolicy = await db.attendancePolicy.create({
        data: {
          companyId: session.companyId,
          ...updateData,
          isDefault: true,
        },
      });
    }

    // Record Audit Log
    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ATTENDANCE",
      action: "UPDATE_POLICY",
      recordId: updatedPolicy.id,
      oldValues: existingPolicy,
      newValues: updatedPolicy,
    });

    return NextResponse.json({
      success: true,
      message: "Kebijakan absensi berhasil diperbarui.",
      policy: {
        ...updatedPolicy,
        workingDays: JSON.parse(updatedPolicy.workingDays),
      },
    });
  } catch (err: any) {
    console.error("PUT AttendancePolicy Error:", err);
    return NextResponse.json(
      { error: "Gagal memperbarui kebijakan absensi." },
      { status: 500 }
    );
  }
}
