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

const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      latitude,
      longitude,
      photoUrl,
      areaPhotoUrl,
      accuracyMeters,
      isMockedFromDevice,
      workType = "WFO",
      notes,
    } = body;

    const employee = await db.employee.findUnique({
      where: { id: session.employeeId },
      include: { location: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });
    }

    const policy = await db.attendancePolicy.findFirst({
      where: { companyId: session.companyId },
    });

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // 1. Check Work Schedule / Shift for Today
    const schedule = await db.employeeSchedule.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: todayStart,
        },
      },
      include: { shift: true },
    });

    let effectiveStartTime = policy?.workStartTime || "08:30";
    let effectiveEndTime = policy?.workEndTime || "17:30";
    let shiftName = "Kebijakan Kantor";

    if (schedule) {
      if (schedule.isOffDay) {
        return NextResponse.json(
          { error: "Hari ini adalah Hari Libur (Off-Day) sesuai jadwal kerja Anda. Check-in tidak diperlukan." },
          { status: 400 }
        );
      }
      if (schedule.shift) {
        effectiveStartTime = schedule.shift.startTime;
        effectiveEndTime = schedule.shift.endTime;
        shiftName = schedule.shift.name;
      }
    } else {
      // Fallback to company policy working days
      let workingDays: string[] = ["MON", "TUE", "WED", "THU", "FRI"];
      if (policy?.workingDays) {
        try {
          workingDays = typeof policy.workingDays === "string" ? JSON.parse(policy.workingDays) : policy.workingDays;
        } catch {}
      }

      const currentDayCode = DAY_MAP[now.getDay()];
      if (!workingDays.includes(currentDayCode)) {
        return NextResponse.json(
          { error: `Hari ini (${currentDayCode}) adalah hari libur perusahaan sesuai kebijakan absensi.` },
          { status: 400 }
        );
      }
    }

    // 2. Check-In Window Validation
    const [startHour, startMin] = effectiveStartTime.split(":").map(Number);
    const scheduledStart = new Date();
    scheduledStart.setHours(startHour, startMin, 0, 0);

    const windowStartMins = policy?.checkInWindowStartMinutes ?? 60;
    const windowEndMins = policy?.checkInWindowEndMinutes ?? 240;

    const earliestCheckIn = new Date(scheduledStart.getTime() - windowStartMins * 60 * 1000);
    const latestCheckIn = new Date(scheduledStart.getTime() + windowEndMins * 60 * 1000);

    if (now < earliestCheckIn) {
      const earliestStr = earliestCheckIn.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      return NextResponse.json(
        { error: `Jendela check-in belum dibuka. Absensi untuk shift '${shiftName}' baru dapat dilakukan mulai pukul ${earliestStr} WIB.` },
        { status: 400 }
      );
    }

    if (now > latestCheckIn) {
      return NextResponse.json(
        { error: "Batas waktu check-in (cutoff) telah berakhir. Silakan ajukan Permohonan Izin Keterlambatan atau Koreksi Absensi." },
        { status: 400 }
      );
    }

    // 2b. Determine effective attendanceMode
    const effectiveAttendanceMode =
      employee.attendanceMode && employee.attendanceMode !== "INHERIT"
        ? employee.attendanceMode
        : policy?.attendanceMode || "OFFICE";

    // 3. Geofence & Location Validation + Mock GPS Detection
    let isMock = false;
    let mockReason: string | undefined;

    if (policy?.isGpsRequired && (latitude === undefined || longitude === undefined)) {
      return NextResponse.json({ error: "Koordinat GPS perangkat wajib disertakan." }, { status: 400 });
    }

    if (latitude !== undefined && longitude !== undefined) {
      if (!isValidCoordinates(Number(latitude), Number(longitude))) {
        return NextResponse.json({ error: "Koordinat GPS perangkat tidak valid atau di luar jangkauan." }, { status: 400 });
      }

      // Anti-spoofing / Mock Location check
      if (policy?.detectMockLocation !== false) {
        const prevAtt = await db.attendance.findFirst({
          where: {
            companyId: session.companyId,
            employeeId: session.employeeId,
            checkInLatitude: { not: null },
            checkInLongitude: { not: null },
          },
          orderBy: { checkInTime: "desc" },
        });

        const mockCheck = detectMockLocation({
          latitude: Number(latitude),
          longitude: Number(longitude),
          accuracyMeters: accuracyMeters ? Number(accuracyMeters) : null,
          isMockedFromDevice: Boolean(isMockedFromDevice),
          previousLocation:
            prevAtt && prevAtt.checkInLatitude && prevAtt.checkInLongitude && prevAtt.checkInTime
              ? {
                  latitude: prevAtt.checkInLatitude,
                  longitude: prevAtt.checkInLongitude,
                  timestamp: prevAtt.checkInTime,
                }
              : null,
          currentTime: now,
        });

        if (mockCheck.isMock) {
          isMock = true;
          mockReason = mockCheck.reason;
        }
      }
    }

    // Geofence Policy Evaluation
    const geofenceRes = evaluateGeofence({
      effectiveMode: effectiveAttendanceMode,
      workType,
      currentLat: Number(latitude || 0),
      currentLng: Number(longitude || 0),
      officeLat: employee.location?.latitude,
      officeLng: employee.location?.longitude,
      officeRadiusMeters: employee.location?.radiusMeters,
      policyRadiusMeters: policy?.geofenceRadiusMeters,
      allowOutsideRadius: policy?.allowOutsideRadius,
    });

    if (!geofenceRes.isAllowed && policy?.isGpsRequired) {
      return NextResponse.json({ error: geofenceRes.errorMessage || "Di luar radius geofence kantor." }, { status: 400 });
    }

    // 4. Selfie Validation
    if (policy?.isSelfieRequired && !photoUrl) {
      return NextResponse.json({ error: "Foto selfie kamera langsung wajib diambil untuk verifikasi absensi." }, { status: 400 });
    }

    // 5. Late Status Computation
    const lateTolerance = policy?.lateToleranceMinutes ?? 15;
    const lateThreshold = new Date(scheduledStart.getTime() + lateTolerance * 60 * 1000);
    const status = now > lateThreshold ? "LATE" : "PRESENT";

    // 6. Check If Already Checked In Today
    const existingRecord = await db.attendance.findUnique({
      where: {
        companyId_employeeId_date: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          date: todayStart,
        },
      },
    });

    if (existingRecord && existingRecord.checkInTime) {
      return NextResponse.json(
        { error: "Anda sudah melakukan check-in hari ini pada pukul " + new Date(existingRecord.checkInTime).toLocaleTimeString("id-ID") + " WIB." },
        { status: 400 }
      );
    }

    let noteTags = `[Shift: ${shiftName}] ${geofenceRes.noteTag || ""}`;
    if (isMock) {
      noteTags += ` [FLAG: ${mockReason || "Fake GPS Terindikasi"}]`;
    }
    if (accuracyMeters && accuracyMeters > (policy?.maxAllowedAccuracyMeters || 100)) {
      noteTags += ` [GPS Akurasi Rendah: ±${Math.round(accuracyMeters)}m]`;
    }
    const fullNotes = notes ? `${notes} ${noteTags.trim()}` : noteTags.trim();

    const record = await db.attendance.upsert({
      where: {
        companyId_employeeId_date: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          date: todayStart,
        },
      },
      create: {
        companyId: session.companyId,
        employeeId: session.employeeId,
        date: todayStart,
        checkInTime: now,
        checkInLatitude: latitude ? Number(latitude) : null,
        checkInLongitude: longitude ? Number(longitude) : null,
        checkInAccuracyMeters: accuracyMeters ? Number(accuracyMeters) : null,
        isCheckInMockLocation: isMock,
        checkInPhotoUrl: photoUrl || "/selfie-mock.jpg",
        checkInAreaPhotoUrl: areaPhotoUrl || null,
        checkInDistanceMeters: geofenceRes.distanceMeters,
        checkInAddress: employee.location?.address || "Area Kerja",
        status,
        workType,
        attendanceMode: effectiveAttendanceMode,
        deviceInfo: req.headers.get("user-agent") || null,
        notes: fullNotes,
      },
      update: {
        checkInTime: now,
        checkInLatitude: latitude ? Number(latitude) : null,
        checkInLongitude: longitude ? Number(longitude) : null,
        checkInAccuracyMeters: accuracyMeters ? Number(accuracyMeters) : null,
        isCheckInMockLocation: isMock,
        checkInPhotoUrl: photoUrl || "/selfie-mock.jpg",
        checkInAreaPhotoUrl: areaPhotoUrl || null,
        checkInDistanceMeters: geofenceRes.distanceMeters,
        status,
        workType,
        attendanceMode: effectiveAttendanceMode,
        deviceInfo: req.headers.get("user-agent") || null,
        notes: fullNotes,
      },
    });

    // Save Photo Evidences into AttendanceEvidence
    if (photoUrl) {
      await db.attendanceEvidence.create({
        data: {
          companyId: session.companyId,
          attendanceId: record.id,
          type: "CHECKIN_SELFIE",
          photoUrl: photoUrl,
          latitude: latitude || null,
          longitude: longitude || null,
          accuracyMeters: accuracyMeters || null,
          address: employee.location?.address || "Kantor Utama",
          watermarkText: `CHECKIN_SELFIE | ${effectiveAttendanceMode} | ${now.toISOString()}`,
          capturedAt: now,
        },
      });
    }

    if (areaPhotoUrl) {
      await db.attendanceEvidence.create({
        data: {
          companyId: session.companyId,
          attendanceId: record.id,
          type: "CHECKIN_AREA",
          photoUrl: areaPhotoUrl,
          latitude: latitude || null,
          longitude: longitude || null,
          accuracyMeters: accuracyMeters || null,
          address: employee.location?.address || "Area Kerja Lapangan",
          watermarkText: `CHECKIN_AREA | ${effectiveAttendanceMode} | ${now.toISOString()}`,
          capturedAt: now,
        },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ATTENDANCE",
      action: "CHECKIN",
      recordId: record.id,
      newValues: {
        time: now,
        status,
        shift: shiftName,
        distanceMeters: geofenceRes.distanceMeters,
      },
    });

    return NextResponse.json({
      success: true,
      message: status === "LATE"
        ? `Absen masuk berhasil (Terlambat). Shift: ${shiftName}`
        : `Absen masuk berhasil (Tepat Waktu). Shift: ${shiftName}`,
      data: record,
    });
  } catch (err: any) {
    console.error("Checkin Error:", err);
    return NextResponse.json({ error: "Gagal memproses absensi: " + err.message }, { status: 500 });
  }
}