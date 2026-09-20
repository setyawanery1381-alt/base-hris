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

    const isAuthorized =
      session.roles.includes("HR_ADMIN") ||
      session.roles.includes("SUPER_ADMIN") ||
      session.roles.includes("MANAGER");

    if (!isAuthorized) {
      return NextResponse.json({
        error: "Forbidden: Hanya HR Admin atau Manager yang dapat menyetujui/menolak izin.",
      }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { action, comments } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Aksi tidak valid. Gunakan 'APPROVE' atau 'REJECT'." }, { status: 400 });
    }

    const permission = await db.permissionRequest.findUnique({
      where: { id },
      include: {
        typeDefinition: true,
        employee: { include: { user: true } },
      },
    });

    if (!permission) {
      return NextResponse.json({ error: "Pengajuan izin tidak ditemukan." }, { status: 404 });
    }

    if (permission.companyId !== session.companyId && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (permission.status !== "PENDING") {
      return NextResponse.json({
        error: `Pengajuan izin ini sudah tidak dalam status menunggu persetujuan (Status saat ini: ${permission.status}).`,
      }, { status: 400 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await db.$transaction(async (tx) => {
      // 1. Update status
      await tx.permissionRequest.update({
        where: { id },
        data: {
          status: newStatus,
          adminNotes: comments || null,
        },
      });

      // 2. Send Notification to Employee
      if (permission.employee.user) {
        await tx.notification.create({
          data: {
            companyId: session.companyId!,
            userId: permission.employee.user.id,
            category: "APPROVAL",
            title: action === "APPROVE" ? "Izin Disetujui ✓" : "Izin Ditolak ✗",
            message: `Pengajuan izin '${permission.typeDefinition?.name || permission.permissionType}' Anda untuk tanggal ${new Date(permission.date).toLocaleDateString("id-ID")} telah ${action === "APPROVE" ? "disetujui" : "ditolak"}. ${comments ? "Catatan: " + comments : ""}`,
            referenceModule: "PERMISSION",
            referenceId: permission.id,
          },
        });
      }
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "PERMISSION",
      action: action === "APPROVE" ? "PERMISSION_APPROVED" : "PERMISSION_REJECTED",
      recordId: permission.id,
      newValues: { status: newStatus, comments },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan izin ${permission.employee.firstName} berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}.`,
    });
  } catch (err: any) {
    console.error("Permission action error:", err);
    return NextResponse.json({ error: "Gagal memproses aksi izin: " + err.message }, { status: 500 });
  }
}
