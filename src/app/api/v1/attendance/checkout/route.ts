import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

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

    // Optional location & photo on checkout
    let latitude: number | undefined;
    let longitude: number | undefined;
    let photoUrl: string | undefined;

    try {
      const body = await req.json();
      latitude = body?.latitude;
      longitude = body?.longitude;
      photoUrl = body?.photoUrl;
    } catch {}

    const checkInDate = new Date(record.checkInTime!);
    const durationMinutes = Math.max(
      1,
      Math.round((now.getTime() - checkInDate.getTime()) / (1000 * 60))
    );

    const updated = await db.attendance.update({
      where: { id: record.id },
      data: {
        checkOutTime: now,
        checkOutLatitude: latitude,
        checkOutLongitude: longitude,
        checkOutPhotoUrl: photoUrl,
        workDurationMinutes: durationMinutes,
      },
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "ATTENDANCE",
      action: "CHECKOUT",
      recordId: updated.id,
      newValues: { checkOutTime: now, durationMinutes },
    });

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationDisplay = hours > 0 ? `${hours} jam ${mins} menit` : `${mins} menit`;

    return NextResponse.json({
      success: true,
      message: `Absen keluar berhasil dicatat! Total durasi kerja: ${durationDisplay}.`,
      data: updated,
    });
  } catch (err: any) {
    console.error("Checkout Error:", err);
    return NextResponse.json({ error: "Gagal checkout: " + err.message }, { status: 500 });
  }
}