import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { reason = "Dibatalkan oleh pemohon" } = body;

    const overtime = await db.overtimeRequest.findUnique({
      where: { id },
      include: {
        employee: { include: { user: true } },
      },
    });

    if (!overtime || overtime.companyId !== session.companyId) {
      return NextResponse.json({ error: "Pengajuan lembur tidak ditemukan." }, { status: 404 });
    }

    const isOwner = session.employeeId && overtime.employeeId === session.employeeId;
    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    if (!isOwner && !isHr) {
      return NextResponse.json(
        {
          error: "Forbidden: Anda tidak memiliki hak akses untuk membatalkan pengajuan lembur ini.",
        },
        { status: 403 }
      );
    }

    if (overtime.status === "CANCELLED") {
      return NextResponse.json({ error: "Pengajuan lembur ini sudah dibatalkan sebelumnya." }, { status: 400 });
    }

    if (overtime.status === "REJECTED") {
      return NextResponse.json({ error: "Pengajuan lembur yang telah ditolak tidak dapat dibatalkan." }, { status: 400 });
    }

    if (overtime.status === "APPROVED" && !isHr) {
      return NextResponse.json(
        {
          error: "Pengajuan lembur yang sudah disetujui hanya dapat dibatalkan oleh HR Administrator.",
        },
        { status: 403 }
      );
    }

    await db.overtimeRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: session.userId,
        adminNotes: reason,
      },
    });

    // Notify employee if cancelled by HR
    if (overtime.employee.user && overtime.employee.user.id !== session.userId) {
      await db.notification.create({
        data: {
          companyId: session.companyId,
          userId: overtime.employee.user.id,
          category: "INFO",
          title: "Pengajuan Lembur Dibatalkan",
          message: `Pengajuan lembur Anda untuk tanggal ${new Date(overtime.date).toLocaleDateString("id-ID")} (${overtime.durationHours || overtime.hours} jam) telah dibatalkan. Alasan: ${reason}`,
          referenceModule: "OVERTIME",
          referenceId: overtime.id,
        },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "OVERTIME",
      action: "OVERTIME_CANCELLED",
      recordId: overtime.id,
      newValues: { status: "CANCELLED", reason },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan lembur berhasil dibatalkan.",
    });
  } catch (err: any) {
    console.error("Cancel Overtime Error:", err);
    return NextResponse.json({ error: "Gagal membatalkan pengajuan lembur: " + err.message }, { status: 500 });
  }
}
