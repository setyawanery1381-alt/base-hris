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

    let distanceMeters = 0;
    if (policy?.isGpsRequired && employee.location) {
      if (latitude === undefined || longitude === undefined) {
        return NextResponse.json({ error: "Lokasi GPS wajib disertakan sesuai kebijakan perusahaan." }, { status: 400 });
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
          error: `Lokasi Anda (${Math.round(distanceMeters)}m) berada di luar radius kantor yang diizinkan (${maxRadius}m).`,
        }, { status: 400 });
      }
    }

    if (policy?.isSelfieRequired && !photoUrl) {
      return NextResponse.json({ error: "Foto selfie wajib diambil untuk verifikasi absensi." }, { status: 400 });
    }

    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Calculate late status
    let status = "PRESENT";
    if (policy?.workStartTime) {
      const [startHour, startMin] = policy.workStartTime.split(":").map(Number);
      const tolerance = policy.lateToleranceMinutes || 15;
      const scheduledStart = new Date();
      scheduledStart.setHours(startHour, startMin + tolerance, 0, 0);

      if (now > scheduledStart) {
        status = "LATE";
      }
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
        checkInAddress: employee.location?.address || "Kantor Pusat",
        status,
        workType,
        notes,
      },
      update: {
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        checkInPhotoUrl: photoUrl || "/selfie-mock.jpg",
        checkInDistanceMeters: Math.round(distanceMeters),
        status,
        workType,
        notes,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ATTENDANCE",
      action: "CHECKIN",
      recordId: record.id,
      newValues: { time: now, status, distanceMeters: Math.round(distanceMeters) },
    });

    return NextResponse.json({
      success: true,
      message: status === "LATE" ? "Absen masuk berhasil (Terlambat)" : "Absen masuk berhasil (Tepat Waktu)",
      data: record,
    });
  } catch (err: any) {
    console.error("Checkin Error:", err);
    return NextResponse.json({ error: "Gagal memproses absensi: " + err.message }, { status: 500 });
  }
}