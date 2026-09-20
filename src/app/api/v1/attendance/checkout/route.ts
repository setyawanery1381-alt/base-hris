import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. Find active open shift (checked in, not checked out yet)
    let record = await db.attendance.findFirst({
      where: {
        companyId: session.companyId,
        employeeId: session.employeeId,
        checkInTime: { not: null },
        checkOutTime: null,
      },
      orderBy: { checkInTime: "desc" },
    });

    // 2. If no open shift found, check if already checked out or truly not checked in
    if (!record) {
      const alreadyCheckedOut = await db.attendance.findFirst({
        where: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          checkOutTime: { not: null },
          checkInTime: { not: null },
          date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { checkOutTime: "desc" },
      });

      if (alreadyCheckedOut) {
        return NextResponse.json(
          { error: "Anda sudah melakukan absen keluar hari ini." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Anda belum melakukan absen masuk hari ini." },
        { status: 400 }
      );
    }

    // Optional location & photo & notes on checkout
    let latitude: number | undefined;
    let longitude: number | undefined;
    let photoUrl: string | undefined;
    let notes: string | undefined;

    try {
      const body = await req.json();
      latitude = body?.latitude;
      longitude = body?.longitude;
      photoUrl = body?.photoUrl;
      notes = body?.notes;
    } catch {}

    // Load policy, employee location & schedule
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
            date: record.date,
          },
        },
        include: { shift: true },
      }),
    ]);

    // Calculate distance if coordinates provided
    let distanceMeters: number | undefined;
    if (latitude !== undefined && longitude !== undefined && employee?.location) {
      distanceMeters = Math.round(
        getDistanceMeters(
          latitude,
          longitude,
          employee.location.latitude,
          employee.location.longitude
        )
      );
    }

    // 3. Work Duration Calculation
    const checkInDate = new Date(record.checkInTime!);
    const grossMinutes = Math.max(
      1,
      Math.round((now.getTime() - checkInDate.getTime()) / (1000 * 60))
    );
    const breakMinutes =
      schedule?.shift?.breakDurationMinutes ?? policy?.breakDurationMinutes ?? 60;
    const workDurationMinutes =
      grossMinutes > breakMinutes ? grossMinutes - breakMinutes : grossMinutes;

    // 4. Early Checkout Calculation
    const effectiveEndTime =
      schedule?.shift?.endTime || policy?.workEndTime || "17:00";
    const [endHour, endMin] = effectiveEndTime.split(":").map(Number);
    const scheduledEnd = new Date(now);
    scheduledEnd.setHours(endHour, endMin, 0, 0);

    const earlyTolerance = policy?.earlyCheckoutToleranceMinutes ?? 0;
    const earlyThreshold = new Date(
      scheduledEnd.getTime() - earlyTolerance * 60 * 1000
    );
    const isEarlyLeave = now < earlyThreshold;

    let status = record.status;
    if (status === "PRESENT" && isEarlyLeave) {
      status = "EARLY_LEAVE";
    }

    // 5. Overtime Calculation
    const isOvertimeAllowed = policy?.isOvertimeAllowed ?? true;
    const minOvertimeMinutes = policy?.minOvertimeMinutes ?? 30;
    let overtimeMinutes = 0;
    if (isOvertimeAllowed && now > scheduledEnd) {
      const otDiff = Math.round(
        (now.getTime() - scheduledEnd.getTime()) / (1000 * 60)
      );
      if (otDiff >= minOvertimeMinutes) {
        overtimeMinutes = otDiff;
      }
    }

    // 6. Build updated notes
    let updatedNotes = record.notes || "";
    if (isEarlyLeave && !updatedNotes.includes("[Pulang Awal]")) {
      updatedNotes = updatedNotes ? `${updatedNotes} [Pulang Awal]` : "[Pulang Awal]";
    }
    if (overtimeMinutes > 0 && !updatedNotes.includes("[Lembur:")) {
      updatedNotes = updatedNotes
        ? `${updatedNotes} [Lembur: ${overtimeMinutes}m]`
        : `[Lembur: ${overtimeMinutes}m]`;
    }
    if (notes) {
      updatedNotes = updatedNotes ? `${updatedNotes} - ${notes}` : notes;
    }

    const updated = await db.attendance.update({
      where: { id: record.id },
      data: {
        checkOutTime: now,
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
        checkOutPhotoUrl: photoUrl,
        checkOutDistanceMeters: distanceMeters,
        checkOutAddress: employee?.location?.address || "Kantor Utama",
        workDurationMinutes,
        status,
        notes: updatedNotes || null,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ATTENDANCE",
      action: "CHECKOUT",
      recordId: updated.id,
      newValues: {
        checkOutTime: now,
        workDurationMinutes,
        status,
        isEarlyLeave,
        overtimeMinutes,
      },
    });

    const hours = Math.floor(workDurationMinutes / 60);
    const mins = workDurationMinutes % 60;
    const durationDisplay =
      hours > 0 ? `${hours} jam ${mins} menit` : `${mins} menit`;

    let msg = `Absen keluar berhasil dicatat! Durasi kerja bersih: ${durationDisplay}.`;
    if (isEarlyLeave) msg += " (Pulang lebih awal)";
    if (overtimeMinutes > 0) msg += ` (Lembur: ${overtimeMinutes} menit)`;

    return NextResponse.json({
      success: true,
      message: msg,
      data: updated,
    });
  } catch (err: any) {
    console.error("Checkout Error:", err);
    return NextResponse.json(
      { error: "Gagal checkout: " + err.message },
      { status: 500 }
    );
  }
}