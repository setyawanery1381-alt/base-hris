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
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const record = await db.attendance.findUnique({
      where: {
        companyId_employeeId_date: {
          companyId: session.companyId,
          employeeId: session.employeeId,
          date: todayStart,
        },
      },
    });

    if (!record || !record.checkInTime) {
      return NextResponse.json({ error: "Anda belum melakukan absen masuk hari ini." }, { status: 400 });
    }

    const durationMinutes = Math.round((now.getTime() - new Date(record.checkInTime).getTime()) / (1000 * 60));

    const updated = await db.attendance.update({
      where: { id: record.id },
      data: {
        checkOutTime: now,
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

    return NextResponse.json({
      success: true,
      message: `Absen keluar berhasil dicatat. Durasi kerja: ${Math.floor(durationMinutes / 60)}j ${durationMinutes % 60}m`,
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Gagal checkout: " + err.message }, { status: 500 });
  }
}