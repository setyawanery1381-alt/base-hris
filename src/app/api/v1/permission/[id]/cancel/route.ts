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

    const permission = await db.permissionRequest.findUnique({
      where: { id },
      include: {
        typeDefinition: true,
        employee: { include: { user: true } },
      },
    });

    if (!permission || permission.companyId !== session.companyId) {
      return NextResponse.json({ error: "Pengajuan izin tidak ditemukan." }, { status: 404 });
    }

    const isOwner = session.employeeId && permission.employeeId === session.employeeId;
    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    if (!isOwner && !isHr) {
      return NextResponse.json({
        error: "Forbidden: Anda tidak memiliki hak akses untuk membatalkan pengajuan izin ini.",
      }, { status: 403 });
    }

    if (permission.status === "CANCELLED") {
      return NextResponse.json({ error: "Pengajuan izin ini sudah dibatalkan sebelumnya." }, { status: 400 });
    }

    if (permission.status === "REJECTED") {
      return NextResponse.json({ error: "Pengajuan izin yang telah ditolak tidak dapat dibatalkan." }, { status: 400 });
    }

    if (permission.status === "APPROVED" && !isHr) {
      return NextResponse.json({
        error: "Pengajuan izin yang sudah disetujui hanya dapat dibatalkan oleh HR Administrator.",
      }, { status: 403 });
    }

    await db.permissionRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: session.userId,
        adminNotes: reason,
      },
    });

    // Notify employee if cancelled by HR
    if (permission.employee.user && permission.employee.user.id !== session.userId) {
      await db.notification.create({
        data: {
          companyId: session.companyId,
          userId: permission.employee.user.id,
          category: "INFO",
          title: "Pengajuan Izin Dibatalkan",
          message: `Pengajuan izin Anda untuk tanggal ${new Date(permission.date).toLocaleDateString("id-ID")} telah dibatalkan. Alasan: ${reason}`,
          referenceModule: "PERMISSION",
          referenceId: permission.id,
        },
      });
    }

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERMISSION",
      action: "PERMISSION_CANCELLED",
      recordId: permission.id,
      newValues: { status: "CANCELLED", reason },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan izin berhasil dibatalkan.",
    });
  } catch (err: any) {
    console.error("Cancel Permission Error:", err);
    return NextResponse.json({ error: "Gagal membatalkan pengajuan izin: " + err.message }, { status: 500 });
  }
}
