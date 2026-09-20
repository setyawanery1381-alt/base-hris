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

    const leave = await db.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        employee: { include: { user: true } },
      },
    });

    if (!leave || leave.companyId !== session.companyId) {
      return NextResponse.json({ error: "Pengajuan cuti tidak ditemukan." }, { status: 404 });
    }

    const isOwner = session.employeeId && leave.employeeId === session.employeeId;
    const isHr = session.roles.includes("HR_ADMIN") || session.roles.includes("SUPER_ADMIN");

    if (!isOwner && !isHr) {
      return NextResponse.json({ error: "Forbidden: Anda tidak memiliki akses untuk membatalkan permohonan ini." }, { status: 403 });
    }

    if (leave.status === "CANCELLED") {
      return NextResponse.json({ error: "Pengajuan cuti ini sudah dibatalkan sebelumnya." }, { status: 400 });
    }

    if (leave.status === "REJECTED") {
      return NextResponse.json({ error: "Pengajuan cuti yang telah ditolak tidak dapat dibatalkan." }, { status: 400 });
    }

    // If already approved, only HR Admin can cancel it
    if (leave.status === "APPROVED" && !isHr) {
      return NextResponse.json({
        error: "Pengajuan cuti yang sudah disetujui hanya dapat dibatalkan oleh HR Administrator.",
      }, { status: 403 });
    }

    const wasApproved = leave.status === "APPROVED";

    await db.$transaction(async (tx) => {
      // 1. Update status
      await tx.leaveRequest.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: session.userId,
          adminNotes: reason,
        },
      });

      // 2. If it was approved, restore the deducted balance
      if (wasApproved) {
        const year = new Date(leave.startDate).getFullYear();
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: leave.employeeId,
              leaveTypeId: leave.leaveTypeId,
              year,
            },
          },
        });

        if (balance) {
          const newUsed = Math.max(0, balance.used - leave.durationDays);
          const newRemaining = Math.max(0, balance.entitlement - newUsed);
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: { used: newUsed, remaining: newRemaining },
          });
        }
      }

      // 3. Send Notification
      if (leave.employee.user && leave.employee.user.id !== session.userId) {
        await tx.notification.create({
          data: {
            companyId: session.companyId!,
            userId: leave.employee.user.id,
            category: "INFO",
            title: "Pengajuan Cuti Dibatalkan",
            message: `Pengajuan ${leave.leaveType.name} Anda untuk tanggal ${new Date(leave.startDate).toLocaleDateString("id-ID")} telah dibatalkan. Alasan: ${reason}`,
            referenceModule: "LEAVE",
            referenceId: leave.id,
          },
        });
      }
    });

    await recordAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      module: "LEAVE",
      action: "LEAVE_CANCELLED",
      recordId: leave.id,
      newValues: { status: "CANCELLED", reason, wasApproved },
    });

    return NextResponse.json({
      success: true,
      message: "Pengajuan cuti berhasil dibatalkan.",
    });
  } catch (err: any) {
    console.error("Cancel Leave Error:", err);
    return NextResponse.json({ error: "Gagal membatalkan permohonan cuti: " + err.message }, { status: 500 });
  }
}
