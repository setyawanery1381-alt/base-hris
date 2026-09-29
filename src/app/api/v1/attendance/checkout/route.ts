import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import {
  calculateDistanceMeters,
  isValidCoordinates,
  detectMockLocation,
  evaluateGeofence,
} from "@/lib/geofence";

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
    let areaPhotoUrl: string | undefined;
    let accuracyMeters: number | undefined;
    let isMockedFromDevice: boolean | undefined;
    let notes: string | undefined;

    try {
      const body = await req.json();
      latitude = body?.latitude;
      longitude = body?.longitude;
      photoUrl = body?.photoUrl;
      areaPhotoUrl = body?.areaPhotoUrl;
      accuracyMeters = body?.accuracyMeters;
      isMockedFromDevice = body?.isMockedFromDevice;
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

    // Validate coordinates & Anti-spoofing for checkout
    let isMock = false;
    let mockReason: string | undefined;
    let distanceMeters = 0;
    let geofenceTag = "";

    if (latitude !== undefined && longitude !== undefined) {
      if (!isValidCoordinates(Number(latitude), Number(longitude))) {
        return NextResponse.json({ error: "Koordinat GPS perangkat checkout tidak valid." }, { status: 400 });
      }

      // Check teleportation velocity against check-in location
      if (policy?.detectMockLocation !== false) {
        const mockCheck = detectMockLocation({
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracyMeters: accuracyMeters ? Number(accuracyMeters) : null,
          isMockedFromDevice: Boolean(isMockedFromDevice),
          previousLocation:
            record.checkInLatitude && record.checkInLongitude && record.checkInTime
              ? {
                  latitude: record.checkInLatitude,
                  longitude: record.checkInLongitude,
                  timestamp: record.checkInTime,
                }
              : null,
          currentTime: now,
        });

        if (mockCheck.isMock) {
          isMock = true;
          mockReason = mockCheck.reason;
        }
      }

      // Geofence evaluation
      const geofenceRes = evaluateGeofence({
        effectiveMode: record.attendanceMode || "OFFICE",
        workType: record.workType,
        currentLat: Number(latitude),
        currentLng: Number(longitude),
        officeLat: employee?.location?.latitude,
        officeLng: employee?.location?.longitude,
        officeRadiusMeters: employee?.location?.radiusMeters,
        policyRadiusMeters: policy?.geofenceRadiusMeters,
        allowOutsideRadius: policy?.allowOutsideRadius,
      });

      distanceMeters = geofenceRes.distanceMeters;
      geofenceTag = geofenceRes.noteTag || "";
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
    if (geofenceTag) {
      updatedNotes = updatedNotes ? `${updatedNotes} ${geofenceTag}` : geofenceTag;
    }
    if (isMock) {
      updatedNotes = updatedNotes
        ? `${updatedNotes} [FLAG: ${mockReason || "Fake GPS Terindikasi"}]`
        : `[FLAG: ${mockReason || "Fake GPS Terindikasi"}]`;
    }
    if (accuracyMeters && accuracyMeters > (policy?.maxAllowedAccuracyMeters || 100)) {
      updatedNotes = updatedNotes
        ? `${updatedNotes} [GPS Akurasi Rendah: ±${Math.round(accuracyMeters)}m]`
        : `[GPS Akurasi Rendah: ±${Math.round(accuracyMeters)}m]`;
    }
    if (notes) {
      updatedNotes = updatedNotes ? `${updatedNotes} - ${notes}` : notes;
    }

    const updated = await db.attendance.update({
      where: { id: record.id },
      data: {
        checkOutTime: now,
        checkOutLatitude: latitude ? Number(latitude) : null,
        checkOutLongitude: longitude ? Number(longitude) : null,
        checkOutAccuracyMeters: accuracyMeters ? Number(accuracyMeters) : null,
        isCheckOutMockLocation: isMock,
        checkOutPhotoUrl: photoUrl,
        checkOutAreaPhotoUrl: areaPhotoUrl || null,
        checkOutDistanceMeters: distanceMeters,
        checkOutAddress: employee?.location?.address || "Area Selesai Kerja",
        workDurationMinutes,
        status,
        notes: updatedNotes || null,
      },
    });

    // Save AttendanceEvidence records for checkout
    if (photoUrl) {
      await db.attendanceEvidence.create({
        data: {
          companyId: session.companyId,
          attendanceId: updated.id,
          type: "CHECKOUT_SELFIE",
          photoUrl: photoUrl,
          latitude: latitude || null,
          longitude: longitude || null,
          accuracyMeters: accuracyMeters || null,
          address: employee?.location?.address || "Kantor Utama",
          watermarkText: `CHECKOUT_SELFIE | ${record.attendanceMode || "OFFICE"} | ${now.toISOString()}`,
          capturedAt: now,
        },
      });
    }

    if (areaPhotoUrl) {
      await db.attendanceEvidence.create({
        data: {
          companyId: session.companyId,
          attendanceId: updated.id,
          type: "CHECKOUT_AREA",
          photoUrl: areaPhotoUrl,
          latitude: latitude || null,
          longitude: longitude || null,
          accuracyMeters: accuracyMeters || null,
          address: employee?.location?.address || "Area Selesai Kerja",
          watermarkText: `CHECKOUT_AREA | ${record.attendanceMode || "OFFICE"} | ${now.toISOString()}`,
          capturedAt: now,
        },
      });
    }

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