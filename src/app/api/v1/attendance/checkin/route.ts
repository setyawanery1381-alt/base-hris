import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

// Haversine formula to calculate distance in meters
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
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

const DAY_MAP = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { latitude, longitude, photoUrl, workType = "WFO", notes } = body;

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

    // 3. Geofence & Location Validation
    let distanceMeters = 0;
    if (policy?.isGpsRequired && employee.location) {
      if (latitude === undefined || longitude === undefined) {
        return NextResponse.json({ error: "Koordinat GPS perangkat wajib disertakan." }, { status: 400 });
      }

      distanceMeters = getDistanceMeters(
        latitude,
        longitude,
        employee.location.latitude,
        employee.location.longitude
      );

      const maxRadius = policy.geofenceRadiusMeters || employee.location.radiusMeters || 100;
      if (distanceMeters > maxRadius && workType === "WFO") {
        return NextResponse.json({
          error: `Anda berada di luar radius kantor (${Math.round(distanceMeters)}m). Maksimal yang diizinkan adalah ${maxRadius}m.`,
        }, { status: 400 });
      }
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
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInPhotoUrl: photoUrl || "/selfie-mock.jpg",
        checkInDistanceMeters: Math.round(distanceMeters),
        checkInAddress: employee.location?.address || "Kantor Utama",
        status,
        workType,
        notes: notes ? `${notes} [Shift: ${shiftName}]` : `[Shift: ${shiftName}]`,
      },
      update: {
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInPhotoUrl: photoUrl || "/selfie-mock.jpg",
        checkInDistanceMeters: Math.round(distanceMeters),
        status,
        workType,
        notes: notes ? `${notes} [Shift: ${shiftName}]` : `[Shift: ${shiftName}]`,
      },
    });

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
        distanceMeters: Math.round(distanceMeters),
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