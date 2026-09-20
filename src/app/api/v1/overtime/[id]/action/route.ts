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
      return NextResponse.json(
        {
          error: "Forbidden: Hanya HR Admin atau Manager yang dapat menyetujui/menolak lembur.",
        },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await req.json().catch(() => ({}));
    const { action, comments } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ error: "Aksi tidak valid. Gunakan 'APPROVE' atau 'REJECT'." }, { status: 400 });
    }

    const overtime = await db.overtimeRequest.findUnique({
      where: { id },
      include: {
        employee: { include: { user: true } },
      },
    });

    if (!overtime) {
      return NextResponse.json({ error: "Pengajuan lembur tidak ditemukan." }, { status: 404 });
    }

    if (overtime.companyId !== session.companyId && !session.roles.includes("SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (overtime.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `Pengajuan lembur ini sudah tidak dalam status menunggu persetujuan (Status saat ini: ${overtime.status}).`,
        },
        { status: 400 }
      );
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await db.$transaction(async (tx) => {
      // 1. Update status
      await tx.overtimeRequest.update({
        where: { id },
        data: {
          status: newStatus,
          adminNotes: comments || null,
          approvedBy: session.userId,
        },
      });

      // 2. Send Notification to Employee
      if (overtime.employee.user) {
        await tx.notification.create({
          data: {
            companyId: session.companyId!,
            userId: overtime.employee.user.id,
            category: "APPROVAL",
            title: action === "APPROVE" ? "Lembur Disetujui ✓" : "Lembur Ditolak ✗",
            message: `Pengajuan lembur Anda untuk tanggal ${new Date(overtime.date).toLocaleDateString("id-ID")} (${overtime.durationHours || overtime.hours} jam) telah ${action === "APPROVE" ? "disetujui" : "ditolak"}. ${comments ? "Catatan: " + comments : ""}`,
            referenceModule: "OVERTIME",
            referenceId: overtime.id,
          },
        });
      }
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "OVERTIME",
      action: action === "APPROVE" ? "OVERTIME_APPROVED" : "OVERTIME_REJECTED",
      recordId: overtime.id,
      newValues: { status: newStatus, comments },
    });

    return NextResponse.json({
      success: true,
      message: `Pengajuan lembur ${overtime.employee.firstName} berhasil di-${action === "APPROVE" ? "setujui" : "tolak"}.`,
    });
  } catch (err: any) {
    console.error("Overtime action error:", err);
    return NextResponse.json({ error: "Gagal memproses aksi lembur: " + err.message }, { status: 500 });
  }
}
